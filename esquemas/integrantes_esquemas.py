from pydantic import BaseModel, Field
from typing import Optional

REGEX_LETRAS = r"^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$"
# Tipos de identificación aceptados en Venezuela para viajar
REGEX_TIPO_DOCUMENTO = r"^(Cédula|Pasaporte|Sin Documento)$"

class IntegranteCreate(BaseModel):
    id_reserva: int
    nombre: str = Field(pattern=REGEX_LETRAS, max_length=100)
    apellido: str = Field(pattern=REGEX_LETRAS, max_length=100)
    # Para menores "Sin Documento" puede venir vacío: el sistema genera MENOR-<doc representante>-<n>
    documento_id: Optional[str] = Field(default="", max_length=50)
    tipo_documento: Optional[str] = Field(default="Cédula", pattern=REGEX_TIPO_DOCUMENTO)
    edad: int = Field(ge=0)
    numero_asiento: Optional[int] = Field(default=None, ge=1)

class IntegrantePut(BaseModel):
    id_reserva: int
    nombre: str = Field(pattern=REGEX_LETRAS, max_length=100)
    apellido: str = Field(pattern=REGEX_LETRAS, max_length=100)
    documento_id: Optional[str] = Field(default="", max_length=50)
    tipo_documento: Optional[str] = Field(default="Cédula", pattern=REGEX_TIPO_DOCUMENTO)
    edad: int = Field(ge=0)
    numero_asiento: Optional[int] = Field(default=None, ge=1)
    is_active: bool

class IntegranteUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, pattern=REGEX_LETRAS, max_length=100)
    apellido: Optional[str] = Field(default=None, pattern=REGEX_LETRAS, max_length=100)
    documento_id: Optional[str] = Field(default=None, max_length=50)
    tipo_documento: Optional[str] = Field(default=None, pattern=REGEX_TIPO_DOCUMENTO)
    edad: Optional[int] = Field(default=None, ge=0)
    numero_asiento: Optional[int] = Field(default=None, ge=1)
    is_active: Optional[bool] = None

class IntegranteResponse(BaseModel):
    id_integrante: int
    id_reserva: int
    nombre: str
    apellido: str
    documento_id: str
    tipo_documento: Optional[str] = "Cédula"
    edad: int
    numero_asiento: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True
