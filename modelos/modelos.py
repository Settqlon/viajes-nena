from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    id_usuario: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    correo_electronico: str
    contrasena: str
    rol: str
    estatus: str
    fecha_creacion: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)

    procesos: list["Proceso"] = Relationship(back_populates="usuario")
    auditorias: list["Auditoria"] = Relationship(back_populates="usuario")


class Cliente(SQLModel, table=True):
    __tablename__ = "clientes"

    id_cliente: str = Field(primary_key=True, max_length=20)
    # Tipo de identificación del titular: "Cédula" o "Pasaporte"
    tipo_documento: str = Field(default="Cédula")
    nombre: str
    apellido: str
    telefono: str
    correo_electronico: str
    direccion: str
    is_active: bool = Field(default=True)

    reservas: list["Reserva"] = Relationship(back_populates="cliente")


class Destino(SQLModel, table=True):
    __tablename__ = "destinos"

    id_destino: Optional[int] = Field(default=None, primary_key=True)
    nombre_destino: str
    descripcion: Optional[str] = Field(default=None)
    precio_base: Decimal
    is_active: bool = Field(default=True)

    paquetes: list["Paquete"] = Relationship(back_populates="destino")
    viajes: list["Viaje"] = Relationship(back_populates="destino")


class Paquete(SQLModel, table=True):
    __tablename__ = "paquetes"

    id_paquete: Optional[int] = Field(default=None, primary_key=True)
    id_destino: Optional[int] = Field(default=None, foreign_key="destinos.id_destino")
    nombre_paquete: str
    resumen: Optional[str] = Field(default=None)
    descripcion: str
    incluye: Optional[str] = Field(default=None)
    no_incluye: Optional[str] = Field(default=None)
    condiciones: Optional[str] = Field(default=None)
    duracion_dias: int
    duracion_noches: int
    precio_paquete: Decimal
    is_active: bool = Field(default=True)

    destino: Optional[Destino] = Relationship(back_populates="paquetes")

    viajes: list["Viaje"] = Relationship(back_populates="paquete")


class Viaje(SQLModel, table=True):
    __tablename__ = "viajes"

    id_viaje: Optional[int] = Field(default=None, primary_key=True)
    id_destino: int = Field(foreign_key="destinos.id_destino")
    id_paquete: Optional[int] = Field(default=None, foreign_key="paquetes.id_paquete")
    fecha_salida: date
    fecha_retorno: date
    metodo_transporte: str = Field(default="Bus Cama")
    cantidad_unidades: int = Field(default=1)
    cupos_disponibles: int
    estatus: str
    is_active: bool = Field(default=True)

    destino: Optional[Destino] = Relationship(back_populates="viajes")
    paquete: Optional[Paquete] = Relationship(back_populates="viajes")

    reservas: list["Reserva"] = Relationship(back_populates="viaje")
    costos: list["CostoViaje"] = Relationship(back_populates="viaje")
    inconvenientes: list["Inconveniente"] = Relationship(back_populates="viaje")
    ganancia: Optional["Ganancia"] = Relationship(back_populates="viaje")


class Proceso(SQLModel, table=True):
    __tablename__ = "procesos"

    id_pro: Optional[int] = Field(default=None, primary_key=True)
    id_usu: int = Field(foreign_key="usuarios.id_usuario")
    nom_pro: str = Field(max_length=100)
    fec_inicio: date
    fec_fin: date
    est_pro: str = Field(default="en ejecución", max_length=30)
    det_pro: Optional[str] = Field(default=None)
    act_pro: bool = Field(default=True)

    usuario: Optional[Usuario] = Relationship(back_populates="procesos")


class Auditoria(SQLModel, table=True):
    __tablename__ = "auditoria"

    id_auditoria: Optional[int] = Field(default=None, primary_key=True)
    tabla_afectada: Optional[str] = Field(default=None)
    accion: Optional[str] = Field(default=None)
    id_usuario: Optional[int] = Field(default=None, foreign_key="usuarios.id_usuario")
    detalles: Optional[str] = Field(default=None)
    fecha_hora: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)

    usuario: Optional[Usuario] = Relationship(back_populates="auditorias")


class Reserva(SQLModel, table=True):
    __tablename__ = "reservas"

    id_reserva: Optional[int] = Field(default=None, primary_key=True)
    id_cliente: str = Field(foreign_key="clientes.id_cliente")
    id_viaje: int = Field(foreign_key="viajes.id_viaje")
    fecha_reserva: datetime = Field(default_factory=datetime.now)
    monto_total: Decimal
    estatus_pago: str
    is_active: bool = Field(default=True)

    cliente: Optional[Cliente] = Relationship(back_populates="reservas")
    viaje: Optional[Viaje] = Relationship(back_populates="reservas")

    pagos: list["Pago"] = Relationship(back_populates="reserva")
    integrantes: list["Integrante"] = Relationship(back_populates="reserva")


class CostoViaje(SQLModel, table=True):
    __tablename__ = "costos_viaje"

    id_costo: Optional[int] = Field(default=None, primary_key=True)
    id_viaje: int = Field(foreign_key="viajes.id_viaje")
    descripcion: str
    monto: Decimal
    is_active: bool = Field(default=True)

    viaje: Optional[Viaje] = Relationship(back_populates="costos")


class Inconveniente(SQLModel, table=True):
    __tablename__ = "inconvenientes"

    id_inconveniente: Optional[int] = Field(default=None, primary_key=True)
    id_viaje: int = Field(foreign_key="viajes.id_viaje")
    descripcion: str
    monto_descontado: Decimal
    fecha_reporte: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)

    viaje: Optional[Viaje] = Relationship(back_populates="inconvenientes")


class Ganancia(SQLModel, table=True):
    __tablename__ = "ganancias"

    id_ganancia: Optional[int] = Field(default=None, primary_key=True)
    id_viaje: int = Field(foreign_key="viajes.id_viaje", unique=True)
    ingresos_totales: Decimal
    costos_totales: Decimal
    inconvenientes_totales: Decimal
    ganancia_neta: Decimal
    fecha_calculo: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)

    viaje: Optional[Viaje] = Relationship(back_populates="ganancia")


class Pago(SQLModel, table=True):
    __tablename__ = "pagos"

    id_pago: Optional[int] = Field(default=None, primary_key=True)
    id_reserva: int = Field(foreign_key="reservas.id_reserva")
    monto: Decimal
    metodo_pago: str
    referencia: str
    fecha_pago: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)

    reserva: Optional[Reserva] = Relationship(back_populates="pagos")


class Integrante(SQLModel, table=True):
    __tablename__ = "integrantes"

    id_integrante: Optional[int] = Field(default=None, primary_key=True)
    id_reserva: int = Field(foreign_key="reservas.id_reserva")
    nombre: str
    apellido: str
    documento_id: str
    # Tipo de identificación: "Cédula", "Pasaporte" o "Sin Documento" (menores sin cédula, se identifican con el representante)
    tipo_documento: str = Field(default="Cédula")
    edad: int
    numero_asiento: Optional[int] = Field(default=None)
    is_active: bool = Field(default=True)

    reserva: Optional[Reserva] = Relationship(back_populates="integrantes")
