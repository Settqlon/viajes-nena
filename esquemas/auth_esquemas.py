from pydantic import BaseModel, EmailStr, Field
from typing import Optional

REGEX_LETRAS = r"^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$"

class UsuarioLogin(BaseModel):
    correo_electronico: EmailStr
    contrasena: str

class UsuarioCreate(BaseModel):
    nombre: str = Field(pattern=REGEX_LETRAS)
    correo_electronico: EmailStr
    contrasena: str
    rol: str = "Vendedor"

class UsuarioPut(BaseModel):
    nombre: str = Field(pattern=REGEX_LETRAS)
    correo_electronico: EmailStr
    contrasena: str
    rol: str
    estatus: str

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, pattern=REGEX_LETRAS)
    correo_electronico: Optional[EmailStr] = None
    contrasena: Optional[str] = None
    rol: Optional[str] = None
    estatus: Optional[str] = None
    is_active: Optional[bool] = None

class UsuarioResponse(BaseModel):
    id_usuario: int
    nombre: str
    correo_electronico: EmailStr
    rol: str
    estatus: str
    is_active: bool

    class Config:
        from_attributes = True
