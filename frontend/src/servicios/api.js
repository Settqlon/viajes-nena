import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
});

let peticionesActivas = 0;
const suscriptoresCarga = new Set();

export const suscribirCarga = (fn) => {
    suscriptoresCarga.add(fn);
    fn(peticionesActivas > 0);
    return () => suscriptoresCarga.delete(fn);
};

const notificarCarga = (delta) => {
    peticionesActivas = Math.max(0, peticionesActivas + delta);
    const activo = peticionesActivas > 0;
    suscriptoresCarga.forEach((fn) => fn(activo));
};

// Adjunta el token guardado en las peticiones enviadas al backend y activa el estado de carga
api.interceptors.request.use(
    (config) => {
        notificarCarga(1);
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        notificarCarga(-1);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        notificarCarga(-1);
        return response;
    },
    (error) => {
        notificarCarga(-1);
        return Promise.reject(error);
    }
);

export default api;
