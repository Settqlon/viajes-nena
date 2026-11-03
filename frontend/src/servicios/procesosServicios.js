import api from './api';

export const obtenerProcesos = async () => {
    const response = await api.get('/procesos/');
    return response.data;
};

export const crearProceso = async (datosProceso) => {
    const response = await api.post('/procesos/', datosProceso);
    return response.data;
};

export const actualizarProceso = async (idProceso, datosProceso) => {
    const response = await api.patch(`/procesos/${idProceso}`, datosProceso);
    return response.data;
};

export const eliminarProceso = async (idProceso) => {
    const response = await api.delete(`/procesos/${idProceso}`);
    return response.data;
};
