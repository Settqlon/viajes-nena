from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

class GananciaCreate(BaseModel):
    id_viaje: int
    ingresos_totales: Decimal = Field(ge=0, decimal_places=2)
    costos_totales: Decimal = Field(ge=0, decimal_places=2)
    inconvenientes_totales: Decimal = Field(ge=0, decimal_places=2)
    ganancia_neta: Decimal = Field(decimal_places=2)  # Puede ser negativa si hubo pérdidas

class GananciaPut(BaseModel):
    id_viaje: int
    ingresos_totales: Decimal = Field(ge=0, decimal_places=2)
    costos_totales: Decimal = Field(ge=0, decimal_places=2)
    inconvenientes_totales: Decimal = Field(ge=0, decimal_places=2)
    ganancia_neta: Decimal = Field(decimal_places=2)
    is_active: bool

class GananciaUpdate(BaseModel):
    id_viaje: Optional[int] = None
    ingresos_totales: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    costos_totales: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    inconvenientes_totales: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    ganancia_neta: Optional[Decimal] = Field(default=None, decimal_places=2)
    is_active: Optional[bool] = None

class GananciaResponse(BaseModel):
    id_ganancia: int
    id_viaje: int
    ingresos_totales: Decimal
    costos_totales: Decimal
    inconvenientes_totales: Decimal
    ganancia_neta: Decimal
    fecha_calculo: datetime
    is_active: bool

    class Config:
        from_attributes = True