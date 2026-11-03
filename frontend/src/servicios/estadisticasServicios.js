import api from './api';

export const obtenerResumenEstadisticas = async () => {
    const response = await api.get('/estadisticas/resumen');
    return response.data;
};
