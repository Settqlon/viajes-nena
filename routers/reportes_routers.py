import unicodedata
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlmodel import Session
from database.conexion import get_session
from servicios.auth_servicio import verificar_personal
from servicios.reportes_servicios import (
    generar_reporte_manifiesto,
    generar_reporte_financiero,
    generar_reporte_reservas,
    generar_reporte_pagos,
    generar_reporte_auditoria
)

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes Ejecutivos Excel y PDF"],
    dependencies=[Depends(verificar_personal)]
)


def _respuesta_archivo(contenido: bytes, nombre_archivo: str, formato: str) -> Response:
    nombre_seguro = unicodedata.normalize("NFKD", nombre_archivo).encode("ascii", "ignore").decode("ascii")
    media_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if formato.lower() == "excel"
        else "application/pdf"
    )
    return Response(
        content=contenido,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{nombre_seguro}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/manifiesto/{id_viaje}")
def descargar_reporte_manifiesto(
    id_viaje: int,
    formato: str = Query("pdf", pattern="^(pdf|excel)$"),
    session: Session = Depends(get_session)
):
    contenido, nombre = generar_reporte_manifiesto(session, id_viaje, formato)
    return _respuesta_archivo(contenido, nombre, formato)


@router.get("/financiero")
def descargar_reporte_financiero(
    formato: str = Query("pdf", pattern="^(pdf|excel)$"),
    session: Session = Depends(get_session)
):
    contenido, nombre = generar_reporte_financiero(session, formato)
    return _respuesta_archivo(contenido, nombre, formato)


@router.get("/reservas")
def descargar_reporte_reservas(
    formato: str = Query("pdf", pattern="^(pdf|excel)$"),
    session: Session = Depends(get_session)
):
    contenido, nombre = generar_reporte_reservas(session, formato)
    return _respuesta_archivo(contenido, nombre, formato)


@router.get("/pagos")
def descargar_reporte_pagos(
    formato: str = Query("pdf", pattern="^(pdf|excel)$"),
    session: Session = Depends(get_session)
):
    contenido, nombre = generar_reporte_pagos(session, formato)
    return _respuesta_archivo(contenido, nombre, formato)


@router.get("/auditoria")
def descargar_reporte_auditoria(
    formato: str = Query("pdf", pattern="^(pdf|excel)$"),
    session: Session = Depends(get_session)
):
    contenido, nombre = generar_reporte_auditoria(session, formato)
    return _respuesta_archivo(contenido, nombre, formato)
