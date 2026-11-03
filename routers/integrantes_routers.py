from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.integrantes_esquemas import IntegranteCreate, IntegranteResponse, IntegranteUpdate, IntegrantePut
from servicios.auth_servicio import verificar_admin, verificar_personal
from servicios.integrantes_servicios import (
    crear_integrante,
    obtener_integrantes,
    obtener_integrante_por_id,
    reemplazar_integrante,
    actualizar_integrante,
    desactivar_integrante
)

router = APIRouter(prefix="/integrantes", tags=["Gestión de Integrantes"])

@router.post("/", response_model=IntegranteResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_personal)])
def registrar_integrante(datos: IntegranteCreate, session: Session = Depends(get_session)):
    return crear_integrante(session, datos)

@router.get("/", response_model=list[IntegranteResponse])
def listar_integrantes(session: Session = Depends(get_session)):
    return obtener_integrantes(session)

@router.get("/{id_integrante}", response_model=IntegranteResponse)
def obtener_integrante(id_integrante: int, session: Session = Depends(get_session)):
    return obtener_integrante_por_id(session, id_integrante)

@router.put("/{id_integrante}", response_model=IntegranteResponse, dependencies=[Depends(verificar_personal)])
def modificar_integrante_completo(id_integrante: int, datos: IntegrantePut, session: Session = Depends(get_session)):
    return reemplazar_integrante(session, id_integrante, datos)

@router.patch("/{id_integrante}", response_model=IntegranteResponse, dependencies=[Depends(verificar_personal)])
def modificar_integrante_parcial(id_integrante: int, datos: IntegranteUpdate, session: Session = Depends(get_session)):
    return actualizar_integrante(session, id_integrante, datos)

@router.delete("/{id_integrante}", response_model=IntegranteResponse, dependencies=[Depends(verificar_admin)])
def eliminar_integrante_logico(id_integrante: int, session: Session = Depends(get_session)):
    return desactivar_integrante(session, id_integrante)