from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.pagos_esquemas import PagoCreate, PagoResponse, PagoUpdate
from servicios.auth_servicio import verificar_admin, verificar_autenticado
from servicios.pagos_servicios import (
    crear_pago,
    obtener_pagos,
    obtener_pago_por_id,
    actualizar_pago,
    desactivar_pago
)

router = APIRouter(prefix="/pagos", tags=["Gestión de Pagos"])

@router.post("/", response_model=PagoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_autenticado)])
@router.post("", response_model=PagoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_autenticado)])
def registrar_pago(datos: PagoCreate, session: Session = Depends(get_session)):
    return crear_pago(session, datos)

@router.get("/", response_model=list[PagoResponse])
@router.get("", response_model=list[PagoResponse])
def listar_pagos(session: Session = Depends(get_session)):
    return obtener_pagos(session)

@router.get("/{id_pago}", response_model=PagoResponse)
def obtener_pago(id_pago: int, session: Session = Depends(get_session)):
    return obtener_pago_por_id(session, id_pago)

@router.patch("/{id_pago}", response_model=PagoResponse, dependencies=[Depends(verificar_autenticado)])
def modificar_pago_parcial(id_pago: int, datos: PagoUpdate, session: Session = Depends(get_session)):
    return actualizar_pago(session, id_pago, datos)

@router.delete("/{id_pago}", response_model=PagoResponse, dependencies=[Depends(verificar_admin)])
def eliminar_pago_logico(id_pago: int, session: Session = Depends(get_session)):
    return desactivar_pago(session, id_pago)
