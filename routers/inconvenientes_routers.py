from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.inconvenientes_esquemas import InconvenienteCreate, InconvenienteResponse, InconvenienteUpdate, InconvenientePut
from servicios.auth_servicio import verificar_admin, verificar_admin_u_operador
from servicios.inconvenientes_servicios import (
    crear_inconveniente,
    obtener_inconvenientes,
    obtener_inconveniente_por_id,
    reemplazar_inconveniente,
    actualizar_inconveniente,
    desactivar_inconveniente
)

router = APIRouter(prefix="/inconvenientes", tags=["Gestión de Inconvenientes"])

@router.post("/", response_model=InconvenienteResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_admin_u_operador)])
def registrar_inconveniente(datos: InconvenienteCreate, session: Session = Depends(get_session)):
    return crear_inconveniente(session, datos)

@router.get("/", response_model=list[InconvenienteResponse])
def listar_inconvenientes(session: Session = Depends(get_session)):
    return obtener_inconvenientes(session)

@router.get("/{id_inconveniente}", response_model=InconvenienteResponse)
def obtener_inconveniente(id_inconveniente: int, session: Session = Depends(get_session)):
    return obtener_inconveniente_por_id(session, id_inconveniente)

@router.put("/{id_inconveniente}", response_model=InconvenienteResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_inconveniente_completo(id_inconveniente: int, datos: InconvenientePut, session: Session = Depends(get_session)):
    return reemplazar_inconveniente(session, id_inconveniente, datos)

@router.patch("/{id_inconveniente}", response_model=InconvenienteResponse, dependencies=[Depends(verificar_admin_u_operador)])
def modificar_inconveniente_parcial(id_inconveniente: int, datos: InconvenienteUpdate, session: Session = Depends(get_session)):
    return actualizar_inconveniente(session, id_inconveniente, datos)

@router.delete("/{id_inconveniente}", response_model=InconvenienteResponse, dependencies=[Depends(verificar_admin)])
def eliminar_inconveniente_logico(id_inconveniente: int, session: Session = Depends(get_session)):
    return desactivar_inconveniente(session, id_inconveniente)