from datetime import date
from sqlmodel import Session, select, func
from modelos.modelos import (
    Cliente, Destino, Paquete, Viaje, Reserva, Pago,
    Integrante, CostoViaje, Inconveniente, Ganancia
)


def _a_float(valor) -> float:
    return float(valor) if valor is not None else 0.0


def obtener_kpis(session: Session) -> dict:
    total_clientes = session.exec(select(func.count(Cliente.id_cliente)).where(Cliente.is_active == True)).one()
    total_reservas = session.exec(select(func.count(Reserva.id_reserva)).where(Reserva.is_active == True)).one()
    total_viajes = session.exec(select(func.count(Viaje.id_viaje)).where(Viaje.is_active == True)).one()
    total_destinos = session.exec(select(func.count(Destino.id_destino)).where(Destino.is_active == True)).one()
    total_viajeros = session.exec(select(func.count(Integrante.id_integrante)).where(Integrante.is_active == True)).one()

    ingresos = session.exec(select(func.sum(Pago.monto)).where(Pago.is_active == True)).one()
    ventas = session.exec(select(func.sum(Reserva.monto_total)).where(Reserva.is_active == True)).one()
    ticket_promedio = session.exec(select(func.avg(Reserva.monto_total)).where(Reserva.is_active == True)).one()
    costos = session.exec(select(func.sum(CostoViaje.monto)).where(CostoViaje.is_active == True)).one()
    inconvenientes = session.exec(select(func.sum(Inconveniente.monto_descontado)).where(Inconveniente.is_active == True)).one()

    ventas_f = _a_float(ventas)
    ingresos_f = _a_float(ingresos)

    return {
        "total_clientes": total_clientes,
        "total_reservas": total_reservas,
        "total_viajes": total_viajes,
        "total_destinos": total_destinos,
        "total_viajeros": total_viajeros,
        "ventas_totales": ventas_f,
        "ingresos_cobrados": ingresos_f,
        "por_cobrar": max(ventas_f - ingresos_f, 0),
        "ticket_promedio": round(_a_float(ticket_promedio), 2),
        "costos_totales": _a_float(costos),
        "inconvenientes_totales": _a_float(inconvenientes),
        "ganancia_estimada": round(ingresos_f - _a_float(costos) - _a_float(inconvenientes), 2),
    }


def obtener_top_destinos(session: Session, limite: int = 5) -> list[dict]:
    consulta = (
        select(
            Destino.nombre_destino,
            func.count(Reserva.id_reserva),
            func.sum(Reserva.monto_total)
        )
        .join(Viaje, Viaje.id_destino == Destino.id_destino)
        .join(Reserva, Reserva.id_viaje == Viaje.id_viaje)
        .where(Reserva.is_active == True)
        .group_by(Destino.nombre_destino)
        .order_by(func.count(Reserva.id_reserva).desc())
        .limit(limite)
    )
    return [
        {"nombre": nombre, "reservas": cantidad, "ventas": _a_float(monto)}
        for nombre, cantidad, monto in session.exec(consulta).all()
    ]


def obtener_top_paquetes(session: Session, limite: int = 5) -> list[dict]:
    consulta = (
        select(
            Paquete.nombre_paquete,
            func.count(Reserva.id_reserva),
            func.sum(Reserva.monto_total)
        )
        .join(Viaje, Viaje.id_paquete == Paquete.id_paquete)
        .join(Reserva, Reserva.id_viaje == Viaje.id_viaje)
        .where(Reserva.is_active == True)
        .group_by(Paquete.nombre_paquete)
        .order_by(func.count(Reserva.id_reserva).desc())
        .limit(limite)
    )
    return [
        {"nombre": nombre, "reservas": cantidad, "ventas": _a_float(monto)}
        for nombre, cantidad, monto in session.exec(consulta).all()
    ]


def obtener_viaje_mas_vendido(session: Session) -> dict | None:
    consulta = (
        select(
            Viaje.id_viaje,
            Destino.nombre_destino,
            Viaje.fecha_salida,
            func.count(Reserva.id_reserva),
            func.sum(Reserva.monto_total)
        )
        .join(Destino, Destino.id_destino == Viaje.id_destino)
        .join(Reserva, Reserva.id_viaje == Viaje.id_viaje)
        .where(Reserva.is_active == True)
        .group_by(Viaje.id_viaje, Destino.nombre_destino, Viaje.fecha_salida)
        .order_by(func.count(Reserva.id_reserva).desc())
        .limit(1)
    )
    fila = session.exec(consulta).first()
    if not fila:
        return None
    id_viaje, destino, fecha_salida, cantidad, monto = fila
    return {
        "id_viaje": id_viaje,
        "destino": destino,
        "fecha_salida": str(fecha_salida),
        "reservas": cantidad,
        "ventas": _a_float(monto),
    }


def obtener_ingresos_por_mes(session: Session) -> list[dict]:
    mes = func.to_char(Pago.fecha_pago, "YYYY-MM")
    consulta = (
        select(mes, func.sum(Pago.monto), func.count(Pago.id_pago))
        .where(Pago.is_active == True)
        .group_by(mes)
        .order_by(mes)
    )
    return [
        {"mes": m, "ingresos": _a_float(total), "pagos": cantidad}
        for m, total, cantidad in session.exec(consulta).all()
    ]


def obtener_reservas_por_mes(session: Session) -> list[dict]:
    mes = func.to_char(Reserva.fecha_reserva, "YYYY-MM")
    consulta = (
        select(mes, func.count(Reserva.id_reserva), func.sum(Reserva.monto_total))
        .where(Reserva.is_active == True)
        .group_by(mes)
        .order_by(mes)
    )
    return [
        {"mes": m, "reservas": cantidad, "ventas": _a_float(total)}
        for m, cantidad, total in session.exec(consulta).all()
    ]


def obtener_metodos_pago(session: Session) -> list[dict]:
    consulta = (
        select(Pago.metodo_pago, func.count(Pago.id_pago), func.sum(Pago.monto))
        .where(Pago.is_active == True)
        .group_by(Pago.metodo_pago)
        .order_by(func.count(Pago.id_pago).desc())
    )
    return [
        {"metodo": metodo, "cantidad": cantidad, "monto": _a_float(total)}
        for metodo, cantidad, total in session.exec(consulta).all()
    ]


def obtener_estatus_reservas(session: Session) -> list[dict]:
    consulta = (
        select(Reserva.estatus_pago, func.count(Reserva.id_reserva))
        .where(Reserva.is_active == True)
        .group_by(Reserva.estatus_pago)
    )
    return [
        {"estatus": estatus, "cantidad": cantidad}
        for estatus, cantidad in session.exec(consulta).all()
    ]


def obtener_top_clientes(session: Session, limite: int = 5) -> list[dict]:
    consulta = (
        select(
            Cliente.id_cliente,
            Cliente.nombre,
            Cliente.apellido,
            func.count(Reserva.id_reserva),
            func.sum(Reserva.monto_total)
        )
        .join(Reserva, Reserva.id_cliente == Cliente.id_cliente)
        .where(Reserva.is_active == True)
        .group_by(Cliente.id_cliente, Cliente.nombre, Cliente.apellido)
        .order_by(func.sum(Reserva.monto_total).desc())
        .limit(limite)
    )
    return [
        {
            "id_cliente": id_cliente,
            "nombre": f"{nombre} {apellido}",
            "reservas": cantidad,
            "total_gastado": _a_float(total),
        }
        for id_cliente, nombre, apellido, cantidad, total in session.exec(consulta).all()
    ]


def obtener_ganancias_por_viaje(session: Session) -> list[dict]:
    consulta = (
        select(
            Ganancia.id_viaje,
            Destino.nombre_destino,
            Ganancia.ingresos_totales,
            Ganancia.costos_totales,
            Ganancia.inconvenientes_totales,
            Ganancia.ganancia_neta
        )
        .join(Viaje, Viaje.id_viaje == Ganancia.id_viaje)
        .join(Destino, Destino.id_destino == Viaje.id_destino)
        .where(Ganancia.is_active == True)
        .order_by(Ganancia.ganancia_neta.desc())
    )
    return [
        {
            "viaje": f"#{id_viaje} {destino}",
            "ingresos": _a_float(ing),
            "costos": _a_float(cos),
            "inconvenientes": _a_float(inc),
            "ganancia": _a_float(gan),
        }
        for id_viaje, destino, ing, cos, inc, gan in session.exec(consulta).all()
    ]


def obtener_ocupacion_viajes(session: Session) -> list[dict]:
    viajes_activos = session.exec(
        select(Viaje, Destino.nombre_destino)
        .join(Destino, Destino.id_destino == Viaje.id_destino)
        .where(Viaje.is_active == True)
        .order_by(Viaje.id_viaje)
    ).all()
    resultado = []
    for v, destino in viajes_activos:
        asientos_unidad = 150 if v.metodo_transporte == "Avión" else 60
        capacidad = asientos_unidad * max(v.cantidad_unidades or 1, 1)
        ocupados = max(capacidad - v.cupos_disponibles, 0)
        porcentaje = round((ocupados / capacidad) * 100, 1) if capacidad else 0
        resultado.append({
            "viaje": f"#{v.id_viaje} {destino} ({v.metodo_transporte})",
            "reservas": ocupados,
            "cupos_disponibles": v.cupos_disponibles,
            "capacidad_total": capacidad,
            "ocupacion": porcentaje,
        })
    return resultado


def obtener_semaforo_salidas(session: Session) -> list[dict]:
    hoy = date.today()
    viajes_activos = session.exec(
        select(Viaje, Destino.nombre_destino)
        .join(Destino, Destino.id_destino == Viaje.id_destino)
        .where(Viaje.is_active == True)
        .order_by(Viaje.fecha_salida)
    ).all()
    reservas_activas = session.exec(select(Reserva).where(Reserva.is_active == True)).all()
    pagos_activos = session.exec(select(Pago).where(Pago.is_active == True)).all()

    pagos_por_reserva: dict[int, float] = {}
    for p in pagos_activos:
        pagos_por_reserva[p.id_reserva] = pagos_por_reserva.get(p.id_reserva, 0.0) + float(p.monto)

    resultado = []
    for v, destino in viajes_activos:
        dias = (v.fecha_salida - hoy).days
        asientos_unidad = 150 if v.metodo_transporte == "Avión" else 60
        capacidad = asientos_unidad * max(v.cantidad_unidades or 1, 1)
        ocupados = max(capacidad - v.cupos_disponibles, 0)
        ocupacion = round((ocupados / capacidad) * 100, 1) if capacidad else 0

        res_viaje = [r for r in reservas_activas if r.id_viaje == v.id_viaje]
        reservas_con_deuda = 0
        saldo_pendiente_viaje = 0.0
        for r in res_viaje:
            pagado = pagos_por_reserva.get(r.id_reserva, 0.0)
            restante = max(float(r.monto_total) - pagado, 0.0)
            if restante > 0.01:
                reservas_con_deuda += 1
                saldo_pendiente_viaje += restante

        if v.estatus == "Cancelado":
            nivel = "cancelado"
            etiqueta = "Cancelado"
        elif v.estatus == "Finalizado" or v.fecha_retorno < hoy:
            nivel = "finalizado"
            etiqueta = "Finalizado"
        elif v.fecha_salida <= hoy <= v.fecha_retorno or v.estatus == "En Curso":
            nivel = "en_curso"
            etiqueta = "En curso hoy"
        elif dias <= 7:
            nivel = "urgente"
            etiqueta = "Sale hoy" if dias == 0 else f"Sale en {dias} día{'s' if dias != 1 else ''}"
        elif dias <= 21:
            nivel = "proximo"
            etiqueta = f"Sale en {dias} días"
        else:
            nivel = "holgado"
            etiqueta = f"Faltan {dias} días"

        resultado.append({
            "id_viaje": v.id_viaje,
            "destino": destino,
            "metodo_transporte": v.metodo_transporte,
            "fecha_salida": str(v.fecha_salida),
            "fecha_retorno": str(v.fecha_retorno),
            "estatus": v.estatus,
            "dias_para_salida": dias,
            "nivel": nivel,
            "etiqueta_tiempo": etiqueta,
            "ocupacion": ocupacion,
            "ocupados": ocupados,
            "capacidad": capacidad,
            "reservas_con_deuda": reservas_con_deuda,
            "saldo_pendiente": round(saldo_pendiente_viaje, 2),
        })
    return resultado


def obtener_edades_viajeros(session: Session) -> list[dict]:
    rangos = [
        ("0-12", 0, 12), ("13-17", 13, 17), ("18-30", 18, 30),
        ("31-45", 31, 45), ("46-60", 46, 60), ("60+", 61, 200)
    ]
    resultado = []
    for etiqueta, minimo, maximo in rangos:
        cantidad = session.exec(
            select(func.count(Integrante.id_integrante))
            .where(Integrante.is_active == True)
            .where(Integrante.edad >= minimo)
            .where(Integrante.edad <= maximo)
        ).one()
        resultado.append({"rango": etiqueta, "cantidad": cantidad})
    return resultado


def obtener_resumen_completo(session: Session) -> dict:
    return {
        "kpis": obtener_kpis(session),
        "viaje_mas_vendido": obtener_viaje_mas_vendido(session),
        "top_destinos": obtener_top_destinos(session),
        "top_paquetes": obtener_top_paquetes(session),
        "top_clientes": obtener_top_clientes(session),
        "ingresos_por_mes": obtener_ingresos_por_mes(session),
        "reservas_por_mes": obtener_reservas_por_mes(session),
        "metodos_pago": obtener_metodos_pago(session),
        "estatus_reservas": obtener_estatus_reservas(session),
        "ganancias_por_viaje": obtener_ganancias_por_viaje(session),
        "ocupacion_viajes": obtener_ocupacion_viajes(session),
        "semaforo_salidas": obtener_semaforo_salidas(session),
        "edades_viajeros": obtener_edades_viajeros(session),
    }
