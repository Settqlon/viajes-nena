from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import date

ASIENTOS_POR_TRANSPORTE = {
    "Bus Cama": 60,
    "Avión": 150
}


class ViajeCreate(BaseModel):
    id_destino: int
    id_paquete: Optional[int] = None
    fecha_salida: date
    fecha_retorno: date
    metodo_transporte: str = "Bus Cama"
    cantidad_unidades: int = Field(default=1, ge=1)
    cupos_disponibles: Optional[int] = Field(default=None, ge=0)
    estatus: str

    @model_validator(mode='after')
    def validar_fechas_y_cupos(self):
        if self.fecha_retorno < self.fecha_salida:
            raise ValueError("La fecha de retorno no puede ser menor a la de salida")
        if self.metodo_transporte not in ASIENTOS_POR_TRANSPORTE:
            raise ValueError("El método de transporte debe ser 'Bus Cama' (60 asientos) o 'Avión' (150 asientos)")
        # Calcula automáticamente los cupos según el método de transporte y la cantidad de unidades
        self.cupos_disponibles = ASIENTOS_POR_TRANSPORTE[self.metodo_transporte] * self.cantidad_unidades
        return self


class ViajePut(BaseModel):
    id_destino: int
    id_paquete: Optional[int] = None
    fecha_salida: date
    fecha_retorno: date
    metodo_transporte: str = "Bus Cama"
    cantidad_unidades: int = Field(default=1, ge=1)
    cupos_disponibles: int = Field(ge=0)
    estatus: str
    is_active: bool

    @model_validator(mode='after')
    def validar_fechas(self):
        if self.fecha_retorno < self.fecha_salida:
            raise ValueError("La fecha de retorno no puede ser menor a la de salida")
        return self


class ViajeUpdate(BaseModel):
    id_destino: Optional[int] = None
    id_paquete: Optional[int] = None
    fecha_salida: Optional[date] = None
    fecha_retorno: Optional[date] = None
    metodo_transporte: Optional[str] = None
    cantidad_unidades: Optional[int] = Field(default=None, ge=1)
    cupos_disponibles: Optional[int] = Field(default=None, ge=0)
    estatus: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode='after')
    def validar_fechas(self):
        if self.fecha_salida and self.fecha_retorno:
            if self.fecha_retorno < self.fecha_salida:
                raise ValueError("La fecha de retorno no puede ser anterior a la de salida")
        return self


class ViajeResponse(BaseModel):
    id_viaje: int
    id_destino: int
    id_paquete: Optional[int] = None
    fecha_salida: date
    fecha_retorno: date
    metodo_transporte: str = "Bus Cama"
    cantidad_unidades: int = 1
    cupos_disponibles: int
    estatus: str
    is_active: bool

    class Config:
        from_attributes = True
