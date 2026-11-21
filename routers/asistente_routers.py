from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlmodel import Session
from database.conexion import get_session
from servicios.auth_servicio import verificar_personal, verificar_admin
from servicios.asistente_servicios import (
    consultar_asistente,
    cotizar_por_presupuesto,
    obtener_recomendaciones_sistema,
    configurar_api_key,
    obtener_api_key_activa
)

router = APIRouter(
    prefix="/asistente",
    tags=["Asistente Comercial y Cotizador"],
    dependencies=[Depends(verificar_personal)]
)


class ChatRequest(BaseModel):
    mensaje: str
    previous_interaction_id: Optional[str] = None
    api_key: Optional[str] = None


class CotizarRequest(BaseModel):
    presupuesto: float
    adultos: int = 1
    ninos: int = 0
    infantes: int = 0
    filtro_texto: str = ""


class ApiKeyConfigRequest(BaseModel):
    api_key: str


@router.get("/recomendaciones")
def listar_recomendaciones(session: Session = Depends(get_session)):
    return {
        "recomendaciones": obtener_recomendaciones_sistema(session),
        "api_key_configurada": bool(obtener_api_key_activa())
    }


@router.post("/cotizar")
def cotizar_viajes_cliente(datos: CotizarRequest, session: Session = Depends(get_session)):
    return cotizar_por_presupuesto(
        session=session,
        presupuesto=datos.presupuesto,
        adultos=datos.adultos,
        ninos=datos.ninos,
        infantes=datos.infantes,
        filtro_texto=datos.filtro_texto
    )


@router.post("/chat")
def conversar_con_asistente(datos: ChatRequest, session: Session = Depends(get_session)):
    return consultar_asistente(
        session=session,
        mensaje=datos.mensaje,
        previous_interaction_id=datos.previous_interaction_id,
        api_key=datos.api_key
    )


@router.post("/configurar-key", dependencies=[Depends(verificar_admin)])
def guardar_api_key(datos: ApiKeyConfigRequest):
    configurar_api_key(datos.api_key)
    return {"ok": True, "api_key_configurada": bool(obtener_api_key_activa())}
