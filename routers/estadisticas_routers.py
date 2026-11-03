from fastapi import APIRouter, Depends
from sqlmodel import Session
from database.conexion import get_session
from servicios.auth_servicio import verificar_admin
from servicios.estadisticas_servicios import (
    obtener_resumen_completo,
    obtener_kpis,
    obtener_top_destinos,
    obtener_top_paquetes,
    obtener_viaje_mas_vendido,
    obtener_ingresos_por_mes
)

router = APIRouter(prefix="/estadisticas", tags=["Estadísticas del Sistema"])

@router.get("/resumen", dependencies=[Depends(verificar_admin)])
def resumen_general(session: Session = Depends(get_session)):
    return obtener_resumen_completo(session)

@router.get("/kpis", dependencies=[Depends(verificar_admin)])
def indicadores(session: Session = Depends(get_session)):
    return obtener_kpis(session)

@router.get("/destinos-top", dependencies=[Depends(verificar_admin)])
def destinos_mas_vendidos(limite: int = 5, session: Session = Depends(get_session)):
    return obtener_top_destinos(session, limite)

@router.get("/paquetes-top", dependencies=[Depends(verificar_admin)])
def paquetes_mas_vendidos(limite: int = 5, session: Session = Depends(get_session)):
    return obtener_top_paquetes(session, limite)

@router.get("/viaje-mas-vendido", dependencies=[Depends(verificar_admin)])
def viaje_mas_vendido(session: Session = Depends(get_session)):
    return obtener_viaje_mas_vendido(session)

@router.get("/ingresos-mensuales", dependencies=[Depends(verificar_admin)])
def ingresos_mensuales(session: Session = Depends(get_session)):
    return obtener_ingresos_por_mes(session)
