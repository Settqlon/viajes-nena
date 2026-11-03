import api from './api';

export const obtenerReservas = async () => {
    const response = await api.get('/reservas/');
    return response.data;
};

export const crearReserva = async (datosReserva) => {
    const response = await api.post('/reservas/', datosReserva);
    return response.data;
};

export const actualizarReserva = async (idReserva, datosReserva) => {
    const response = await api.patch(`/reservas/${idReserva}`, datosReserva);
    return response.data;
};

export const eliminarReserva = async (idReserva) => {
    const response = await api.delete(`/reservas/${idReserva}`);
    return response.data;
};
