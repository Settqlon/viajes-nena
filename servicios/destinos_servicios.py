from sqlmodel import Session, select
from fastapi import HTTPException, status
from modelos.modelos import Destino
from esquemas.destino_esquemas import DestinoCreate, DestinoUpdate, DestinoPut

def crear_destino(session: Session, datos: DestinoCreate) -> Destino:
    nuevo_destino = Destino(
        nombre_destino=datos.nombre_destino,
        descripcion=datos.descripcion,
        precio_base=datos.precio_base
    )
    session.add(nuevo_destino)
    session.commit()
    session.refresh(nuevo_destino)
    return nuevo_destino

def obtener_destinos(session: Session) -> list[Destino]:
    return session.exec(select(Destino)).all()

def obtener_destino_por_id(session: Session, id_destino: int) -> Destino:
    destino = session.get(Destino, id_destino)
    if not destino:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Destino no encontrado"
        )
    return destino

def reemplazar_destino(session: Session, id_destino: int, datos: DestinoPut) -> Destino:
    destino = obtener_destino_por_id(session, id_destino)
    
    destino.nombre_destino = datos.nombre_destino
    destino.descripcion = datos.descripcion
    destino.precio_base = datos.precio_base
    destino.is_active = datos.is_active
    
    session.add(destino)
    session.commit()
    session.refresh(destino)
    return destino

def actualizar_destino(session: Session, id_destino: int, datos: DestinoUpdate) -> Destino:
    destino = obtener_destino_por_id(session, id_destino)
    datos_dict = datos.model_dump(exclude_unset=True)
    
    for key, value in datos_dict.items():
        setattr(destino, key, value)
        
    session.add(destino)
    session.commit()
    session.refresh(destino)
    return destino

def desactivar_destino(session: Session, id_destino: int) -> Destino:
    destino = obtener_destino_por_id(session, id_destino)
    destino.is_active = False
    
    session.add(destino)
    session.commit()
    session.refresh(destino)
    return destino