from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import Inconveniente, Viaje
from esquemas.inconvenientes_esquemas import InconvenienteCreate, InconvenienteUpdate, InconvenientePut
from servicios.ganancias_servicios import sincronizar_ganancia_viaje
from servicios.auditoria_servicios import registrar_auditoria


def crear_inconveniente(session: Session, datos: InconvenienteCreate) -> Inconveniente:
    if not session.get(Viaje, datos.id_viaje):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Viaje inexistente."
        )

    nuevo_inconveniente = Inconveniente(
        id_viaje=datos.id_viaje,
        descripcion=datos.descripcion,
        monto_descontado=datos.monto_descontado
    )
    session.add(nuevo_inconveniente)
    session.commit()
    session.refresh(nuevo_inconveniente)
    sincronizar_ganancia_viaje(session, nuevo_inconveniente.id_viaje)
    registrar_auditoria(
        session,
        "inconvenientes",
        "INSERT",
        f"Inconveniente reportado en Viaje #{nuevo_inconveniente.id_viaje}: {nuevo_inconveniente.descripcion} (-${nuevo_inconveniente.monto_descontado})"
    )
    return nuevo_inconveniente


def obtener_inconvenientes(session: Session) -> list[Inconveniente]:
    return session.exec(select(Inconveniente)).all()


def obtener_inconveniente_por_id(session: Session, id_inconveniente: int) -> Inconveniente:
    inconveniente = session.get(Inconveniente, id_inconveniente)
    if not inconveniente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Inconveniente inexistente."
        )
    return inconveniente


def reemplazar_inconveniente(session: Session, id_inconveniente: int, datos: InconvenientePut) -> Inconveniente:
    inconveniente = obtener_inconveniente_por_id(session, id_inconveniente)
    viaje_anterior = inconveniente.id_viaje

    if not session.get(Viaje, datos.id_viaje):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Viaje inexistente."
        )

    inconveniente.id_viaje = datos.id_viaje
    inconveniente.descripcion = datos.descripcion
    inconveniente.monto_descontado = datos.monto_descontado
    inconveniente.is_active = datos.is_active

    session.add(inconveniente)
    session.commit()
    session.refresh(inconveniente)
    sincronizar_ganancia_viaje(session, inconveniente.id_viaje)
    if viaje_anterior != inconveniente.id_viaje:
        sincronizar_ganancia_viaje(session, viaje_anterior)
    return inconveniente


def actualizar_inconveniente(session: Session, id_inconveniente: int, datos: InconvenienteUpdate) -> Inconveniente:
    inconveniente = obtener_inconveniente_por_id(session, id_inconveniente)
    viaje_anterior = inconveniente.id_viaje
    datos_dict = datos.model_dump(exclude_unset=True)

    if "id_viaje" in datos_dict and not session.get(Viaje, datos_dict["id_viaje"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Viaje inexistente."
        )

    for key, value in datos_dict.items():
        setattr(inconveniente, key, value)

    session.add(inconveniente)
    session.commit()
    session.refresh(inconveniente)
    sincronizar_ganancia_viaje(session, inconveniente.id_viaje)
    if viaje_anterior != inconveniente.id_viaje:
        sincronizar_ganancia_viaje(session, viaje_anterior)
    registrar_auditoria(
        session,
        "inconvenientes",
        "UPDATE",
        f"Actualización de inconveniente #{id_inconveniente} en Viaje #{inconveniente.id_viaje}: {inconveniente.descripcion}"
    )
    return inconveniente


def desactivar_inconveniente(session: Session, id_inconveniente: int) -> Inconveniente:
    inconveniente = obtener_inconveniente_por_id(session, id_inconveniente)
    inconveniente.is_active = False

    session.add(inconveniente)
    session.commit()
    session.refresh(inconveniente)
    sincronizar_ganancia_viaje(session, inconveniente.id_viaje)
    registrar_auditoria(
        session,
        "inconvenientes",
        "DELETE",
        f"Baja lógica de inconveniente #{id_inconveniente} en Viaje #{inconveniente.id_viaje}"
    )
    return inconveniente
