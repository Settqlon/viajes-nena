from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from database.conexion import get_session
from esquemas.auth_esquemas import UsuarioCreate, UsuarioResponse, UsuarioUpdate, UsuarioPut
from servicios.auth_servicio import (
    autenticar_usuario,
    crear_token_acceso,
    crear_nuevo_usuario, obtener_usuarios,
    actualizar_usuario,
    reemplazar_usuario,
    desactivar_usuario,
    verificar_admin
)

router = APIRouter(prefix="/auth", tags=["Autenticación y Usuarios"])

@router.get("/", response_model=list[UsuarioResponse])
def listar_usuarios(session: Session = Depends(get_session)):
    return obtener_usuarios(session)

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    usuario = autenticar_usuario(session, form_data.username, form_data.password)
    token_jwt = crear_token_acceso(data={"sub": usuario.correo_electronico, "rol": usuario.rol})
    
    return {
        "access_token": token_jwt,
        "token_type": "bearer"
    }

@router.post("/registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def registrar_usuario(nuevo_usuario: UsuarioCreate, session: Session = Depends(get_session)):
    return crear_nuevo_usuario(session, nuevo_usuario)

@router.put("/{id_usuario}", response_model=UsuarioResponse, dependencies=[Depends(verificar_admin)])
def reemplazar_usuario_completo(id_usuario: int, datos: UsuarioPut, session: Session = Depends(get_session)):
    return reemplazar_usuario(session, id_usuario, datos)

@router.patch("/{id_usuario}", response_model=UsuarioResponse, dependencies=[Depends(verificar_admin)])
def modificar_usuario_parcial(id_usuario: int, datos: UsuarioUpdate, session: Session = Depends(get_session)):
    return actualizar_usuario(session, id_usuario, datos)

@router.delete("/{id_usuario}", response_model=UsuarioResponse, dependencies=[Depends(verificar_admin)])
def eliminar_usuario_logico(id_usuario: int, session: Session = Depends(get_session)):
    return desactivar_usuario(session, id_usuario)