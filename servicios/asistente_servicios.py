import os
import re
import json
from typing import Optional
from sqlmodel import Session, select
from modelos.modelos import Destino, Paquete, Viaje, Reserva, Pago, Integrante, Cliente
from servicios.estadisticas_servicios import obtener_kpis, obtener_viaje_mas_vendido, obtener_ocupacion_viajes

_API_KEY_MEMORIA: Optional[str] = None

MESES_MAP = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12
}


def configurar_api_key(api_key: str) -> None:
    global _API_KEY_MEMORIA
    _API_KEY_MEMORIA = api_key.strip() if api_key else None


def obtener_api_key_activa(api_key_request: Optional[str] = None) -> Optional[str]:
    if api_key_request and api_key_request.strip():
        return api_key_request.strip()
    if _API_KEY_MEMORIA:
        return _API_KEY_MEMORIA
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def _leer_tasas_locales() -> dict:
    try:
        ruta = os.path.join(os.path.dirname(__file__), "..", "database", "tasas_cambio.json")
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"tasa_bcv": 36.5, "tasa_cop": 4000.0}


def cotizar_por_presupuesto(
    session: Session,
    presupuesto: float,
    adultos: int = 1,
    ninos: int = 0,
    infantes: int = 0,
    filtro_texto: str = ""
) -> dict:
    """
    Analiza todos los viajes programados y paquetes activos para recomendar opciones
    reales según el presupuesto del cliente, composición familiar y fechas/destino.
    """
    adultos = max(int(adultos or 0), 1)
    ninos = max(int(ninos or 0), 0)
    infantes = max(int(infantes or 0), 0)
    total_pasajeros = adultos + ninos + infantes
    pagantes = adultos + ninos
    abono_minimo_grupo = round(30.0 * max(pagantes, 1), 2)

    tasas = _leer_tasas_locales()
    tasa_bcv = float(tasas.get("tasa_bcv") or 36.5)
    tasa_cop = float(tasas.get("tasa_cop") or 4000.0)

    destinos = {d.id_destino: d for d in session.exec(select(Destino).where(Destino.is_active == True)).all()}
    paquetes = {p.id_paquete: p for p in session.exec(select(Paquete).where(Paquete.is_active == True)).all()}
    viajes = session.exec(
        select(Viaje)
        .where(Viaje.is_active == True, Viaje.estatus == "Programado")
        .order_by(Viaje.fecha_salida)
    ).all()

    filtro_q = (filtro_texto or "").lower().strip()
    mes_filtrado = None
    for nombre_mes, num_mes in MESES_MAP.items():
        if nombre_mes in filtro_q:
            mes_filtrado = num_mes
            break

    opciones_completas = []
    opciones_con_abono = []
    todas_opciones = []

    for v in viajes:
        if (v.cupos_disponibles or 0) < total_pasajeros:
            continue

        dest = destinos.get(v.id_destino)
        paq = paquetes.get(v.id_paquete) if v.id_paquete else None
        if not dest:
            continue

        # Filtro opcional por mes o por nombre de destino
        if mes_filtrado and v.fecha_salida.month != mes_filtrado:
            continue
        if filtro_q and not mes_filtrado:
            texto_viaje = f"{dest.nombre_destino} {paq.nombre_paquete if paq else ''} {v.fecha_salida} {v.metodo_transporte}".lower()
            # Si el usuario especificó un destino concreto que no coincide, omitir
            palabras_destino = [d.nombre_destino.lower() for d in destinos.values() if d.nombre_destino.lower() in filtro_q]
            if palabras_destino and not any(pd in texto_viaje for pd in palabras_destino):
                continue

        precio_unitario = float(paq.precio_paquete) if paq else float(dest.precio_base)
        costo_adultos = round(adultos * precio_unitario, 2)
        costo_ninos = round(ninos * (precio_unitario * 0.75), 2)
        costo_total_grupo = round(costo_adultos + costo_ninos, 2)
        diferencia = round(presupuesto - costo_total_grupo, 2)
        resta_por_pagar = round(max(costo_total_grupo - presupuesto, 0.0), 2)

        item = {
            "id_viaje": v.id_viaje,
            "destino": dest.nombre_destino,
            "paquete": paq.nombre_paquete if paq else "Tarifa Base Directa",
            "duracion": f"{paq.duracion_dias} días / {paq.duracion_noches} noches" if paq else "Según itinerario",
            "incluye": paq.incluye if paq and paq.incluye else dest.descripcion or "Transporte y logística base",
            "fecha_salida": str(v.fecha_salida),
            "fecha_retorno": str(v.fecha_retorno),
            "metodo_transporte": v.metodo_transporte,
            "cupos_disponibles": v.cupos_disponibles,
            "precio_unitario": precio_unitario,
            "costo_total_grupo": costo_total_grupo,
            "costo_total_bs": round(costo_total_grupo * tasa_bcv, 2),
            "costo_total_cop": round(costo_total_grupo * tasa_cop, 0),
            "abono_minimo_grupo": abono_minimo_grupo,
            "sobrante": diferencia if diferencia >= 0 else 0.0,
            "falta_para_total": resta_por_pagar,
            "alcanza_completo": presupuesto >= costo_total_grupo,
            "alcanza_abono": presupuesto >= abono_minimo_grupo
        }

        todas_opciones.append(item)
        if presupuesto >= costo_total_grupo:
            opciones_completas.append(item)
        elif presupuesto >= abono_minimo_grupo:
            opciones_con_abono.append(item)

    opciones_completas.sort(key=lambda x: x["costo_total_grupo"])
    opciones_con_abono.sort(key=lambda x: x["costo_total_grupo"])
    todas_opciones.sort(key=lambda x: x["costo_total_grupo"])

    return {
        "presupuesto": round(presupuesto, 2),
        "presupuesto_bs": round(presupuesto * tasa_bcv, 2),
        "presupuesto_cop": round(presupuesto * tasa_cop, 0),
        "pasajeros": {
            "adultos": adultos,
            "ninos": ninos,
            "infantes": infantes,
            "total": total_pasajeros
        },
        "abono_minimo_requerido": abono_minimo_grupo,
        "opciones_completas": opciones_completas,
        "opciones_con_abono": opciones_con_abono,
        "todas_opciones": todas_opciones[:6]
    }


def obtener_recomendaciones_sistema(session: Session) -> list[dict]:
    """Genera recomendaciones estratégicas y operativas en tiempo real analizando la base de datos."""
    kpis = obtener_kpis(session)
    top_viaje = obtener_viaje_mas_vendido(session)
    ocupaciones = obtener_ocupacion_viajes(session)
    viajes_prog = session.exec(
        select(Viaje, Destino.nombre_destino)
        .join(Destino, Destino.id_destino == Viaje.id_destino)
        .where(Viaje.is_active == True, Viaje.estatus == "Programado")
        .order_by(Viaje.fecha_salida)
    ).all()

    recomendaciones = []

    if kpis["por_cobrar"] > 0:
        reservas_abonadas = session.exec(
            select(Reserva).where(Reserva.is_active == True, Reserva.estatus_pago == "Abonado")
        ).all()
        recomendaciones.append({
            "categoria": "Finanzas y Cobranza",
            "titulo": f"Recuperar ${kpis['por_cobrar']:,.2f} en saldos pendientes",
            "detalle": (
                f"Tienes {len(reservas_abonadas)} reserva(s) en estado 'Abonado'. "
                f"En el módulo de Reservas puedes filtrar por 'Con Saldo Pendiente' y liquidarlas en 1 clic."
            ),
            "accion_sugerida": "Ir a Reservas → Con Saldo Pendiente",
            "seccion_destino": "reservas"
        })

    altos = [o for o in ocupaciones if o["ocupacion"] >= 45]
    if altos:
        mejor = max(altos, key=lambda x: x["ocupacion"])
        recomendaciones.append({
            "categoria": "Optimización de Flota",
            "titulo": f"Alta demanda en {mejor['viaje']} ({mejor['ocupacion']}% ocupado)",
            "detalle": (
                f"Quedan {mejor['cupos_disponibles']} cupos de {mejor['capacidad_total']}. "
                f"Si la demanda sigue subiendo, puedes editar el viaje en 'Viajes Programados' y aumentar la cantidad de unidades."
            ),
            "accion_sugerida": "Ver Viajes Programados",
            "seccion_destino": "viajes"
        })

    bajos = [o for o in ocupaciones if o["ocupacion"] < 30]
    if bajos:
        bajo = min(bajos, key=lambda x: x["ocupacion"])
        recomendaciones.append({
            "categoria": "Impulso Comercial",
            "titulo": f"Promocionar salida {bajo['viaje']} ({bajo['ocupacion']}% de ocupación)",
            "detalle": (
                f"Esta salida tiene {bajo['cupos_disponibles']} asientos libres. "
                f"Recuerda a los clientes que pueden apartar su cupo hoy con solo $30.00 por persona."
            ),
            "accion_sugerida": "Cotizar este viaje a clientes",
            "seccion_destino": "clientes"
        })

    if top_viaje:
        recomendaciones.append({
            "categoria": "Destino Estrella",
            "titulo": f"{top_viaje['destino']} lidera las ventas (${top_viaje['ventas']:,.2f})",
            "detalle": (
                f"El Viaje #{top_viaje['id_viaje']} acumula {top_viaje['reservas']} reservas activas. "
                f"Se recomienda programar una nueva salida hacia {top_viaje['destino']}."
            ),
            "accion_sugerida": "Programar nueva fecha en Viajes",
            "seccion_destino": "viajes"
        })

    if viajes_prog:
        prox_v, prox_dest = viajes_prog[0]
        recomendaciones.append({
            "categoria": "Logística Operativa",
            "titulo": f"Próxima salida: Viaje #{prox_v.id_viaje} a {prox_dest} ({prox_v.fecha_salida})",
            "detalle": (
                f"Transporte: {prox_v.cantidad_unidades} {prox_v.metodo_transporte} ({prox_v.cupos_disponibles} cupos libres). "
                f"Verifica la lista de pasajeros en 'Manifiesto de Abordaje'."
            ),
            "accion_sugerida": "Abrir Manifiesto de Abordaje",
            "seccion_destino": "integrantes"
        })

    return recomendaciones


def _extraer_parametros_cotizacion(mensaje: str) -> Optional[dict]:
    """
    Detecta si el mensaje del usuario contiene una consulta de presupuesto, precio o cotización
    y extrae automáticamente monto, adultos, niños e infantes.
    """
    q = mensaje.lower()

    # Detectar número de adultos / personas / pareja
    adultos = 1
    ninos = 0
    infantes = 0

    if "pareja" in q or "dos personas" in q:
        adultos = 2

    m_adultos = re.search(r"(\d+)\s*(?:adulto|adultos|persona|personas|pasajero|pasajeros|viajero|viajeros)", q)
    if m_adultos:
        adultos = max(int(m_adultos.group(1)), 1)

    m_ninos = re.search(r"(\d+)\s*(?:niño|niños|nino|ninos|menor|menores|hijo|hijos)", q)
    if m_ninos:
        ninos = int(m_ninos.group(1))
    elif any(w in q for w in ["un niño", "una niña", "1 niño", "con niño"]):
        ninos = 1

    m_infantes = re.search(r"(\d+)\s*(?:bebe|bebé|bebes|bebés|infante|infantes)", q)
    if m_infantes:
        infantes = int(m_infantes.group(1))
    elif any(w in q for w in ["un bebe", "un bebé"]):
        infantes = 1

    # Detectar monto de presupuesto ($300, 300$, 300 dolares, presupuesto de 300, tiene 250, etc.)
    patrones_monto = [
        r"\$\s*(\d+(?:[\.,]\d+)?)",
        r"(\d+(?:[\.,]\d+)?)\s*(?:\$|usd|dolar|dólar|dolares|dólares|verdes)",
        r"(?:presupuesto|cuenta con|tiene|dispone|hasta|menos de|maximo|máximo|por)\s*(?:de\s*)?\$?\s*(\d+(?:[\.,]\d+)?)",
    ]

    monto = None
    for pat in patrones_monto:
        m = re.search(pat, q)
        if m:
            val = float(m.group(1).replace(",", "."))
            if val >= 20:  # Evitar confundir '2 personas' con $2
                monto = val
                break

    # Si el usuario escribió solo un número como "300" o "450"
    if monto is None and re.fullmatch(r"\$?\s*\d+(?:[\.,]\d+)?\s*\$?", q.strip()):
        val = float(re.sub(r"[^\d\.]", "", q.replace(",", ".")))
        if val >= 30:
            monto = val

    if monto is not None:
        return {
            "presupuesto": monto,
            "adultos": adultos,
            "ninos": ninos,
            "infantes": infantes,
            "filtro_texto": q
        }
    return None


def _formatear_respuesta_cotizacion(res: dict) -> str:
    p = res["presupuesto"]
    pax = res["pasajeros"]
    desc_grupo = f"**{pax['adultos']} adulto(s)**"
    if pax["ninos"] > 0:
        desc_grupo += f" + **{pax['ninos']} niño(s) (3-12 años, -25%)**"
    if pax["infantes"] > 0:
        desc_grupo += f" + **{pax['infantes']} infante(s) (<3 años, Gratis)**"

    lineas = [
        f"### 💰 Propuesta de Viajes para Presupuesto de **${p:,.2f} USD**\n",
        f"👥 **Grupo cotizado:** {desc_grupo} ({pax['total']} viajero/s en total)",
        f"💱 **Equivalente:** Bs. {res['presupuesto_bs']:,.2f} (BCV) · ${res['presupuesto_cop']:,.0f} COP\n"
    ]

    completas = res["opciones_completas"]
    con_abono = res["opciones_con_abono"]

    if completas:
        lineas.append(f"#### ✅ Opción 1: Viajes que cubre 100% de contado ({len(completas)} disponibles)\n")
        for op in completas[:5]:
            icono = "✈️" if op["metodo_transporte"] == "Avión" else "🚌"
            sobra_txt = f"*(Le sobran **${op['sobrante']:,.2f}**)*" if op["sobrante"] > 0 else "*(Presupuesto exacto)*"
            lineas.append(
                f"- **{op['destino']} — {op['paquete']}** (Viaje #{op['id_viaje']})\n"
                f"  - 📅 **Fechas:** Salida `{op['fecha_salida']}` al `{op['fecha_retorno']}` ({op['duracion']})\n"
                f"  - {icono} **Transporte:** {op['metodo_transporte']} ({op['cupos_disponibles']} asientos libres)\n"
                f"  - 💵 **Costo Total para su grupo:** **${op['costo_total_grupo']:,.2f}** (${op['precio_unitario']:,.2f}/adulto) {sobra_txt}\n"
                f"  - 🎁 **Incluye:** {op['incluye']}"
            )
    else:
        lineas.append(
            f"⚠️ *Ningún paquete cubre el 100% de contado con ${p:,.2f} para {pax['total']} persona(s), "
            f"pero revisa las opciones que puede apartar hoy mismo:*\n"
        )

    if con_abono:
        lineas.append(f"\n#### 📌 Opción 2: Viajes que puede APARTAR HOY (Abono mínimo: ${res['abono_minimo_requerido']:,.2f})\n")
        for op in con_abono[:4]:
            icono = "✈️" if op["metodo_transporte"] == "Avión" else "🚌"
            lineas.append(
                f"- **{op['destino']} — {op['paquete']}** (Viaje #{op['id_viaje']} · Salida `{op['fecha_salida']}`)\n"
                f"  - 💵 **Total Grupo:** ${op['costo_total_grupo']:,.2f} · **Si abona hoy ${p:,.2f}**, solo le restan **${op['falta_para_total']:,.2f}** por pagar antes del viaje ({op['cupos_disponibles']} cupos libres)."
            )

    if not completas and not con_abono:
        mas_economico = res["todas_opciones"][0] if res["todas_opciones"] else None
        lineas.append(
            f"❌ El abono mínimo para {pax['adultos'] + pax['ninos']} pasajero(s) pagante(s) es de **${res['abono_minimo_requerido']:,.2f}** ($30 c/u)."
        )
        if mas_economico:
            lineas.append(
                f"\n💡 **Sugerencia:** La opción más económica programada es **{mas_economico['destino']} ({mas_economico['paquete']})** "
                f"con salida el `{mas_economico['fecha_salida']}` por **${mas_economico['costo_total_grupo']:,.2f}** en total."
            )

    return "\n".join(lineas)


def construir_contexto_sistema(session: Session) -> str:
    """Construye el resumen actualizado de la base de datos y las reglas del sistema."""
    kpis = obtener_kpis(session)
    top_viaje = obtener_viaje_mas_vendido(session)
    destinos = session.exec(select(Destino).where(Destino.is_active == True)).all()
    paquetes = session.exec(select(Paquete).where(Paquete.is_active == True)).all()
    viajes = session.exec(select(Viaje).where(Viaje.is_active == True).order_by(Viaje.fecha_salida)).all()

    mapa_dest = {d.id_destino: d.nombre_destino for d in destinos}
    mapa_paq = {p.id_paquete: f"{p.nombre_paquete} (${p.precio_paquete}, {p.duracion_dias}D/{p.duracion_noches}N)" for p in paquetes}

    lineas_viajes = []
    for v in viajes:
        nom_d = mapa_dest.get(v.id_destino, f"Destino #{v.id_destino}")
        nom_p = mapa_paq.get(v.id_paquete, "Tarifa Base")
        cap = (150 if v.metodo_transporte == "Avión" else 60) * (v.cantidad_unidades or 1)
        lineas_viajes.append(
            f"- Viaje #{v.id_viaje}: {nom_d} | Paquete: {nom_p} | Salida: {v.fecha_salida} al {v.fecha_retorno} | "
            f"Transporte: {v.cantidad_unidades} {v.metodo_transporte} | Cupos libres: {v.cupos_disponibles}/{cap} | Estatus: {v.estatus}"
        )

    return f"""Eres 'Nena AI', el Asesor Comercial y Operativo de 'Viajes La Nena'.
Responde siempre en español de forma útil, directa y orientada a cerrar ventas o resolver operaciones.

REGLAS DE TARIFAS Y RESERVAS:
- Adultos (+13 años): 100% de la tarifa del paquete o destino.
- Niños (3 a 12 años): 25% de descuento (pagan el 75%).
- Infantes (<3 años): Gratis ($0.00) y no pagan abono mínimo.
- Abono mínimo para apartar: $30.00 por cada pasajero pagante (mayor o igual a 3 años).

DATOS ACTUALES:
- Clientes activos: {kpis['total_clientes']} | Reservas activas: {kpis['total_reservas']}
- Ventas totales: ${kpis['ventas_totales']:,.2f} | Cobrado: ${kpis['ingresos_cobrados']:,.2f} | Por cobrar: ${kpis['por_cobrar']:,.2f}
- Ganancia neta estimada: ${kpis['ganancia_estimada']:,.2f}

VIAJES PROGRAMADOS:
{chr(10).join(lineas_viajes)}
"""


def _respuesta_local_inteligente(session: Session, mensaje: str) -> str:
    """Motor asesor inteligente que cotiza presupuestos, busca clientes/reservas y analiza viajes en tiempo real."""
    q = mensaje.lower().strip()

    # 1. ¿Es una consulta de presupuesto / cotización para un cliente?
    params_cot = _extraer_parametros_cotizacion(mensaje)
    if params_cot:
        res_cot = cotizar_por_presupuesto(
            session=session,
            presupuesto=params_cot["presupuesto"],
            adultos=params_cot["adultos"],
            ninos=params_cot["ninos"],
            infantes=params_cot["infantes"],
            filtro_texto=params_cot["filtro_texto"]
        )
        return _formatear_respuesta_cotizacion(res_cot)

    # 2. ¿Está buscando una Cédula / Pasaporte específico (ej. V-12345678)?
    m_doc = re.search(r"\b([vep]-\d{5,12})\b", q, re.IGNORECASE)
    if m_doc:
        doc_buscar = m_doc.group(1).upper()
        cli = session.exec(select(Cliente).where(Cliente.id_cliente.ilike(f"%{doc_buscar}%"))).first()
        if cli:
            res_cli = session.exec(select(Reserva).where(Reserva.id_cliente == cli.id_cliente, Reserva.is_active == True)).all()
            pagos_all = session.exec(select(Pago).where(Pago.is_active == True)).all()
            lineas = [
                f"### 👤 Expediente de **{cli.nombre} {cli.apellido}** (`{cli.id_cliente}`)\n",
                f"- 📞 **Teléfono:** {cli.telefono} · ✉️ **Correo:** {cli.correo_electronico}",
                f"- 📍 **Dirección:** {cli.direccion}\n"
            ]
            if res_cli:
                lineas.append(f"#### 🎟️ Reservaciones Activas ({len(res_cli)}):")
                for r in res_cli:
                    abonado = sum(float(p.monto) for p in pagos_all if p.id_reserva == r.id_reserva)
                    falta = max(float(r.monto_total) - abonado, 0.0)
                    lineas.append(
                        f"- **Reserva #{r.id_reserva}** (Viaje #{r.id_viaje}): Total **${float(r.monto_total):,.2f}** · "
                        f"Abonado: **${abonado:,.2f}** · {f'⚠️ **Debe ${falta:,.2f}**' if falta > 0.01 else '✅ **Solvente**'}"
                    )
            else:
                lineas.append("*Actualmente no tiene reservaciones activas.*")
            return "\n".join(lineas)

    # 3. ¿Pregunta por paquetes, ideas de viaje, fechas o precios sin dar un monto exacto?
    viajes = session.exec(
        select(Viaje, Destino)
        .join(Destino, Destino.id_destino == Viaje.id_destino)
        .where(Viaje.is_active == True, Viaje.estatus == "Programado")
        .order_by(Viaje.fecha_salida)
    ).all()
    paquetes = {p.id_paquete: p for p in session.exec(select(Paquete).where(Paquete.is_active == True)).all()}

    if any(p in q for p in ["paquete", "destino", "precio", "barato", "economico", "económico", "fecha", "cuando", "cuándo", "idea", "conviene", "opciones", "roques", "merida", "mérida", "tortuga", "choroni", "choroní", "canaima", "margarita", "morrocoy"]):
        # Filtrar si menciona algún destino o mes en particular
        filtrados = []
        for v, d in viajes:
            paq = paquetes.get(v.id_paquete) if v.id_paquete else None
            precio = float(paq.precio_paquete) if paq else float(d.precio_base)
            filtrados.append((v, d, paq, precio))

        # Si pide lo más económico / barato, ordenar por precio ascendente
        if any(w in q for w in ["barato", "economico", "económico", "accesible", "menor precio"]):
            filtrados.sort(key=lambda x: x[3])

        lineas = [
            "### 🌴 Opciones de Viajes y Paquetes por Fecha y Precio\n",
            "💡 *Tip: También puedes escribirme por ejemplo: **«Tengo un cliente con $350 para 2 adultos y 1 niño»** o usar la pestaña **💰 Cotizador** arriba.*\n"
        ]
        for v, d, paq, precio in filtrados[:7]:
            icono = "✈️" if v.metodo_transporte == "Avión" else "🚌"
            nom_paq = f"{paq.nombre_paquete} ({paq.duracion_dias}D/{paq.duracion_noches}N)" if paq else "Tarifa Base"
            precio_nino = round(precio * 0.75, 2)
            lineas.append(
                f"- **{d.nombre_destino} — {nom_paq}** (Viaje #{v.id_viaje})\n"
                f"  - 📅 **Salida:** `{v.fecha_salida}` al `{v.fecha_retorno}` · {icono} {v.metodo_transporte} (**{v.cupos_disponibles} cupos libres**)\n"
                f"  - 💵 **Adulto:** **${precio:,.2f}** · **Niño (3-12):** **${precio_nino:,.2f}** · **Aparta con:** $30.00/pers."
            )
        return "\n".join(lineas)

    if any(p in q for p in ["cupo", "disponible", "asiento", "bus", "avion", "avión", "transporte", "salida", "viaje"]):
        lineas = ["### 🚌✈️ Próximas Salidas y Disponibilidad de Asientos\n"]
        for v, d in viajes:
            paq = paquetes.get(v.id_paquete) if v.id_paquete else None
            precio = float(paq.precio_paquete) if paq else float(d.precio_base)
            cap = (150 if v.metodo_transporte == "Avión" else 60) * (v.cantidad_unidades or 1)
            icono = "✈️" if v.metodo_transporte == "Avión" else "🚌"
            lineas.append(
                f"- **Viaje #{v.id_viaje} — {d.nombre_destino}** (`{v.fecha_salida}` al `{v.fecha_retorno}`): "
                f"{icono} **{v.cupos_disponibles} asientos libres** de {cap} · Tarifa: **${precio:,.2f}**."
            )
        return "\n".join(lineas)

    kpis = obtener_kpis(session)
    top_viaje = obtener_viaje_mas_vendido(session)
    recs = obtener_recomendaciones_sistema(session)

    if any(p in q for p in ["ganancia", "costo", "inconveniente", "finanza", "venta", "ingreso", "estadistica", "estadística", "cobrar", "deuda"]):
        return (
            "### 📊 Balance Financiero en Vivo\n\n"
            f"- **Ventas Facturadas**: **${kpis['ventas_totales']:,.2f}** ({kpis['total_reservas']} reservas activas)\n"
            f"- **Cobrado en Caja**: **${kpis['ingresos_cobrados']:,.2f}**\n"
            f"- **Pendiente por Cobrar**: **${kpis['por_cobrar']:,.2f}**\n"
            f"- **Costos Operativos**: **${kpis['costos_totales']:,.2f}** · **Inconvenientes**: **${kpis['inconvenientes_totales']:,.2f}**\n"
            f"- **Ganancia Neta Estimada**: **${kpis['ganancia_estimada']:,.2f}**\n"
            f"- **Destino Líder**: **{top_viaje['destino']} (Viaje #{top_viaje['id_viaje']})** con ${top_viaje['ventas']:,.2f} vendidos."
        )

    if any(p in q for p in ["recomenda", "consejo", "sugerencia", "mejorar", "optimizar", "estrategia"]):
        lineas = ["### 💡 Acciones Recomendadas Hoy\n"]
        for r in recs:
            lineas.append(f"- **{r['categoria']} — {r['titulo']}**: {r['detalle']}")
        return "\n".join(lineas)

    # Respuesta interactiva por defecto
    return (
        "¡Hola! Soy tu **Asesor Comercial y Operativo**. Ahora puedes usarme para **cotizar en vivo según el presupuesto del cliente**:\n\n"
        "- 💰 **Cotizar por presupuesto:** Escríbeme por ejemplo:\n"
        "  - *«Cliente con presupuesto de $350 para 2 adultos»*\n"
        "  - *«Tengo $500 para 2 adultos y 1 niño, ¿qué paquetes me convienen?»*\n"
        "  - *«¿Qué viajes son los más económicos?»*\n"
        "- 👤 **Consultar un cliente:** Escribe su cédula (ej. `V-14523890`) para ver sus reservas y cuánto debe.\n"
        "- 🧮 O abre la pestaña **«💰 Cotizador»** aquí arriba para filtrar por presupuesto, edades y fechas e ir directo a reservar."
    )


def consultar_asistente(
    session: Session,
    mensaje: str,
    previous_interaction_id: Optional[str] = None,
    api_key: Optional[str] = None
) -> dict:
    # Si es una cotización por presupuesto o cédula, usar nuestro motor exacto con cálculos matemáticos verificados
    if _extraer_parametros_cotizacion(mensaje) or re.search(r"\b([vep]-\d{5,12})\b", mensaje, re.IGNORECASE):
        return {
            "respuesta": _respuesta_local_inteligente(session, mensaje),
            "modo": "motor-cotizador-bd",
            "interaction_id": None,
            "api_key_configurada": bool(obtener_api_key_activa(api_key))
        }

    key = obtener_api_key_activa(api_key)
    contexto = construir_contexto_sistema(session)

    if key:
        try:
            from google import genai
            client = genai.Client(api_key=key)
            kwargs = {
                "model": "gemini-3.8-flash",
                "system_instruction": contexto,
                "input": mensaje,
            }
            if previous_interaction_id:
                kwargs["previous_interaction_id"] = previous_interaction_id

            interaction = client.interactions.create(**kwargs)
            texto = interaction.output_text or _respuesta_local_inteligente(session, mensaje)
            return {
                "respuesta": texto,
                "modo": "gemini-3.8-flash",
                "interaction_id": getattr(interaction, "id", None),
                "api_key_configurada": True
            }
        except Exception:
            pass

    return {
        "respuesta": _respuesta_local_inteligente(session, mensaje),
        "modo": "motor-cotizador-bd",
        "interaction_id": None,
        "api_key_configurada": False
    }
