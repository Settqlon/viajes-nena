from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import Viaje, Destino, Paquete, Reserva, Integrante, Proceso, Usuario
from esquemas.viajes_esquemas import ViajeCreate, ViajeUpdate, ViajePut, ASIENTOS_POR_TRANSPORTE
from servicios.auditoria_servicios import registrar_auditoria


def _estatus_proceso_por_viaje(estatus_viaje: str) -> str:
    if estatus_viaje == "Finalizado":
        return "completado"
    if estatus_viaje == "Cancelado":
        return "pausado"
    return "en ejecución"


def crear_viaje(session: Session, datos: ViajeCreate) -> Viaje:
    destino = session.get(Destino, datos.id_destino)
    if not destino:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Destino inexistente."
        )

    if datos.id_paquete and not session.get(Paquete, datos.id_paquete):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Paquete inexistente."
        )

    asientos_unidad = ASIENTOS_POR_TRANSPORTE.get(datos.metodo_transporte, 60)
    cupos_calculados = asientos_unidad * datos.cantidad_unidades

    nuevo_viaje = Viaje(
        id_destino=datos.id_destino,
        id_paquete=datos.id_paquete,
        fecha_salida=datos.fecha_salida,
        fecha_retorno=datos.fecha_retorno,
        metodo_transporte=datos.metodo_transporte,
        cantidad_unidades=datos.cantidad_unidades,
        cupos_disponibles=cupos_calculados,
        estatus=datos.estatus
    )
    session.add(nuevo_viaje)
    session.commit()
    session.refresh(nuevo_viaje)

    # Crear automáticamente el proceso logístico asociado al viaje
    admin = session.exec(select(Usuario).where(Usuario.is_active == True)).first()
    if admin:
        proc = Proceso(
            id_usu=admin.id_usuario,
            nom_pro=f"Logística Viaje #{nuevo_viaje.id_viaje} — {destino.nombre_destino.split(',')[0]}"[:100],
            fec_inicio=nuevo_viaje.fecha_salida,
            fec_fin=nuevo_viaje.fecha_retorno,
            est_pro=_estatus_proceso_por_viaje(nuevo_viaje.estatus),
            det_pro=(
                f"Coordinación de {nuevo_viaje.cantidad_unidades} {nuevo_viaje.metodo_transporte} "
                f"({cupos_calculados} asientos), hospedaje y control de embarque para {destino.nombre_destino}."
            ),
            act_pro=True
        )
        session.add(proc)
        session.commit()

    registrar_auditoria(
        session,
        "viajes",
        "INSERT",
        f"Nuevo Viaje #{nuevo_viaje.id_viaje} a {destino.nombre_destino} ({nuevo_viaje.metodo_transporte} × {nuevo_viaje.cantidad_unidades}, {cupos_calculados} cupos)"
    )
    return nuevo_viaje


def obtener_viajes(session: Session) -> list[Viaje]:
    return session.exec(select(Viaje)).all()


def obtener_viaje_por_id(session: Session, id_viaje: int) -> Viaje:
    viaje = session.get(Viaje, id_viaje)
    if not viaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Viaje inexistente."
        )
    return viaje


def reemplazar_viaje(session: Session, id_viaje: int, datos: ViajePut) -> Viaje:
    viaje = obtener_viaje_por_id(session, id_viaje)

    if not session.get(Destino, datos.id_destino):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Destino inexistente."
        )

    if datos.id_paquete and not session.get(Paquete, datos.id_paquete):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Paquete inexistente."
        )

    viaje.id_destino = datos.id_destino
    viaje.id_paquete = datos.id_paquete
    viaje.fecha_salida = datos.fecha_salida
    viaje.fecha_retorno = datos.fecha_retorno
    viaje.metodo_transporte = datos.metodo_transporte
    viaje.cantidad_unidades = datos.cantidad_unidades
    viaje.cupos_disponibles = datos.cupos_disponibles
    viaje.estatus = datos.estatus
    viaje.is_active = datos.is_active

    session.add(viaje)
    session.commit()
    session.refresh(viaje)
    return viaje


def actualizar_viaje(session: Session, id_viaje: int, datos: ViajeUpdate) -> Viaje:
    viaje = obtener_viaje_por_id(session, id_viaje)
    datos_dict = datos.model_dump(exclude_unset=True)

    if "id_destino" in datos_dict and not session.get(Destino, datos_dict["id_destino"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Destino inexistente."
        )

    if "id_paquete" in datos_dict and datos_dict["id_paquete"] is not None and not session.get(Paquete, datos_dict["id_paquete"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Paquete inexistente."
        )

    cambio_transporte = "metodo_transporte" in datos_dict or "cantidad_unidades" in datos_dict

    for key, value in datos_dict.items():
        setattr(viaje, key, value)

    if cambio_transporte:
        asientos_unidad = ASIENTOS_POR_TRANSPORTE.get(viaje.metodo_transporte, 60)
        capacidad_total = asientos_unidad * (viaje.cantidad_unidades or 1)
        reservas_activas = session.exec(
            select(Reserva).where(Reserva.id_viaje == viaje.id_viaje, Reserva.is_active == True)
        ).all()
        ocupados = 0
        for res in reservas_activas:
            ints_activos = session.exec(
                select(Integrante).where(Integrante.id_reserva == res.id_reserva, Integrante.is_active == True)
            ).all()
            ocupados += len(ints_activos)
        if capacidad_total < ocupados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error 400: La nueva capacidad ({capacidad_total} asientos) es menor que los cupos ya reservados ({ocupados})."
            )
        viaje.cupos_disponibles = capacidad_total - ocupados

    session.add(viaje)
    session.commit()
    session.refresh(viaje)

    # Sincronizar proceso logístico si existe
    proc = session.exec(
        select(Proceso).where(Proceso.nom_pro.contains(f"Viaje #{viaje.id_viaje}"))
    ).first()
    if proc:
        proc.fec_inicio = viaje.fecha_salida
        proc.fec_fin = viaje.fecha_retorno
        proc.est_pro = _estatus_proceso_por_viaje(viaje.estatus)
        proc.act_pro = viaje.is_active
        session.add(proc)
        session.commit()

    # Si cambió el destino o el paquete, recalcular totales de las reservas activas de este viaje
    if "id_destino" in datos_dict or "id_paquete" in datos_dict:
        from servicios.reserva_servicios import recalcular_totales_reserva
        reservas_viaje = session.exec(
            select(Reserva).where(Reserva.id_viaje == viaje.id_viaje, Reserva.is_active == True)
        ).all()
        for r_v in reservas_viaje:
            recalcular_totales_reserva(session, r_v)

    registrar_auditoria(
        session,
        "viajes",
        "UPDATE",
        f"Actualización de Viaje #{viaje.id_viaje} (Estatus: {viaje.estatus}, Cupos disp.: {viaje.cupos_disponibles})"
    )
    return viaje


def desactivar_viaje(session: Session, id_viaje: int) -> Viaje:
    viaje = obtener_viaje_por_id(session, id_viaje)
    viaje.is_active = False

    session.add(viaje)
    session.commit()
    session.refresh(viaje)

    proc = session.exec(
        select(Proceso).where(Proceso.nom_pro.contains(f"Viaje #{viaje.id_viaje}"))
    ).first()
    if proc:
        proc.act_pro = False
        session.add(proc)
        session.commit()

    registrar_auditoria(
        session,
        "viajes",
        "DELETE",
        f"Baja lógica de Viaje #{viaje.id_viaje}"
    )
    return viaje
