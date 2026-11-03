import api from './api';

export const obtenerInconvenientes = async () => {
    const response = await api.get('/inconvenientes/');
    return response.data;
};

export const crearInconveniente = async (datosInconveniente) => {
    const response = await api.post('/inconvenientes/', datosInconveniente);
    return response.data;
};

export const actualizarInconveniente = async (idInconveniente, datosInconveniente) => {
    const response = await api.patch(`/inconvenientes/${idInconveniente}`, datosInconveniente);
    return response.data;
};

export const eliminarInconveniente = async (idInconveniente) => {
    const response = await api.delete(`/inconvenientes/${idInconveniente}`);
    return response.data;
};
