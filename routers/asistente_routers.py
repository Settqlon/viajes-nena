from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlmodel import Session
from database.conexion import get_session
from servicios.asistente_servicios import (
    consultar_asistente,
    obtener_recomendaciones_sistema,
    configurar_api_key,
    obtener_api_key_activa
)

router = APIRouter(prefix="/asistente", tags=["Asistente IA y Recomendaciones"])


class ChatRequest(BaseModel):
    mensaje: str
    previous_interaction_id: Optional[str] = None
    api_key: Optional[str] = None


class ApiKeyConfigRequest(BaseModel):
    api_key: str


@router.get("/recomendaciones")
def listar_recomendaciones(session: Session = Depends(get_session)):
    return {
        "recomendaciones": obtener_recomendaciones_sistema(session),
        "api_key_configurada": bool(obtener_api_key_activa())
    }


@router.post("/chat")
def conversar_con_asistente(datos: ChatRequest, session: Session = Depends(get_session)):
    return consultar_asistente(
        session=session,
        mensaje=datos.mensaje,
        previous_interaction_id=datos.previous_interaction_id,
        api_key=datos.api_key
    )


@router.post("/configurar-key")
def guardar_api_key(datos: ApiKeyConfigRequest):
    configurar_api_key(datos.api_key)
    return {"ok": True, "api_key_configurada": bool(obtener_api_key_activa())}
