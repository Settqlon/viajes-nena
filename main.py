from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.conexion import init_db

# Importaciones de routers
from routers import auth_router
from routers import viajes_routers
from routers import clientes_routers
from routers import destinos_routers
from routers import paquetes_routers
from routers import auditoria_routers
from routers import pagos_routers
from routers import ganancias_routers
from routers import inconvenientes_routers
from routers import integrantes_routers
from routers import reserva_routers
from routers import procesos_routers
from routers import costos_viaje_routers, estadisticas_routers, asistente_routers, tasas_router

app = FastAPI(
    title="API Viajes La Nena",
    description="Sistema de gestión con autenticación JWT, seguridad por roles y arquitectura limpia",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Inclusión de routers
app.include_router(auth_router.router)
app.include_router(destinos_routers.router)
app.include_router(paquetes_routers.router)
app.include_router(clientes_routers.router) 
app.include_router(viajes_routers.router)
app.include_router(auditoria_routers.router)
app.include_router(pagos_routers.router)
app.include_router(ganancias_routers.router)    
app.include_router(inconvenientes_routers.router)
app.include_router(integrantes_routers.router)
app.include_router(reserva_routers.router)
app.include_router(procesos_routers.router)
app.include_router(costos_viaje_routers.router) 
app.include_router(estadisticas_routers.router)
app.include_router(asistente_routers.router)
app.include_router(tasas_router.router)

@app.get("/", tags=["Root"])
def root():
    return {"message": "API Operativa"}