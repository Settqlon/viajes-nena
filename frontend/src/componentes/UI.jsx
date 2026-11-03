import { useState, useEffect } from 'react';
import { Inbox, Search, Trash, Pencil, RotateCcw, MapPin, Package, Calendar, Users, CheckCircle2, RefreshCw, Coins, ArrowRightLeft, DollarSign, Edit3, X, Check, Copy, CreditCard } from 'lucide-react';
import { obtenerTasas, guardarTasas, formatoBs, formatoCOP, calcularEquivalentes, obtenerTasasLocales } from '../servicios/tasasServicios';
import { crearPago } from '../servicios/pagosServicios';

export const formatoMoneda = (valor) =>
    '$' + Number(valor || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatoFecha = (valor) =>
    valor ? new Date(valor).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const mensajeError = (err, porDefecto) => {
    const detalle = err?.response?.data?.detail;
    if (Array.isArray(detalle)) return detalle.map(d => d.msg).join(' | ');
    return detalle || porDefecto;
};

export function PageHeader({ titulo, subtitulo, children }) {
    return (
        <div className="page-header">
            <div>
                <h1 className="page-title">{titulo}</h1>
                {subtitulo && <p className="page-sub">{subtitulo}</p>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>{children}</div>
        </div>
    );
}

export function StatCard({ icono: Icono, etiqueta, valor, pie, color = 'primary' }) {
    return (
        <div className="card stat-card">
            <div className={`stat-icon c-${color}`}><Icono size={22} /></div>
            <div>
                <div className="stat-label">{etiqueta}</div>
                <div className="stat-value">{valor}</div>
                {pie && <div className="stat-foot">{pie}</div>}
            </div>
        </div>
    );
}

export function Badge({ tipo = 'neutral', children }) {
    return <span className={`badge badge-${tipo}`}>{children}</span>;
}

export function EstadoActivo({ activo }) {
    return activo ? <Badge tipo="success">Activo</Badge> : <Badge tipo="neutral">Inactivo</Badge>;
}

export function BadgeRol({ rol }) {
    if (rol === 'Admin') {
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#ede9fe',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
                fontWeight: 700,
                fontSize: '0.76rem',
                padding: '3px 10px',
                borderRadius: 999
            }}>
                👑 Administrador
            </span>
        );
    }
    if (rol === 'Operador') {
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#e0f2fe',
                color: '#0369a1',
                border: '1px solid #bae6fd',
                fontWeight: 700,
                fontSize: '0.76rem',
                padding: '3px 10px',
                borderRadius: 999
            }}>
                🧭 Operador
            </span>
        );
    }
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            fontWeight: 700,
            fontSize: '0.76rem',
            padding: '3px 10px',
            borderRadius: 999
        }}>
            💼 Vendedor
        </span>
    );
}

export function Buscador({ valor, onChange, placeholder = 'Buscar...' }) {
    return (
        <div className="search">
            <Search size={16} color="#94a3b8" />
            <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

export function Vacio({ texto = 'No hay registros para mostrar' }) {
    return (
        <div className="empty">
            <Inbox size={42} />
            <div>{texto}</div>
        </div>
    );
}

export function BotonEditar({ onClick, titulo = 'Editar registro' }) {
    return (
        <button
            type="button"
            className="btn btn-ghost"
            onClick={onClick}
            title={titulo}
            style={{ padding: '7px 10px', marginRight: 6 }}
        >
            <Pencil size={15} />
        </button>
    );
}

export function BotonBaja({ activo, onClick, onRestaurar }) {
    if (!activo && onRestaurar) {
        return (
            <button
                type="button"
                className="btn"
                onClick={onRestaurar}
                title="Restaurar registro"
                style={{ background: 'var(--success-soft)', color: '#15803d', padding: '7px 11px', fontSize: '0.78rem' }}
            >
                <RotateCcw size={14} /> Restaurar
            </button>
        );
    }
    return (
        <button type="button" className="btn btn-danger-soft" onClick={onClick} disabled={!activo} title="Dar de baja lógica">
            <Trash size={15} />
        </button>
    );
}

/**
 * Selector visual y ordenado de viajes (reemplaza desplegables largos y desordenados).
 * Permite filtrar por destino con pestañas rápidas, buscar por texto y elegir en tarjetas estructuradas.
 */
export function SelectorViaje({
    viajes = [],
    destinos = [],
    paquetes = [],
    valor = '',
    onChange,
    soloConCupos = false
}) {
    const [destinoFiltro, setDestinoFiltro] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [abierto, setAbierto] = useState(!valor);

    const obtenerDestino = (idDestino) => destinos.find(d => d.id_destino === idDestino);
    const obtenerPaquete = (idPaquete) => paquetes.find(p => p.id_paquete === idPaquete);

    const calcularPrecio = (v) => {
        if (!v) return 0;
        if (v.id_paquete) {
            const p = obtenerPaquete(v.id_paquete);
            if (p) return Number(p.precio_paquete);
        }
        const d = obtenerDestino(v.id_destino);
        return d ? Number(d.precio_base) : 0;
    };

    const viajesBase = viajes
        .filter(v => v.is_active && (!soloConCupos || (v.cupos_disponibles > 0 && v.estatus !== 'Cancelado' && v.estatus !== 'Finalizado')))
        .sort((a, b) => String(a.fecha_salida).localeCompare(String(b.fecha_salida)));

    const idsDestinosConViaje = Array.from(new Set(viajesBase.map(v => v.id_destino)));
    const destinosDisponibles = idsDestinosConViaje
        .map(id => obtenerDestino(id))
        .filter(Boolean);

    const viajesFiltrados = viajesBase.filter(v => {
        if (destinoFiltro !== 'todos' && v.id_destino !== Number(destinoFiltro)) return false;
        const q = busqueda.trim().toLowerCase();
        if (!q) return true;
        const d = obtenerDestino(v.id_destino);
        const p = obtenerPaquete(v.id_paquete);
        const texto = `#${v.id_viaje} ${d?.nombre_destino || ''} ${p?.nombre_paquete || ''} ${v.fecha_salida} ${v.estatus}`.toLowerCase();
        return texto.includes(q);
    });

    const viajeSeleccionado = viajes.find(v => v.id_viaje === Number(valor));

    if (viajeSeleccionado && !abierto) {
        const dest = obtenerDestino(viajeSeleccionado.id_destino);
        const paq = obtenerPaquete(viajeSeleccionado.id_paquete);
        const precio = calcularPrecio(viajeSeleccionado);

        return (
            <div className="viaje-selected-banner">
                <div className="viaje-selected-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="viaje-id-chip">Viaje #{viajeSeleccionado.id_viaje}</span>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text)' }}>
                            {dest?.nombre_destino || `Destino #${viajeSeleccionado.id_destino}`}
                        </strong>
                        {precio > 0 && (
                            <span className="viaje-price-chip">{formatoMoneda(precio)} / viajero</span>
                        )}
                    </div>
                    <div className="viaje-meta-row" style={{ marginTop: 6 }}>
                        <span>{viajeSeleccionado.metodo_transporte === 'Avión' ? '✈️ Avión' : '🚌 Bus Cama'} ({viajeSeleccionado.cantidad_unidades || 1} unid.)</span>
                        <span><Package size={13} /> {paq ? paq.nombre_paquete : 'Tarifa base del destino'}</span>
                        <span><Calendar size={13} /> {formatoFecha(viajeSeleccionado.fecha_salida + 'T00:00:00')} → {formatoFecha(viajeSeleccionado.fecha_retorno + 'T00:00:00')}</span>
                        <span><Users size={13} /> {viajeSeleccionado.cupos_disponibles} cupos disponibles</span>
                    </div>
                </div>
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setAbierto(true)}
                    style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                >
                    <RefreshCw size={14} /> Cambiar viaje
                </button>
            </div>
        );
    }

    return (
        <div className="viaje-selector-box">
            <div className="viaje-selector-toolbar">
                <div className="viaje-destino-pills">
                    <button
                        type="button"
                        className={`viaje-pill ${destinoFiltro === 'todos' ? 'active' : ''}`}
                        onClick={() => setDestinoFiltro('todos')}
                    >
                        Todos ({viajesBase.length})
                    </button>
                    {destinosDisponibles.map(d => {
                        const cuenta = viajesBase.filter(v => v.id_destino === d.id_destino).length;
                        return (
                            <button
                                key={d.id_destino}
                                type="button"
                                className={`viaje-pill ${Number(destinoFiltro) === d.id_destino ? 'active' : ''}`}
                                onClick={() => setDestinoFiltro(String(d.id_destino))}
                            >
                                <MapPin size={12} /> {d.nombre_destino.split(',')[0]} ({cuenta})
                            </button>
                        );
                    })}
                </div>
                <div className="search" style={{ minWidth: 210, background: '#fff' }}>
                    <Search size={15} color="#94a3b8" />
                    <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Filtrar por #ID, paquete o fecha..."
                        style={{ minWidth: 160, padding: '7px 0', fontSize: '0.83rem' }}
                    />
                </div>
            </div>

            {viajesFiltrados.length === 0 ? (
                <div style={{ padding: '18px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.86rem' }}>
                    No se encontraron viajes disponibles con ese filtro.
                </div>
            ) : (
                <div className="viaje-cards-grid">
                    {viajesFiltrados.map(v => {
                        const dest = obtenerDestino(v.id_destino);
                        const paq = obtenerPaquete(v.id_paquete);
                        const precio = calcularPrecio(v);
                        const esSeleccionado = Number(valor) === v.id_viaje;

                        return (
                            <div
                                key={v.id_viaje}
                                className={`viaje-option-card ${esSeleccionado ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(String(v.id_viaje));
                                    setAbierto(false);
                                }}
                            >
                                <div className="viaje-card-top">
                                    <span className="viaje-id-chip">#{v.id_viaje}</span>
                                    {precio > 0 && (
                                        <span className="viaje-price-chip">{formatoMoneda(precio)}/pers.</span>
                                    )}
                                </div>
                                <div className="viaje-card-title">
                                    {dest?.nombre_destino || `Destino #${v.id_destino}`}
                                </div>
                                <div className="viaje-card-pack">
                                    <Package size={13} />
                                    <span>{paq ? paq.nombre_paquete : 'Precio base (sin paquete)'}</span>
                                </div>
                                <div className="viaje-card-footer">
                                    <span>
                                        <Calendar size={12} /> {formatoFecha(v.fecha_salida + 'T00:00:00')}
                                    </span>
                                    <span className="viaje-cupos-badge">
                                        {v.metodo_transporte === 'Avión' ? '✈️' : '🚌'} {v.cupos_disponibles} cupos
                                    </span>
                                </div>
                                {esSeleccionado && (
                                    <div className="viaje-check-icon">
                                        <CheckCircle2 size={16} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ==========================================
// HELPERS PARA IDENTIFICACIÓN VENEZOLANA
// Cédula / Pasaporte / Menor sin documento
// ==========================================
export const TIPOS_DOC_TITULAR = ['Cédula', 'Pasaporte'];
export const TIPOS_DOC_VIAJERO = ['Cédula', 'Pasaporte', 'Sin Documento'];

export const esMenorSinDocumento = (doc, tipo) => {
    if (tipo === 'Sin Documento') return true;
    return typeof doc === 'string' && doc.trim().toUpperCase().startsWith('MENOR-');
};

export const extraerRepresentanteMenor = (doc) => {
    if (!doc || typeof doc !== 'string') return '';
    const match = doc.match(/^MENOR-(.+?)(?:-\d+)?$/i);
    return match ? match[1] : '';
};

export const formatearDocumento = (doc, tipo = 'Cédula') => {
    if (esMenorSinDocumento(doc, tipo)) {
        const rep = extraerRepresentanteMenor(doc);
        return {
            tipo: 'Sin Documento',
            etiqueta: 'Menor sin cédula',
            detalle: rep ? `Representante: ${rep}` : 'Asociado al titular',
            icono: '👶',
            badge: 'warning',
            valorReal: doc
        };
    }
    if (tipo === 'Pasaporte' || (typeof doc === 'string' && /^[A-Z]{1,3}\d{6,9}$/i.test(doc.trim()))) {
        return {
            tipo: 'Pasaporte',
            etiqueta: 'Pasaporte',
            detalle: doc,
            icono: '🛂',
            badge: 'info',
            valorReal: doc
        };
    }
    return {
        tipo: 'Cédula',
        etiqueta: 'Cédula',
        detalle: doc,
        icono: '🪪',
        badge: 'neutral',
        valorReal: doc
    };
};

export function BadgeDocumento({ doc, tipo = 'Cédula', conRepresentante = true }) {
    const info = formatearDocumento(doc, tipo);
    if (info.tipo === 'Sin Documento') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <Badge tipo="warning">
                    👶 Menor sin cédula
                </Badge>
                {conRepresentante && info.detalle && (
                    <span style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 600 }}>
                        ({info.detalle})
                    </span>
                )}
            </span>
        );
    }
    if (info.tipo === 'Pasaporte') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Badge tipo="info">
                    🛂 Pasaporte
                </Badge>
                <strong>{doc}</strong>
            </span>
        );
    }
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>🪪</span>
            <strong>{doc}</strong>
        </span>
    );
}

/**
 * Búsqueda lógica inteligente:
 * - Si buscan "pasaporte" o "pas": filtra los pasaportes
 * - Si buscan "menor", "niño", "sin doc": filtra los menores sin documento
 * - Si buscan la cédula del representante: encuentra tanto al representante como a sus menores
 * - Si buscan por nombre, apellido, código o número de documento
 */
export const coincideBusquedaAvanzada = (query, item = {}) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return true;

    const doc = (item.documento_id || item.id_cliente || '').toLowerCase();
    const tipo = (item.tipo_documento || '').toLowerCase();
    const nombre = (item.nombre || '').toLowerCase();
    const apellido = (item.apellido || '').toLowerCase();
    const nombreCompleto = `${nombre} ${apellido}`.trim();
    const rep = extraerRepresentanteMenor(doc).toLowerCase();
    const titularReserva = (item.id_titular || item.titular || '').toLowerCase();

    // Filtros por palabras clave de tipo
    if (['pasaporte', 'pas'].includes(q) && (tipo === 'pasaporte' || /^[A-Z]{1,3}\d{6,9}$/i.test(doc))) return true;
    if (['menor', 'sin documento', 'sin cedula', 'sin cédula', 'niño', 'bebe', 'bebé'].includes(q) && (tipo === 'sin documento' || doc.startsWith('menor-'))) return true;
    if (['cedula', 'cédula'].includes(q) && tipo === 'cédula') return true;

    // Coincidencia directa
    return (
        doc.includes(q) ||
        nombre.includes(q) ||
        apellido.includes(q) ||
        nombreCompleto.includes(q) ||
        tipo.includes(q) ||
        rep.includes(q) ||
        titularReserva.includes(q)
    );
};

// ==========================================
// MÉTODOS DE PAGO Y MONEDAS (USD, BS, COP)
// Soporte para Nequi, Bancolombia, Pago Móvil, etc.
// ==========================================
export { formatoBs, formatoCOP, calcularEquivalentes };

export const METODOS_PAGO = [
    { id: 'Transferencia', label: 'Transferencia (Bs / USD)', moneda: 'USD_BS', icono: '🏦', desc: 'Bancos nacionales o internacionales' },
    { id: 'Pago Móvil', label: 'Pago Móvil (Bs · Tasa BCV)', moneda: 'BS', icono: '📱', desc: 'Pago inmediato en Bolívares' },
    { id: 'Nequi', label: 'Nequi (Pesos Colombianos · COP)', moneda: 'COP', icono: '🟣', desc: 'Transferencia digital Colombia' },
    { id: 'Bancolombia', label: 'Bancolombia (Pesos Colombianos · COP)', moneda: 'COP', icono: '🟡', desc: 'Cuenta de ahorros / corriente Colombia' },
    { id: 'Zelle', label: 'Zelle (USD)', moneda: 'USD', icono: '💵', desc: 'Transferencia directa en Dólares' },
    { id: 'Efectivo', label: 'Efectivo (USD / Bs / COP)', moneda: 'USD', icono: '💵', desc: 'Pago en caja en moneda física' },
    { id: 'Tarjeta', label: 'Tarjeta (Débito / Crédito)', moneda: 'USD', icono: '💳', desc: 'Punto de venta o pasarela' }
];

export const NOMBRES_METODOS = METODOS_PAGO.map(m => m.id);

export function BadgeMetodoPago({ metodo, conMoneda = true }) {
    const met = (metodo || '').trim();
    if (met === 'Nequi') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fdf2f8', color: '#9d174d', border: '1px solid #fbcfe8', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>
                🟣 Nequi {conMoneda && <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>COP</span>}
            </span>
        );
    }
    if (met === 'Bancolombia') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>
                🟡 Bancolombia {conMoneda && <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>COP</span>}
            </span>
        );
    }
    if (met === 'Pago Móvil') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>
                📱 Pago Móvil {conMoneda && <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>Bs BCV</span>}
            </span>
        );
    }
    if (met === 'Zelle') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>
                💵 Zelle {conMoneda && <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>USD</span>}
            </span>
        );
    }
    if (met === 'Efectivo') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>
                💵 Efectivo
            </span>
        );
    }
    if (met === 'Transferencia') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>
                🏦 Transferencia
            </span>
        );
    }
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.78rem' }}>
            💳 {met || 'Otro'}
        </span>
    );
}

// ==========================================
// CALCULADORA Y CONVERSOR MULTIDIVISA
// Calcula en tiempo real USD, Bolívares y Pesos
// ==========================================
export function CalculadoraDivisas({
    montoUSD = 0,
    metodoSeleccionado = 'Transferencia',
    onCambiarMontoUSD = null,
    titulo = 'Cálculo Multimoneda (Tasa BCV y Pesos Colombianos)',
    mostrarConversorInverso = true
}) {
    const [tasas, setTasas] = useState(obtenerTasasLocales());
    const [modoInverso, setModoInverso] = useState(false);
    const [montoBsInput, setMontoBsInput] = useState('');
    const [montoCOPInput, setMontoCOPInput] = useState('');
    const [copiado, setCopiado] = useState('');

    useEffect(() => {
        obtenerTasas().then(setTasas);
        const handleSync = (e) => {
            if (e.detail) setTasas(e.detail);
        };
        window.addEventListener('tasas-cambio-actualizadas', handleSync);
        return () => window.removeEventListener('tasas-cambio-actualizadas', handleSync);
    }, []);

    const equiv = calcularEquivalentes(montoUSD, tasas.tasa_bcv, tasas.tasa_cop);
    const esCOP = ['Nequi', 'Bancolombia'].includes(metodoSeleccionado);
    const esBS = metodoSeleccionado === 'Pago Móvil';
    const esUSD = ['Zelle', 'Tarjeta'].includes(metodoSeleccionado);

    const copiarTexto = (txt, label) => {
        navigator.clipboard?.writeText(String(txt));
        setCopiado(label);
        setTimeout(() => setCopiado(''), 2000);
    };

    const calcularUSDdesdeBs = (valorBs) => {
        setMontoBsInput(valorBs);
        const bs = parseFloat(valorBs) || 0;
        if (bs > 0 && tasas.tasa_bcv > 0 && onCambiarMontoUSD) {
            const usd = Number((bs / tasas.tasa_bcv).toFixed(2));
            onCambiarMontoUSD(usd);
        }
    };

    const calcularUSDdesdeCOP = (valorCOP) => {
        setMontoCOPInput(valorCOP);
        const cop = parseFloat(valorCOP) || 0;
        if (cop > 0 && tasas.tasa_cop > 0 && onCambiarMontoUSD) {
            const usd = Number((cop / tasas.tasa_cop).toFixed(2));
            onCambiarMontoUSD(usd);
        }
    };

    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 14,
            marginTop: 10,
            marginBottom: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Coins size={16} color="var(--primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        {titulo}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem' }}>
                    <span style={{ color: '#475569' }}>
                        🇻🇪 BCV: <strong>Bs. {tasas.tasa_bcv?.toFixed(2)}</strong>
                    </span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span style={{ color: '#475569' }}>
                        🇨🇴 COP: <strong>$ {tasas.tasa_cop?.toLocaleString('es-CO')}</strong>
                    </span>
                    {mostrarConversorInverso && (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                            onClick={() => setModoInverso(!modoInverso)}
                            title="Ingresa el pago en Bolívares o Pesos y calcula los dólares correspondientes"
                        >
                            <ArrowRightLeft size={12} /> {modoInverso ? 'Ocultar conversor' : 'Convertir Bs / COP ➜ $'}
                        </button>
                    )}
                </div>
            </div>

            {/* MODO CONVERSOR INVERSO: Si el cliente pagó en Bs o en COP */}
            {modoInverso && (
                <div style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 12
                }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                        💡 Ingresa el comprobante que te enviaron para calcular los dólares ($) exactos:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                                🇻🇪 Monto pagado en Bolívares (Bs)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Ej. 1650.00 Bs"
                                value={montoBsInput}
                                onChange={(e) => calcularUSDdesdeBs(e.target.value)}
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #bfdbfe', borderRadius: 6 }}
                            />
                            {montoBsInput > 0 && (
                                <small style={{ color: '#15803d', fontWeight: 700, fontSize: '0.72rem', display: 'block', marginTop: 2 }}>
                                    = ${(montoBsInput / tasas.tasa_bcv).toFixed(2)} USD
                                </small>
                            )}
                        </div>
                        <div>
                            <label style={{ fontSize: '0.74rem', color: '#9d174d', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                                🇨🇴 Monto en Pesos Colombianos (Nequi / Bancolombia)
                            </label>
                            <input
                                type="number"
                                step="100"
                                placeholder="Ej. 150000 COP"
                                value={montoCOPInput}
                                onChange={(e) => calcularUSDdesdeCOP(e.target.value)}
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #fbcfe8', borderRadius: 6 }}
                            />
                            {montoCOPInput > 0 && (
                                <small style={{ color: '#15803d', fontWeight: 700, fontSize: '0.72rem', display: 'block', marginTop: 2 }}>
                                    = ${(montoCOPInput / tasas.tasa_cop).toFixed(2)} USD
                                </small>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TARJETAS DE CONVERSIÓN MULTIDIVISA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {/* 1. DÓLARES */}
                <div style={{
                    border: esUSD ? '2px solid #22c55e' : '1px solid #e2e8f0',
                    background: esUSD ? '#f0fdf4' : '#fafafa',
                    borderRadius: 10,
                    padding: '8px 12px',
                    transition: 'all 0.2s'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            🇺🇸 Dólares (USD)
                        </span>
                        {esUSD && <Badge tipo="success">Seleccionado</Badge>}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                        ${equiv.usd.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                        Base de reserva del sistema
                    </div>
                </div>

                {/* 2. BOLÍVARES (TASA BCV) */}
                <div style={{
                    border: esBS ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    background: esBS ? '#eff6ff' : '#fafafa',
                    borderRadius: 10,
                    padding: '8px 12px',
                    transition: 'all 0.2s',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>
                            🇻🇪 Bolívares (BCV)
                        </span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {esBS && <Badge tipo="info">Pago Móvil</Badge>}
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                                onClick={() => copiarTexto(equiv.montoBs, 'bs')}
                                title="Copiar monto en Bolívares"
                            >
                                {copiado === 'bs' ? <Check size={11} color="#15803d" /> : <Copy size={11} />}
                            </button>
                        </div>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: esBS ? '#1e3a8a' : '#0f172a', margin: '4px 0' }}>
                        {equiv.textoBs}
                    </div>
                    <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                        Tasa: {tasas.tasa_bcv?.toFixed(2)} Bs por dólar
                    </div>
                </div>

                {/* 3. PESOS COLOMBIANOS (NEQUI / BANCOLOMBIA) */}
                <div style={{
                    border: esCOP ? '2px solid #ec4899' : '1px solid #e2e8f0',
                    background: esCOP ? '#fdf2f8' : '#fafafa',
                    borderRadius: 10,
                    padding: '8px 12px',
                    transition: 'all 0.2s'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#9d174d', fontWeight: 700, textTransform: 'uppercase' }}>
                            🇨🇴 Pesos (Nequi / Bancolombia)
                        </span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {esCOP && (
                                <span style={{ background: '#fbcfe8', color: '#831843', fontSize: '0.68rem', fontWeight: 800, padding: '2px 5px', borderRadius: 4 }}>
                                    {metodoSeleccionado}
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                                onClick={() => copiarTexto(equiv.montoCOP, 'cop')}
                                title="Copiar monto en Pesos COP"
                            >
                                {copiado === 'cop' ? <Check size={11} color="#15803d" /> : <Copy size={11} />}
                            </button>
                        </div>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: esCOP ? '#831843' : '#0f172a', margin: '4px 0' }}>
                        {equiv.textoCOP}
                    </div>
                    <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                        Tasa: $ {tasas.tasa_cop?.toLocaleString('es-CO')} COP por dólar
                    </div>
                </div>
            </div>

            {/* AVISO INFORMATIVO DEL MÉTODO SELECCIONADO */}
            {esCOP && (
                <div style={{ marginTop: 8, background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 6, padding: '6px 10px', fontSize: '0.76rem', color: '#831843', fontWeight: 600 }}>
                    🟣 <strong>Atención ({metodoSeleccionado}):</strong> El cliente debe transferir exactamente <strong>{equiv.textoCOP}</strong> a tu cuenta de {metodoSeleccionado} para acreditar ${equiv.usd.toFixed(2)} USD.
                </div>
            )}
            {esBS && (
                <div style={{ marginTop: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 10px', fontSize: '0.76rem', color: '#1e3a8a', fontWeight: 600 }}>
                    📱 <strong>Atención (Pago Móvil):</strong> El cliente debe transferir <strong>{equiv.textoBs}</strong> a la tasa oficial BCV ({tasas.tasa_bcv?.toFixed(2)} Bs) para acreditar ${equiv.usd.toFixed(2)} USD.
                </div>
            )}
        </div>
    );
}

// ==========================================
// MODAL PARA EDITAR TASAS DE CAMBIO
// ==========================================
export function ModalEditarTasas({ abierto, onCerrar, onTasasActualizadas }) {
    const [tasaBCV, setTasaBCV] = useState('');
    const [tasaCOP, setTasaCOP] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (abierto) {
            const actual = obtenerTasasLocales();
            setTasaBCV(String(actual.tasa_bcv || '55.20'));
            setTasaCOP(String(actual.tasa_cop || '4250'));
            setError('');
        }
    }, [abierto]);

    if (!abierto) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const bcv = parseFloat(tasaBCV);
        const cop = parseFloat(tasaCOP);
        if (!bcv || bcv <= 0 || !cop || cop <= 0) {
            setError('Las tasas deben ser números mayores a cero.');
            return;
        }
        setGuardando(true);
        try {
            const actualizadas = await guardarTasas({ tasa_bcv: bcv, tasa_cop: cop });
            if (onTasasActualizadas) onTasasActualizadas(actualizadas);
            onCerrar();
        } catch (err) {
            setError('No se pudo guardar las tasas en el servidor.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onCerrar}>
            <div className="modal-card fade-in" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
                <div className="card-header">
                    <div>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Coins size={18} color="var(--primary)" />
                            Actualizar Tasas de Cambio
                        </div>
                        <div className="card-sub">
                            Ajusta la tasa BCV oficial y la tasa de Pesos Colombianos (Nequi / Bancolombia)
                        </div>
                    </div>
                    <button className="btn btn-ghost" onClick={onCerrar} style={{ padding: 6 }}>
                        <X size={18} />
                    </button>
                </div>

                {error && <div className="alert alert-error" style={{ margin: '0 16px 12px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ padding: '0 16px 16px' }}>
                    <div className="field" style={{ marginBottom: 14 }}>
                        <label style={{ fontWeight: 700 }}>🇻🇪 Tasa Oficial BCV (Bolívares Bs por cada $1 USD)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="1"
                            required
                            value={tasaBCV}
                            onChange={(e) => setTasaBCV(e.target.value)}
                            placeholder="Ej. 55.20"
                            style={{ fontSize: '1rem', fontWeight: 700 }}
                        />
                        <small className="cell-sub">Se utiliza para calcular cobros en Pago Móvil y transferencias nacionales.</small>
                    </div>

                    <div className="field" style={{ marginBottom: 18 }}>
                        <label style={{ fontWeight: 700 }}>🇨🇴 Tasa Pesos Colombianos (COP por cada $1 USD)</label>
                        <input
                            type="number"
                            step="1"
                            min="100"
                            required
                            value={tasaCOP}
                            onChange={(e) => setTasaCOP(e.target.value)}
                            placeholder="Ej. 4250"
                            style={{ fontSize: '1rem', fontWeight: 700 }}
                        />
                        <small className="cell-sub">Se utiliza para cobros por Nequi, Bancolombia y efectivo frontera.</small>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button type="button" className="btn btn-ghost" onClick={onCerrar} disabled={guardando}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar y Aplicar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==========================================
// WIDGET DE TASAS PARA LA BARRA SUPERIOR (TOPBAR)
// ==========================================
export function WidgetTasasTopBar() {
    const [tasas, setTasas] = useState(obtenerTasasLocales());
    const [modalAbierto, setModalAbierto] = useState(false);

    useEffect(() => {
        obtenerTasas().then(setTasas);
        const handleSync = (e) => {
            if (e.detail) setTasas(e.detail);
        };
        window.addEventListener('tasas-cambio-actualizadas', handleSync);
        return () => window.removeEventListener('tasas-cambio-actualizadas', handleSync);
    }, []);

    return (
        <>
            <div
                onClick={() => setModalAbierto(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.15s'
                }}
                title="Haz clic para actualizar la Tasa BCV y Pesos Colombianos"
            >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>🇻🇪</span>
                    <span style={{ color: '#64748b' }}>BCV:</span>
                    <strong style={{ color: '#0f172a' }}>Bs. {tasas.tasa_bcv ? Number(tasas.tasa_bcv).toFixed(2) : '—'}</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>🇨🇴</span>
                    <span style={{ color: '#64748b' }}>COP:</span>
                    <strong style={{ color: '#0f172a' }}>${tasas.tasa_cop ? Math.round(Number(tasas.tasa_cop)).toLocaleString('es-CO') : '—'}</strong>
                </span>
                <Edit3 size={12} color="#94a3b8" style={{ marginLeft: 2 }} />
            </div>

            <ModalEditarTasas
                abierto={modalAbierto}
                onCerrar={() => setModalAbierto(false)}
                onTasasActualizadas={setTasas}
            />
        </>
    );
}

// ==========================================
// MODAL DE LIQUIDACIÓN RÁPIDA DE SALDO
// Permite liquidar o abonar a una reserva en 1 clic
// ==========================================
export function ModalLiquidarSaldo({ infoReserva, abierto, onCerrar, onLiquidado }) {
    if (!abierto || !infoReserva) return null;

    const idReserva = infoReserva.reserva?.id_reserva || infoReserva.id_reserva;
    const docCliente = infoReserva.reserva?.id_cliente || infoReserva.id_cliente;
    const falta = Number(infoReserva.falta ?? infoReserva.saldoPendiente ?? 0);
    const total = Number(infoReserva.total ?? infoReserva.reserva?.monto_total ?? 0);
    const abonado = Number(infoReserva.abonado ?? (total - falta) ?? 0);

    const [monto, setMonto] = useState(String(falta > 0 ? falta.toFixed(2) : '30.00'));
    const [metodoPago, setMetodoPago] = useState('Transferencia');
    const [referencia, setReferencia] = useState(`LIQ-RES-${idReserva}`);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (abierto && infoReserva) {
            const f = Number(infoReserva.falta ?? infoReserva.saldoPendiente ?? 0);
            setMonto(String(f > 0 ? f.toFixed(2) : '30.00'));
            setReferencia(`LIQ-RES-${infoReserva.reserva?.id_reserva || infoReserva.id_reserva}`);
            setError('');
        }
    }, [infoReserva, abierto]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const montoNum = parseFloat(monto);
        if (!montoNum || montoNum <= 0) {
            setError('Ingresa un monto válido mayor a $0.');
            return;
        }
        if (montoNum > falta + 0.01) {
            setError(`El monto ingresado ($${montoNum.toFixed(2)}) supera el saldo pendiente de $${falta.toFixed(2)}.`);
            return;
        }
        if (!referencia.trim()) {
            setError('Debes ingresar un número de referencia o comprobante.');
            return;
        }
        setGuardando(true);
        try {
            await crearPago({
                id_reserva: idReserva,
                monto: montoNum,
                metodo_pago: metodoPago,
                referencia: referencia.trim()
            });
            if (onLiquidado) onLiquidado();
            onCerrar();
        } catch (err) {
            setError(mensajeError(err, 'No se pudo registrar la liquidación de la reserva.'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onCerrar}>
            <div className="modal-card fade-in" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                    <div>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CreditCard size={18} color="var(--primary)" />
                            Liquidar Saldo — Reserva #{idReserva}
                        </div>
                        <div className="card-sub">
                            Cliente: <strong>{docCliente}</strong> · Total: {formatoMoneda(total)} · Ya abonado: {formatoMoneda(abonado)}
                        </div>
                    </div>
                    <button className="btn btn-ghost" onClick={onCerrar} style={{ padding: 6 }}>
                        <X size={18} />
                    </button>
                </div>

                {error && <div className="alert alert-error" style={{ margin: '12px 16px 0' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ padding: 16 }}>
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 14,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <span className="cell-sub" style={{ fontSize: '0.76rem', textTransform: 'uppercase', fontWeight: 700 }}>
                                Saldo Restante por Cobrar
                            </span>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b45309' }}>
                                {formatoMoneda(falta)}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '0.8rem', padding: '6px 12px', background: '#fff', border: '1px solid var(--border)' }}
                            onClick={() => setMonto(String(falta.toFixed(2)))}
                        >
                            Liquidar Todo ({formatoMoneda(falta)})
                        </button>
                    </div>

                    <div className="form-grid" style={{ marginBottom: 12 }}>
                        <div className="field">
                            <label style={{ fontWeight: 700 }}>Monto a Cobrar ($ USD)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={falta > 0 ? falta.toFixed(2) : undefined}
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                required
                                style={{ fontSize: '1.05rem', fontWeight: 700 }}
                            />
                        </div>

                        <div className="field">
                            <label style={{ fontWeight: 700 }}>Método de Pago</label>
                            <select
                                value={metodoPago}
                                onChange={(e) => setMetodoPago(e.target.value)}
                            >
                                {METODOS_PAGO.map(m => (
                                    <option key={m.id} value={m.id}>{m.icono} {m.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="field full">
                            <label style={{ fontWeight: 700 }}>
                                Referencia / Nº Comprobante
                            </label>
                            <input
                                value={referencia}
                                onChange={(e) => setReferencia(e.target.value)}
                                placeholder={['Nequi', 'Bancolombia'].includes(metodoPago) ? 'Nº Comprobante o Aprobación Colombia' : 'Nº Referencia'}
                                required
                            />
                        </div>
                    </div>

                    {/* Conversor en vivo a Bs y COP para este cobro */}
                    <CalculadoraDivisas
                        montoUSD={parseFloat(monto) || 0}
                        metodoSeleccionado={metodoPago}
                        onCambiarMontoUSD={(usd) => setMonto(String(usd))}
                        titulo="Monto Exacto a Cobrar al Cliente"
                        mostrarConversorInverso={true}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                        <button type="button" className="btn btn-ghost" onClick={onCerrar} disabled={guardando}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={guardando} style={{ padding: '8px 18px' }}>
                            {guardando ? 'Procesando...' : `Confirmar y Liquidar (${formatoMoneda(parseFloat(monto) || 0)})`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
