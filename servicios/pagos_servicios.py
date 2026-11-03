from decimal import Decimal
from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import Pago, Reserva
from esquemas.pagos_esquemas import PagoCreate, PagoUpdate
from servicios.reserva_servicios import recalcular_totales_reserva
from servicios.auditoria_servicios import registrar_auditoria

def crear_pago(session: Session, datos: PagoCreate) -> Pago:
    reserva = session.get(Reserva, datos.id_reserva)
    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Reserva inexistente."
        )

    monto_nuevo = Decimal(str(datos.monto)).quantize(Decimal("0.01"))
    if monto_nuevo <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto del pago debe ser mayor a $0.00."
        )

    pagos_activos = session.exec(
        select(Pago)
        .where(Pago.id_reserva == reserva.id_reserva)
        .where(Pago.is_active == True)
    ).all()
    pagado_actual = sum((Decimal(str(p.monto)) for p in pagos_activos), Decimal("0.00"))
    monto_total_res = Decimal(str(reserva.monto_total)).quantize(Decimal("0.01"))
    saldo_pendiente = max(monto_total_res - pagado_actual, Decimal("0.00"))

    if monto_total_res > Decimal("0.00") and monto_nuevo > saldo_pendiente:
        if saldo_pendiente <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La Reserva #{reserva.id_reserva} ya se encuentra 100% pagada (${monto_total_res:.2f})."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"El monto ingresado (${monto_nuevo:.2f}) supera el saldo pendiente de la "
                f"Reserva #{reserva.id_reserva} (${saldo_pendiente:.2f})."
            )
        )

    nuevo_pago = Pago(
        id_reserva=datos.id_reserva,
        monto=monto_nuevo,
        metodo_pago=datos.metodo_pago,
        referencia=datos.referencia
    )
    session.add(nuevo_pago)
    session.commit()
    session.refresh(nuevo_pago)
    recalcular_totales_reserva(session, reserva)
    registrar_auditoria(
        session,
        "pagos",
        "INSERT",
        f"Pago #{nuevo_pago.id_pago} registrado en Reserva #{nuevo_pago.id_reserva}: ${nuevo_pago.monto} ({nuevo_pago.metodo_pago}, Ref: {nuevo_pago.referencia}) — Estatus Reserva: {reserva.estatus_pago}"
    )
    return nuevo_pago

def obtener_pagos(session: Session) -> list[Pago]:
    return session.exec(select(Pago)).all()

def obtener_pago_por_id(session: Session, id_pago: int) -> Pago:
    pago = session.get(Pago, id_pago)
    if not pago:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Error 404 (Not Found): Pago inexistente."
        )
    return pago

def actualizar_pago(session: Session, id_pago: int, datos: PagoUpdate) -> Pago:
    pago = obtener_pago_por_id(session, id_pago)
    datos_dict = datos.model_dump(exclude_unset=True)
    
    for key, value in datos_dict.items():
        setattr(pago, key, value)

    reserva = session.get(Reserva, pago.id_reserva)
    if reserva and reserva.is_active:
        from modelos.modelos import Integrante
        from servicios.reserva_servicios import calcular_abono_minimo_por_edades

        ints = session.exec(
            select(Integrante)
            .where(Integrante.id_reserva == reserva.id_reserva)
            .where(Integrante.is_active == True)
        ).all()
        minimo = calcular_abono_minimo_por_edades([i.edad for i in ints])
        pagos_activos = session.exec(
            select(Pago)
            .where(Pago.id_reserva == reserva.id_reserva)
            .where(Pago.is_active == True)
        ).all()
        total_pagado = sum((Decimal(str(p.monto)) for p in pagos_activos), Decimal("0.00"))
        if total_pagado < minimo:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No se puede reducir el pago porque la reserva quedaría con ${total_pagado:.2f} "
                    f"(menor al abono mínimo obligatorio de ${minimo:.2f})."
                )
            )
        monto_total_res = Decimal(str(reserva.monto_total)).quantize(Decimal("0.01"))
        if monto_total_res > Decimal("0.00") and total_pagado > monto_total_res:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"La suma de pagos (${total_pagado:.2f}) no puede superar el monto total "
                    f"de la reserva (${monto_total_res:.2f})."
                )
            )

    session.add(pago)
    session.commit()
    session.refresh(pago)

    if reserva:
        recalcular_totales_reserva(session, reserva)
    registrar_auditoria(
        session,
        "pagos",
        "UPDATE",
        f"Actualización de Pago #{pago.id_pago} en Reserva #{pago.id_reserva} (${pago.monto}, Activo: {pago.is_active})"
    )
    return pago

def desactivar_pago(session: Session, id_pago: int) -> Pago:
    pago = obtener_pago_por_id(session, id_pago)
    reserva = session.get(Reserva, pago.id_reserva)
    if reserva and reserva.is_active:
        from modelos.modelos import Integrante
        from servicios.reserva_servicios import calcular_abono_minimo_por_edades

        ints = session.exec(
            select(Integrante)
            .where(Integrante.id_reserva == reserva.id_reserva)
            .where(Integrante.is_active == True)
        ).all()
        minimo = calcular_abono_minimo_por_edades([i.edad for i in ints])

        otros_pagos = session.exec(
            select(Pago)
            .where(Pago.id_reserva == reserva.id_reserva)
            .where(Pago.is_active == True)
            .where(Pago.id_pago != id_pago)
        ).all()
        restante_pagado = sum((Decimal(str(p.monto)) for p in otros_pagos), Decimal("0.00"))
        if restante_pagado < minimo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No se puede anular este pago porque la reserva quedaría con ${restante_pagado:.2f} "
                    f"(menor al abono mínimo obligatorio de ${minimo:.2f}). "
                    f"Si deseas cancelar toda la reserva, dala de baja directamente."
                )
            )

    pago.is_active = False
    session.add(pago)
    session.commit()
    session.refresh(pago)

    if reserva:
        recalcular_totales_reserva(session, reserva)
    registrar_auditoria(
        session,
        "pagos",
        "DELETE",
        f"Anulación lógica de Pago #{pago.id_pago} en Reserva #{pago.id_reserva} (${pago.monto})"
    )
    return pago
