from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

class InconvenienteCreate(BaseModel):
    id_viaje: int
    descripcion: str = Field(max_length=255)
    monto_descontado: Decimal = Field(ge=0, decimal_places=2)

class InconvenientePut(BaseModel):
    id_viaje: int
    descripcion: str = Field(max_length=255)
    monto_descontado: Decimal = Field(ge=0, decimal_places=2)
    is_active: bool

class InconvenienteUpdate(BaseModel):
    id_viaje: Optional[int] = None
    descripcion: Optional[str] = Field(default=None, max_length=255)
    monto_descontado: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    is_active: Optional[bool] = None

class InconvenienteResponse(BaseModel):
    id_inconveniente: int
    id_viaje: int
    descripcion: str
    monto_descontado: Decimal
    fecha_reporte: datetime
    is_active: bool

    class Config:
        from_attributes = True