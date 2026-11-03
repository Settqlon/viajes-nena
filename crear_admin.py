from sqlmodel import Session, select
from database.conexion import engine
from modelos.modelos import Usuario
from servicios.auth_servicio import obtener_hash_contrasena

USUARIOS_INICIALES = [
    {
        "nombre": "Administrador Principal",
        "correo_electronico": "admin@viajesnena.com",
        "contrasena": "admin12345",
        "rol": "Admin",
        "estatus": "Activo"
    },
    {
        "nombre": "Coordinador de Operaciones",
        "correo_electronico": "operador@viajesnena.com",
        "contrasena": "operador12345",
        "rol": "Operador",
        "estatus": "Activo"
    },
    {
        "nombre": "Asesor Comercial",
        "correo_electronico": "vendedor@viajesnena.com",
        "contrasena": "vendedor12345",
        "rol": "Vendedor",
        "estatus": "Activo"
    }
]

def inyectar_roles():
    with Session(engine) as session:
        for u in USUARIOS_INICIALES:
            existente = session.exec(select(Usuario).where(Usuario.correo_electronico == u["correo_electronico"])).first()
            hash_pass = obtener_hash_contrasena(u["contrasena"])
            if existente:
                existente.nombre = u["nombre"]
                existente.rol = u["rol"]
                existente.contrasena = hash_pass
                existente.is_active = True
                session.add(existente)
                print(f"[OK] Usuario actualizado: {u['correo_electronico']} ({u['rol']})")
            else:
                nuevo = Usuario(
                    nombre=u["nombre"],
                    correo_electronico=u["correo_electronico"],
                    contrasena=hash_pass,
                    rol=u["rol"],
                    estatus=u["estatus"],
                    is_active=True
                )
                session.add(nuevo)
                print(f"[OK] Usuario creado: {u['correo_electronico']} ({u['rol']})")
        session.commit()
        print("[EXITO] Los 3 roles esenciales han sido configurados correctamente.")

if __name__ == "__main__":
    inyectar_roles()
