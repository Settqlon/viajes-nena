import api from './api';

export const obtenerClientes = async () => {
    const response = await api.get('/clientes/');
    return response.data;
};

export const crearCliente = async (datosCliente) => {
    const response = await api.post('/clientes/', datosCliente);
    return response.data;
};

export const actualizarCliente = async (idCliente, datosCliente) => {
    const response = await api.patch(`/clientes/${idCliente}`, datosCliente);
    return response.data;
};

export const eliminarCliente = async (idCliente) => {
    const response = await api.delete(`/clientes/${idCliente}`);
    return response.data;
};
