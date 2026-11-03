from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal

class CostoViajeCreate(BaseModel):
    id_viaje: int
    descripcion: str = Field(max_length=255)
    monto: Decimal = Field(ge=0, decimal_places=2)

class CostoViajePut(BaseModel):
    id_viaje: int
    descripcion: str = Field(max_length=255)
    monto: Decimal = Field(ge=0, decimal_places=2)
    is_active: bool

class CostoViajeUpdate(BaseModel):
    id_viaje: Optional[int] = None
    descripcion: Optional[str] = Field(default=None, max_length=255)
    monto: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    is_active: Optional[bool] = None

class CostoViajeResponse(BaseModel):
    id_costo: int
    id_viaje: int
    descripcion: str
    monto: Decimal
    is_active: bool

    class Config:
        from_attributes = True