from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import CostoViaje, Viaje
from esquemas.costos_viaje_esquemas import CostoViajeCreate, CostoViajeUpdate, CostoViajePut
from servicios.ganancias_servicios import sincronizar_ganancia_viaje
from servicios.auditoria_servicios import registrar_auditoria


def crear_costo_viaje(session: Session, datos: CostoViajeCreate) -> CostoViaje:
    if not session.get(Viaje, datos.id_viaje):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Viaje inexistente."
        )

    nuevo_costo = CostoViaje(
        id_viaje=datos.id_viaje,
        descripcion=datos.descripcion,
        monto=datos.monto
    )
    session.add(nuevo_costo)
    session.commit()
    session.refresh(nuevo_costo)
    sincronizar_ganancia_viaje(session, nuevo_costo.id_viaje)
    registrar_auditoria(
        session,
        "costos_viaje",
        "INSERT",
        f"Costo operativo registrado en Viaje #{nuevo_costo.id_viaje}: {nuevo_costo.descripcion} (${nuevo_costo.monto})"
    )
    return nuevo_costo


def obtener_costos_viaje(session: Session) -> list[CostoViaje]:
    return session.exec(select(CostoViaje)).all()


def obtener_costo_viaje_por_id(session: Session, id_costo: int) -> CostoViaje:
    costo = session.get(CostoViaje, id_costo)
    if not costo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Costo de viaje inexistente."
        )
    return costo


def reemplazar_costo_viaje(session: Session, id_costo: int, datos: CostoViajePut) -> CostoViaje:
    costo = obtener_costo_viaje_por_id(session, id_costo)
    viaje_anterior = costo.id_viaje

    if not session.get(Viaje, datos.id_viaje):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error 404 (Not Found): Viaje inexistente.")

    costo.id_viaje = datos.id_viaje
    costo.descripcion = datos.descripcion
    costo.monto = datos.monto
    costo.is_active = datos.is_active

    session.add(costo)
    session.commit()
    session.refresh(costo)
    sincronizar_ganancia_viaje(session, costo.id_viaje)
    if viaje_anterior != costo.id_viaje:
        sincronizar_ganancia_viaje(session, viaje_anterior)
    return costo


def actualizar_costo_viaje(session: Session, id_costo: int, datos: CostoViajeUpdate) -> CostoViaje:
    costo = obtener_costo_viaje_por_id(session, id_costo)
    viaje_anterior = costo.id_viaje
    datos_dict = datos.model_dump(exclude_unset=True)

    if "id_viaje" in datos_dict and not session.get(Viaje, datos_dict["id_viaje"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error 404 (Not Found): Viaje inexistente.")

    for key, value in datos_dict.items():
        setattr(costo, key, value)

    session.add(costo)
    session.commit()
    session.refresh(costo)
    sincronizar_ganancia_viaje(session, costo.id_viaje)
    if viaje_anterior != costo.id_viaje:
        sincronizar_ganancia_viaje(session, viaje_anterior)
    registrar_auditoria(
        session,
        "costos_viaje",
        "UPDATE",
        f"Actualización de costo #{id_costo} en Viaje #{costo.id_viaje}: {costo.descripcion} (${costo.monto})"
    )
    return costo


def desactivar_costo_viaje(session: Session, id_costo: int) -> CostoViaje:
    costo = obtener_costo_viaje_por_id(session, id_costo)
    costo.is_active = False

    session.add(costo)
    session.commit()
    session.refresh(costo)
    sincronizar_ganancia_viaje(session, costo.id_viaje)
    registrar_auditoria(
        session,
        "costos_viaje",
        "DELETE",
        f"Baja lógica de costo #{id_costo} en Viaje #{costo.id_viaje}"
    )
    return costo
