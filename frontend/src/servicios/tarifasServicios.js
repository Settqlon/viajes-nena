/**
 * Servicios y Helpers Centralizados de Tarifas y Abonos
 * Reglas de Viajes La Nena:
 * - Infantes menores de 3 años: Gratis ($0.00) y no pagan abono mínimo.
 * - Niños de 3 a 12 años: 25% de descuento (pagan el 75%) y abonan $30.
 * - De 13 años en adelante: Tarifa completa (100%) y abonan $30.
 */

export const ABONO_POR_INTEGRANTE = 30;

export const calcularTarifaPorEdad = (precioBase, edad) => {
    const pBase = Number(precioBase) || 0;
    const ed = parseInt(edad) || 0;
    if (ed < 3) {
        return { monto: 0, etiqueta: 'Gratis (<3 años)', tipo: 'success', pagaAbono: false, porcentaje: 0 };
    }
    if (ed < 13) {
        return { monto: Number((pBase * 0.75).toFixed(2)), etiqueta: '-25% Niño (3-12)', tipo: 'warning', pagaAbono: true, porcentaje: 75 };
    }
    return { monto: pBase, etiqueta: 'Tarifa Completa', tipo: 'neutral', pagaAbono: true, porcentaje: 100 };
};

export const calcularAbonoMinimoGrupo = (pasajeros = []) => {
    const pagantes = pasajeros.filter(p => (parseInt(p.edad) || 0) >= 3).length;
    return ABONO_POR_INTEGRANTE * Math.max(pagantes, 1);
};

export const obtenerPrecioBaseViaje = (viaje, destinos = [], paquetes = []) => {
    if (!viaje) return 0;
    if (viaje.id_paquete) {
        const paq = paquetes.find(p => p.id_paquete === viaje.id_paquete);
        if (paq) return Number(paq.precio_paquete);
    }
    const dest = destinos.find(d => d.id_destino === viaje.id_destino);
    return dest ? Number(dest.precio_base) : 0;
};
