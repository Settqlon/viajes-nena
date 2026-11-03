import json
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session
from database.conexion import get_session
from servicios.auditoria_servicios import registrar_auditoria

router = APIRouter(prefix="/tasas", tags=["Tasas de Cambio (BCV y Pesos COP)"])

ARCHIVO_TASAS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "tasas_cambio.json")

VALORES_DEFAULT = {
    "tasa_bcv": 891.11,
    "tasa_cop": 3183.0,
    "fecha_actualizacion": datetime.now().isoformat()
}

class TasasResponse(BaseModel):
    tasa_bcv: float = Field(..., description="Tasa oficial BCV (Bolívares Bs por cada USD)")
    tasa_cop: float = Field(..., description="Tasa Pesos Colombianos (COP por cada USD)")
    fecha_actualizacion: str

class TasasUpdate(BaseModel):
    tasa_bcv: float = Field(..., gt=0, description="Tasa oficial BCV (Bs/USD)")
    tasa_cop: float = Field(..., gt=0, description="Tasa Pesos Colombianos (COP/USD)")

def cargar_tasas_archivo() -> dict:
    if os.path.exists(ARCHIVO_TASAS):
        try:
            with open(ARCHIVO_TASAS, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "tasa_bcv": float(data.get("tasa_bcv", VALORES_DEFAULT["tasa_bcv"])),
                    "tasa_cop": float(data.get("tasa_cop", VALORES_DEFAULT["tasa_cop"])),
                    "fecha_actualizacion": data.get("fecha_actualizacion", VALORES_DEFAULT["fecha_actualizacion"])
                }
        except Exception:
            return VALORES_DEFAULT.copy()
    return VALORES_DEFAULT.copy()

def guardar_tasas_archivo(datos: dict):
    with open(ARCHIVO_TASAS, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)

@router.get("", response_model=TasasResponse)
@router.get("/", response_model=TasasResponse)
def consultar_tasas():
    return cargar_tasas_archivo()

@router.put("", response_model=TasasResponse)
@router.put("/", response_model=TasasResponse)
@router.post("", response_model=TasasResponse)
@router.post("/", response_model=TasasResponse)
def actualizar_tasas(payload: TasasUpdate, session: Session = Depends(get_session)):
    if payload.tasa_bcv <= 0 or payload.tasa_cop <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las tasas de cambio deben ser mayores a 0."
        )
    
    nuevos_datos = {
        "tasa_bcv": round(float(payload.tasa_bcv), 4),
        "tasa_cop": round(float(payload.tasa_cop), 2),
        "fecha_actualizacion": datetime.now().isoformat()
    }
    guardar_tasas_archivo(nuevos_datos)

    try:
        registrar_auditoria(
            session,
            "tasas",
            "UPDATE",
            f"Tasas actualizadas — BCV: {nuevos_datos['tasa_bcv']} Bs/$ | COP: {nuevos_datos['tasa_cop']:,} COP/$"
        )
    except Exception:
        pass

    return nuevos_datos
