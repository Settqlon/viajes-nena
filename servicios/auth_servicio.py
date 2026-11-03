from sqlmodel import Session, select
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from modelos.modelos import Usuario
from esquemas.auth_esquemas import UsuarioCreate, UsuarioUpdate, UsuarioPut

SECRET_KEY = "tu_clave_secreta_viajes_nena"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def obtener_hash_contrasena(contrasena_plana: str) -> str:
    return pwd_context.hash(contrasena_plana)

def verificar_contrasena(contrasena_plana: str, contrasena_hash: str) -> bool:
    return pwd_context.verify(contrasena_plana, contrasena_hash)

def crear_token_acceso(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verificar_autenticado(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

ROLES_SISTEMA = ["Admin", "Operador", "Vendedor"]

def requerir_roles(roles_permitidos: list[str]):
    def dependency(token: str = Depends(oauth2_scheme)) -> dict:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            rol = payload.get("rol")
            if rol not in roles_permitidos:
                roles_str = " o ".join(roles_permitidos)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Operación denegada. Se requiere rol de {roles_str}. Tu rol actual es: {rol}."
                )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    return dependency

verificar_admin = requerir_roles(["Admin"])
verificar_admin_u_operador = requerir_roles(["Admin", "Operador"])
verificar_admin_o_vendedor = requerir_roles(["Admin", "Vendedor"])
verificar_personal = requerir_roles(["Admin", "Operador", "Vendedor"])

def autenticar_usuario(session: Session, correo: str, contrasena: str) -> Usuario:
    statement = select(Usuario).where(Usuario.correo_electronico == correo)
    usuario = session.exec(statement).first()
    
    if not usuario or not verificar_contrasena(contrasena, usuario.contrasena):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
        
    if not usuario.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario está inactivo o dado de baja"
        )

    return usuario

def obtener_usuarios(session: Session) -> list[Usuario]:
    return session.exec(select(Usuario)).all()

def crear_nuevo_usuario(session: Session, nuevo_usuario: UsuarioCreate) -> Usuario:
    statement = select(Usuario).where(Usuario.correo_electronico == nuevo_usuario.correo_electronico)
    if session.exec(statement).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado"
        )
    
    hash_password = obtener_hash_contrasena(nuevo_usuario.contrasena)
    
    usuario_db = Usuario(
        nombre=nuevo_usuario.nombre,
        correo_electronico=nuevo_usuario.correo_electronico,
        contrasena=hash_password,
        rol=nuevo_usuario.rol,
        estatus=getattr(nuevo_usuario, 'estatus', "Activo")
    )
    
    session.add(usuario_db)
    session.commit()
    session.refresh(usuario_db)
    return usuario_db

def reemplazar_usuario(session: Session, id_usuario: int, datos: UsuarioPut) -> Usuario:
    usuario = session.get(Usuario, id_usuario)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    
    usuario.nombre = datos.nombre
    usuario.correo_electronico = datos.correo_electronico
    usuario.contrasena = obtener_hash_contrasena(datos.contrasena)
    usuario.rol = datos.rol
    usuario.estatus = datos.estatus
        
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario

def actualizar_usuario(session: Session, id_usuario: int, datos: UsuarioUpdate) -> Usuario:
    usuario = session.get(Usuario, id_usuario)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    
    datos_dict = datos.model_dump(exclude_unset=True)
    
    if "contrasena" in datos_dict:
        datos_dict["contrasena"] = obtener_hash_contrasena(datos_dict["contrasena"])
        
    for key, value in datos_dict.items():
        setattr(usuario, key, value)
        
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario

def desactivar_usuario(session: Session, id_usuario: int) -> Usuario:
    usuario = session.get(Usuario, id_usuario)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    
    usuario.is_active = False
    
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario