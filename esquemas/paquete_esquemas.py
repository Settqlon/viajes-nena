from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal


class PaqueteCreate(BaseModel):
    id_destino: Optional[int] = None
    nombre_paquete: str = Field(min_length=3, max_length=150)
    resumen: Optional[str] = Field(default=None, max_length=255)
    descripcion: str
    incluye: Optional[str] = Field(default=None)
    no_incluye: Optional[str] = Field(default=None)
    condiciones: Optional[str] = Field(default=None)
    duracion_dias: int = Field(gt=0)
    duracion_noches: int = Field(ge=0)
    precio_paquete: Decimal = Field(gt=0, decimal_places=2)


class PaquetePut(BaseModel):
    id_destino: Optional[int] = None
    nombre_paquete: str = Field(min_length=3, max_length=150)
    resumen: Optional[str] = Field(default=None, max_length=255)
    descripcion: str
    incluye: Optional[str] = Field(default=None)
    no_incluye: Optional[str] = Field(default=None)
    condiciones: Optional[str] = Field(default=None)
    duracion_dias: int = Field(gt=0)
    duracion_noches: int = Field(ge=0)
    precio_paquete: Decimal = Field(gt=0, decimal_places=2)
    is_active: bool


class PaqueteUpdate(BaseModel):
    id_destino: Optional[int] = None
    nombre_paquete: Optional[str] = Field(default=None, min_length=3, max_length=150)
    resumen: Optional[str] = Field(default=None, max_length=255)
    descripcion: Optional[str] = None
    incluye: Optional[str] = None
    no_incluye: Optional[str] = None
    condiciones: Optional[str] = None
    duracion_dias: Optional[int] = Field(default=None, gt=0)
    duracion_noches: Optional[int] = Field(default=None, ge=0)
    precio_paquete: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    is_active: Optional[bool] = None


class PaqueteResponse(BaseModel):
    id_paquete: int
    id_destino: Optional[int]
    nombre_paquete: str
    resumen: Optional[str]
    descripcion: str
    incluye: Optional[str]
    no_incluye: Optional[str]
    condiciones: Optional[str]
    duracion_dias: int
    duracion_noches: int
    precio_paquete: Decimal
    is_active: bool

    class Config:
        from_attributes = True