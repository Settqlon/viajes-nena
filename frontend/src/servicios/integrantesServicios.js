import api from './api';

export const obtenerIntegrantes = async () => {
    const response = await api.get('/integrantes/');
    return response.data;
};

export const crearIntegrante = async (datosIntegrante) => {
    const response = await api.post('/integrantes/', datosIntegrante);
    return response.data;
};

export const actualizarIntegrante = async (idIntegrante, datosIntegrante) => {
    const response = await api.patch(`/integrantes/${idIntegrante}`, datosIntegrante);
    return response.data;
};

export const eliminarIntegrante = async (idIntegrante) => {
    const response = await api.delete(`/integrantes/${idIntegrante}`);
    return response.data;
};
