from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.costos_viaje_esquemas import CostoViajeCreate, CostoViajeResponse, CostoViajeUpdate, CostoViajePut
from servicios.auth_servicio import verificar_admin, verificar_admin_u_operador
from servicios.costos_viaje_servicios import (
    crear_costo_viaje,
    obtener_costos_viaje,
    obtener_costo_viaje_por_id,
    reemplazar_costo_viaje,
    actualizar_costo_viaje,
    desactivar_costo_viaje
)

router = APIRouter(prefix="/costos-viaje", tags=["Gestión de Costos de Viaje"])

@router.post("/", response_model=CostoViajeResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_admin_u_operador)])
def registrar_costo_viaje(datos: CostoViajeCreate, session: Session = Depends(get_session)):
    return crear_costo_viaje(session, datos)

@router.get("/", response_model=list[CostoViajeResponse])
def listar_costos_viaje(session: Session = Depends(get_session)):
    return obtener_costos_viaje(session)

@router.get("/{id_costo}", response_model=CostoViajeResponse)
def obtener_costo_viaje(id_costo: int, session: Session = Depends(get_session)):
    return obtener_costo_viaje_por_id(session, id_costo)

@router.put("/{id_costo}", response_model=CostoViajeResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_costo_completo(id_costo: int, datos: CostoViajePut, session: Session = Depends(get_session)):
    return reemplazar_costo_viaje(session, id_costo, datos)

@router.patch("/{id_costo}", response_model=CostoViajeResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_costo_parcial(id_costo: int, datos: CostoViajeUpdate, session: Session = Depends(get_session)):
    return actualizar_costo_viaje(session, id_costo, datos)

@router.delete("/{id_costo}", response_model=CostoViajeResponse, dependencies=[Depends(verificar_admin)])
def eliminar_costo_logico(id_costo: int, session: Session = Depends(get_session)):
    return desactivar_costo_viaje(session, id_costo)