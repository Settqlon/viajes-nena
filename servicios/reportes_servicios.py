import io
from datetime import datetime
from sqlmodel import Session, select
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from modelos.modelos import (
    Viaje, Destino, Paquete, Reserva, Cliente, Integrante,
    Pago, CostoViaje, Inconveniente, Auditoria, Usuario
)


def _generar_excel_estilizado(
    titulo: str,
    subtitulo: str,
    resumen_kpis: list[tuple[str, str]],
    columnas: list[str],
    filas: list[list],
    fila_totales: list | None = None,
    nombre_hoja: str = "Reporte"
) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = nombre_hoja[:31]

    total_cols = max(len(columnas), 4)
    letra_final = get_column_letter(total_cols)

    fill_navy = PatternFill(start_color="0F1B2D", end_color="0F1B2D", fill_type="solid")
    fill_teal = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")
    fill_sub = PatternFill(start_color="F0FDFA", end_color="F0FDFA", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_total = PatternFill(start_color="ECFDF5", end_color="ECFDF5", fill_type="solid")
    fill_kpi = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    font_brand = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
    font_sub = Font(name="Calibri", size=10, italic=True, color="0F766E")
    font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    font_cell = Font(name="Calibri", size=10, color="0F172A")
    font_bold = Font(name="Calibri", size=10, bold=True, color="0F172A")
    font_total = Font(name="Calibri", size=10, bold=True, color="065F46")

    borde_fino = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )

    # Fila 1: Encabezado Institucional
    ws.merge_cells(f"A1:{letra_final}1")
    ws["A1"] = f"VIAJES LA NENA — {titulo.upper()}"
    ws["A1"].font = font_brand
    ws["A1"].fill = fill_navy
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 30

    # Fila 2: Subtítulo y Fecha de Emisión
    fecha_emision = datetime.now().strftime("%d/%m/%Y %H:%M")
    ws.merge_cells(f"A2:{letra_final}2")
    ws["A2"] = f"{subtitulo}   |   Emitido el: {fecha_emision}"
    ws["A2"].font = font_sub
    ws["A2"].fill = fill_sub
    ws["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 20

    fila_actual = 4

    # Bloque de KPIs de resumen
    if resumen_kpis:
        col_idx = 1
        for etiqueta, valor in resumen_kpis:
            celda = ws.cell(row=fila_actual, column=col_idx, value=f"{etiqueta}: {valor}")
            celda.font = font_bold
            celda.fill = fill_kpi
            celda.border = borde_fino
            celda.alignment = Alignment(horizontal="center", vertical="center")
            col_idx += 1
            if col_idx > total_cols:
                col_idx = 1
                fila_actual += 1
        ws.row_dimensions[fila_actual].height = 22
        fila_actual += 2

    # Encabezados de la tabla
    ws.row_dimensions[fila_actual].height = 24
    for idx, col_nombre in enumerate(columnas, start=1):
        c = ws.cell(row=fila_actual, column=idx, value=col_nombre)
        c.font = font_header
        c.fill = fill_teal
        c.border = borde_fino
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    fila_actual += 1

    # Filas de datos
    for r_idx, fila in enumerate(filas):
        ws.row_dimensions[fila_actual].height = 20
        es_par = r_idx % 2 == 1
        for c_idx, valor in enumerate(fila, start=1):
            c = ws.cell(row=fila_actual, column=c_idx, value=valor)
            c.font = font_cell
            if es_par:
                c.fill = fill_zebra
            c.border = borde_fino

            if isinstance(valor, float):
                c.number_format = '"$"#,##0.00'
                c.alignment = Alignment(horizontal="right", vertical="center")
            elif isinstance(valor, int):
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")
        fila_actual += 1

    # Fila de totales
    if fila_totales:
        ws.row_dimensions[fila_actual].height = 23
        for c_idx, valor in enumerate(fila_totales, start=1):
            c = ws.cell(row=fila_actual, column=c_idx, value=valor)
            c.font = font_total
            c.fill = fill_total
            c.border = borde_fino
            if isinstance(valor, float):
                c.number_format = '"$"#,##0.00'
                c.alignment = Alignment(horizontal="right", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

    # Autoajustar ancho de columnas
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.row in (1, 2):
                continue
            val_str = f"${cell.value:,.2f}" if isinstance(cell.value, float) else str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(min(max_len + 5, 45), 13)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def _generar_pdf_estilizado(
    titulo: str,
    subtitulo: str,
    resumen_kpis: list[tuple[str, str]],
    columnas: list[str],
    filas: list[list],
    fila_totales: list | None = None,
    horizontal: bool = True
) -> bytes:
    buffer = io.BytesIO()
    pagesize = landscape(A4) if horizontal else A4
    doc = SimpleDocTemplate(
        buffer,
        pagesize=pagesize,
        leftMargin=1.2 * cm,
        rightMargin=1.2 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.4 * cm,
        title=f"Viajes La Nena - {titulo}"
    )

    estilos = getSampleStyleSheet()
    estilo_titulo = ParagraphStyle(
        "TituloReporte",
        parent=estilos["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0F1B2D"),
        spaceAfter=2
    )
    estilo_sub = ParagraphStyle(
        "SubtituloReporte",
        parent=estilos["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0F766E"),
        spaceAfter=10
    )
    estilo_celda = ParagraphStyle(
        "CeldaTabla",
        parent=estilos["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0F172A")
    )
    estilo_celda_bold = ParagraphStyle(
        "CeldaTablaBold",
        parent=estilo_celda,
        fontName="Helvetica-Bold"
    )

    elementos = []
    fecha_emision = datetime.now().strftime("%d/%m/%Y %H:%M")

    elementos.append(Paragraph(f"VIAJES LA NENA — {titulo}", estilo_titulo))
    elementos.append(Paragraph(f"{subtitulo} &nbsp;|&nbsp; <b>Fecha de emisión:</b> {fecha_emision}", estilo_sub))

    # Tabla resumen de KPIs
    if resumen_kpis:
        kpi_headers = [k[0] for k in resumen_kpis]
        kpi_vals = [k[1] for k in resumen_kpis]
        t_kpi = Table([kpi_headers, kpi_vals])
        t_kpi.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F1B2D")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#F0FDFA")),
            ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#0F766E")),
            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 1), (-1, 1), 10),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ]))
        elementos.append(t_kpi)
        elementos.append(Spacer(1, 0.4 * cm))

    # Construir tabla principal
    datos_tabla = [columnas]
    for fila in filas:
        fila_formateada = []
        for val in fila:
            if isinstance(val, float):
                fila_formateada.append(f"${val:,.2f}")
            else:
                texto = str(val if val is not None else "—")
                if len(texto) > 42:
                    fila_formateada.append(Paragraph(texto, estilo_celda))
                else:
                    fila_formateada.append(texto)
        datos_tabla.append(fila_formateada)

    if fila_totales:
        tot_fmt = []
        for val in fila_totales:
            if isinstance(val, float):
                tot_fmt.append(f"${val:,.2f}")
            else:
                tot_fmt.append(str(val if val is not None else ""))
        datos_tabla.append(tot_fmt)

    tabla = Table(datos_tabla, repeatRows=1)
    estilos_tabla = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F766E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
    ]

    for i in range(1, len(datos_tabla)):
        if fila_totales and i == len(datos_tabla) - 1:
            estilos_tabla.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#ECFDF5")))
            estilos_tabla.append(("FONTNAME", (0, i), (-1, i), "Helvetica-Bold"))
            estilos_tabla.append(("TEXTCOLOR", (0, i), (-1, i), colors.HexColor("#065F46")))
        elif i % 2 == 0:
            estilos_tabla.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F8FAFC")))

    tabla.setStyle(TableStyle(estilos_tabla))
    elementos.append(tabla)

    def _pie_pagina(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawString(1.2 * cm, 0.7 * cm, "Viajes La Nena — Sistema Integral de Gestión Turística | Reporte Oficial")
        canvas.drawRightString(pagesize[0] - 1.2 * cm, 0.7 * cm, f"Página {doc_obj.page}")
        canvas.restoreState()

    doc.build(elementos, onFirstPage=_pie_pagina, onLaterPages=_pie_pagina)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 1. REPORTE DE MANIFIESTO DE ABORDAJE POR VIAJE
# ==============================================================================
def generar_reporte_manifiesto(session: Session, id_viaje: int, formato: str = "pdf") -> tuple[bytes, str]:
    viaje = session.get(Viaje, id_viaje)
    destino = session.get(Destino, viaje.id_destino) if viaje else None
    paquete = session.get(Paquete, viaje.id_paquete) if (viaje and viaje.id_paquete) else None

    nom_dest = destino.nombre_destino if destino else f"Destino #{id_viaje}"
    nom_paq = paquete.nombre_paquete if paquete else "Tarifa Base"
    precio_base = float(paquete.precio_paquete) if paquete else (float(destino.precio_base) if destino else 0.0)

    reservas = session.exec(
        select(Reserva).where(Reserva.id_viaje == id_viaje, Reserva.is_active == True)
    ).all()
    res_map = {r.id_reserva: r for r in reservas}
    clientes = {c.id_cliente.lower(): c for c in session.exec(select(Cliente)).all()}
    pagos = session.exec(select(Pago).where(Pago.is_active == True)).all()

    integrantes = session.exec(
        select(Integrante).where(Integrante.is_active == True)
    ).all()
    pasajeros = [i for i in integrantes if i.id_reserva in res_map]
    pasajeros.sort(key=lambda x: (x.numero_asiento or 999, x.id_integrante))

    cap_unidad = 150 if (viaje and viaje.metodo_transporte == "Avión") else 60
    cap_total = cap_unidad * (viaje.cantidad_unidades if viaje else 1)

    columnas = ["Puesto", "Pasajero", "Tipo Doc.", "Documento", "Edad", "Tarifa", "Teléfono Titular", "Reserva", "Estado Pago"]
    filas = []
    for p in pasajeros:
        res = res_map.get(p.id_reserva)
        cli = clientes.get(res.id_cliente.lower()) if res else None
        abonado = sum(float(pg.monto) for pg in pagos if pg.id_reserva == p.id_reserva)
        total_res = float(res.monto_total) if res else 0.0
        falta = max(total_res - abonado, 0.0)

        if p.edad < 3:
            cat_tarifa = "Gratis (<3)"
        elif p.edad < 13:
            cat_tarifa = f"Niño -25% (${precio_base * 0.75:,.2f})"
        else:
            cat_tarifa = f"Completa (${precio_base:,.2f})"

        puesto_str = f"#{p.numero_asiento:02d}" if p.numero_asiento else "Sin asignar"
        estado_str = "Solvente" if falta <= 0.01 else f"Debe ${falta:,.2f}"

        filas.append([
            puesto_str,
            f"{p.nombre} {p.apellido}",
            p.tipo_documento or "Cédula",
            p.documento_id,
            p.edad,
            cat_tarifa,
            cli.telefono if cli else "—",
            f"#{p.id_reserva}",
            estado_str
        ])

    titulo = f"Manifiesto Oficial de Abordaje — Viaje #{id_viaje} ({nom_dest})"
    subtitulo = f"Paquete: {nom_paq} | Salida: {viaje.fecha_salida if viaje else ''} al {viaje.fecha_retorno if viaje else ''} | Transporte: {viaje.metodo_transporte if viaje else ''}"
    kpis = [
        ("Viaje", f"#{id_viaje} - {nom_dest}"),
        ("Transporte", f"{viaje.cantidad_unidades if viaje else 1}x {viaje.metodo_transporte if viaje else 'Bus'}"),
        ("Pasajeros Confirmados", f"{len(pasajeros)} / {cap_total}"),
        ("Reservas Activas", str(len(reservas)))
    ]

    if formato.lower() == "excel":
        contenido = _generar_excel_estilizado(titulo, subtitulo, kpis, columnas, filas, nombre_hoja=f"Manifiesto_Viaje_{id_viaje}")
        return contenido, f"Manifiesto_Viaje_{id_viaje}_{nom_dest.replace(' ', '_')}.xlsx"
    contenido = _generar_pdf_estilizado(titulo, subtitulo, kpis, columnas, filas, horizontal=True)
    return contenido, f"Manifiesto_Viaje_{id_viaje}_{nom_dest.replace(' ', '_')}.pdf"


# ==============================================================================
# 2. REPORTE DE CONTROL FINANCIERO Y RENTABILIDAD
# ==============================================================================
def generar_reporte_financiero(session: Session, formato: str = "pdf") -> tuple[bytes, str]:
    viajes = session.exec(select(Viaje).order_by(Viaje.id_viaje)).all()
    destinos = {d.id_destino: d.nombre_destino for d in session.exec(select(Destino)).all()}
    reservas = session.exec(select(Reserva).where(Reserva.is_active == True)).all()
    pagos = session.exec(select(Pago).where(Pago.is_active == True)).all()
    costos = session.exec(select(CostoViaje).where(CostoViaje.is_active == True)).all()
    inconvenientes = session.exec(select(Inconveniente).where(Inconveniente.is_active == True)).all()

    columnas = [
        "Viaje", "Destino", "Salida", "Transporte", "Reservas",
        "Ingresos ($)", "Cobrado ($)", "Costos ($)", "Inconvenientes ($)", "Ganancia Neta ($)", "Margen"
    ]
    filas = []

    tot_ing = 0.0
    tot_cob = 0.0
    tot_cos = 0.0
    tot_inc = 0.0
    tot_gan = 0.0
    tot_res = 0

    for v in viajes:
        res_v = [r for r in reservas if r.id_viaje == v.id_viaje]
        res_ids = {r.id_reserva for r in res_v}
        ing = sum(float(r.monto_total) for r in res_v)
        cob = sum(float(p.monto) for p in pagos if p.id_reserva in res_ids)
        cos = sum(float(c.monto) for c in costos if c.id_viaje == v.id_viaje)
        inc = sum(float(i.monto_descontado) for i in inconvenientes if i.id_viaje == v.id_viaje)
        gan = ing - cos - inc
        margen = f"{(gan / ing * 100):.1f}%" if ing > 0 else "0.0%"

        tot_ing += ing
        tot_cob += cob
        tot_cos += cos
        tot_inc += inc
        tot_gan += gan
        tot_res += len(res_v)

        filas.append([
            f"#{v.id_viaje}",
            destinos.get(v.id_destino, f"Destino #{v.id_destino}"),
            str(v.fecha_salida),
            v.metodo_transporte,
            len(res_v),
            round(ing, 2),
            round(cob, 2),
            round(cos, 2),
            round(inc, 2),
            round(gan, 2),
            margen
        ])

    margen_global = f"{(tot_gan / tot_ing * 100):.1f}%" if tot_ing > 0 else "0.0%"
    fila_totales = [
        "TOTAL", "CONSOLIDADO GENERAL", "", "", tot_res,
        round(tot_ing, 2), round(tot_cob, 2), round(tot_cos, 2),
        round(tot_inc, 2), round(tot_gan, 2), margen_global
    ]

    titulo = "Reporte de Control Financiero y Rentabilidad por Viaje"
    subtitulo = "Estado de Resultados: Ingresos por Reservaciones, Costos Operativos, Inconvenientes y Ganancia Neta"
    kpis = [
        ("Ingresos Facturados", f"${tot_ing:,.2f}"),
        ("Total Cobrado", f"${tot_cob:,.2f}"),
        ("Costos + Inconvenientes", f"${(tot_cos + tot_inc):,.2f}"),
        ("Ganancia Neta Real", f"${tot_gan:,.2f} ({margen_global})")
    ]

    if formato.lower() == "excel":
        contenido = _generar_excel_estilizado(titulo, subtitulo, kpis, columnas, filas, fila_totales, nombre_hoja="Control_Financiero")
        return contenido, "Reporte_Control_Financiero_ViajesLaNena.xlsx"
    contenido = _generar_pdf_estilizado(titulo, subtitulo, kpis, columnas, filas, fila_totales, horizontal=True)
    return contenido, "Reporte_Control_Financiero_ViajesLaNena.pdf"


# ==============================================================================
# 3. REPORTE DE RESERVACIONES Y CUENTAS POR COBRAR
# ==============================================================================
def generar_reporte_reservas(session: Session, formato: str = "pdf") -> tuple[bytes, str]:
    reservas = session.exec(select(Reserva).order_by(Reserva.id_reserva.desc())).all()
    clientes = {c.id_cliente.lower(): c for c in session.exec(select(Cliente)).all()}
    viajes = {v.id_viaje: v for v in session.exec(select(Viaje)).all()}
    destinos = {d.id_destino: d.nombre_destino for d in session.exec(select(Destino)).all()}
    integrantes = session.exec(select(Integrante).where(Integrante.is_active == True)).all()
    pagos = session.exec(select(Pago).where(Pago.is_active == True)).all()

    columnas = ["Reserva", "Fecha", "Cliente Titular", "Documento", "Teléfono", "Destino / Viaje", "Viajeros", "Total ($)", "Abonado ($)", "Pendiente ($)", "Estatus"]
    filas = []

    tot_facturado = 0.0
    tot_abonado = 0.0
    tot_pendiente = 0.0
    tot_pax = 0

    for r in reservas:
        cli = clientes.get(r.id_cliente.lower())
        v = viajes.get(r.id_viaje)
        nom_dest = destinos.get(v.id_destino, f"Viaje #{r.id_viaje}") if v else f"Viaje #{r.id_viaje}"
        cant_pax = sum(1 for i in integrantes if i.id_reserva == r.id_reserva)
        abonado = sum(float(p.monto) for p in pagos if p.id_reserva == r.id_reserva)
        total = float(r.monto_total)
        falta = max(total - abonado, 0.0) if r.is_active else 0.0

        if r.is_active:
            tot_facturado += total
            tot_abonado += abonado
            tot_pendiente += falta
            tot_pax += cant_pax

        estatus_str = "Cancelada" if not r.is_active else ("Pagado" if falta <= 0.01 else "Abonado")

        filas.append([
            f"#{r.id_reserva}",
            r.fecha_reserva.strftime("%d/%m/%Y"),
            f"{cli.nombre} {cli.apellido}" if cli else r.id_cliente,
            r.id_cliente,
            cli.telefono if cli else "—",
            f"{nom_dest} (#{r.id_viaje})",
            cant_pax,
            round(total, 2),
            round(abonado, 2),
            round(falta, 2),
            estatus_str
        ])

    fila_totales = [
        "TOTAL", "RESERVAS ACTIVAS", "", "", "", "",
        tot_pax, round(tot_facturado, 2), round(tot_abonado, 2), round(tot_pendiente, 2), ""
    ]

    titulo = "Reporte General de Reservaciones y Estado de Cobranzas"
    subtitulo = "Consolidado de reservas emitidas, pasajeros por reserva, montos abonados y cuentas por cobrar"
    kpis = [
        ("Reservas Activas", str(sum(1 for r in reservas if r.is_active))),
        ("Total Facturado", f"${tot_facturado:,.2f}"),
        ("Total Cobrado", f"${tot_abonado:,.2f}"),
        ("Saldo por Cobrar", f"${tot_pendiente:,.2f}")
    ]

    if formato.lower() == "excel":
        contenido = _generar_excel_estilizado(titulo, subtitulo, kpis, columnas, filas, fila_totales, nombre_hoja="Reservaciones")
        return contenido, "Reporte_Reservaciones_ViajesLaNena.xlsx"
    contenido = _generar_pdf_estilizado(titulo, subtitulo, kpis, columnas, filas, fila_totales, horizontal=True)
    return contenido, "Reporte_Reservaciones_ViajesLaNena.pdf"


# ==============================================================================
# 4. REPORTE DE PAGOS Y COBRANZAS
# ==============================================================================
def generar_reporte_pagos(session: Session, formato: str = "pdf") -> tuple[bytes, str]:
    pagos = session.exec(select(Pago).order_by(Pago.id_pago.desc())).all()
    reservas = {r.id_reserva: r for r in session.exec(select(Reserva)).all()}
    clientes = {c.id_cliente.lower(): c for c in session.exec(select(Cliente)).all()}

    columnas = ["ID Pago", "Fecha", "Reserva", "Cliente Titular", "Documento", "Método de Pago", "Referencia", "Monto ($)", "Estado"]
    filas = []
    tot_cobrado = 0.0

    for p in pagos:
        res = reservas.get(p.id_reserva)
        doc = res.id_cliente if res else "—"
        cli = clientes.get(doc.lower()) if doc != "—" else None
        monto = float(p.monto)
        if p.is_active:
            tot_cobrado += monto

        filas.append([
            f"#{p.id_pago}",
            p.fecha_pago.strftime("%d/%m/%Y %H:%M"),
            f"Reserva #{p.id_reserva}",
            f"{cli.nombre} {cli.apellido}" if cli else doc,
            doc,
            p.metodo_pago,
            p.referencia,
            round(monto, 2),
            "Activo" if p.is_active else "Anulado"
        ])

    fila_totales = ["TOTAL", "INGRESOS ACTIVOS EN CAJA", "", "", "", "", "", round(tot_cobrado, 2), ""]
    titulo = "Reporte de Pagos y Cobranzas Recibidas"
    subtitulo = "Relación detallada de abonos y liquidaciones por método de pago y número de referencia"
    kpis = [
        ("Pagos Activos", str(sum(1 for p in pagos if p.is_active))),
        ("Total Recaudado", f"${tot_cobrado:,.2f}"),
        ("Ticket Promedio Pago", f"${(tot_cobrado / max(sum(1 for p in pagos if p.is_active), 1)):,.2f}")
    ]

    if formato.lower() == "excel":
        contenido = _generar_excel_estilizado(titulo, subtitulo, kpis, columnas, filas, fila_totales, nombre_hoja="Pagos_Cobranzas")
        return contenido, "Reporte_Pagos_ViajesLaNena.xlsx"
    contenido = _generar_pdf_estilizado(titulo, subtitulo, kpis, columnas, filas, fila_totales, horizontal=True)
    return contenido, "Reporte_Pagos_ViajesLaNena.pdf"


# ==============================================================================
# 5. REPORTE DE AUDITORÍA Y TRAZABILIDAD
# ==============================================================================
def generar_reporte_auditoria(session: Session, formato: str = "pdf") -> tuple[bytes, str]:
    auditorias = session.exec(select(Auditoria).order_by(Auditoria.fecha_hora.desc())).all()
    usuarios = {u.id_usuario: u.nombre for u in session.exec(select(Usuario)).all()}

    columnas = ["ID", "Fecha y Hora", "Tabla Afectada", "Acción", "Usuario Responsable", "Detalle de la Operación"]
    filas = []

    for a in auditorias:
        filas.append([
            f"#{a.id_auditoria}",
            a.fecha_hora.strftime("%d/%m/%Y %H:%M:%S"),
            a.tabla_afectada,
            a.accion,
            usuarios.get(a.id_usuario, f"Usuario #{a.id_usuario}"),
            a.detalles
        ])

    titulo = "Bitácora Oficial de Auditoría y Trazabilidad del Sistema"
    subtitulo = "Registro inmutable de inserciones (INSERT), actualizaciones (UPDATE) y bajas lógicas (DELETE)"
    kpis = [
        ("Total Eventos", str(len(auditorias))),
        ("Creaciones (INSERT)", str(sum(1 for a in auditorias if a.accion == "INSERT"))),
        ("Ediciones (UPDATE)", str(sum(1 for a in auditorias if a.accion == "UPDATE"))),
        ("Bajas Lógicas (DELETE)", str(sum(1 for a in auditorias if a.accion == "DELETE")))
    ]

    if formato.lower() == "excel":
        contenido = _generar_excel_estilizado(titulo, subtitulo, kpis, columnas, filas, nombre_hoja="Auditoria")
        return contenido, "Reporte_Auditoria_ViajesLaNena.xlsx"
    contenido = _generar_pdf_estilizado(titulo, subtitulo, kpis, columnas, filas, horizontal=True)
    return contenido, "Reporte_Auditoria_ViajesLaNena.pdf"
