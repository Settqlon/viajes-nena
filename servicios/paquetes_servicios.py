from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import Paquete, Destino
from esquemas.paquete_esquemas import PaqueteCreate, PaquetePut, PaqueteUpdate

def crear_paquete(session: Session, datos: PaqueteCreate) -> Paquete:
    if datos.id_destino and not session.get(Destino, datos.id_destino):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Destino inexistente."
        )
    
    nuevo_paquete = Paquete.model_validate(datos)
    session.add(nuevo_paquete)
    session.commit()
    session.refresh(nuevo_paquete)
    return nuevo_paquete

def obtener_paquetes(session: Session) -> list[Paquete]:
    return session.exec(select(Paquete)).all()

def obtener_paquete_por_id(session: Session, id_paquete: int) -> Paquete:
    paquete = session.get(Paquete, id_paquete)
    if not paquete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Paquete inexistente."
        )
    return paquete

def reemplazar_paquete(session: Session, id_paquete: int, datos: PaquetePut) -> Paquete:
    paquete = obtener_paquete_por_id(session, id_paquete)
    
    if datos.id_destino and not session.get(Destino, datos.id_destino):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error 404 (Not Found): Destino inexistente."
        )
    
    paquete.sqlmodel_update(datos.model_dump())
    session.add(paquete)
    session.commit()
    session.refresh(paquete)
    return paquete

def actualizar_paquete(session: Session, id_paquete: int, datos: PaqueteUpdate) -> Paquete:
    paquete = obtener_paquete_por_id(session, id_paquete)
    datos_dict = datos.model_dump(exclude_unset=True)
    
    if "id_destino" in datos_dict and datos_dict["id_destino"] is not None:
        if not session.get(Destino, datos_dict["id_destino"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error 404 (Not Found): Destino inexistente."
            )
            
    for key, value in datos_dict.items():
        setattr(paquete, key, value)
        
    session.add(paquete)
    session.commit()
    session.refresh(paquete)
    return paquete

def desactivar_paquete(session: Session, id_paquete: int) -> Paquete:
    paquete = obtener_paquete_por_id(session, id_paquete)
    paquete.is_active = False
    
    session.add(paquete)
    session.commit()
    session.refresh(paquete)
    return paquete