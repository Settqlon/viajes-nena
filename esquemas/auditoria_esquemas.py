from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AuditoriaUpdate(BaseModel):
    is_active: Optional[bool] = None
    detalles: Optional[str] = None


class AuditoriaResponse(BaseModel):
    id_auditoria: int
    tabla_afectada: Optional[str]
    accion: Optional[str]
    id_usuario: Optional[int]
    detalles: Optional[str]
    fecha_hora: datetime
    is_active: bool

    class Config:
        from_attributes = True
