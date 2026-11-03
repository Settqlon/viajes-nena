import { useEffect, useState } from 'react';
import { Plus, X, MapPin, Package, CheckCircle2, Plane, Bus, Clock, AlertTriangle, CreditCard } from 'lucide-react';
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
        return { tipo: 'neutral', texto: '✓ Fecha cumplida', dias, urgente: false };
    }
    if ((salida <= hoy && hoy <= retorno) || v.estatus === 'En Curso') {
        return { tipo: 'warning', texto: '🚌 En curso hoy', dias: 0, urgente: true };
    }
    if (dias <= 7) {
        return {
            tipo: 'danger',
            texto: dias === 0 ? '🚨 Sale hoy' : `🚨 Sale en ${dias} día${dias === 1 ? '' : 's'}`,
            dias,
            urgente: true
        };
    }
    if (dias <= 21) {
        return { tipo: 'warning', texto: `⏳ Sale en ${dias} días`, dias, urgente: false };
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
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [busqueda, setBusqueda] = useState('');
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
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarForm = () => {
        setIdEditando(null);
        setForm(FORM_INICIAL);
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
        e.preventDefault();
        if (!form.id_destino) {
            alert('Por favor selecciona un destino para el viaje.');
            return;
        }
        try {
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

    // Detectar viajes activos próximos o con saldos pendientes de liquidar
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
                titulo="Viajes Programados"
                subtitulo="Semáforo de cuenta regresiva y control de liquidación antes de la salida"
            >
                {puedeGestionarViajes ? (
                    <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarForm() : setMostrarForm(true)}>
                        {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Viaje</>}
                    </button>
                ) : (
                    <span style={{ fontSize: '0.82rem', padding: '6px 12px', background: '#f1f5f9', borderRadius: 8, color: '#475569', fontWeight: 600 }}>
                        👁️ Consulta de Cupos y Fechas
                    </span>
                )}
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Semáforo de Alerta de Viajes con Saldos por Liquidar */}
            {viajesConAlertaCobro.length > 0 && (
                <div
                    className="card"
                    style={{
                        marginBottom: 20,
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        border: '1px solid #f59e0b'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontWeight: 800, fontSize: '0.94rem' }}>
                            <AlertTriangle size={18} color="#d97706" />
                            <span>Semáforo Pre-Salida: {viajesConAlertaCobro.length} viaje(s) tienen pasajeros con saldo pendiente por liquidar</span>
                        </div>
                        <Badge tipo="warning">Control de Cobranza Pre-Viaje</Badge>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))', gap: 10 }}>
                        {viajesConAlertaCobro.map(({ viaje, semaforo, cobranza }) => (
                            <div
                                key={viaje.id_viaje}
                                style={{
                                    background: '#fff',
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    border: semaforo.urgente ? '1.5px solid #ef4444' : '1px solid #fcd34d'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <strong style={{ fontSize: '0.86rem' }}>Viaje #{viaje.id_viaje} · {nombreDestino(viaje.id_destino)}</strong>
                                    <Badge tipo={semaforo.tipo}>{semaforo.texto}</Badge>
                                </div>
                                <div className="cell-sub" style={{ color: '#b45309', fontWeight: 700 }}>
                                    ⚠️ {cobranza.reservasConDeuda} reserva{cobranza.reservasConDeuda === 1 ? '' : 's'} sin liquidar ({formatoMoneda(cobranza.saldoPendiente)} por cobrar)
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ marginTop: 8, width: '100%', justifyContent: 'center', fontSize: '0.78rem', background: '#fffbeb', border: '1px solid #fcd34d' }}
                                    onClick={() => setViajeCobranzaModal({ viaje, cobranza })}
                                >
                                    <CreditCard size={13} /> Ver y Liquidar Reservas ({cobranza.reservasConDeuda})
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">{idEditando ? `Actualizar Viaje #${idEditando}` : 'Programar Viaje'}</div>
                            <div className="card-sub">
                                Los cupos disponibles se calculan automáticamente según el transporte elegido (Bus Cama = 60 asientos · Avión = 150 asientos)
                            </div>
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="field full">
                            <label>1. Selecciona el Destino</label>
                            <div className="viaje-cards-grid" style={{ maxHeight: 210 }}>
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
                                                <span className="viaje-id-chip"><MapPin size={11} /> Destino #{d.id_destino}</span>
                                                <span className="viaje-price-chip">Base: {formatoMoneda(d.precio_base)}</span>
                                            </div>
                                            <div className="viaje-card-title">{d.nombre_destino}</div>
                                            <div className="viaje-card-pack">
                                                {transpSugerido === 'Avión' ? <Plane size={13} /> : <Bus size={13} />}
                                                <span>Sugerido: {transpSugerido}</span>
                                            </div>
                                            {activo && (
                                                <div className="viaje-check-icon"><CheckCircle2 size={16} /></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {form.id_destino && (
                            <div className="field full">
                                <label>2. Selecciona el Paquete Turístico para {destinoElegido?.nombre_destino}</label>
                                <div className="viaje-cards-grid" style={{ maxHeight: 210 }}>
                                    <div
                                        className={`viaje-option-card ${!form.id_paquete ? 'selected' : ''}`}
                                        onClick={() => seleccionarPaquete('')}
                                    >
                                        <div className="viaje-card-top">
                                            <span className="viaje-id-chip">Tarifa Base</span>
                                            <span className="viaje-price-chip">{formatoMoneda(destinoElegido?.precio_base)}/pers.</span>
                                        </div>
                                        <div className="viaje-card-title">Sin paquete adicional</div>
                                        <div className="viaje-card-pack">Usa el precio base del destino</div>
                                        {!form.id_paquete && (
                                            <div className="viaje-check-icon"><CheckCircle2 size={16} /></div>
                                        )}
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
                                                    <span className="viaje-id-chip"><Package size={11} /> {p.duracion_dias}D / {p.duracion_noches}N</span>
                                                    <span className="viaje-price-chip">{formatoMoneda(p.precio_paquete)}/pers.</span>
                                                </div>
                                                <div className="viaje-card-title">{p.nombre_paquete}</div>
                                                <div className="viaje-card-pack">{p.resumen || p.descripcion}</div>
                                                {activo && (
                                                    <div className="viaje-check-icon"><CheckCircle2 size={16} /></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="field">
                            <label>3. Método de Transporte del Viaje</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div
                                    className={`viaje-option-card ${form.metodo_transporte === 'Bus Cama' ? 'selected' : ''}`}
                                    onClick={() => setForm({ ...form, metodo_transporte: 'Bus Cama' })}
                                    style={{ padding: '10px 12px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                        <Bus size={18} color="var(--primary-dark)" />
                                        <span>Bus Cama</span>
                                    </div>
                                    <div className="cell-sub">60 asientos por unidad (Mérida, Chichiriviche, etc.)</div>
                                </div>
                                <div
                                    className={`viaje-option-card ${form.metodo_transporte === 'Avión' ? 'selected' : ''}`}
                                    onClick={() => setForm({ ...form, metodo_transporte: 'Avión' })}
                                    style={{ padding: '10px 12px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                        <Plane size={18} color="var(--indigo)" />
                                        <span>Avión</span>
                                    </div>
                                    <div className="cell-sub">150 asientos por vuelo (Los Roques, Isla Tortuga, etc.)</div>
                                </div>
                            </div>
                        </div>

                        <div className="field">
                            <label>
                                Cantidad de {form.metodo_transporte === 'Avión' ? 'aviones / vuelos' : 'buses cama'} ({asientosPorUnidad} asientos c/u)
                            </label>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <input
                                    type="number"
                                    name="cantidad_unidades"
                                    min="1"
                                    max="20"
                                    value={form.cantidad_unidades}
                                    onChange={handleChange}
                                    required
                                    style={{ width: 110 }}
                                />
                                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.9rem' }}>
                                    Total cupos del viaje: {unidadesNum} × {asientosPorUnidad} = <strong>{cuposCalculados} cupos</strong>
                                </div>
                            </div>
                        </div>

                        <div className="field">
                            <label>Fecha de salida</label>
                            <input type="date" name="fecha_salida" value={form.fecha_salida} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label>Fecha de retorno</label>
                            <input type="date" name="fecha_retorno" value={form.fecha_retorno} onChange={handleChange} required />
                        </div>

                        <div className="field full">
                            <label>Estatus del viaje</label>
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

                        {form.id_destino && (
                            <div className="calc-box" style={{ flexWrap: 'wrap', gap: 16 }}>
                                <div>
                                    <div className="cell-sub">Transporte configurado</div>
                                    <strong>{unidadesNum} {form.metodo_transporte} ({cuposCalculados} asientos totales)</strong>
                                </div>
                                <div>
                                    <div className="cell-sub">Precio fijo por viajero ({paqueteElegido ? paqueteElegido.nombre_paquete : 'Tarifa base'})</div>
                                    <strong>{formatoMoneda(precioFinalForm)}</strong>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={cancelarForm}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? `Actualizar Viaje #${idEditando}` : `Guardar Viaje (${cuposCalculados} cupos)`}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Listado de viajes</div>
                    <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por destino, transporte o fecha..." />
                </div>
                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Destino / Paquete</th>
                                    <th>Transporte</th>
                                    <th>Precio / viajero</th>
                                    <th>Salida / Semáforo</th>
                                    <th>Cupos y Cobranza</th>
                                    <th>Estatus</th>
                                    <th>Estado</th>
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
                                            <td>#{v.id_viaje}</td>
                                            <td>
                                                <div className="cell-main">{nombreDestino(v.id_destino)}</div>
                                                <div className="cell-sub">{nombrePaquete(v.id_paquete)}</div>
                                            </td>
                                            <td>
                                                <Badge tipo={esAvion ? 'info' : 'success'}>
                                                    {esAvion ? '✈️ Avión' : '🚌 Bus Cama'} × {v.cantidad_unidades || 1}
                                                </Badge>
                                                <div className="cell-sub" style={{ marginTop: 2 }}>Capacidad: {capTotal} asientos</div>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={() => setViajeCroquisModal(v)}
                                                    style={{ padding: '2px 6px', fontSize: '0.72rem', color: '#0ea5a4', fontWeight: 700, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                    title="Ver mapa gráfico de asientos y ocupación"
                                                >
                                                    💺 Ver Croquis ({v.cupos_disponibles} libres)
                                                </button>
                                            </td>
                                            <td className="money">{formatoMoneda(precioPorPersona(v))}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{formatoFecha(v.fecha_salida + 'T00:00:00')}</div>
                                                <div className="cell-sub" style={{ marginBottom: 4 }}>al {formatoFecha(v.fecha_retorno + 'T00:00:00')}</div>
                                                <Badge tipo={semaforo.tipo}>{semaforo.texto}</Badge>
                                            </td>
                                            <td>
                                                <div><strong>{v.cupos_disponibles}</strong> libres de {capTotal}</div>
                                                {cobranza.reservasConDeuda > 0 ? (
                                                    <div className="cell-sub" style={{ color: '#b45309', fontWeight: 700, marginTop: 3 }}>
                                                        ⚠️ {cobranza.reservasConDeuda} res. debe {formatoMoneda(cobranza.saldoPendiente)}
                                                    </div>
                                                ) : cobranza.totalReservas > 0 ? (
                                                    <div className="cell-sub" style={{ color: '#15803d', fontWeight: 700, marginTop: 3 }}>
                                                        ✓ 100% liquidado
                                                    </div>
                                                ) : (
                                                    <div className="cell-sub">Sin reservas aún</div>
                                                )}
                                            </td>
                                            <td><Badge tipo={TIPO_ESTATUS[v.estatus] || 'neutral'}>{v.estatus}</Badge></td>
                                            <td><EstadoActivo activo={v.is_active} /></td>
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
                                                    {esVendedor && (
                                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, padding: '4px 8px', background: '#f1f5f9', borderRadius: 6 }}>
                                                            {v.estatus}
                                                        </span>
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
                                    Salida: {formatoFecha(viajeCobranzaModal.viaje.fecha_salida + 'T00:00:00')} · Total por cobrar: <strong>{formatoMoneda(viajeCobranzaModal.cobranza.saldoPendiente)}</strong> en {viajeCobranzaModal.cobranza.reservasConDeuda} reserva(s)
                                </div>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setViajeCobranzaModal(null)} style={{ padding: 6 }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: 16 }}>
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

            {/* Modal de Mapa y Croquis de Asientos del Viaje */}
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
                                    <span>💺 Croquis y Mapa de Asientos — Viaje #{viajeCroquisModal.id_viaje}</span>
                                    <Badge tipo={viajeCroquisModal.metodo_transporte === 'Avión' ? 'info' : 'success'}>
                                        {viajeCroquisModal.metodo_transporte === 'Avión' ? '✈️ Avión Comercial' : '🚌 Bus Cama (2 Pisos)'}
                                    </Badge>
                                </div>
                                <div className="card-sub" style={{ marginTop: 4 }}>
                                    Destino: <strong>{nombreDestino(viajeCroquisModal.id_destino)}</strong> · Salida: {formatoFecha(viajeCroquisModal.fecha_salida + 'T00:00:00')} al {formatoFecha(viajeCroquisModal.fecha_retorno + 'T00:00:00')}
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
                                            <div style={{ flex: 1, minWidth: 200, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>CAPACIDAD TOTAL</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{capViaje} Asientos</div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 200, padding: 12, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                                                <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>ASIENTOS ASIGNADOS</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>{ocupadosCount} Asientos ({((ocupadosCount / (capViaje || 1)) * 100).toFixed(0)}%)</div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 200, padding: 12, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                                                <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 600 }}>ASIENTOS DISPONIBLES</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>{Math.max(capViaje - ocupadosCount, 0)} Libres</div>
                                            </div>
                                        </div>

                                        <MapaAsientos
                                            viaje={viajeCroquisModal}
                                            ocupadosExternos={integrantesDelViaje}
                                            titulo={`Croquis de Asientos — ${viajeCroquisModal.metodo_transporte || 'Bus Cama'}`}
                                        />

                                        {/* Listado de Pasajeros de este viaje */}
                                        <div className="card" style={{ marginTop: 16 }}>
                                            <div className="card-header">
                                                <div className="card-title" style={{ fontSize: '0.92rem' }}>
                                                    📋 Pasajeros con Puesto Asignado en este Viaje ({integrantesDelViaje.length})
                                                </div>
                                            </div>
                                            {integrantesDelViaje.length === 0 ? (
                                                <div style={{ padding: 18, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                                    Aún no hay pasajeros registrados en este viaje. Todos los puestos del vehículo están disponibles.
                                                </div>
                                            ) : (
                                                <div className="table-wrap">
                                                    <table className="table" style={{ fontSize: '0.84rem' }}>
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
