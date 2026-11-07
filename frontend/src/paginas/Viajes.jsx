import { useEffect, useState } from 'react';
import {
    Plus, X, MapPin, Package, CheckCircle2, Plane, Bus, Clock, AlertTriangle, CreditCard,
    ArrowRight, ArrowLeft, Check, Calendar, Users
} from 'lucide-react';
import { obtenerViajes, crearViaje, actualizarViaje, eliminarViaje } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { obtenerReservas } from '../servicios/reservasServicios';
import { obtenerPagos } from '../servicios/pagosServicios';
import { obtenerIntegrantes } from '../servicios/integrantesServicios';
import MapaAsientos from '../componentes/MapaAsientos';
import {
    PageHeader, Buscador, EstadoActivo, BotonEditar, BotonBaja, Vacio, Badge, formatoFecha, formatoMoneda, mensajeError,
    ModalLiquidarSaldo
} from '../componentes/UI';

const ASIENTOS_POR_TRANSPORTE = {
    'Bus Cama': 60,
    'Avión': 150
};

const FORM_INICIAL = {
    id_destino: '',
    id_paquete: '',
    fecha_salida: '',
    fecha_retorno: '',
    metodo_transporte: 'Bus Cama',
    cantidad_unidades: 1,
    estatus: 'Programado'
};

const TIPO_ESTATUS = { 'Programado': 'info', 'En Curso': 'warning', 'Finalizado': 'success', 'Cancelado': 'danger' };

const sugerirTransportePorDestino = (nombre = '') => {
    const n = nombre.toLowerCase();
    if (n.includes('roques') || n.includes('tortuga') || n.includes('canaima') || n.includes('margarita') || n.includes('isla') || n.includes('archipiélago')) {
        return 'Avión';
    }
    return 'Bus Cama';
};

const calcularSemaforoViaje = (v) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const salida = new Date(v.fecha_salida + 'T00:00:00');
    const retorno = new Date(v.fecha_retorno + 'T00:00:00');
    const dias = Math.round((salida - hoy) / (1000 * 60 * 60 * 24));

    if (v.estatus === 'Cancelado') {
        return { tipo: 'danger', texto: 'Cancelado', dias, urgente: false };
    }
    if (v.estatus === 'Finalizado' || retorno < hoy) {
        return { tipo: 'neutral', texto: '✓ Cumplido', dias, urgente: false };
    }
    if ((salida <= hoy && hoy <= retorno) || v.estatus === 'En Curso') {
        return { tipo: 'warning', texto: '🚌 En curso hoy', dias: 0, urgente: true };
    }
    if (dias <= 7) {
        return {
            tipo: 'danger',
            texto: dias === 0 ? '🚨 Sale hoy' : `🚨 En ${dias} día${dias === 1 ? '' : 's'}`,
            dias,
            urgente: true
        };
    }
    if (dias <= 21) {
        return { tipo: 'warning', texto: `⏳ En ${dias} días`, dias, urgente: false };
    }
    return { tipo: 'success', texto: `🟢 En ${dias} días`, dias, urgente: false };
};

export default function Viajes({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const puedeGestionarViajes = esAdmin || esOperador;
    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [integrantes, setIntegrantes] = useState([]);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    // Estado del Asistente Lineal para Programar Viajes
    const [mostrarForm, setMostrarForm] = useState(false);
    const [pasoViaje, setPasoViaje] = useState(1);
    const [idEditando, setIdEditando] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    // Modales separados para no saturar la vista principal
    const [mostrarModalCobranzas, setMostrarModalCobranzas] = useState(false);
    const [viajeCobranzaModal, setViajeCobranzaModal] = useState(null);
    const [viajeCroquisModal, setViajeCroquisModal] = useState(null);
    const [reservaParaLiquidarDirecta, setReservaParaLiquidarDirecta] = useState(null);
    const [form, setForm] = useState(FORM_INICIAL);

    const cargarDatos = async () => {
        try {
            const [vData, dData, pData, rData, pgData, iData] = await Promise.all([
                obtenerViajes(),
                obtenerDestinos(),
                obtenerPaquetes(),
                obtenerReservas(),
                obtenerPagos(),
                obtenerIntegrantes()
            ]);
            setViajes(vData);
            setDestinos(dData);
            setPaquetes(pData);
            setReservas(rData);
            setPagos(pgData);
            setIntegrantes(iData || []);
        } catch (err) {
            setError('Error al obtener la lista de viajes.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const obtenerCobranzaViaje = (idViaje) => {
        const resViaje = reservas.filter(r => r.is_active && r.id_viaje === Number(idViaje));
        let reservasConDeuda = 0;
        let saldoPendiente = 0;
        resViaje.forEach(r => {
            const abonado = pagos
                .filter(p => p.is_active && p.id_reserva === r.id_reserva)
                .reduce((s, p) => s + Number(p.monto), 0);
            const falta = Math.max((Number(r.monto_total) || 0) - abonado, 0);
            if (falta > 0.01) {
                reservasConDeuda += 1;
                saldoPendiente += falta;
            }
        });
        return { totalReservas: resViaje.length, reservasConDeuda, saldoPendiente };
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const iniciarEdicion = (v) => {
        setIdEditando(v.id_viaje);
        setForm({
            id_destino: String(v.id_destino),
            id_paquete: v.id_paquete ? String(v.id_paquete) : '',
            fecha_salida: v.fecha_salida,
            fecha_retorno: v.fecha_retorno,
            metodo_transporte: v.metodo_transporte || 'Bus Cama',
            cantidad_unidades: v.cantidad_unidades || 1,
            estatus: v.estatus
        });
        setPasoViaje(1);
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarForm = () => {
        setIdEditando(null);
        setForm(FORM_INICIAL);
        setPasoViaje(1);
        setMostrarForm(false);
    };

    const seleccionarDestino = (d) => {
        const sugerido = sugerirTransportePorDestino(d.nombre_destino);
        setForm({
            ...form,
            id_destino: String(d.id_destino),
            id_paquete: '',
            metodo_transporte: sugerido
        });
    };

    const seleccionarPaquete = (idPaquete) => {
        setForm({ ...form, id_paquete: idPaquete ? String(idPaquete) : '' });
    };

    const asientosPorUnidad = ASIENTOS_POR_TRANSPORTE[form.metodo_transporte] || 60;
    const unidadesNum = Math.max(parseInt(form.cantidad_unidades) || 1, 1);
    const cuposCalculados = asientosPorUnidad * unidadesNum;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!form.id_destino) {
            alert('Por favor selecciona un destino para el viaje.');
            setPasoViaje(1);
            return;
        }
        if (!form.fecha_salida || !form.fecha_retorno) {
            alert('Por favor indica las fechas de salida y retorno.');
            setPasoViaje(2);
            return;
        }
        if (new Date(form.fecha_retorno) < new Date(form.fecha_salida)) {
            alert('La fecha de retorno no puede ser anterior a la fecha de salida.');
            setPasoViaje(2);
            return;
        }

        try {
            setGuardando(true);
            const payload = {
                id_destino: parseInt(form.id_destino),
                id_paquete: form.id_paquete ? parseInt(form.id_paquete) : null,
                fecha_salida: form.fecha_salida,
                fecha_retorno: form.fecha_retorno,
                metodo_transporte: form.metodo_transporte,
                cantidad_unidades: unidadesNum,
                estatus: form.estatus
            };
            if (idEditando) {
                await actualizarViaje(idEditando, payload);
            } else {
                await crearViaje({ ...payload, cupos_disponibles: cuposCalculados });
            }
            cancelarForm();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el viaje (verifica las fechas y el destino).'));
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este viaje? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarViaje(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar el viaje.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarViaje(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el viaje.'));
        }
    };

    const nombreDestino = (id) => destinos.find(d => d.id_destino === id)?.nombre_destino || `Destino #${id}`;
    const nombrePaquete = (id) => paquetes.find(p => p.id_paquete === id)?.nombre_paquete || 'Sin paquete';
    const precioPorPersona = (v) => {
        if (v.id_paquete) {
            const p = paquetes.find(x => x.id_paquete === v.id_paquete);
            if (p) return Number(p.precio_paquete);
        }
        const d = destinos.find(x => x.id_destino === v.id_destino);
        return d ? Number(d.precio_base) : 0;
    };

    const destinoElegido = destinos.find(d => d.id_destino === parseInt(form.id_destino));
    const paquetesDelDestino = form.id_destino
        ? paquetes.filter(p => p.is_active && p.id_destino === parseInt(form.id_destino))
        : [];
    const paqueteElegido = paquetes.find(p => p.id_paquete === parseInt(form.id_paquete));
    const precioFinalForm = paqueteElegido
        ? Number(paqueteElegido.precio_paquete)
        : (destinoElegido ? Number(destinoElegido.precio_base) : 0);

    // Detectar viajes con saldos pendientes por cobrar
    const viajesConAlertaCobro = viajes
        .filter(v => v.is_active && v.estatus !== 'Cancelado')
        .map(v => ({
            viaje: v,
            semaforo: calcularSemaforoViaje(v),
            cobranza: obtenerCobranzaViaje(v.id_viaje)
        }))
        .filter(x => x.cobranza.reservasConDeuda > 0);

    const q = busqueda.trim().toLowerCase();
    const filtrados = viajes.filter(v =>
        !q || `${v.id_viaje} ${nombreDestino(v.id_destino)} ${nombrePaquete(v.id_paquete)} ${v.metodo_transporte || ''} ${v.fecha_salida} ${v.estatus}`
            .toLowerCase()
            .includes(q)
    );

    return (
        <div className="fade-in">
            <PageHeader
                titulo={mostrarForm ? (idEditando ? `Editar Viaje #${idEditando}` : 'Programación Lineal de Viaje') : 'Viajes Programados'}
                subtitulo={mostrarForm ? 'Proceso guiado de programación' : `${viajes.length} viajes registrados`}
            >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Botón de Cobranzas Pre-Salida (Reubica la alerta para no saturar la vista) */}
                    {viajesConAlertaCobro.length > 0 && !mostrarForm && (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#b45309', fontWeight: 700 }}
                            onClick={() => setMostrarModalCobranzas(true)}
                            title="Ver viajes con saldos pendientes por cobrar"
                        >
                            <AlertTriangle size={15} color="#d97706" /> Cobranzas Pre-Salida ({viajesConAlertaCobro.length})
                        </button>
                    )}

                    {puedeGestionarViajes && (
                        mostrarForm ? (
                            <button className="btn btn-ghost" onClick={cancelarForm}>
                                <ArrowLeft size={16} /> Volver a la Lista
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={() => { setPasoViaje(1); setMostrarForm(true); }}>
                                <Plus size={16} /> + Programar Viaje
                            </button>
                        )
                    )}
                </div>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            {/* ASISTENTE LINEAL PARA PROGRAMAR VIAJES */}
            {mostrarForm && (
                <div className="card fade-in" style={{ maxWidth: 900, margin: '0 auto 24px', padding: 0, overflow: 'hidden' }}>
                    {/* ENCABEZADO STEPPER LINEAL */}
                    <div className="wizard-header">
                        <div className="wizard-stepper">
                            <button
                                type="button"
                                className={`wizard-step-item ${pasoViaje === 1 ? 'active' : ''} ${pasoViaje > 1 ? 'completed' : ''}`}
                                onClick={() => setPasoViaje(1)}
                            >
                                <div className="wizard-step-badge">
                                    {pasoViaje > 1 ? <Check size={16} /> : '1'}
                                </div>
                                <div className="wizard-step-text">
                                    <span className="wizard-step-title">1. Destino y Paquete</span>
                                    <span className="wizard-step-sub">{destinoElegido?.nombre_destino || 'Elegir destino'}</span>
                                </div>
                            </button>

                            <div className="wizard-divider" />

                            <button
                                type="button"
                                className={`wizard-step-item ${pasoViaje === 2 ? 'active' : ''} ${pasoViaje > 2 ? 'completed' : ''}`}
                                onClick={() => form.id_destino && setPasoViaje(2)}
                                disabled={!form.id_destino}
                            >
                                <div className="wizard-step-badge">
                                    {pasoViaje > 2 ? <Check size={16} /> : '2'}
                                </div>
                                <div className="wizard-step-text">
                                    <span className="wizard-step-title">2. Transporte y Fechas</span>
                                    <span className="wizard-step-sub">{form.metodo_transporte} · {cuposCalculados} cupos</span>
                                </div>
                            </button>

                            <div className="wizard-divider" />

                            <button
                                type="button"
                                className={`wizard-step-item ${pasoViaje === 3 ? 'active' : ''}`}
                                onClick={() => form.id_destino && form.fecha_salida && setPasoViaje(3)}
                                disabled={!form.id_destino || !form.fecha_salida}
                            >
                                <div className="wizard-step-badge">3</div>
                                <div className="wizard-step-text">
                                    <span className="wizard-step-title">3. Confirmar y Publicar</span>
                                    <span className="wizard-step-sub">Resumen final</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* CUERPO DEL ASISTENTE */}
                    <div className="wizard-body">
                        {/* PASO 1: DESTINO Y PAQUETE */}
                        {pasoViaje === 1 && (
                            <div className="fade-in">
                                <div style={{ marginBottom: 14 }}>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                        Paso 1: Destino Turístico y Paquete Opcional
                                    </h3>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                                        Selecciona el destino al que viajará el grupo y el paquete asociado.
                                    </p>
                                </div>

                                <div className="viaje-cards-grid" style={{ maxHeight: 220, marginBottom: 14 }}>
                                    {destinos.filter(d => d.is_active).map(d => {
                                        const activo = parseInt(form.id_destino) === d.id_destino;
                                        const transpSugerido = sugerirTransportePorDestino(d.nombre_destino);
                                        return (
                                            <div
                                                key={d.id_destino}
                                                className={`viaje-option-card ${activo ? 'selected' : ''}`}
                                                onClick={() => seleccionarDestino(d)}
                                            >
                                                <div className="viaje-card-top">
                                                    <span className="viaje-id-chip"><MapPin size={11} /> #{d.id_destino}</span>
                                                    <span className="viaje-price-chip">Base: {formatoMoneda(d.precio_base)}</span>
                                                </div>
                                                <div className="viaje-card-title">{d.nombre_destino}</div>
                                                <div className="viaje-card-pack">
                                                    {transpSugerido === 'Avión' ? <Plane size={13} /> : <Bus size={13} />}
                                                    <span>Sugerido: {transpSugerido}</span>
                                                </div>
                                                {activo && <div className="viaje-check-icon"><CheckCircle2 size={16} /></div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {form.id_destino && (
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: 8 }}>
                                            Paquetes disponibles para {destinoElegido?.nombre_destino}:
                                        </div>
                                        <div className="viaje-cards-grid" style={{ maxHeight: 200 }}>
                                            <div
                                                className={`viaje-option-card ${!form.id_paquete ? 'selected' : ''}`}
                                                onClick={() => seleccionarPaquete('')}
                                            >
                                                <div className="viaje-card-top">
                                                    <span className="viaje-id-chip">Tarifa Base</span>
                                                    <span className="viaje-price-chip">{formatoMoneda(destinoElegido?.precio_base)}</span>
                                                </div>
                                                <div className="viaje-card-title">Sin paquete adicional</div>
                                                <div className="viaje-card-pack">Usa la tarifa base del destino</div>
                                                {!form.id_paquete && <div className="viaje-check-icon"><CheckCircle2 size={16} /></div>}
                                            </div>
                                            {paquetesDelDestino.map(p => {
                                                const activo = parseInt(form.id_paquete) === p.id_paquete;
                                                return (
                                                    <div
                                                        key={p.id_paquete}
                                                        className={`viaje-option-card ${activo ? 'selected' : ''}`}
                                                        onClick={() => seleccionarPaquete(p.id_paquete)}
                                                    >
                                                        <div className="viaje-card-top">
                                                            <span className="viaje-id-chip"><Package size={11} /> {p.duracion_dias}D/{p.duracion_noches}N</span>
                                                            <span className="viaje-price-chip">{formatoMoneda(p.precio_paquete)}</span>
                                                        </div>
                                                        <div className="viaje-card-title">{p.nombre_paquete}</div>
                                                        <div className="viaje-card-pack">{p.resumen || p.descripcion}</div>
                                                        {activo && <div className="viaje-check-icon"><CheckCircle2 size={16} /></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PASO 2: TRANSPORTE Y FECHAS */}
                        {pasoViaje === 2 && (
                            <div className="fade-in">
                                <div style={{ marginBottom: 14 }}>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                        Paso 2: Transporte, Cupos y Fechas de Salida
                                    </h3>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                                        Define el medio de transporte, cantidad de unidades y el itinerario de fechas.
                                    </p>
                                </div>

                                <div className="form-grid">
                                    <div className="field full">
                                        <label>Tipo de Transporte</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <div
                                                className={`viaje-option-card ${form.metodo_transporte === 'Bus Cama' ? 'selected' : ''}`}
                                                onClick={() => setForm({ ...form, metodo_transporte: 'Bus Cama' })}
                                                style={{ padding: '10px 14px' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                                    <Bus size={18} color="var(--primary-dark)" />
                                                    <span>Bus Cama Doble Piso</span>
                                                </div>
                                                <div className="cell-sub">60 asientos por unidad</div>
                                            </div>

                                            <div
                                                className={`viaje-option-card ${form.metodo_transporte === 'Avión' ? 'selected' : ''}`}
                                                onClick={() => setForm({ ...form, metodo_transporte: 'Avión' })}
                                                style={{ padding: '10px 14px' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                                    <Plane size={18} color="var(--indigo)" />
                                                    <span>Avión Comercial</span>
                                                </div>
                                                <div className="cell-sub">150 asientos por vuelo</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="field">
                                        <label>Cantidad de {form.metodo_transporte === 'Avión' ? 'aviones / vuelos' : 'buses'}</label>
                                        <input
                                            type="number"
                                            name="cantidad_unidades"
                                            min="1"
                                            max="20"
                                            value={form.cantidad_unidades}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="field">
                                        <label>Capacidad Total Calculada</label>
                                        <div style={{ padding: '9px 12px', background: 'var(--primary-soft)', color: 'var(--primary-dark)', fontWeight: 800, borderRadius: 8, fontSize: '0.95rem' }}>
                                            {unidadesNum} × {asientosPorUnidad} = {cuposCalculados} cupos totales
                                        </div>
                                    </div>

                                    <div className="field">
                                        <label>Fecha de Salida</label>
                                        <input
                                            type="date"
                                            name="fecha_salida"
                                            value={form.fecha_salida}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="field">
                                        <label>Fecha de Retorno</label>
                                        <input
                                            type="date"
                                            name="fecha_retorno"
                                            value={form.fecha_retorno}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO 3: CONFIRMACIÓN Y PUBLICAR */}
                        {pasoViaje === 3 && (
                            <div className="fade-in">
                                <div style={{ marginBottom: 14 }}>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                        Paso 3: Confirmación y Programación
                                    </h3>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                                        Revisa el itinerario antes de programarlo en el sistema.
                                    </p>
                                </div>

                                <div style={{ background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                                        <div>
                                            <div className="cell-sub">Destino y Paquete</div>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f766e' }}>{destinoElegido?.nombre_destino}</strong>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                                {paqueteElegido ? paqueteElegido.nombre_paquete : 'Tarifa base del destino'}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="cell-sub">Fechas del Itinerario</div>
                                            <strong>{formatoFecha(form.fecha_salida + 'T00:00:00')}</strong>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                                al {formatoFecha(form.fecha_retorno + 'T00:00:00')}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="cell-sub">Transporte y Capacidad</div>
                                            <strong>{unidadesNum} {form.metodo_transporte}</strong>
                                            <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}>
                                                {cuposCalculados} cupos disponibles
                                            </div>
                                        </div>

                                        <div>
                                            <div className="cell-sub">Tarifa por Pasajero</div>
                                            <strong style={{ fontSize: '1.2rem', color: '#047857' }}>
                                                {formatoMoneda(precioFinalForm)}
                                            </strong>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                Precio fijo base
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="field">
                                    <label>Estatus Inicial del Viaje</label>
                                    <div className="viaje-destino-pills" style={{ marginTop: 4 }}>
                                        {Object.keys(TIPO_ESTATUS).map(e => (
                                            <button
                                                key={e}
                                                type="button"
                                                className={`viaje-pill ${form.estatus === e ? 'active' : ''}`}
                                                onClick={() => setForm({ ...form, estatus: e })}
                                            >
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PIE DE NAVEGACIÓN DEL WIZARD */}
                    <div className="wizard-footer">
                        <div>
                            {pasoViaje === 1 ? (
                                <button type="button" className="btn btn-ghost" onClick={cancelarForm}>
                                    Cancelar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setPasoViaje(pasoViaje - 1)}
                                >
                                    <ArrowLeft size={16} /> Paso Anterior
                                </button>
                            )}
                        </div>

                        <div>
                            {pasoViaje === 1 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={!form.id_destino}
                                    onClick={() => setPasoViaje(2)}
                                >
                                    Siguiente: Transporte y Fechas <ArrowRight size={16} />
                                </button>
                            )}

                            {pasoViaje === 2 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={!form.fecha_salida || !form.fecha_retorno}
                                    onClick={() => {
                                        if (new Date(form.fecha_retorno) < new Date(form.fecha_salida)) {
                                            alert('La fecha de retorno no puede ser menor a la de salida.');
                                            return;
                                        }
                                        setPasoViaje(3);
                                    }}
                                >
                                    Siguiente: Confirmación <ArrowRight size={16} />
                                </button>
                            )}

                            {pasoViaje === 3 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={guardando}
                                    style={{ background: 'linear-gradient(135deg, #0ea5a4, #10b981)', padding: '10px 22px', fontSize: '0.96rem', fontWeight: 800 }}
                                >
                                    {guardando ? 'Guardando...' : (idEditando ? 'Actualizar Viaje' : '🚀 Programar y Publicar Viaje')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TABLA PRINCIPAL DE VIAJES (SOLO CUANDO NO SE ESTÁ PROGRAMANDO) */}
            {!mostrarForm && (
                <div className="card fade-in">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Listado de Viajes Programados</div>
                            <div className="card-sub">{filtrados.length} viajes encontrados</div>
                        </div>
                        <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por destino, transporte o fecha..." />
                    </div>
                    {filtrados.length === 0 ? <Vacio /> : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Destino y Paquete</th>
                                        <th>Transporte</th>
                                        <th>Precio / pers.</th>
                                        <th>Salida / Semáforo</th>
                                        <th>Cupos y Cobranza</th>
                                        <th>Estatus</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map((v) => {
                                        const esAvion = v.metodo_transporte === 'Avión';
                                        const capTotal = (esAvion ? 150 : 60) * (v.cantidad_unidades || 1);
                                        const semaforo = calcularSemaforoViaje(v);
                                        const cobranza = obtenerCobranzaViaje(v.id_viaje);
                                        return (
                                            <tr key={v.id_viaje} className={v.is_active ? '' : 'inactive'}>
                                                <td><strong>#{v.id_viaje}</strong></td>
                                                <td>
                                                    <div className="cell-main">{nombreDestino(v.id_destino)}</div>
                                                    <div className="cell-sub">{nombrePaquete(v.id_paquete)}</div>
                                                </td>
                                                <td>
                                                    <Badge tipo={esAvion ? 'info' : 'success'}>
                                                        {esAvion ? '✈️ Avión' : '🚌 Bus Cama'} × {v.cantidad_unidades || 1}
                                                    </Badge>
                                                    <div className="cell-sub" style={{ marginTop: 2 }}>{capTotal} asientos</div>
                                                </td>
                                                <td className="money">{formatoMoneda(precioPorPersona(v))}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{formatoFecha(v.fecha_salida + 'T00:00:00')}</div>
                                                    <div className="cell-sub" style={{ marginBottom: 3 }}>al {formatoFecha(v.fecha_retorno + 'T00:00:00')}</div>
                                                    <Badge tipo={semaforo.tipo}>{semaforo.texto}</Badge>
                                                </td>
                                                <td>
                                                    <div><strong>{v.cupos_disponibles}</strong> libres</div>
                                                    {cobranza.reservasConDeuda > 0 ? (
                                                        <div className="cell-sub" style={{ color: '#b45309', fontWeight: 700, marginTop: 2 }}>
                                                            ⚠️ {cobranza.reservasConDeuda} debe {formatoMoneda(cobranza.saldoPendiente)}
                                                        </div>
                                                    ) : cobranza.totalReservas > 0 ? (
                                                        <div className="cell-sub" style={{ color: '#15803d', fontWeight: 700, marginTop: 2 }}>
                                                            ✓ 100% al día
                                                        </div>
                                                    ) : (
                                                        <div className="cell-sub">Sin reservas</div>
                                                    )}
                                                </td>
                                                <td><Badge tipo={TIPO_ESTATUS[v.estatus] || 'neutral'}>{v.estatus}</Badge></td>
                                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => setViajeCroquisModal(v)}
                                                            title="Ver Mapa y Croquis de Asientos"
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', fontSize: '0.76rem', fontWeight: 700 }}
                                                        >
                                                            💺 Croquis
                                                        </button>
                                                        {puedeGestionarViajes && (
                                                            <BotonEditar onClick={() => iniciarEdicion(v)} />
                                                        )}
                                                        {esAdmin && (
                                                            <BotonBaja
                                                                activo={v.is_active}
                                                                onClick={() => handleEliminar(v.id_viaje)}
                                                                onRestaurar={() => handleRestaurar(v.id_viaje)}
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL REUBICADO: CONTROL DE COBRANZAS PRE-SALIDA (YA NO INVADE LA VISTA PRINCIPAL) */}
            {mostrarModalCobranzas && (
                <div className="modal-backdrop" onClick={() => setMostrarModalCobranzas(false)}>
                    <div className="modal-card fade-in" style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ padding: 8, background: '#fef3c7', borderRadius: 8, color: '#d97706' }}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <div className="card-title">Control de Cobranza Pre-Salida</div>
                                    <div className="card-sub">{viajesConAlertaCobro.length} viaje(s) tienen pasajeros con saldo pendiente por liquidar</div>
                                </div>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setMostrarModalCobranzas(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: '16px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                                {viajesConAlertaCobro.map(({ viaje, semaforo, cobranza }) => (
                                    <div
                                        key={viaje.id_viaje}
                                        style={{
                                            background: '#fff',
                                            borderRadius: 10,
                                            padding: '12px 14px',
                                            border: semaforo.urgente ? '1.5px solid #ef4444' : '1px solid #fcd34d',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <strong style={{ fontSize: '0.88rem' }}>Viaje #{viaje.id_viaje} · {nombreDestino(viaje.id_destino)}</strong>
                                            <Badge tipo={semaforo.tipo}>{semaforo.texto}</Badge>
                                        </div>
                                        <div className="cell-sub" style={{ color: '#b45309', fontWeight: 700, margin: '6px 0' }}>
                                            ⚠️ {cobranza.reservasConDeuda} reserva{cobranza.reservasConDeuda === 1 ? '' : 's'} debe {formatoMoneda(cobranza.saldoPendiente)}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ marginTop: 6, width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
                                            onClick={() => {
                                                setMostrarModalCobranzas(false);
                                                setViajeCobranzaModal({ viaje, cobranza });
                                            }}
                                        >
                                            <CreditCard size={13} /> Ver Pasajeros y Liquidar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE RESERVAS CON SALDO PENDIENTE DEL VIAJE SELECCIONADO */}
            {viajeCobranzaModal && (
                <div className="modal-backdrop" onClick={() => setViajeCobranzaModal(null)}>
                    <div className="modal-card fade-in" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                            <div>
                                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={18} color="#d97706" />
                                    Cobranza Pre-Salida — Viaje #{viajeCobranzaModal.viaje.id_viaje} ({nombreDestino(viajeCobranzaModal.viaje.id_destino)})
                                </div>
                                <div className="card-sub">
                                    Salida: {formatoFecha(viajeCobranzaModal.viaje.fecha_salida + 'T00:00:00')} · Total por cobrar: <strong>{formatoMoneda(viajeCobranzaModal.cobranza.saldoPendiente)}</strong>
                                </div>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setViajeCobranzaModal(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: '14px 0' }}>
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Reserva</th>
                                            <th>Cliente Titular</th>
                                            <th>Total</th>
                                            <th>Abonado</th>
                                            <th>Falta</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reservas
                                            .filter(r => r.is_active && r.id_viaje === viajeCobranzaModal.viaje.id_viaje)
                                            .map(r => {
                                                const pagosR = pagos.filter(p => p.id_reserva === r.id_reserva && p.is_active);
                                                const abonado = pagosR.reduce((s, p) => s + Number(p.monto), 0);
                                                const falta = Math.max(Number(r.monto_total) - abonado, 0);
                                                if (falta <= 0.01) return null;
                                                return (
                                                    <tr key={r.id_reserva}>
                                                        <td><strong>#{r.id_reserva}</strong></td>
                                                        <td><strong>{r.id_cliente}</strong></td>
                                                        <td className="money">{formatoMoneda(r.monto_total)}</td>
                                                        <td className="money" style={{ color: '#15803d' }}>{formatoMoneda(abonado)}</td>
                                                        <td className="money" style={{ color: '#b45309', fontWeight: 700 }}>{formatoMoneda(falta)}</td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary"
                                                                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                                                                onClick={() => setReservaParaLiquidarDirecta({
                                                                    reserva: r,
                                                                    id_reserva: r.id_reserva,
                                                                    id_cliente: r.id_cliente,
                                                                    total: Number(r.monto_total),
                                                                    abonado,
                                                                    falta
                                                                })}
                                                            >
                                                                <CreditCard size={12} /> Liquidar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CROQUIS Y MAPA DE ASIENTOS */}
            {viajeCroquisModal && (
                <div className="modal-backdrop fade-in" onClick={() => setViajeCroquisModal(null)}>
                    <div
                        className="modal-content card"
                        style={{ maxWidth: 980, width: '96%', maxHeight: '92vh', overflowY: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                            <div>
                                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.15rem' }}>
                                    <span>💺 Croquis de Asientos — Viaje #{viajeCroquisModal.id_viaje}</span>
                                    <Badge tipo={viajeCroquisModal.metodo_transporte === 'Avión' ? 'info' : 'success'}>
                                        {viajeCroquisModal.metodo_transporte === 'Avión' ? '✈️ Avión' : '🚌 Bus Cama'}
                                    </Badge>
                                </div>
                                <div className="card-sub" style={{ marginTop: 4 }}>
                                    Destino: <strong>{nombreDestino(viajeCroquisModal.id_destino)}</strong> · Salida: {formatoFecha(viajeCroquisModal.fecha_salida + 'T00:00:00')}
                                </div>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setViajeCroquisModal(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            {(() => {
                                const resViaje = new Set(reservas.filter(r => r.id_viaje === viajeCroquisModal.id_viaje && r.is_active).map(r => r.id_reserva));
                                const integrantesDelViaje = integrantes.filter(i => i.is_active && resViaje.has(i.id_reserva));
                                const capViaje = ((viajeCroquisModal.metodo_transporte === 'Avión' ? 150 : 60) * (viajeCroquisModal.cantidad_unidades || 1));
                                const ocupadosCount = integrantesDelViaje.filter(i => i.numero_asiento).length;
                                return (
                                    <>
                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                                            <div style={{ flex: 1, minWidth: 180, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>CAPACIDAD</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{capViaje} Asientos</div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 180, padding: 10, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>ASIGNADOS</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>{ocupadosCount} Asientos</div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 180, padding: 10, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                                                <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600 }}>DISPONIBLES</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb' }}>{Math.max(capViaje - ocupadosCount, 0)} Libres</div>
                                            </div>
                                        </div>

                                        <MapaAsientos
                                            viaje={viajeCroquisModal}
                                            ocupadosExternos={integrantesDelViaje}
                                            titulo={`Croquis de Asientos — ${viajeCroquisModal.metodo_transporte || 'Bus Cama'}`}
                                        />

                                        {/* Pasajeros de este viaje */}
                                        <div className="card" style={{ marginTop: 14 }}>
                                            <div className="card-header">
                                                <div className="card-title" style={{ fontSize: '0.9rem' }}>
                                                    📋 Pasajeros con Puesto Asignado ({integrantesDelViaje.length})
                                                </div>
                                            </div>
                                            {integrantesDelViaje.length === 0 ? (
                                                <div style={{ padding: 14, textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                                                    Aún no hay pasajeros con asientos asignados en este viaje.
                                                </div>
                                            ) : (
                                                <div className="table-wrap">
                                                    <table className="table" style={{ fontSize: '0.82rem' }}>
                                                        <thead>
                                                            <tr>
                                                                <th>Puesto</th>
                                                                <th>Nombre y Apellido</th>
                                                                <th>Documento</th>
                                                                <th>Edad</th>
                                                                <th>Reserva</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {integrantesDelViaje
                                                                .slice()
                                                                .sort((a, b) => (Number(a.numero_asiento) || 999) - (Number(b.numero_asiento) || 999))
                                                                .map((p) => (
                                                                    <tr key={p.id_integrante}>
                                                                        <td>
                                                                            <Badge tipo={p.numero_asiento ? 'success' : 'warning'}>
                                                                                {p.numero_asiento ? `Puesto #${String(p.numero_asiento).padStart(2, '0')}` : 'Sin puesto'}
                                                                            </Badge>
                                                                        </td>
                                                                        <td className="cell-main">{p.nombre} {p.apellido}</td>
                                                                        <td>{p.documento_id}</td>
                                                                        <td>{p.edad ? `${p.edad} años` : '—'}</td>
                                                                        <td><Badge tipo="neutral">#{p.id_reserva}</Badge></td>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            <ModalLiquidarSaldo
                infoReserva={reservaParaLiquidarDirecta}
                abierto={!!reservaParaLiquidarDirecta}
                onCerrar={() => setReservaParaLiquidarDirecta(null)}
                onLiquidado={() => {
                    cargarDatos();
                    setViajeCobranzaModal(null);
                }}
            />
        </div>
    );
}
