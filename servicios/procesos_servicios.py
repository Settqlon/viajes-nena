from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import Proceso, Usuario
from esquemas.procesos_esquemas import ProcesoCreate, ProcesoUpdate, ProcesoPut

def crear_proceso(session: Session, datos: ProcesoCreate) -> Proceso:
    if not session.get(Usuario, datos.id_usu):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Usuario inexistente."
        )
        
    nuevo_proceso = Proceso(
        id_usu=datos.id_usu,
        nom_pro=datos.nom_pro,
        fec_inicio=datos.fec_inicio,
        fec_fin=datos.fec_fin,
        est_pro=datos.estatus if hasattr(datos, 'estatus') else datos.est_pro,
        det_pro=datos.det_pro
    )
    session.add(nuevo_proceso)
    session.commit()
    session.refresh(nuevo_proceso)
    return nuevo_proceso

def obtener_procesos(session: Session) -> list[Proceso]:
    return session.exec(select(Proceso)).all()

def obtener_proceso_por_id(session: Session, id_pro: int) -> Proceso:
    proceso = session.get(Proceso, id_pro)
    if not proceso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Error 404 (Not Found): Proceso inexistente."
        )
    return proceso

def reemplazar_proceso(session: Session, id_pro: int, datos: ProcesoPut) -> Proceso:
    proceso = obtener_proceso_por_id(session, id_pro)
    
    if not session.get(Usuario, datos.id_usu):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Error 404 (Not Found): Usuario inexistente."
        )
        
    proceso.id_usu = datos.id_usu
    proceso.nom_pro = datos.nom_pro
    proceso.fec_inicio = datos.fec_inicio
    proceso.fec_fin = datos.fec_fin
    proceso.est_pro = datos.est_pro
    proceso.det_pro = datos.det_pro
    proceso.act_pro = datos.act_pro
    
    session.add(proceso)
    session.commit()
    session.refresh(proceso)
    return proceso

def actualizar_proceso(session: Session, id_pro: int, datos: ProcesoUpdate) -> Proceso:
    proceso = obtener_proceso_por_id(session, id_pro)
    datos_dict = datos.model_dump(exclude_unset=True)
    
    if "id_usu" in datos_dict and not session.get(Usuario, datos_dict["id_usu"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Error 404 (Not Found): Usuario inexistente."
        )
    
    for key, value in datos_dict.items():
        setattr(proceso, key, value)
        
    session.add(proceso)
    session.commit()
    session.refresh(proceso)
    return proceso

def desactivar_proceso(session: Session, id_pro: int) -> Proceso:
    proceso = obtener_proceso_por_id(session, id_pro)
    proceso.act_pro = False  # Baja lógica usando el campo correcto del modelo
    
    session.add(proceso)
    session.commit()
    session.refresh(proceso)
    return proceso