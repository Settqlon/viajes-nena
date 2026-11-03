import api from './api';

export const obtenerPagos = async () => {
    const response = await api.get('/pagos/');
    return response.data;
};

export const crearPago = async (datosPago) => {
    const response = await api.post('/pagos/', datosPago);
    return response.data;
};

export const actualizarPago = async (idPago, datosPago) => {
    const response = await api.patch(`/pagos/${idPago}`, datosPago);
    return response.data;
};

export const eliminarPago = async (idPago) => {
    const response = await api.delete(`/pagos/${idPago}`);
    return response.data;
};
