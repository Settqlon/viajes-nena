import api from './api';

export const obtenerCostosViaje = async () => {
    const response = await api.get('/costos-viaje/');
    return response.data;
};

export const crearCostoViaje = async (datosCosto) => {
    const response = await api.post('/costos-viaje/', datosCosto);
    return response.data;
};

export const actualizarCostoViaje = async (idCosto, datosCosto) => {
    const response = await api.patch(`/costos-viaje/${idCosto}`, datosCosto);
    return response.data;
};

export const eliminarCostoViaje = async (idCosto) => {
    const response = await api.delete(`/costos-viaje/${idCosto}`);
    return response.data;
};
