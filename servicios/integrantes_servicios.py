from sqlmodel import Session, select, func
from fastapi import HTTPException, status
from modelos.modelos import Integrante, Reserva, Viaje, Cliente
from esquemas.integrantes_esquemas import IntegranteCreate, IntegranteUpdate, IntegrantePut
from servicios.reserva_servicios import (
    recalcular_totales_reserva,
    capacidad_maxima_viaje,
    obtener_asientos_ocupados_viaje,
    normalizar_identificacion,
    es_documento_menor_generado
)
from servicios.auditoria_servicios import registrar_auditoria


def _verificar_consistencia_documento(
    session: Session,
    documento_id: str,
    nombre: str,
    apellido: str,
    excluir_id_integrante: int | None = None
) -> None:
    # Los identificadores internos de menores sin documento se resuelven por nombre + representante
    if es_documento_menor_generado(documento_id):
        return
    doc_limpio = documento_id.strip().lower()
    cli = session.exec(select(Cliente).where(func.lower(Cliente.id_cliente) == doc_limpio)).first()
    if cli:
        if cli.nombre.strip().lower() != nombre.strip().lower() or cli.apellido.strip().lower() != apellido.strip().lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"La cédula/documento '{documento_id}' pertenece a '{cli.nombre} {cli.apellido}'. "
                    f"No se puede registrar con otro nombre."
                )
            )
        return

    stmt_int = select(Integrante).where(func.lower(Integrante.documento_id) == doc_limpio)
    if excluir_id_integrante is not None:
        stmt_int = stmt_int.where(Integrante.id_integrante != excluir_id_integrante)
    int_previo = session.exec(stmt_int).first()
    if int_previo:
        if int_previo.nombre.strip().lower() != nombre.strip().lower() or int_previo.apellido.strip().lower() != apellido.strip().lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"La cédula/documento '{documento_id}' ya está registrada a nombre de '{int_previo.nombre} {int_previo.apellido}'. "
                    f"No se puede usar la misma cédula con otro nombre."
                )
            )


def crear_integrante(session: Session, datos: IntegranteCreate) -> Integrante:
    reserva = session.get(Reserva, datos.id_reserva)
    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Reserva inexistente."
        )

    tipo_norm, doc_norm = normalizar_identificacion(
        session,
        datos.tipo_documento,
        datos.documento_id,
        datos.edad,
        datos.nombre,
        datos.apellido,
        doc_representante=reserva.id_cliente
    )
    datos.tipo_documento = tipo_norm
    datos.documento_id = doc_norm

    ya_en_reserva = session.exec(
        select(Integrante)
        .where(Integrante.id_reserva == reserva.id_reserva)
        .where(Integrante.is_active == True)
        .where(func.lower(Integrante.documento_id) == doc_norm.lower())
    ).first()
    if ya_en_reserva:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{ya_en_reserva.nombre} {ya_en_reserva.apellido} ({doc_norm}) ya está incluido en esta reserva."
        )

    _verificar_consistencia_documento(session, datos.documento_id, datos.nombre, datos.apellido)

    es_cliente = session.exec(
        select(Cliente).where(func.lower(Cliente.id_cliente) == datos.documento_id.strip().lower())
    ).first()
    if (es_cliente or datos.documento_id.strip().lower() == reserva.id_cliente.strip().lower()) and datos.edad < 18:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El cliente titular de la reservación no puede ser menor de edad (debe tener mínimo 18 años)."
        )

    viaje = session.get(Viaje, reserva.id_viaje)
    if viaje and viaje.cupos_disponibles <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No quedan cupos disponibles en el viaje asociado a esta reserva."
        )

    puesto = datos.numero_asiento
    if viaje:
        cap_max = capacidad_maxima_viaje(viaje)
        ocupados = obtener_asientos_ocupados_viaje(session, viaje.id_viaje)
        if puesto is not None:
            if puesto < 1 or puesto > cap_max:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El puesto #{puesto} no existe en este viaje (capacidad: {cap_max} asientos)."
                )
            if puesto in ocupados:
                ocup = ocupados[puesto]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El puesto #{puesto} ya está ocupado por {ocup.nombre} {ocup.apellido} (Reserva #{ocup.id_reserva})."
                )
        else:
            sig = 1
            while sig in ocupados:
                sig += 1
            puesto = sig

    nuevo_integrante = Integrante(
        id_reserva=datos.id_reserva,
        nombre=datos.nombre,
        apellido=datos.apellido,
        documento_id=datos.documento_id,
        tipo_documento=datos.tipo_documento or "Cédula",
        edad=datos.edad,
        numero_asiento=puesto
    )
    session.add(nuevo_integrante)

    if viaje:
        viaje.cupos_disponibles -= 1
        session.add(viaje)

    session.commit()
    session.refresh(nuevo_integrante)
    recalcular_totales_reserva(session, reserva)
    registrar_auditoria(
        session,
        "integrantes",
        "INSERT",
        f"Integrante #{nuevo_integrante.id_integrante} ({nuevo_integrante.nombre} {nuevo_integrante.apellido}, Doc: {nuevo_integrante.documento_id}) añadido a Reserva #{nuevo_integrante.id_reserva}"
    )
    return nuevo_integrante


def obtener_integrantes(session: Session) -> list[Integrante]:
    return session.exec(select(Integrante)).all()


def obtener_integrante_por_id(session: Session, id_integrante: int) -> Integrante:
    integrante = session.get(Integrante, id_integrante)
    if not integrante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Integrante inexistente."
        )
    return integrante


def reemplazar_integrante(session: Session, id_integrante: int, datos: IntegrantePut) -> Integrante:
    integrante = obtener_integrante_por_id(session, id_integrante)

    if not session.get(Reserva, datos.id_reserva):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Reserva inexistente."
        )

    integrante.id_reserva = datos.id_reserva
    integrante.nombre = datos.nombre
    integrante.apellido = datos.apellido
    reserva_put = session.get(Reserva, datos.id_reserva)
    tipo_norm, doc_norm = normalizar_identificacion(
        session,
        datos.tipo_documento,
        datos.documento_id,
        datos.edad,
        datos.nombre,
        datos.apellido,
        doc_representante=reserva_put.id_cliente
    )
    integrante.tipo_documento = tipo_norm
    integrante.documento_id = doc_norm
    integrante.edad = datos.edad
    integrante.is_active = datos.is_active

    session.add(integrante)
    session.commit()
    session.refresh(integrante)
    return integrante


def actualizar_integrante(session: Session, id_integrante: int, datos: IntegranteUpdate) -> Integrante:
    integrante = obtener_integrante_por_id(session, id_integrante)
    datos_dict = datos.model_dump(exclude_unset=True)
    estaba_activo = integrante.is_active
    nuevo_estado = datos_dict.get("is_active", estaba_activo)

    for key, value in datos_dict.items():
        setattr(integrante, key, value)

    reserva = session.get(Reserva, integrante.id_reserva)

    # Si cambió el tipo/número de documento, nombre o edad, normalizar la identificación
    if any(k in datos_dict for k in ("tipo_documento", "documento_id", "nombre", "apellido", "edad")):
        tipo_actual = integrante.tipo_documento or "Cédula"
        doc_actual = integrante.documento_id
        # Si pasa de "Sin Documento" a Cédula/Pasaporte con el ID interno aún puesto, exigir el número real
        if tipo_actual != "Sin Documento" and es_documento_menor_generado(doc_actual):
            doc_actual = ""
        # Si pasa a "Sin Documento" desde cédula/pasaporte, regenerar ID interno
        if tipo_actual == "Sin Documento" and not es_documento_menor_generado(doc_actual):
            doc_actual = ""
        try:
            tipo_norm, doc_norm = normalizar_identificacion(
                session,
                tipo_actual,
                doc_actual,
                integrante.edad,
                integrante.nombre,
                integrante.apellido,
                doc_representante=reserva.id_cliente if reserva else "SIN-REP"
            )
        except HTTPException:
            session.rollback()
            raise
        integrante.tipo_documento = tipo_norm
        integrante.documento_id = doc_norm

    _verificar_consistencia_documento(
        session,
        integrante.documento_id,
        integrante.nombre,
        integrante.apellido,
        excluir_id_integrante=integrante.id_integrante
    )

    es_cliente = session.exec(
        select(Cliente).where(func.lower(Cliente.id_cliente) == integrante.documento_id.strip().lower())
    ).first()
    if (es_cliente or (reserva and integrante.documento_id.strip().lower() == reserva.id_cliente.strip().lower())) and integrante.edad < 18:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El cliente titular de la reservación no puede ser menor de edad (debe tener mínimo 18 años)."
        )

    if reserva and integrante.is_active and integrante.numero_asiento is not None:
        viaje_chk = session.get(Viaje, reserva.id_viaje)
        if viaje_chk:
            cap_max = capacidad_maxima_viaje(viaje_chk)
            ocupados = obtener_asientos_ocupados_viaje(
                session,
                viaje_chk.id_viaje,
                excluir_id_integrante=integrante.id_integrante
            )
            if integrante.numero_asiento < 1 or integrante.numero_asiento > cap_max:
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El puesto #{integrante.numero_asiento} no existe en este viaje (capacidad: {cap_max} asientos)."
                )
            if integrante.numero_asiento in ocupados:
                if not estaba_activo and nuevo_estado is True:
                    sig = 1
                    while sig in ocupados:
                        sig += 1
                    integrante.numero_asiento = sig
                else:
                    ocup = ocupados[integrante.numero_asiento]
                    session.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El puesto #{integrante.numero_asiento} ya está ocupado por {ocup.nombre} {ocup.apellido} (Reserva #{ocup.id_reserva})."
                    )

    if not estaba_activo and nuevo_estado is True and reserva:
        viaje = session.get(Viaje, reserva.id_viaje)
        if viaje:
            if viaje.cupos_disponibles <= 0:
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No quedan cupos disponibles en el viaje para restaurar este integrante."
                )
            viaje.cupos_disponibles -= 1
            session.add(viaje)

    session.add(integrante)
    session.commit()
    session.refresh(integrante)
    if reserva:
        recalcular_totales_reserva(session, reserva)
    registrar_auditoria(
        session,
        "integrantes",
        "UPDATE",
        f"Actualización de Integrante #{integrante.id_integrante} ({integrante.nombre} {integrante.apellido}, Activo: {integrante.is_active}) en Reserva #{integrante.id_reserva}"
    )
    return integrante


def desactivar_integrante(session: Session, id_integrante: int) -> Integrante:
    integrante = obtener_integrante_por_id(session, id_integrante)
    if integrante.is_active:
        reserva = session.get(Reserva, integrante.id_reserva)
        if reserva and reserva.is_active:
            activos = session.exec(
                select(Integrante)
                .where(Integrante.id_reserva == reserva.id_reserva)
                .where(Integrante.is_active == True)
            ).all()
            if len(activos) <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No puedes dar de baja al único viajero activo de la reserva. Si deseas cancelar el viaje, da de baja la reserva completa."
                )

        integrante.is_active = False
        session.add(integrante)
        session.commit()
        session.refresh(integrante)

        if reserva:
            viaje = session.get(Viaje, reserva.id_viaje)
            if viaje:
                viaje.cupos_disponibles += 1
                session.add(viaje)
            recalcular_totales_reserva(session, reserva)

        registrar_auditoria(
            session,
            "integrantes",
            "DELETE",
            f"Baja lógica de Integrante #{integrante.id_integrante} ({integrante.nombre} {integrante.apellido}) en Reserva #{integrante.id_reserva}"
        )
    return integrante
