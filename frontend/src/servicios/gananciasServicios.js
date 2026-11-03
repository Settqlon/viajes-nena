import api from './api';

export const obtenerGanancias = async () => {
    const response = await api.get('/ganancias/');
    return response.data;
};

export const crearGanancia = async (datosGanancia) => {
    const response = await api.post('/ganancias/', datosGanancia);
    return response.data;
};

export const actualizarGanancia = async (idGanancia, datosGanancia) => {
    const response = await api.patch(`/ganancias/${idGanancia}`, datosGanancia);
    return response.data;
};

export const eliminarGanancia = async (idGanancia) => {
    const response = await api.delete(`/ganancias/${idGanancia}`);
    return response.data;
};
