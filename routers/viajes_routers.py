from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.viajes_esquemas import ViajeCreate, ViajeResponse, ViajeUpdate, ViajePut
from servicios.auth_servicio import verificar_admin, verificar_admin_u_operador
from servicios.viajes_servicios import (
    crear_viaje,
    obtener_viajes,
    obtener_viaje_por_id,
    reemplazar_viaje,
    actualizar_viaje,
    desactivar_viaje
)

router = APIRouter(prefix="/viajes", tags=["Gestión de Viajes"])

@router.post("/", response_model=ViajeResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_admin_u_operador)])
def registrar_viaje(datos: ViajeCreate, session: Session = Depends(get_session)):
    return crear_viaje(session, datos)

@router.get("/", response_model=list[ViajeResponse])
def listar_viajes(session: Session = Depends(get_session)):
    return obtener_viajes(session)

@router.get("/{id_viaje}", response_model=ViajeResponse)
def obtener_viaje(id_viaje: int, session: Session = Depends(get_session)):
    return obtener_viaje_por_id(session, id_viaje)

@router.put("/{id_viaje}", response_model=ViajeResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_viaje_completo(id_viaje: int, datos: ViajePut, session: Session = Depends(get_session)):
    return reemplazar_viaje(session, id_viaje, datos)

@router.patch("/{id_viaje}", response_model=ViajeResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_viaje_parcial(id_viaje: int, datos: ViajeUpdate, session: Session = Depends(get_session)):
    return actualizar_viaje(session, id_viaje, datos)

@router.delete("/{id_viaje}", response_model=ViajeResponse, dependencies=[Depends(verificar_admin)])
def eliminar_viaje_logico(id_viaje: int, session: Session = Depends(get_session)):
    return desactivar_viaje(session, id_viaje)