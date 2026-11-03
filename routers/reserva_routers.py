from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.reserva_esquemas import ReservaCreate, ReservaResponse, ReservaUpdate, ReservaPut
from servicios.auth_servicio import verificar_admin, verificar_autenticado
from servicios.reserva_servicios import (
    crear_reserva,
    obtener_reservas,
    obtener_reserva_por_id,
    reemplazar_reserva,
    actualizar_reserva,
    desactivar_reserva
)

router = APIRouter(prefix="/reservas", tags=["Gestión de Reservas"])

@router.post("/", response_model=ReservaResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_autenticado)])
@router.post("", response_model=ReservaResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_autenticado)])
def registrar_reserva(datos: ReservaCreate, session: Session = Depends(get_session)):
    return crear_reserva(session, datos)

@router.get("/", response_model=list[ReservaResponse])
@router.get("", response_model=list[ReservaResponse])
def listar_reservas(session: Session = Depends(get_session)):
    return obtener_reservas(session)

@router.get("/{id_reserva}", response_model=ReservaResponse)
def obtener_reserva(id_reserva: int, session: Session = Depends(get_session)):
    return obtener_reserva_por_id(session, id_reserva)

@router.put("/{id_reserva}", response_model=ReservaResponse, dependencies=[Depends(verificar_autenticado)])
def modificar_reserva_completa(id_reserva: int, datos: ReservaPut, session: Session = Depends(get_session)):
    return reemplazar_reserva(session, id_reserva, datos)

@router.patch("/{id_reserva}", response_model=ReservaResponse, dependencies=[Depends(verificar_autenticado)])
def modificar_reserva_parcial(id_reserva: int, datos: ReservaUpdate, session: Session = Depends(get_session)):
    return actualizar_reserva(session, id_reserva, datos)

@router.delete("/{id_reserva}", response_model=ReservaResponse, dependencies=[Depends(verificar_admin)])
def eliminar_reserva_logica(id_reserva: int, session: Session = Depends(get_session)):
    return desactivar_reserva(session, id_reserva)
