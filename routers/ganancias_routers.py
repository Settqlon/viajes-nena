from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.ganancias_esquemas import GananciaCreate, GananciaResponse, GananciaUpdate, GananciaPut
from servicios.auth_servicio import verificar_admin
from servicios.ganancias_servicios import (
    crear_ganancia,
    obtener_ganancias,
    obtener_ganancia_por_id,
    reemplazar_ganancia,
    actualizar_ganancia,
    desactivar_ganancia
)

router = APIRouter(prefix="/ganancias", tags=["Gestión de Ganancias"])

@router.post("/", response_model=GananciaResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_admin)])
def registrar_ganancia(datos: GananciaCreate, session: Session = Depends(get_session)):
    return crear_ganancia(session, datos)

@router.get("/", response_model=list[GananciaResponse])
def listar_ganancias(session: Session = Depends(get_session)):
    return obtener_ganancias(session)

@router.get("/{id_ganancia}", response_model=GananciaResponse)
def obtener_ganancia(id_ganancia: int, session: Session = Depends(get_session)):
    return obtener_ganancia_por_id(session, id_ganancia)

@router.put("/{id_ganancia}", response_model=GananciaResponse, dependencies=[Depends(verificar_admin)])
def modificar_ganancia_completa(id_ganancia: int, datos: GananciaPut, session: Session = Depends(get_session)):
    return reemplazar_ganancia(session, id_ganancia, datos)

@router.patch("/{id_ganancia}", response_model=GananciaResponse, dependencies=[Depends(verificar_admin)])
def modificar_ganancia_parcial(id_ganancia: int, datos: GananciaUpdate, session: Session = Depends(get_session)):
    return actualizar_ganancia(session, id_ganancia, datos)

@router.delete("/{id_ganancia}", response_model=GananciaResponse, dependencies=[Depends(verificar_admin)])
def eliminar_ganancia_logica(id_ganancia: int, session: Session = Depends(get_session)):
    return desactivar_ganancia(session, id_ganancia)