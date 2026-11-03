from sqlmodel import Session, select, func
from fastapi import HTTPException, status
from modelos.modelos import Cliente, Integrante
from esquemas.clientes_esquemas import ClienteCreate, ClienteUpdate, ClientePut
from servicios.auditoria_servicios import registrar_auditoria


def _validar_unicidad_cliente(
    session: Session,
    correo: str | None = None,
    telefono: str | None = None,
    excluir_id: str | None = None
) -> None:
    if correo:
        correo_limpio = correo.strip().lower()
        stmt_correo = select(Cliente).where(func.lower(Cliente.correo_electronico) == correo_limpio)
        if excluir_id:
            stmt_correo = stmt_correo.where(func.lower(Cliente.id_cliente) != excluir_id.strip().lower())
        existente_correo = session.exec(stmt_correo).first()
        if existente_correo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El correo electrónico '{correo}' ya está registrado por otro cliente ({existente_correo.id_cliente})."
            )

    if telefono:
        tel_limpio = telefono.strip()
        stmt_tel = select(Cliente).where(Cliente.telefono == tel_limpio)
        if excluir_id:
            stmt_tel = stmt_tel.where(func.lower(Cliente.id_cliente) != excluir_id.strip().lower())
        existente_tel = session.exec(stmt_tel).first()
        if existente_tel:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El número de teléfono '{telefono}' ya está registrado por otro cliente ({existente_tel.id_cliente})."
            )


def crear_cliente(session: Session, datos: ClienteCreate) -> Cliente:
    id_limpio = datos.id_cliente.strip()
    existente_doc = session.exec(
        select(Cliente).where(func.lower(Cliente.id_cliente) == id_limpio.lower())
    ).first()
    if existente_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un cliente registrado con ese documento de identidad."
        )

    integrante_menor = session.exec(
        select(Integrante)
        .where(func.lower(Integrante.documento_id) == id_limpio.lower())
        .where(Integrante.edad < 18)
    ).first()
    if integrante_menor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El documento '{id_limpio}' está registrado como menor de edad ({integrante_menor.edad} años). El cliente titular debe ser mayor de 18 años."
        )

    _validar_unicidad_cliente(
        session,
        correo=datos.correo_electronico,
        telefono=datos.telefono
    )

    nuevo_cliente = Cliente(
        id_cliente=id_limpio,
        tipo_documento=datos.tipo_documento or "Cédula",
        nombre=datos.nombre.strip(),
        apellido=datos.apellido.strip(),
        telefono=datos.telefono.strip(),
        correo_electronico=datos.correo_electronico.strip().lower(),
        direccion=datos.direccion.strip()
    )
    session.add(nuevo_cliente)
    session.commit()
    session.refresh(nuevo_cliente)
    registrar_auditoria(
        session,
        "clientes",
        "INSERT",
        f"Nuevo Cliente {nuevo_cliente.id_cliente} ({nuevo_cliente.nombre} {nuevo_cliente.apellido})"
    )
    return nuevo_cliente


def obtener_clientes(session: Session) -> list[Cliente]:
    return session.exec(select(Cliente)).all()


def obtener_cliente_por_id(session: Session, id_cliente: str) -> Cliente:
    cliente = session.get(Cliente, id_cliente)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    return cliente


def reemplazar_cliente(session: Session, id_cliente: str, datos: ClientePut) -> Cliente:
    cliente = obtener_cliente_por_id(session, id_cliente)

    _validar_unicidad_cliente(
        session,
        correo=datos.correo_electronico,
        telefono=datos.telefono,
        excluir_id=id_cliente
    )

    cliente.nombre = datos.nombre.strip()
    cliente.apellido = datos.apellido.strip()
    cliente.tipo_documento = datos.tipo_documento or cliente.tipo_documento or "Cédula"
    cliente.telefono = datos.telefono.strip()
    cliente.correo_electronico = datos.correo_electronico.strip().lower()
    cliente.direccion = datos.direccion.strip()
    cliente.is_active = datos.is_active

    session.add(cliente)
    session.commit()
    session.refresh(cliente)
    return cliente


def actualizar_cliente(session: Session, id_cliente: str, datos: ClienteUpdate) -> Cliente:
    cliente = obtener_cliente_por_id(session, id_cliente)
    datos_dict = datos.model_dump(exclude_unset=True)

    _validar_unicidad_cliente(
        session,
        correo=datos_dict.get("correo_electronico"),
        telefono=datos_dict.get("telefono"),
        excluir_id=id_cliente
    )

    for key, value in datos_dict.items():
        if isinstance(value, str):
            value = value.strip()
            if key == "correo_electronico":
                value = value.lower()
        setattr(cliente, key, value)

    session.add(cliente)
    session.commit()
    session.refresh(cliente)
    registrar_auditoria(
        session,
        "clientes",
        "UPDATE",
        f"Actualización de Cliente {cliente.id_cliente} ({cliente.nombre} {cliente.apellido}, Activo: {cliente.is_active})"
    )
    return cliente


def desactivar_cliente(session: Session, id_cliente: str) -> Cliente:
    cliente = obtener_cliente_por_id(session, id_cliente)
    cliente.is_active = False

    session.add(cliente)
    session.commit()
    session.refresh(cliente)
    registrar_auditoria(
        session,
        "clientes",
        "DELETE",
        f"Baja lógica de Cliente {cliente.id_cliente} ({cliente.nombre} {cliente.apellido})"
    )
    return cliente
