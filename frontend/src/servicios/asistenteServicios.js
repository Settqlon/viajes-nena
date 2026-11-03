import api from './api';

export const obtenerRecomendacionesIA = async () => {
    const res = await api.get('/asistente/recomendaciones');
    return res.data;
};

export const enviarMensajeAsistente = async (datos) => {
    const res = await api.post('/asistente/chat', datos);
    return res.data;
};

export const configurarApiKeyIA = async (api_key) => {
    const res = await api.post('/asistente/configurar-key', { api_key });
    return res.data;
};
