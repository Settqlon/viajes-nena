import os
from typing import Optional
from sqlmodel import Session, select
from modelos.modelos import Destino, Paquete, Viaje, Reserva, Pago, Integrante, Cliente, CostoViaje, Inconveniente
from servicios.estadisticas_servicios import obtener_kpis, obtener_viaje_mas_vendido, obtener_ocupacion_viajes

# Almacena temporalmente una API Key configurada desde la interfaz si no está en variables de entorno
_API_KEY_MEMORIA: Optional[str] = None


def configurar_api_key(api_key: str) -> None:
    global _API_KEY_MEMORIA
    _API_KEY_MEMORIA = api_key.strip() if api_key else None


def obtener_api_key_activa(api_key_request: Optional[str] = None) -> Optional[str]:
    if api_key_request and api_key_request.strip():
        return api_key_request.strip()
    if _API_KEY_MEMORIA:
        return _API_KEY_MEMORIA
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


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

    # 1. Recomendación de Cobranza (Cuentas por cobrar)
    if kpis["por_cobrar"] > 0:
        reservas_abonadas = session.exec(
            select(Reserva).where(Reserva.is_active == True, Reserva.estatus_pago == "Abonado")
        ).all()
        recomendaciones.append({
            "categoria": "Finanzas y Cobranza",
            "titulo": f"Recuperar ${kpis['por_cobrar']:,.2f} en saldos pendientes",
            "detalle": (
                f"Tienes {len(reservas_abonadas)} reserva(s) en estado 'Abonado'. "
                f"Te recomiendo entrar al módulo de Reservas, tocar cada reserva abonada y registrar la liquidación antes de la fecha de salida."
            ),
            "accion_sugerida": "Ir a Reservas → Filtrar por 'Abonado'"
        })

    # 2. Recomendación de Capacidad / Flota (Viajes con alta ocupación)
    altos = [o for o in ocupaciones if o["ocupacion"] >= 45]
    if altos:
        mejor = max(altos, key=lambda x: x["ocupacion"])
        recomendaciones.append({
            "categoria": "Optimización de Flota",
            "titulo": f"Alta demanda en {mejor['viaje']} ({mejor['ocupacion']}% ocupado)",
            "detalle": (
                f"Quedan {mejor['cupos_disponibles']} cupos de {mejor['capacidad_total']}. "
                f"Si la demanda sigue subiendo, puedes editar el viaje en 'Viajes Programados' y aumentar la cantidad de unidades (Bus Cama = +60 cupos / Avión = +150 cupos)."
            ),
            "accion_sugerida": "Evaluar ampliar unidades en Viajes"
        })

    # 3. Recomendación Comercial (Viajes próximos con baja ocupación)
    bajos = [o for o in ocupaciones if o["ocupacion"] < 30]
    if bajos:
        bajo = min(bajos, key=lambda x: x["ocupacion"])
        recomendaciones.append({
            "categoria": "Impulso Comercial",
            "titulo": f"Promocionar salida {bajo['viaje']} ({bajo['ocupacion']}% de ocupación)",
            "detalle": (
                f"Esta salida tiene {bajo['cupos_disponibles']} asientos libres. "
                f"Recuerda a los clientes que pueden apartar su cupo con solo $30.00 por persona."
            ),
            "accion_sugerida": "Ofrecer apartado de $30/viajero"
        })

    # 4. Recomendación de Producto Estrella
    if top_viaje:
        recomendaciones.append({
            "categoria": "Destino Estrella",
            "titulo": f"{top_viaje['destino']} lidera las ventas (${top_viaje['ventas']:,.2f})",
            "detalle": (
                f"El Viaje #{top_viaje['id_viaje']} acumula {top_viaje['reservas']} reservas activas. "
                f"Se recomienda programar una nueva salida hacia {top_viaje['destino']} para el próximo mes."
            ),
            "accion_sugerida": "Programar nueva fecha en Viajes"
        })

    # 5. Próxima salida inmediata
    if viajes_prog:
        prox_v, prox_dest = viajes_prog[0]
        recomendaciones.append({
            "categoria": "Logística Operativa",
            "titulo": f"Próxima salida: Viaje #{prox_v.id_viaje} a {prox_dest} ({prox_v.fecha_salida})",
            "detalle": (
                f"Transporte: {prox_v.cantidad_unidades} {prox_v.metodo_transporte} ({prox_v.cupos_disponibles} cupos libres). "
                f"Recuerda imprimir el Manifiesto de Embarque en 'Nómina de Viajeros' y verificar su Proceso Operativo."
            ),
            "accion_sugerida": "Imprimir Manifiesto en Nómina de Viajeros"
        })

    return recomendaciones


def construir_contexto_sistema(session: Session) -> str:
    """Construye el resumen actualizado de la base de datos y las reglas del sistema para inyectarlo al modelo Gemini."""
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

    recomendaciones = obtener_recomendaciones_sistema(session)
    texto_recs = "\n".join(f"- [{r['categoria']}] {r['titulo']}: {r['detalle']}" for r in recomendaciones)

    return f"""Eres 'Nena AI', la Asistente Inteligente de Ingeniería y Operaciones del sistema 'Viajes La Nena'.
Responde siempre en español, de forma clara, amable, concisa y estructurada con viñetas cuando sea útil.

REGLAS DE NEGOCIO DEL SISTEMA (MANTÉN SIEMPRE ESTA LÓGICA):
1. Monto automático de reserva: El monto total nunca se ingresa a mano; se calcula multiplicando el precio del paquete (o precio base del destino) por la cantidad de integrantes activos.
2. Ley de apartado ($30.00): Para apartar cupos es obligatorio abonar mínimo $30.00 por cada integrante ($30 × cantidad de viajeros). Ninguna reserva con menos de ese monto aparece como válida.
3. Transporte y capacidad automática:
   - 'Bus Cama' = 60 asientos por unidad (ej. Mérida, Chichiriviche, Choroní, Gran Sabana, Caripe).
   - 'Avión' = 150 asientos por unidad (ej. Los Roques, Isla Tortuga).
4. Búsqueda de clientes sin desplegables pesados: Los clientes se buscan únicamente por su número de documento/cédula (ej. V-14523890). Su teléfono y correo electrónico son únicos. Al registrar un cliente nuevo se le puede asignar el viaje y crear su reserva en el mismo paso.
5. Cero redundancia en Integrantes: El cliente titular se incluye automáticamente como Viajero #1. Si agregas un acompañante y escribes su cédula, el sistema autocompleta su nombre si ya está registrado, y limpia los campos si cambias a una cédula nueva.
6. Actualización y Borrado Lógico (Soft Delete): Todos los módulos tienen botón de Editar (lápiz), botón de Baja Lógica (papelera) y botón verde 'Restaurar' para reactivar cualquier registro desactivado sin perder historial.
7. Impresión de documentos: En el detalle de cada Reserva se puede imprimir el 'Voucher / Comprobante PDF', y en 'Nómina de Viajeros' se puede imprimir el 'Manifiesto de Embarque'.

DATOS EN VIVO DE LA BASE DE DATOS ACTUAL:
- Clientes activos: {kpis['total_clientes']} | Viajeros registrados: {kpis['total_viajeros']}
- Reservas activas: {kpis['total_reservas']} | Ventas totales: ${kpis['ventas_totales']:,.2f}
- Ingresos cobrados: ${kpis['ingresos_cobrados']:,.2f} | Saldo por cobrar: ${kpis['por_cobrar']:,.2f}
- Costos operativos: ${kpis['costos_totales']:,.2f} | Inconvenientes: ${kpis['inconvenientes_totales']:,.2f} | Ganancia neta estimada: ${kpis['ganancia_estimada']:,.2f}
- Viaje más vendido: {f"Viaje #{top_viaje['id_viaje']} a {top_viaje['destino']} ({top_viaje['reservas']} reservas, ${top_viaje['ventas']:,.2f})" if top_viaje else "Sin datos"}

VIAJES ACTIVOS EN EL SISTEMA:
{chr(10).join(lineas_viajes)}

RECOMENDACIONES ACTUALES DEL SISTEMA:
{texto_recs}
"""


def _respuesta_local_inteligente(session: Session, mensaje: str) -> str:
    """Motor inteligente local que responde dudas y da recomendaciones usando datos reales de PostgreSQL cuando no hay API Key o conexión."""
    q = mensaje.lower().strip()
    kpis = obtener_kpis(session)
    top_viaje = obtener_viaje_mas_vendido(session)
    recs = obtener_recomendaciones_sistema(session)
    viajes = session.exec(
        select(Viaje, Destino.nombre_destino)
        .join(Destino, Destino.id_destino == Viaje.id_destino)
        .where(Viaje.is_active == True)
        .order_by(Viaje.fecha_salida)
    ).all()
    paquetes = session.exec(select(Paquete).where(Paquete.is_active == True)).all()

    if any(p in q for p in ["recomenda", "consejo", "sugerencia", "mejorar", "optimizar", "estrategia", " Analiz", "análisis"]):
        lineas = ["### 💡 Recomendaciones Inteligentes para Viajes La Nena\n"]
        for r in recs:
            lineas.append(f"- **{r['categoria']} — {r['titulo']}**: {r['detalle']} *(Acción: {r['accion_sugerida']})*")
        return "\n".join(lineas)

    if any(p in q for p in ["cupo", "disponible", "asiento", "bus", "avion", "avión", "transporte", "salida", "viaje"]):
        prog = [(v, d) for v, d in viajes if v.estatus == "Programado"]
        lineas = [
            "### 🚌✈️ Viajes Programados y Cupos Disponibles\n",
            "Recuerda que cada **Bus Cama** cuenta con **60 asientos** y cada **Avión** con **150 asientos** por unidad:\n"
        ]
        for v, d in prog:
            cap = (150 if v.metodo_transporte == "Avión" else 60) * (v.cantidad_unidades or 1)
            icono = "✈️" if v.metodo_transporte == "Avión" else "🚌"
            lineas.append(
                f"- **Viaje #{v.id_viaje} — {d}** ({v.fecha_salida} al {v.fecha_retorno}): "
                f"{icono} {v.cantidad_unidades} {v.metodo_transporte} · **{v.cupos_disponibles} cupos libres** de {cap}."
            )
        return "\n".join(lineas)

    if any(p in q for p in ["abono", "minimo", "mínimo", "30", "ley", "reserva", "apartar", "acompañante", "integrante"]):
        return (
            "### 📋 Ayuda sobre Reservas, Abono Mínimo e Integrantes\n\n"
            "- **Ley de Apartado ($30.00)**: Para reservar cupos es obligatorio registrar un abono mínimo de **$30.00 por cada integrante** (`$30 × cantidad de viajeros`).\n"
            "- **Monto Total Automático**: El sistema calcula automáticamente el total multiplicando el precio del paquete (o tarifa base del destino) por el número de viajeros activos.\n"
            "- **Cómo agregar integrantes sin redundancia**:\n"
            "  1. En **Reservas** (o desde **Clientes → Nuevo Cliente + Viaje**), escribe el documento/cédula del cliente titular; él queda incluido automáticamente como **Viajero #1**.\n"
            "  2. Si viaja con más personas, pulsa **`+ Añadir acompañante`** y escribe primero su cédula: si ya existe en el sistema se autocompletan sus datos.\n"
            "  3. Al tocar cualquier reserva en la tabla, se abre su **Modal de Detalle**, donde puedes editar viajeros, registrar abonos, cambiar el viaje o **Imprimir el Voucher en PDF**."
        )

    if any(p in q for p in ["borrar", "eliminar", "restaurar", "editar", "actualizar", "baja", "papelera"]):
        return (
            "### 🔄 Cómo Actualizar, Dar de Baja y Restaurar Registros\n\n"
            "- **Editar (Icono de lápiz ✏️)**: En todas las tablas del sistema tienes el botón de editar. Al pulsarlo, los datos se cargan en el formulario superior para que modifiques cualquier campo y guardes con `PATCH`.\n"
            "- **Borrado Lógico (Icono de papelera 🗑️)**: Ningún registro se destruye de PostgreSQL; al darlo de baja pasa a estado **Inactivo** (`is_active = false` / `act_pro = false`), liberando cupos si es una reserva o integrante.\n"
            "- **Restaurar (Botón verde `Restaurar` ↺)**: Cualquier registro inactivo muestra automáticamente el botón verde **`Restaurar`** para reactivarlo en un clic."
        )

    if any(p in q for p in ["ganancia", "costo", "inconveniente", "finanza", "venta", "ingreso", "estadistica", "estadística", "vendido"]):
        return (
            "### 📊 Resumen Financiero y Estadístico Actual\n\n"
            f"- **Ventas Totales Facturadas**: **${kpis['ventas_totales']:,.2f}** en **{kpis['total_reservas']} reservas activas**.\n"
            f"- **Ingresos Cobrados en Caja**: **${kpis['ingresos_cobrados']:,.2f}** (Restan **${kpis['por_cobrar']:,.2f}** por cobrar en reservas abonadas).\n"
            f"- **Costos Operativos**: **${kpis['costos_totales']:,.2f}** · **Descuentos por Inconvenientes**: **${kpis['inconvenientes_totales']:,.2f}**.\n"
            f"- **Ganancia Estimada**: **${kpis['ganancia_estimada']:,.2f}**.\n"
            f"- **Viaje Más Vendido**: **{top_viaje['destino']} (Viaje #{top_viaje['id_viaje']})** con **{top_viaje['reservas']} reservas** (${top_viaje['ventas']:,.2f}).\n\n"
            "💡 *Recuerda: el módulo de **Ganancias** se sincroniza automáticamente cada vez que agregas o editas una reserva, costo o inconveniente.*"
        )

    if any(p in q for p in ["paquete", "destino", "precio", "roques", "merida", "mérida", "tortuga", "choroni", "choroní", "canaima"]):
        lineas = ["### 🌴 Catálogo de Paquetes Turísticos Activos\n"]
        for p in paquetes:
            lineas.append(f"- **{p.nombre_paquete}**: **${p.precio_paquete}** por persona ({p.duracion_dias} días / {p.duracion_noches} noches) — *{p.resumen or p.descripcion}*")
        return "\n".join(lineas)

    if any(p in q for p in ["proceso", "auditoria", "auditoría", "logistica", "logística"]):
        return (
            "### ⚙️ Procesos Operativos y Auditoría Automática\n\n"
            "- **Procesos Internos**: Cada vez que programas un **Viaje**, el sistema crea automáticamente su proceso logístico (transporte, hospedaje y control de embarque) y actualiza su estado (`en ejecución`, `completado` o `pausado`) según el estatus del viaje.\n"
            "- **Auditoría Automática**: Todas las operaciones de creación (`INSERT`), edición (`UPDATE`) y baja lógica (`DELETE`) en Reservas, Pagos, Viajes, Costos, Inconvenientes y Ganancias quedan registradas automáticamente en el módulo de **Auditoría**."
        )

    # Respuesta general con ayuda + recomendaciones
    resumen_recs = "\n".join(f"- **{r['categoria']}**: {r['titulo']} — {r['detalle']}" for r in recs[:3])
    return (
        "¡Hola! Soy **Nena AI**, tu asistente de **Viajes La Nena**. Puedo ayudarte con dudas sobre el uso del sistema o darte recomendaciones basadas en tus datos reales:\n\n"
        f"#### 📌 Estado Rápido del Sistema\n"
        f"- **{kpis['total_reservas']} reservas activas** ({kpis['total_viajeros']} viajeros) · Ventas: **${kpis['ventas_totales']:,.2f}** · Por cobrar: **${kpis['por_cobrar']:,.2f}**.\n\n"
        f"#### 💡 Principales Recomendaciones de Hoy\n{resumen_recs}\n\n"
        "Pregúntame por ejemplo:\n"
        "- *«¿Qué recomendaciones tienes para mejorar las ventas y cobranzas?»*\n"
        "- *«¿Cuántos cupos quedan en los próximos viajes y qué transporte usan?»*\n"
        "- *«¿Cómo funciona la ley de los $30 de abono y cómo agrego acompañantes?»*\n"
        "- *«¿Cómo edito o restauro un registro dado de baja?»*"
    )


def consultar_asistente(
    session: Session,
    mensaje: str,
    previous_interaction_id: Optional[str] = None,
    api_key: Optional[str] = None
) -> dict:
    """Consulta a Gemini 3.8 Flash con el contexto en vivo de la BD; si no hay API Key usa el motor inteligente local."""
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
        except Exception as e:
            # Si la API Key es inválida o no hay internet, responde con el motor local conectado a PostgreSQL
            respuesta_fallback = _respuesta_local_inteligente(session, mensaje)
            return {
                "respuesta": respuesta_fallback,
                "modo": "motor-local-bd",
                "interaction_id": None,
                "api_key_configurada": False,
                "aviso": f"Usando motor inteligente local conectado a PostgreSQL (Detalle API: {str(e)[:90]})"
            }

    return {
        "respuesta": _respuesta_local_inteligente(session, mensaje),
        "modo": "motor-local-bd",
        "interaction_id": None,
        "api_key_configurada": False
    }
