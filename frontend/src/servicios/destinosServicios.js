import api from './api';

export const obtenerDestinos = async () => {
    const response = await api.get('/destinos/');
    return response.data;
};

export const crearDestino = async (datosDestino) => {
    const response = await api.post('/destinos/', datosDestino);
    return response.data;
};

export const actualizarDestino = async (idDestino, datosDestino) => {
    const response = await api.patch(`/destinos/${idDestino}`, datosDestino);
    return response.data;
};

export const eliminarDestino = async (idDestino) => {
    const response = await api.delete(`/destinos/${idDestino}`);
    return response.data;
};
