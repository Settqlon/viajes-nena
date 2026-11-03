import api from './api';

export const obtenerAuditorias = async (filtros = {}) => {
    const params = {};
    if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
    if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;
    if (filtros.accion) params.accion = filtros.accion;

    const response = await api.get('/auditoria/', { params });
    return response.data;
};

export const actualizarAuditoria = async (idAuditoria, datos) => {
    const response = await api.patch(`/auditoria/${idAuditoria}`, datos);
    return response.data;
};

export const eliminarAuditoria = async (idAuditoria) => {
    const response = await api.delete(`/auditoria/${idAuditoria}`);
    return response.data;
};
