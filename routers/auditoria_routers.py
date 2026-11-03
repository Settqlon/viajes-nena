from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from typing import Optional
from datetime import datetime
from database.conexion import get_session
from esquemas.auditoria_esquemas import AuditoriaResponse, AuditoriaUpdate
from servicios.auth_servicio import verificar_admin
from servicios.auditoria_servicios import (
    obtener_auditorias,
    obtener_auditoria_por_id,
    actualizar_auditoria,
    desactivar_auditoria
)

router = APIRouter(prefix="/auditoria", tags=["Auditoría del Sistema"])


@router.get("/", response_model=list[AuditoriaResponse], dependencies=[Depends(verificar_admin)])
def listar_auditorias(
    fecha_inicio: Optional[datetime] = Query(default=None, description="Filtro de fecha inicio"),
    fecha_fin: Optional[datetime] = Query(default=None, description="Filtro de fecha fin"),
    accion: Optional[str] = Query(default=None, description="Filtro exacto por acción (ej. INSERT, DELETE)"),
    session: Session = Depends(get_session)
):
    return obtener_auditorias(session, fecha_inicio, fecha_fin, accion)


@router.get("/{id_auditoria}", response_model=AuditoriaResponse, dependencies=[Depends(verificar_admin)])
def obtener_auditoria(id_auditoria: int, session: Session = Depends(get_session)):
    return obtener_auditoria_por_id(session, id_auditoria)


@router.patch("/{id_auditoria}", response_model=AuditoriaResponse, dependencies=[Depends(verificar_admin)])
def modificar_auditoria(id_auditoria: int, datos: AuditoriaUpdate, session: Session = Depends(get_session)):
    return actualizar_auditoria(session, id_auditoria, datos)


@router.delete("/{id_auditoria}", response_model=AuditoriaResponse, dependencies=[Depends(verificar_admin)])
def eliminar_auditoria_logica(id_auditoria: int, session: Session = Depends(get_session)):
    return desactivar_auditoria(session, id_auditoria)
