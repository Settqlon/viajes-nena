from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal

class DestinoCreate(BaseModel):
    nombre_destino: str = Field(min_length=3, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    precio_base: Decimal = Field(gt=0, decimal_places=2)


class DestinoPut(BaseModel):
    nombre_destino: str = Field(min_length=3, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    precio_base: Decimal = Field(gt=0, decimal_places=2)
    is_active: bool


class DestinoUpdate(BaseModel):
    nombre_destino: Optional[str] = Field(default=None, min_length=3, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    precio_base: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    is_active: Optional[bool] = None


class DestinoResponse(BaseModel):
    id_destino: int
    nombre_destino: str
    descripcion: Optional[str]
    precio_base: Decimal
    is_active: bool

    class Config:
        from_attributes = True