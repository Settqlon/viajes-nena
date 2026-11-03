from decimal import Decimal
from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import Reserva, Cliente, Viaje, Destino, Paquete, Integrante, Pago
from esquemas.reserva_esquemas import ReservaCreate, ReservaUpdate, ReservaPut
from servicios.ganancias_servicios import sincronizar_ganancia_viaje
from servicios.auditoria_servicios import registrar_auditoria

ABONO_MINIMO_POR_INTEGRANTE = Decimal("30.00")

# ==========================================
# IDENTIFICACIÓN DE VIAJEROS (Venezuela)
# - "Cédula": V-/E- (lo normal en adultos y niños mayores de ~9-10 años)
# - "Pasaporte": número alfanumérico del pasaporte
# - "Sin Documento": menores que aún no tienen cédula. Se les asigna un
#   identificador interno MENOR-<doc del representante>-<n>, de modo que
#   al buscar por la cédula del representante también aparecen sus niños.
# ==========================================
TIPOS_DOCUMENTO = ("Cédula", "Pasaporte", "Sin Documento")
PREFIJO_MENOR = "MENOR-"
EDAD_MAXIMA_SIN_DOCUMENTO = 17


def es_documento_menor_generado(documento_id: str | None) -> bool:
    return bool(documento_id) and documento_id.strip().upper().startswith(PREFIJO_MENOR)


def resolver_documento_menor(
    session: Session,
    doc_representante: str,
    nombre: str,
    apellido: str,
    usados_en_lote: set[str] | None = None
) -> str:
    """
    Devuelve el identificador interno para un menor sin cédula.
    Si ese mismo niño (mismo nombre y apellido con el mismo representante) ya viajó antes,
    se reutiliza su identificador para conservar su historial de viajes.
    """
    from sqlmodel import func
    usados = {u.upper() for u in (usados_en_lote or set())}
    base = f"{PREFIJO_MENOR}{doc_representante.strip().upper()}-"
    previos = session.exec(
        select(Integrante).where(func.upper(Integrante.documento_id).like(f"{base}%"))
    ).all()
    for p in previos:
        if (
            p.nombre.strip().lower() == nombre.strip().lower()
            and p.apellido.strip().lower() == apellido.strip().lower()
            and p.documento_id.upper() not in usados
        ):
            return p.documento_id
    existentes = {p.documento_id.upper() for p in previos} | usados
    n = 1
    while f"{base}{n}" in existentes:
        n += 1
    return f"{base}{n}"


def normalizar_identificacion(
    session: Session,
    tipo_documento: str | None,
    documento_id: str | None,
    edad: int,
    nombre: str,
    apellido: str,
    doc_representante: str,
    usados_en_lote: set[str] | None = None
) -> tuple[str, str]:
    """Valida el tipo de documento y devuelve (tipo_documento, documento_id) listos para guardar."""
    tipo = (tipo_documento or "Cédula").strip()
    if tipo not in TIPOS_DOCUMENTO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de documento inválido '{tipo}'. Use: Cédula, Pasaporte o Sin Documento."
        )
    doc = (documento_id or "").strip()

    if tipo == "Sin Documento":
        if int(edad) > EDAD_MAXIMA_SIN_DOCUMENTO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{nombre} {apellido} tiene {edad} años: solo los menores de edad pueden viajar sin documento. Registre su Cédula o Pasaporte."
            )
        if es_documento_menor_generado(doc):
            return tipo, doc.upper()
        return tipo, resolver_documento_menor(session, doc_representante, nombre, apellido, usados_en_lote)

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Debe indicar el número de {tipo.lower()} de {nombre} {apellido}."
        )
    if es_documento_menor_generado(doc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El prefijo 'MENOR-' está reservado para menores sin documento."
        )
    return tipo, doc.upper() if tipo == "Pasaporte" else doc


def obtener_precio_unitario_viaje(session: Session, viaje: Viaje) -> Decimal:
    if viaje.id_paquete:
        paquete = session.get(Paquete, viaje.id_paquete)
        if paquete:
            return Decimal(str(paquete.precio_paquete))
    destino = session.get(Destino, viaje.id_destino)
    if destino:
        return Decimal(str(destino.precio_base))
    return Decimal("0.00")


def calcular_precio_integrante(precio_unitario: Decimal, edad: int) -> Decimal:
    """
    Regla de tarifas por edad:
    - Menor de 3 años (0 a 2 años): No paga ($0.00 - Exonerado 100%).
    - Menor de 13 años (3 a 12 años): Descuento del 25% (paga el 75%).
    - De 13 años en adelante: Paga tarifa completa (100%).
    """
    edad_num = int(edad or 0)
    if edad_num < 3:
        return Decimal("0.00")
    if edad_num < 13:
        return (precio_unitario * Decimal("0.75")).quantize(Decimal("0.01"))
    return precio_unitario.quantize(Decimal("0.01"))


def calcular_abono_minimo_por_edades(edades: list[int]) -> Decimal:
    """Los infantes menores de 3 años no pagan, por lo que no suman al abono mínimo de $30."""
    pagantes = sum(1 for e in edades if int(e or 0) >= 3)
    return (ABONO_MINIMO_POR_INTEGRANTE * max(pagantes, 1)).quantize(Decimal("0.01"))


def capacidad_maxima_viaje(viaje: Viaje) -> int:
    asientos_unidad = 150 if viaje.metodo_transporte == "Avión" else 60
    return asientos_unidad * max(viaje.cantidad_unidades or 1, 1)


def obtener_asientos_ocupados_viaje(
    session: Session,
    id_viaje: int,
    excluir_id_integrante: int | None = None
) -> dict[int, Integrante]:
    stmt = (
        select(Integrante)
        .join(Reserva, Reserva.id_reserva == Integrante.id_reserva)
        .where(Reserva.id_viaje == id_viaje)
        .where(Reserva.is_active == True)
        .where(Integrante.is_active == True)
    )
    if excluir_id_integrante is not None:
        stmt = stmt.where(Integrante.id_integrante != excluir_id_integrante)
    ocupados: dict[int, Integrante] = {}
    for integ in session.exec(stmt).all():
        if integ.numero_asiento:
            ocupados[integ.numero_asiento] = integ
    return ocupados


def recalcular_totales_reserva(session: Session, reserva: Reserva) -> Reserva:
    viaje = session.get(Viaje, reserva.id_viaje)
    precio_unitario = obtener_precio_unitario_viaje(session, viaje) if viaje else Decimal("0.00")

    integrantes_activos = session.exec(
        select(Integrante)
        .where(Integrante.id_reserva == reserva.id_reserva)
        .where(Integrante.is_active == True)
    ).all()
    if integrantes_activos:
        reserva.monto_total = sum(
            (calcular_precio_integrante(precio_unitario, i.edad) for i in integrantes_activos),
            Decimal("0.00")
        ).quantize(Decimal("0.01"))
        abono_minimo = calcular_abono_minimo_por_edades([i.edad for i in integrantes_activos])
    else:
        reserva.monto_total = precio_unitario.quantize(Decimal("0.01"))
        abono_minimo = ABONO_MINIMO_POR_INTEGRANTE

    pagos_activos = session.exec(
        select(Pago)
        .where(Pago.id_reserva == reserva.id_reserva)
        .where(Pago.is_active == True)
    ).all()
    total_pagado = sum((Decimal(str(p.monto)) for p in pagos_activos), Decimal("0.00"))

    if reserva.monto_total > 0 and total_pagado >= reserva.monto_total:
        reserva.estatus_pago = "Pagado"
    elif total_pagado >= abono_minimo:
        reserva.estatus_pago = "Abonado"
    else:
        reserva.estatus_pago = "Pendiente"
        reserva.is_active = False

    session.add(reserva)
    session.commit()
    session.refresh(reserva)
    sincronizar_ganancia_viaje(session, reserva.id_viaje)
    return reserva


def crear_reserva(session: Session, datos: ReservaCreate) -> Reserva:
    cliente = session.get(Cliente, datos.id_cliente)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Cliente inexistente."
        )
    if not cliente.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error 400 (Bad Request): El cliente se encuentra inactivo y no puede realizar reservas."
        )

    viaje = session.get(Viaje, datos.id_viaje)
    if not viaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Viaje inexistente."
        )
    if not viaje.is_active or viaje.estatus in ("Cancelado", "Finalizado"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pueden crear reservas nuevas en este viaje porque su estado es '{viaje.estatus}'."
        )

    if not datos.integrantes or len(datos.integrantes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes registrar al menos 1 integrante (viajero) en la reserva."
        )

    # Validar que el cliente titular que realiza la reservación NO sea menor de edad (< 18 años)
    from sqlmodel import func
    doc_titular_limpio = datos.id_cliente.strip().lower()

    # Normalizar identificación de cada viajero (Cédula / Pasaporte / Menor sin documento)
    usados_lote: set[str] = set()
    for item in datos.integrantes:
        tipo_norm, doc_norm = normalizar_identificacion(
            session,
            item.tipo_documento,
            item.documento_id,
            item.edad,
            item.nombre,
            item.apellido,
            doc_representante=datos.id_cliente,
            usados_en_lote=usados_lote
        )
        if doc_norm.upper() in usados_lote:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El documento '{doc_norm}' está repetido en la lista de viajeros de esta reserva."
            )
        usados_lote.add(doc_norm.upper())
        item.tipo_documento = tipo_norm
        item.documento_id = doc_norm

    # Validar que ningún integrante use una cédula/pasaporte de otra persona con distinto nombre (antes de guardar nada)
    for item in datos.integrantes:
        if es_documento_menor_generado(item.documento_id):
            continue
        doc_limpio = item.documento_id.strip().lower()
        cli_doc = session.exec(select(Cliente).where(func.lower(Cliente.id_cliente) == doc_limpio)).first()
        if cli_doc and (
            cli_doc.nombre.strip().lower() != item.nombre.strip().lower()
            or cli_doc.apellido.strip().lower() != item.apellido.strip().lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El documento '{item.documento_id}' pertenece a '{cli_doc.nombre} {cli_doc.apellido}', no puede registrarse con otro nombre."
            )
        int_doc = session.exec(select(Integrante).where(func.lower(Integrante.documento_id) == doc_limpio)).first()
        if int_doc and (
            int_doc.nombre.strip().lower() != item.nombre.strip().lower()
            or int_doc.apellido.strip().lower() != item.apellido.strip().lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El documento '{item.documento_id}' ya está registrado a nombre de '{int_doc.nombre} {int_doc.apellido}'."
            )

    for item in datos.integrantes:
        if item.documento_id.strip().lower() == doc_titular_limpio and item.edad < 18:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El cliente titular que realiza la reservación no puede ser menor de edad (debe tener mínimo 18 años)."
            )

    int_titular_previo = session.exec(
        select(Integrante)
        .where(func.lower(Integrante.documento_id) == doc_titular_limpio)
        .where(Integrante.edad < 18)
    ).first()
    if int_titular_previo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El cliente '{datos.id_cliente}' está registrado con {int_titular_previo.edad} años. Un menor de edad no puede ser titular de una reservación."
        )

    cantidad_integrantes = len(datos.integrantes)
    if viaje.cupos_disponibles < cantidad_integrantes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cupos insuficientes. Solo quedan {viaje.cupos_disponibles} cupo(s) disponibles en este viaje."
        )

    precio_unitario = obtener_precio_unitario_viaje(session, viaje)
    monto_total_calculado = sum(
        (calcular_precio_integrante(precio_unitario, item.edad) for item in datos.integrantes),
        Decimal("0.00")
    ).quantize(Decimal("0.01"))
    abono_minimo_requerido = calcular_abono_minimo_por_edades([item.edad for item in datos.integrantes])

    abono = Decimal(str(datos.monto_abono)) if datos.monto_abono is not None else Decimal("0.00")
    if abono < abono_minimo_requerido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Para apartar esta reserva se exige un abono mínimo de "
                f"${abono_minimo_requerido:.2f} ($30.00 por cada pasajero de 3 años o más)."
            )
        )

    if abono > monto_total_calculado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El monto abonado (${abono:.2f}) no puede superar el monto total del viaje (${monto_total_calculado:.2f})."
        )

    estatus_pago = "Pagado" if abono >= monto_total_calculado else "Abonado"

    nueva_reserva = Reserva(
        id_cliente=datos.id_cliente,
        id_viaje=datos.id_viaje,
        monto_total=monto_total_calculado,
        estatus_pago=estatus_pago
    )
    session.add(nueva_reserva)
    session.commit()
    session.refresh(nueva_reserva)

    # Validar y asignar asientos en el mapa del viaje (Bus Cama 60 / Avión 150)
    cap_max = capacidad_maxima_viaje(viaje)
    asientos_ocupados = obtener_asientos_ocupados_viaje(session, viaje.id_viaje)
    asientos_en_reserva: set[int] = set()

    for item in datos.integrantes:
        if item.numero_asiento is not None:
            if item.numero_asiento < 1 or item.numero_asiento > cap_max:
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El puesto #{item.numero_asiento} no existe en este viaje (capacidad: {cap_max} asientos)."
                )
            if item.numero_asiento in asientos_ocupados:
                ocup = asientos_ocupados[item.numero_asiento]
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El puesto #{item.numero_asiento} ya está ocupado por {ocup.nombre} {ocup.apellido} (Reserva #{ocup.id_reserva})."
                )
            if item.numero_asiento in asientos_en_reserva:
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No puedes asignar el mismo puesto (#{item.numero_asiento}) a dos pasajeros de la misma reserva."
                )
            asientos_en_reserva.add(item.numero_asiento)

    sig_asiento = 1
    # Registrar integrantes de la reserva
    for item in datos.integrantes:
        puesto = item.numero_asiento
        if puesto is None:
            while sig_asiento in asientos_ocupados or sig_asiento in asientos_en_reserva:
                sig_asiento += 1
            puesto = sig_asiento
            asientos_en_reserva.add(puesto)

        integrante = Integrante(
            id_reserva=nueva_reserva.id_reserva,
            nombre=item.nombre,
            apellido=item.apellido,
            documento_id=item.documento_id,
            tipo_documento=item.tipo_documento or "Cédula",
            edad=item.edad,
            numero_asiento=puesto
        )
        session.add(integrante)

    # Registrar pago del abono inicial
    pago_inicial = Pago(
        id_reserva=nueva_reserva.id_reserva,
        monto=abono,
        metodo_pago=datos.metodo_pago or "Transferencia",
        referencia=datos.referencia or f"ABONO-RES-{nueva_reserva.id_reserva}"
    )
    session.add(pago_inicial)

    # Descontar cupos del viaje
    viaje.cupos_disponibles -= cantidad_integrantes
    session.add(viaje)

    session.commit()
    session.refresh(nueva_reserva)
    sincronizar_ganancia_viaje(session, nueva_reserva.id_viaje)
    registrar_auditoria(
        session,
        "reservas",
        "INSERT",
        f"Nueva Reserva #{nueva_reserva.id_reserva} — Cliente {nueva_reserva.id_cliente}, Viaje #{nueva_reserva.id_viaje} ({cantidad_integrantes} viajero(s), Total ${nueva_reserva.monto_total}, Abono ${abono:.2f})"
    )
    return nueva_reserva


def cumple_abono_minimo(session: Session, reserva: Reserva) -> bool:
    if not reserva.is_active:
        return True
    integrantes_activos = session.exec(
        select(Integrante)
        .where(Integrante.id_reserva == reserva.id_reserva)
        .where(Integrante.is_active == True)
    ).all()
    abono_minimo = calcular_abono_minimo_por_edades([i.edad for i in integrantes_activos])

    pagos_activos = session.exec(
        select(Pago)
        .where(Pago.id_reserva == reserva.id_reserva)
        .where(Pago.is_active == True)
    ).all()
    total_pagado = sum((Decimal(str(p.monto)) for p in pagos_activos), Decimal("0.00"))
    return total_pagado >= abono_minimo


def obtener_reservas(session: Session) -> list[Reserva]:
    todas = session.exec(select(Reserva)).all()
    return [r for r in todas if cumple_abono_minimo(session, r)]


def obtener_reserva_por_id(session: Session, id_reserva: int) -> Reserva:
    reserva = session.get(Reserva, id_reserva)
    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Reserva inexistente."
        )
    return reserva


def reemplazar_reserva(session: Session, id_reserva: int, datos: ReservaPut) -> Reserva:
    reserva = obtener_reserva_por_id(session, id_reserva)

    if not session.get(Cliente, datos.id_cliente):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error 404 (Not Found): Cliente inexistente.")
    if not session.get(Viaje, datos.id_viaje):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error 404 (Not Found): Viaje inexistente.")

    reserva.id_cliente = datos.id_cliente
    reserva.id_viaje = datos.id_viaje
    reserva.monto_total = datos.monto_total
    reserva.estatus_pago = datos.estatus_pago
    reserva.is_active = datos.is_active

    session.add(reserva)
    session.commit()
    session.refresh(reserva)
    return reserva


def actualizar_reserva(session: Session, id_reserva: int, datos: ReservaUpdate) -> Reserva:
    reserva = obtener_reserva_por_id(session, id_reserva)
    datos_dict = datos.model_dump(exclude_unset=True)

    if "id_cliente" in datos_dict and not session.get(Cliente, datos_dict["id_cliente"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error 404 (Not Found): Cliente inexistente.")
    if "id_viaje" in datos_dict and not session.get(Viaje, datos_dict["id_viaje"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error 404 (Not Found): Viaje inexistente.")

    estaba_activa = reserva.is_active
    nuevo_estado = datos_dict.get("is_active", estaba_activa)
    viaje_anterior_id = reserva.id_viaje
    nuevo_viaje_id = datos_dict.get("id_viaje", viaje_anterior_id)

    integrantes_activos = session.exec(
        select(Integrante)
        .where(Integrante.id_reserva == reserva.id_reserva)
        .where(Integrante.is_active == True)
    ).all()
    cant_ints = len(integrantes_activos)

    if estaba_activa and nuevo_viaje_id != viaje_anterior_id:
        viaje_ant = session.get(Viaje, viaje_anterior_id)
        viaje_nvo = session.get(Viaje, nuevo_viaje_id)
        if viaje_nvo and viaje_nvo.cupos_disponibles < cant_ints:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay cupos suficientes en el nuevo viaje seleccionado."
            )
        if viaje_ant:
            viaje_ant.cupos_disponibles += cant_ints
            session.add(viaje_ant)
        if viaje_nvo:
            viaje_nvo.cupos_disponibles -= cant_ints
            session.add(viaje_nvo)

    for key, value in datos_dict.items():
        setattr(reserva, key, value)

    if not estaba_activa and nuevo_estado is True:
        viaje = session.get(Viaje, reserva.id_viaje)
        if viaje:
            if viaje.cupos_disponibles < cant_ints:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No hay cupos suficientes en el viaje para restaurar esta reserva."
                )
            viaje.cupos_disponibles -= cant_ints
            session.add(viaje)

    session.add(reserva)
    session.commit()
    session.refresh(reserva)
    if "id_viaje" in datos_dict or "is_active" in datos_dict:
        recalcular_totales_reserva(session, reserva)
    if nuevo_viaje_id != viaje_anterior_id:
        sincronizar_ganancia_viaje(session, viaje_anterior_id)
    registrar_auditoria(
        session,
        "reservas",
        "UPDATE",
        f"Actualización de Reserva #{reserva.id_reserva} (Viaje #{reserva.id_viaje}, Activa: {reserva.is_active})"
    )
    return reserva


def desactivar_reserva(session: Session, id_reserva: int) -> Reserva:
    reserva = obtener_reserva_por_id(session, id_reserva)
    if reserva.is_active:
        reserva.is_active = False
        viaje = session.get(Viaje, reserva.id_viaje)
        if viaje:
            integrantes_activos = session.exec(
                select(Integrante)
                .where(Integrante.id_reserva == reserva.id_reserva)
                .where(Integrante.is_active == True)
            ).all()
            viaje.cupos_disponibles += len(integrantes_activos)
            session.add(viaje)

    session.add(reserva)
    session.commit()
    session.refresh(reserva)
    sincronizar_ganancia_viaje(session, reserva.id_viaje)
    registrar_auditoria(
        session,
        "reservas",
        "DELETE",
        f"Baja lógica de Reserva #{reserva.id_reserva} (Viaje #{reserva.id_viaje})"
    )
    return reserva
