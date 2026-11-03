import api from './api';

export const obtenerPaquetes = async () => {
    const response = await api.get('/paquetes/');
    return response.data;
};

export const crearPaquete = async (datosPaquete) => {
    const response = await api.post('/paquetes/', datosPaquete);
    return response.data;
};

export const actualizarPaquete = async (idPaquete, datosPaquete) => {
    const response = await api.patch(`/paquetes/${idPaquete}`, datosPaquete);
    return response.data;
};

export const eliminarPaquete = async (idPaquete) => {
    const response = await api.delete(`/paquetes/${idPaquete}`);
    return response.data;
};
