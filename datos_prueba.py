"""
Script para poblar la base de datos con datos de prueba realistas.
Sirve para visualizar las estadísticas del Dashboard.

Uso:  .\\venv\\Scripts\\python.exe datos_prueba.py
"""
import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlmodel import Session, select
from database.conexion import engine, init_db
from modelos.modelos import (
    Cliente, Destino, Paquete, Viaje, Reserva, Pago,
    Integrante, CostoViaje, Inconveniente, Ganancia
)

random.seed(42)

DESTINOS = [
    ("Los Roques", "Archipiélago paradisíaco con playas de arena blanca", 450),
    ("Margarita", "La Perla del Caribe, playas y compras", 280),
    ("Mérida", "Montañas andinas, teleférico y gastronomía", 220),
    ("Canaima", "Salto Ángel y tepuyes milenarios", 650),
    ("Morrocoy", "Cayos y aguas cristalinas", 180),
    ("Choroní", "Pueblo colonial y playa en el Parque Henri Pittier", 150),
]

PAQUETES = [
    ("Los Roques Full Day", 0, 1, 0, 320),
    ("Los Roques Premium 3D/2N", 0, 3, 2, 890),
    ("Margarita Todo Incluido", 1, 4, 3, 560),
    ("Mérida Aventura Andina", 2, 3, 2, 410),
    ("Canaima Expedición Salto Ángel", 3, 4, 3, 1250),
    ("Morrocoy Cayos Express", 4, 2, 1, 240),
    ("Choroní Fin de Semana", 5, 2, 1, 190),
]

NOMBRES = ["María", "José", "Luis", "Ana", "Carlos", "Gabriela", "Pedro", "Daniela",
           "Andrés", "Valentina", "Miguel", "Sofía", "Jorge", "Camila", "Ricardo",
           "Isabel", "Fernando", "Lucía", "Diego", "Paola"]
APELLIDOS = ["González", "Rodríguez", "Pérez", "Hernández", "García", "Martínez",
             "López", "Díaz", "Ramírez", "Torres", "Rojas", "Mendoza"]
METODOS = ["Transferencia", "Pago Móvil", "Zelle", "Efectivo", "Tarjeta"]
COSTOS = ["Transporte", "Hospedaje", "Alimentación", "Guía turístico", "Seguro de viaje"]
INCONVENIENTES = ["Retraso de vuelo", "Cambio de hotel", "Mal clima", "Avería de transporte"]


def poblar():
    init_db()
    with Session(engine) as session:
        if session.exec(select(Destino)).first():
            print("La base de datos ya tiene destinos. No se insertaron datos de prueba.")
            return

        # Destinos
        destinos = []
        for nombre, desc, precio in DESTINOS:
            d = Destino(nombre_destino=nombre, descripcion=desc, precio_base=Decimal(precio))
            session.add(d)
            destinos.append(d)
        session.commit()
        for d in destinos:
            session.refresh(d)

        # Paquetes
        paquetes = []
        for nombre, idx, dias, noches, precio in PAQUETES:
            p = Paquete(
                id_destino=destinos[idx].id_destino, nombre_paquete=nombre,
                resumen=f"Disfruta {destinos[idx].nombre_destino}",
                descripcion=f"Paquete turístico a {destinos[idx].nombre_destino} de {dias} días.",
                incluye="Traslados, hospedaje y guía", no_incluye="Gastos personales",
                duracion_dias=dias, duracion_noches=noches, precio_paquete=Decimal(precio)
            )
            session.add(p)
            paquetes.append((p, idx))
        session.commit()
        for p, _ in paquetes:
            session.refresh(p)

        # Clientes
        clientes = []
        for i in range(30):
            nombre = random.choice(NOMBRES)
            apellido = random.choice(APELLIDOS)
            c = Cliente(
                id_cliente=f"V-{10000000 + i * 734521}",
                nombre=nombre, apellido=apellido,
                telefono=f"0414-{1000000 + i * 193847}",
                correo_electronico=f"{nombre.lower()}.{apellido.lower()}{i}@correo.com".replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u"),
                direccion=random.choice(["Caracas", "Valencia", "Maracay", "Barquisimeto", "Maracaibo"])
            )
            session.add(c)
            clientes.append(c)
        session.commit()

        # Viajes (en los últimos 8 meses + algunos futuros)
        hoy = date.today()
        viajes = []
        pesos_paquetes = [5, 3, 6, 4, 2, 4, 3]  # popularidad
        for i in range(14):
            paquete, idx = random.choices(paquetes, weights=pesos_paquetes)[0]
            salida = hoy - timedelta(days=240) + timedelta(days=i * 20 + random.randint(0, 10))
            v = Viaje(
                id_destino=destinos[idx].id_destino, id_paquete=paquete.id_paquete,
                fecha_salida=salida,
                fecha_retorno=salida + timedelta(days=paquete.duracion_dias),
                cupos_disponibles=random.randint(15, 30),
                estatus="Finalizado" if salida < hoy else "Programado"
            )
            session.add(v)
            viajes.append((v, paquete))
        session.commit()
        for v, _ in viajes:
            session.refresh(v)

        # Reservas, pagos e integrantes
        for v, paquete in viajes:
            cantidad = random.randint(3, min(12, v.cupos_disponibles))
            for _ in range(cantidad):
                personas = random.randint(1, 4)
                monto = paquete.precio_paquete * personas
                fecha = datetime.combine(v.fecha_salida, datetime.min.time()) - timedelta(days=random.randint(5, 45))
                estatus = random.choices(["Pagado", "Abonado"], weights=[6, 4])[0]
                r = Reserva(
                    id_cliente=random.choice(clientes).id_cliente, id_viaje=v.id_viaje,
                    fecha_reserva=fecha, monto_total=monto, estatus_pago=estatus
                )
                session.add(r)
                session.commit()
                session.refresh(r)

                minimo_abono = Decimal("30.00") * personas
                mitad = (monto / 2).quantize(Decimal("0.01"))
                pagado = monto if estatus == "Pagado" else max(mitad, minimo_abono)
                session.add(Pago(
                    id_reserva=r.id_reserva, monto=pagado,
                    metodo_pago=random.choices(METODOS, weights=[5, 4, 3, 2, 1])[0],
                    referencia=str(random.randint(100000, 999999)),
                    fecha_pago=fecha + timedelta(days=random.randint(0, 3))
                ))

                for _ in range(personas):
                    session.add(Integrante(
                        id_reserva=r.id_reserva, nombre=random.choice(NOMBRES),
                        apellido=random.choice(APELLIDOS),
                        documento_id=f"V-{random.randint(5000000, 32000000)}",
                        edad=random.choices(
                            [random.randint(3, 12), random.randint(13, 17), random.randint(18, 30),
                             random.randint(31, 45), random.randint(46, 60), random.randint(61, 80)],
                            weights=[2, 1, 5, 4, 2, 1]
                        )[0]
                    ))
                v.cupos_disponibles -= 1
            session.add(v)
            session.commit()

            # Costos e inconvenientes
            total_costos = Decimal(0)
            for desc in random.sample(COSTOS, 3):
                monto_c = Decimal(random.randint(150, 900))
                total_costos += monto_c
                session.add(CostoViaje(id_viaje=v.id_viaje, descripcion=desc, monto=monto_c))

            total_inc = Decimal(0)
            if random.random() < 0.35:
                monto_i = Decimal(random.randint(50, 300))
                total_inc += monto_i
                session.add(Inconveniente(
                    id_viaje=v.id_viaje, descripcion=random.choice(INCONVENIENTES),
                    monto_descontado=monto_i
                ))
            session.commit()

            # Ganancia solo para viajes finalizados
            if v.estatus == "Finalizado":
                ingresos = sum(
                    (r.monto_total for r in session.exec(select(Reserva).where(Reserva.id_viaje == v.id_viaje)).all()),
                    Decimal(0)
                )
                session.add(Ganancia(
                    id_viaje=v.id_viaje, ingresos_totales=ingresos,
                    costos_totales=total_costos, inconvenientes_totales=total_inc,
                    ganancia_neta=ingresos - total_costos - total_inc
                ))
                session.commit()

        print("Datos de prueba insertados correctamente.")


if __name__ == "__main__":
    poblar()
