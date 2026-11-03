from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import Auditoria, Usuario
from esquemas.auditoria_esquemas import AuditoriaUpdate
from typing import Optional
from datetime import datetime


def registrar_auditoria(
    session: Session,
    tabla_afectada: str,
    accion: str,
    detalles: str,
    id_usuario: Optional[int] = None
) -> None:
    if id_usuario is None:
        admin = session.exec(select(Usuario).where(Usuario.is_active == True)).first()
        id_usuario = admin.id_usuario if admin else None
    evento = Auditoria(
        tabla_afectada=tabla_afectada,
        accion=accion,
        id_usuario=id_usuario,
        detalles=detalles,
        fecha_hora=datetime.now(),
        is_active=True
    )
    session.add(evento)
    session.commit()


def obtener_auditorias(
    session: Session,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    accion: Optional[str] = None
) -> list[Auditoria]:
    consulta = select(Auditoria)
    if fecha_inicio:
        consulta = consulta.where(Auditoria.fecha_hora >= fecha_inicio)
    if fecha_fin:
        consulta = consulta.where(Auditoria.fecha_hora <= fecha_fin)
    if accion:
        consulta = consulta.where(Auditoria.accion == accion)
    return session.exec(consulta.order_by(Auditoria.fecha_hora.desc())).all()


def obtener_auditoria_por_id(session: Session, id_auditoria: int) -> Auditoria:
    auditoria = session.get(Auditoria, id_auditoria)
    if not auditoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Registro de auditoría inexistente."
        )
    return auditoria


def actualizar_auditoria(session: Session, id_auditoria: int, datos: AuditoriaUpdate) -> Auditoria:
    auditoria = obtener_auditoria_por_id(session, id_auditoria)
    for k, v in datos.model_dump(exclude_unset=True).items():
        setattr(auditoria, k, v)
    session.add(auditoria)
    session.commit()
    session.refresh(auditoria)
    return auditoria


def desactivar_auditoria(session: Session, id_auditoria: int) -> Auditoria:
    auditoria = obtener_auditoria_por_id(session, id_auditoria)
    auditoria.is_active = False
    session.add(auditoria)
    session.commit()
    session.refresh(auditoria)
    return auditoria
