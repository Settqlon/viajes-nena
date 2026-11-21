import api from './api';

export const obtenerAuditorias = async (filtros = {}) => {
    const params = {};
    if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
    if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;
    if (filtros.accion) params.accion = filtros.accion;

    const response = await api.get('/auditoria/', { params });
    return response.data;
};

