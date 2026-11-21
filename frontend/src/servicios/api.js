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

api.interceptors.request.use(
    (config) => {
        config._cargaContada = true;
        notificarCarga(1);
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        if (response.config?._cargaContada) notificarCarga(-1);
        return response;
    },
    (error) => {
        if (error.config?._cargaContada) notificarCarga(-1);
        if (error.response?.status === 401 && !String(error.config?.url || '').includes('/auth/login')) {
            localStorage.removeItem('token');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export default api;
