from pydantic import BaseModel, Field, EmailStr
from typing import Optional

REGEX_LETRAS = r"^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$"
# El titular de la reserva siempre es mayor de edad: se identifica con Cédula o Pasaporte
REGEX_TIPO_DOC_TITULAR = r"^(Cédula|Pasaporte)$"

class ClienteCreate(BaseModel):
    id_cliente: str = Field(max_length=20)
    tipo_documento: Optional[str] = Field(default="Cédula", pattern=REGEX_TIPO_DOC_TITULAR)
    nombre: str = Field(pattern=REGEX_LETRAS)
    apellido: str = Field(pattern=REGEX_LETRAS)
    telefono: str = Field(max_length=50)
    correo_electronico: EmailStr
    direccion: str = Field(max_length=255)

class ClientePut(BaseModel):
    tipo_documento: Optional[str] = Field(default="Cédula", pattern=REGEX_TIPO_DOC_TITULAR)
    nombre: str = Field(pattern=REGEX_LETRAS)
    apellido: str = Field(pattern=REGEX_LETRAS)
    telefono: str = Field(max_length=50)
    correo_electronico: EmailStr
    direccion: str = Field(max_length=255)
    is_active: bool

class ClienteUpdate(BaseModel):
    tipo_documento: Optional[str] = Field(default=None, pattern=REGEX_TIPO_DOC_TITULAR)
    nombre: Optional[str] = Field(default=None, pattern=REGEX_LETRAS)
    apellido: Optional[str] = Field(default=None, pattern=REGEX_LETRAS)
    telefono: Optional[str] = Field(default=None, max_length=50)
    correo_electronico: Optional[EmailStr] = None
    direccion: Optional[str] = Field(default=None, max_length=255)
    is_active: Optional[bool] = None

class ClienteResponse(BaseModel):
    id_cliente: str
    tipo_documento: Optional[str] = "Cédula"
    nombre: str
    apellido: str
    telefono: str
    correo_electronico: EmailStr
    direccion: str
    is_active: bool

    class Config:
        from_attributes = True
