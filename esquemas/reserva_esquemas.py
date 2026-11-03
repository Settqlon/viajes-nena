from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

REGEX_LETRAS = r"^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$"
REGEX_TIPO_DOCUMENTO = r"^(Cédula|Pasaporte|Sin Documento)$"

class IntegranteReservaInput(BaseModel):
    nombre: str = Field(pattern=REGEX_LETRAS, max_length=100)
    apellido: str = Field(pattern=REGEX_LETRAS, max_length=100)
    # Vacío permitido solo para menores "Sin Documento" (se genera MENOR-<doc titular>-<n>)
    documento_id: Optional[str] = Field(default="", max_length=50)
    tipo_documento: Optional[str] = Field(default="Cédula", pattern=REGEX_TIPO_DOCUMENTO)
    edad: int = Field(ge=0)
    numero_asiento: Optional[int] = Field(default=None, ge=1)

class ReservaCreate(BaseModel):
    id_cliente: str
    id_viaje: int
    integrantes: list[IntegranteReservaInput] = Field(default_factory=list)
    monto_abono: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    metodo_pago: Optional[str] = Field(default="Transferencia", max_length=50)
    referencia: Optional[str] = Field(default="ABONO-INICIAL", max_length=100)
    monto_total: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    estatus_pago: Optional[str] = Field(default=None, max_length=50)

class ReservaPut(BaseModel):
    id_cliente: str
    id_viaje: int
    monto_total: Decimal = Field(ge=0, decimal_places=2)
    estatus_pago: str = Field(max_length=50)
    is_active: bool

class ReservaUpdate(BaseModel):
    id_cliente: Optional[str] = None
    id_viaje: Optional[int] = None
    monto_total: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    estatus_pago: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None

class ReservaResponse(BaseModel):
    id_reserva: int
    id_cliente: str
    id_viaje: int
    fecha_reserva: datetime
    monto_total: Decimal
    estatus_pago: str
    is_active: bool

    class Config:
        from_attributes = True
