import api from './api';

export const obtenerViajes = async () => {
    const response = await api.get('/viajes/');
    return response.data;
};

export const crearViaje = async (datosViaje) => {
    const response = await api.post('/viajes/', datosViaje);
    return response.data;
};

export const actualizarViaje = async (idViaje, datosViaje) => {
    const response = await api.patch(`/viajes/${idViaje}`, datosViaje);
    return response.data;
};

export const eliminarViaje = async (idViaje) => {
    const response = await api.delete(`/viajes/${idViaje}`);
    return response.data;
};
