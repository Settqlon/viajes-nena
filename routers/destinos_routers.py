from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.destino_esquemas import DestinoCreate, DestinoResponse, DestinoUpdate, DestinoPut
from servicios.auth_servicio import verificar_admin, verificar_admin_u_operador
from servicios.destinos_servicios import (
    crear_destino,
    obtener_destinos,
    obtener_destino_por_id,
    reemplazar_destino,
    actualizar_destino,
    desactivar_destino
)

router = APIRouter(prefix="/destinos", tags=["Destinos Turísticos"])

@router.post("/", response_model=DestinoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_admin_u_operador)])
def registrar_destino(datos: DestinoCreate, session: Session = Depends(get_session)):
    return crear_destino(session, datos)

@router.get("/", response_model=list[DestinoResponse])
def listar_destinos(session: Session = Depends(get_session)):
    return obtener_destinos(session)

@router.get("/{id_destino}", response_model=DestinoResponse)
def obtener_destino(id_destino: int, session: Session = Depends(get_session)):
    return obtener_destino_por_id(session, id_destino)

@router.put("/{id_destino}", response_model=DestinoResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_destino_completo(id_destino: int, datos: DestinoPut, session: Session = Depends(get_session)):
    return reemplazar_destino(session, id_destino, datos)

@router.patch("/{id_destino}", response_model=DestinoResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_destino_parcial(id_destino: int, datos: DestinoUpdate, session: Session = Depends(get_session)):
    return actualizar_destino(session, id_destino, datos)

@router.delete("/{id_destino}", response_model=DestinoResponse, dependencies=[Depends(verificar_admin)])
def eliminar_destino(id_destino: int, session: Session = Depends(get_session)):
    return desactivar_destino(session, id_destino)