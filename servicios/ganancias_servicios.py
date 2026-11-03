from sqlmodel import Session, select
from fastapi import HTTPException, status
from decimal import Decimal
from datetime import datetime
from modelos.modelos import Ganancia, Viaje, Reserva, CostoViaje, Inconveniente
from esquemas.ganancias_esquemas import GananciaCreate, GananciaUpdate, GananciaPut
from servicios.auditoria_servicios import registrar_auditoria


def sincronizar_ganancia_viaje(session: Session, id_viaje: int) -> None:
    """Recalcula automáticamente la ganancia de un viaje cuando cambian sus reservas, costos o inconvenientes."""
    ganancia = session.exec(select(Ganancia).where(Ganancia.id_viaje == id_viaje)).first()
    if not ganancia:
        return

    reservas_activas = session.exec(
        select(Reserva).where(Reserva.id_viaje == id_viaje, Reserva.is_active == True)
    ).all()
    costos_activos = session.exec(
        select(CostoViaje).where(CostoViaje.id_viaje == id_viaje, CostoViaje.is_active == True)
    ).all()
    inconvenientes_activos = session.exec(
        select(Inconveniente).where(Inconveniente.id_viaje == id_viaje, Inconveniente.is_active == True)
    ).all()

    ingresos = sum((Decimal(str(r.monto_total)) for r in reservas_activas), Decimal("0.00")).quantize(Decimal("0.01"))
    costos = sum((Decimal(str(c.monto)) for c in costos_activos), Decimal("0.00")).quantize(Decimal("0.01"))
    inconvenientes = sum((Decimal(str(i.monto_descontado)) for i in inconvenientes_activos), Decimal("0.00")).quantize(Decimal("0.01"))
    neta = (ingresos - costos - inconvenientes).quantize(Decimal("0.01"))

    ganancia.ingresos_totales = ingresos
    ganancia.costos_totales = costos
    ganancia.inconvenientes_totales = inconvenientes
    ganancia.ganancia_neta = neta
    ganancia.fecha_calculo = datetime.now()
    session.add(ganancia)
    session.commit()


def crear_ganancia(session: Session, datos: GananciaCreate) -> Ganancia:
    if not session.get(Viaje, datos.id_viaje):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Viaje inexistente."
        )

    statement = select(Ganancia).where(Ganancia.id_viaje == datos.id_viaje)
    if session.exec(statement).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error 400 (Bad Request): Este viaje ya tiene un registro de ganancias asociado."
        )

    nueva_ganancia = Ganancia(
        id_viaje=datos.id_viaje,
        ingresos_totales=datos.ingresos_totales,
        costos_totales=datos.costos_totales,
        inconvenientes_totales=datos.inconvenientes_totales,
        ganancia_neta=datos.ganancia_neta
    )
    session.add(nueva_ganancia)
    session.commit()
    session.refresh(nueva_ganancia)
    registrar_auditoria(
        session,
        "ganancias",
        "INSERT",
        f"Cierre de ganancia registrado para Viaje #{datos.id_viaje} (Neta: ${datos.ganancia_neta})"
    )
    return nueva_ganancia


def obtener_ganancias(session: Session) -> list[Ganancia]:
    return session.exec(select(Ganancia)).all()


def obtener_ganancia_por_id(session: Session, id_ganancia: int) -> Ganancia:
    ganancia = session.get(Ganancia, id_ganancia)
    if not ganancia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Registro de ganancia inexistente."
        )
    return ganancia


def reemplazar_ganancia(session: Session, id_ganancia: int, datos: GananciaPut) -> Ganancia:
    ganancia = obtener_ganancia_por_id(session, id_ganancia)

    if datos.id_viaje != ganancia.id_viaje:
        if not session.get(Viaje, datos.id_viaje):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error 404 (Not Found): Viaje inexistente.")

        statement = select(Ganancia).where(Ganancia.id_viaje == datos.id_viaje)
        if session.exec(statement).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error 400 (Bad Request): El nuevo viaje asignado ya tiene ganancias."
            )

    ganancia.id_viaje = datos.id_viaje
    ganancia.ingresos_totales = datos.ingresos_totales
    ganancia.costos_totales = datos.costos_totales
    ganancia.inconvenientes_totales = datos.inconvenientes_totales
    ganancia.ganancia_neta = datos.ganancia_neta
    ganancia.is_active = datos.is_active

    session.add(ganancia)
    session.commit()
    session.refresh(ganancia)
    return ganancia


def actualizar_ganancia(session: Session, id_ganancia: int, datos: GananciaUpdate) -> Ganancia:
    ganancia = obtener_ganancia_por_id(session, id_ganancia)
    datos_dict = datos.model_dump(exclude_unset=True)

    if "id_viaje" in datos_dict and datos_dict["id_viaje"] != ganancia.id_viaje:
        if not session.get(Viaje, datos_dict["id_viaje"]):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error 404 (Not Found): Viaje inexistente.")

        statement = select(Ganancia).where(Ganancia.id_viaje == datos_dict["id_viaje"])
        if session.exec(statement).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error 400 (Bad Request): El nuevo viaje asignado ya tiene ganancias."
            )

    for key, value in datos_dict.items():
        setattr(ganancia, key, value)

    session.add(ganancia)
    session.commit()
    session.refresh(ganancia)
    registrar_auditoria(
        session,
        "ganancias",
        "UPDATE",
        f"Actualización de ganancia #{id_ganancia} (Viaje #{ganancia.id_viaje})"
    )
    return ganancia


def desactivar_ganancia(session: Session, id_ganancia: int) -> Ganancia:
    ganancia = obtener_ganancia_por_id(session, id_ganancia)
    ganancia.is_active = False

    session.add(ganancia)
    session.commit()
    session.refresh(ganancia)
    registrar_auditoria(
        session,
        "ganancias",
        "DELETE",
        f"Baja lógica de ganancia #{id_ganancia} (Viaje #{ganancia.id_viaje})"
    )
    return ganancia
