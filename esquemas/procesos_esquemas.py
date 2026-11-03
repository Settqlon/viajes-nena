from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import date

class ProcesoCreate(BaseModel):
    id_usu: int
    nom_pro: str = Field(max_length=100)
    fec_inicio: date
    fec_fin: date
    est_pro: str = Field(default="en ejecución", max_length=30)
    det_pro: Optional[str] = Field(default=None)

    @model_validator(mode='after')
    def validar_fechas(self):
        if self.fec_fin < self.fec_inicio:
            raise ValueError("La fecha de fin no puede ser menor a la fecha de inicio")
        return self

class ProcesoPut(BaseModel):
    id_usu: int
    nom_pro: str = Field(max_length=100)
    fec_inicio: date
    fec_fin: date
    est_pro: str = Field(max_length=30)
    det_pro: Optional[str] = Field(default=None)
    act_pro: bool

    @model_validator(mode='after')
    def validar_fechas(self):
        if self.fec_fin < self.fec_inicio:
            raise ValueError("La fecha de fin no puede ser menor a la fecha de inicio")
        return self

class ProcesoUpdate(BaseModel):
    id_usu: Optional[int] = None
    nom_pro: Optional[str] = Field(default=None, max_length=100)
    fec_inicio: Optional[date] = None
    fec_fin: Optional[date] = None
    est_pro: Optional[str] = Field(default=None, max_length=30)
    det_pro: Optional[str] = None
    act_pro: Optional[bool] = None

    @model_validator(mode='after')
    def validar_fechas(self):
        if self.fec_inicio and self.fec_fin:
            if self.fec_fin < self.fec_inicio:
                raise ValueError("La fecha de fin no puede ser menor a la fecha de inicio")
        return self

class ProcesoResponse(BaseModel):
    id_pro: int
    id_usu: int
    nom_pro: str
    fec_inicio: date
    fec_fin: date
    est_pro: str
    det_pro: Optional[str]
    act_pro: bool

    class Config:
        from_attributes = True