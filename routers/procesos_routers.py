from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from database.conexion import get_session
from esquemas.procesos_esquemas import ProcesoCreate, ProcesoResponse, ProcesoUpdate, ProcesoPut
from servicios.auth_servicio import verificar_admin
from servicios.procesos_servicios import (
    crear_proceso,
    obtener_procesos,
    obtener_proceso_por_id,
    reemplazar_proceso,
    actualizar_proceso,
    desactivar_proceso
)

router = APIRouter(prefix="/procesos", tags=["Gestión de Procesos"])

@router.post("/", response_model=ProcesoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verificar_admin)])
def registrar_proceso(datos: ProcesoCreate, session: Session = Depends(get_session)):
    return crear_proceso(session, datos)

@router.get("/", response_model=list[ProcesoResponse])
def listar_procesos(session: Session = Depends(get_session)):
    return obtener_procesos(session)

@router.get("/{id_pro}", response_model=ProcesoResponse)
def obtener_proceso(id_pro: int, session: Session = Depends(get_session)):
    return obtener_proceso_por_id(session, id_pro)

@router.put("/{id_pro}", response_model=ProcesoResponse, dependencies=[Depends(verificar_admin)])
def modificar_proceso_completo(id_pro: int, datos: ProcesoPut, session: Session = Depends(get_session)):
    return reemplazar_proceso(session, id_pro, datos)

@router.patch("/{id_pro}", response_model=ProcesoResponse, dependencies=[Depends(verificar_admin)])
def modificar_proceso_parcial(id_pro: int, datos: ProcesoUpdate, session: Session = Depends(get_session)):
    return actualizar_proceso(session, id_pro, datos)

@router.delete("/{id_pro}", response_model=ProcesoResponse, dependencies=[Depends(verificar_admin)])
def eliminar_proceso_logico(id_pro: int, session: Session = Depends(get_session)):
    return desactivar_proceso(session, id_pro)