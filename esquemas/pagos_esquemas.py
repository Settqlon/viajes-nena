from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

class PagoCreate(BaseModel):
    id_reserva: int
    monto: Decimal = Field(ge=0, decimal_places=2)
    metodo_pago: str = Field(max_length=50)
    referencia: str = Field(max_length=100)

class PagoUpdate(BaseModel):
    metodo_pago: Optional[str] = Field(default=None, max_length=50)
    referencia: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None

class PagoResponse(BaseModel):
    id_pago: int
    id_reserva: int
    monto: Decimal
    metodo_pago: str
    referencia: str
    fecha_pago: datetime
    is_active: bool

    class Config:
        from_attributes = True
