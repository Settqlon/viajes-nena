from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.clientes_esquemas import ClienteCreate, ClienteResponse, ClienteUpdate, ClientePut
from servicios.auth_servicio import verificar_admin, verificar_personal
from servicios.clientes_servicios import (
    crear_cliente,
    obtener_clientes,
    obtener_cliente_por_id,
    reemplazar_cliente,
    actualizar_cliente,
    desactivar_cliente
)

router = APIRouter(prefix="/clientes", tags=["Gestión de Clientes"])

@router.post("/", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def registrar_cliente(datos: ClienteCreate, session: Session = Depends(get_session)):
    return crear_cliente(session, datos)

@router.get("/", response_model=list[ClienteResponse])
def listar_clientes(session: Session = Depends(get_session)):
    return obtener_clientes(session)

@router.get("/{id_cliente}", response_model=ClienteResponse)
def obtener_cliente(id_cliente: str, session: Session = Depends(get_session)):
    return obtener_cliente_por_id(session, id_cliente)

@router.put("/{id_cliente}", response_model=ClienteResponse, dependencies=[Depends(verificar_personal)])
def modificar_cliente_completo(id_cliente: str, datos: ClientePut, session: Session = Depends(get_session)):
    return reemplazar_cliente(session, id_cliente, datos)

@router.patch("/{id_cliente}", response_model=ClienteResponse, dependencies=[Depends(verificar_personal)])
def modificar_cliente_parcial(id_cliente: str, datos: ClienteUpdate, session: Session = Depends(get_session)):
    return actualizar_cliente(session, id_cliente, datos)

@router.delete("/{id_cliente}", response_model=ClienteResponse, dependencies=[Depends(verificar_admin)])
def eliminar_cliente_logico(id_cliente: str, session: Session = Depends(get_session)):
    return desactivar_cliente(session, id_cliente)