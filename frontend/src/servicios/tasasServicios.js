import api from './api';

const CLAVE_LOCAL = 'viajes_nena_tasas_cambio';
const TASAS_DEFAULT = {
    tasa_bcv: 891.11,
    tasa_cop: 3183.00,
    fecha_actualizacion: new Date().toISOString()
};

export const obtenerTasasLocales = () => {
    try {
        const raw = localStorage.getItem(CLAVE_LOCAL);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.tasa_bcv > 0 && parsed.tasa_cop > 0) return parsed;
        }
    } catch {
        // fallback
    }
    return TASAS_DEFAULT;
};

export const obtenerTasas = async () => {
    try {
        const res = await api.get('/tasas');
        if (res.data && res.data.tasa_bcv > 0 && res.data.tasa_cop > 0) {
            localStorage.setItem(CLAVE_LOCAL, JSON.stringify(res.data));
            return res.data;
        }
    } catch (err) {
        // Fallback a localStorage si la red falla
    }
    return obtenerTasasLocales();
};

export const guardarTasas = async (nuevasTasas) => {
    const payload = {
        tasa_bcv: parseFloat(nuevasTasas.tasa_bcv) || TASAS_DEFAULT.tasa_bcv,
        tasa_cop: parseFloat(nuevasTasas.tasa_cop) || TASAS_DEFAULT.tasa_cop
    };
    try {
        const res = await api.put('/tasas', payload);
        const data = res.data;
        localStorage.setItem(CLAVE_LOCAL, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('tasas-cambio-actualizadas', { detail: data }));
        return data;
    } catch (err) {
        const fallback = {
            ...payload,
            fecha_actualizacion: new Date().toISOString()
        };
        localStorage.setItem(CLAVE_LOCAL, JSON.stringify(fallback));
        window.dispatchEvent(new CustomEvent('tasas-cambio-actualizadas', { detail: fallback }));
        return fallback;
    }
};

export const formatoBs = (monto) => {
    const val = Number(monto) || 0;
    return `Bs. ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatoCOP = (monto) => {
    const val = Math.round(Number(monto) || 0);
    return `$ ${val.toLocaleString('es-CO')} COP`;
};

export const calcularEquivalentes = (montoUSD, tasaBCV, tasaCOP) => {
    const usd = Math.max(Number(montoUSD) || 0, 0);
    const bcv = Number(tasaBCV) || TASAS_DEFAULT.tasa_bcv;
    const cop = Number(tasaCOP) || TASAS_DEFAULT.tasa_cop;

    const montoBs = Number((usd * bcv).toFixed(2));
    const montoCOP = Math.round(usd * cop);

    return {
        usd,
        bcv,
        cop,
        montoBs,
        montoCOP,
        textoBs: formatoBs(montoBs),
        textoCOP: formatoCOP(montoCOP)
    };
};
