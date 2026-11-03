from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.paquete_esquemas import PaqueteCreate, PaqueteResponse, PaqueteUpdate, PaquetePut
from servicios.auth_servicio import verificar_admin, verificar_admin_u_operador
from servicios.paquetes_servicios import (
    crear_paquete,
    obtener_paquetes,
    obtener_paquete_por_id,
    reemplazar_paquete,
    actualizar_paquete,
    desactivar_paquete
)

router = APIRouter(prefix="/paquetes", tags=["Gestión de Paquetes"])

@router.post("/", response_model=PaqueteResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_admin_u_operador)])
def registrar_paquete(datos: PaqueteCreate, session: Session = Depends(get_session)):
    return crear_paquete(session, datos)

@router.get("/", response_model=list[PaqueteResponse])
def listar_paquetes(session: Session = Depends(get_session)):
    return obtener_paquetes(session)

@router.get("/{id_paquete}", response_model=PaqueteResponse)
def obtener_paquete(id_paquete: int, session: Session = Depends(get_session)):
    return obtener_paquete_por_id(session, id_paquete)

@router.put("/{id_paquete}", response_model=PaqueteResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_paquete_completo(id_paquete: int, datos: PaquetePut, session: Session = Depends(get_session)):
    return reemplazar_paquete(session, id_paquete, datos)

@router.patch("/{id_paquete}", response_model=PaqueteResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_paquete_parcial(id_paquete: int, datos: PaqueteUpdate, session: Session = Depends(get_session)):
    return actualizar_paquete(session, id_paquete, datos)

@router.delete("/{id_paquete}", response_model=PaqueteResponse, dependencies=[Depends(verificar_admin)])
def eliminar_paquete_logico(id_paquete: int, session: Session = Depends(get_session)):
    return desactivar_paquete(session, id_paquete)