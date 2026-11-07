import { useEffect, useState } from 'react';
import {
    TrendingUp, Plus, X, Receipt, TriangleAlert, DollarSign, Wallet, CheckCircle2,
    Calendar, MapPin, Fuel, UserCheck, AlertCircle, Trash
} from 'lucide-react';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { obtenerReservas } from '../servicios/reservasServicios';
import { obtenerPagos } from '../servicios/pagosServicios';
import { obtenerCostosViaje, crearCostoViaje, actualizarCostoViaje, eliminarCostoViaje } from '../servicios/costosViajeServicios';
import { obtenerInconvenientes, crearInconveniente, actualizarInconveniente, eliminarInconveniente } from '../servicios/inconvenientesServicios';
import { obtenerGanancias, crearGanancia, actualizarGanancia } from '../servicios/gananciasServicios';
import {
    PageHeader, Buscador, Vacio, Badge, formatoMoneda, formatoFecha, mensajeError, BotonEditar, BotonBaja
} from '../componentes/UI';

const FORM_COSTO_INICIAL = { descripcion: '', monto: '' };
const FORM_INC_INICIAL = { descripcion: '', monto_descontado: '' };

export default function ControlFinanciero({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const puedeGestionar = esAdmin || esOperador;

    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [costos, setCostos] = useState([]);
    const [inconvenientes, setInconvenientes] = useState([]);
    const [ganancias, setGanancias] = useState([]);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');

    const [idViajeSeleccionado, setIdViajeSeleccionado] = useState('');
    const [subTab, setSubTab] = useState('costos'); // 'costos' | 'inconvenientes' | 'reservas' | 'resumen_global'

    // Formulario de Costo
    const [mostrarFormCosto, setMostrarFormCosto] = useState(false);
    const [idEditandoCosto, setIdEditandoCosto] = useState(null);
    const [formCosto, setFormCosto] = useState(FORM_COSTO_INICIAL);

    // Formulario de Inconveniente
    const [mostrarFormInc, setMostrarFormInc] = useState(false);
    const [idEditandoInc, setIdEditandoInc] = useState(null);
    const [formInc, setFormInc] = useState(FORM_INC_INICIAL);

    const cargarDatos = async () => {
        try {
            const [vData, dData, pData, rData, pgData, cData, incData, gData] = await Promise.all([
                obtenerViajes(),
                obtenerDestinos(),
                obtenerPaquetes(),
                obtenerReservas(),
                obtenerPagos(),
                obtenerCostosViaje(),
                obtenerInconvenientes(),
                obtenerGanancias()
            ]);
            setViajes(vData);
            setDestinos(dData);
            setPaquetes(pData);
            setReservas(rData);
            setPagos(pgData);
            setCostos(cData);
            setInconvenientes(incData);
            setGanancias(gData);

            if (vData.length > 0 && !idViajeSeleccionado) {
                const activo = vData.find(v => v.is_active && v.estatus !== 'Cancelado') || vData[0];
                setIdViajeSeleccionado(String(activo.id_viaje));
            }
        } catch (err) {
            setError('Error al obtener la información financiera.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const viajeActual = viajes.find(v => v.id_viaje === Number(idViajeSeleccionado));
    const destinoActual = viajeActual ? destinos.find(d => d.id_destino === viajeActual.id_destino) : null;
    const paqueteActual = viajeActual?.id_paquete ? paquetes.find(p => p.id_paquete === viajeActual.id_paquete) : null;

    // Métricas del viaje seleccionado
    const vid = Number(idViajeSeleccionado);
    const reservasViaje = reservas.filter(r => r.is_active && r.id_viaje === vid);
    const ingresosTotales = reservasViaje.reduce((s, r) => s + Number(r.monto_total || 0), 0);
    const ingresosCobrados = pagos
        .filter(p => p.is_active && reservasViaje.some(r => r.id_reserva === p.id_reserva))
        .reduce((s, p) => s + Number(p.monto || 0), 0);
    const saldoPorCobrar = Math.max(ingresosTotales - ingresosCobrados, 0);

    const costosViaje = costos.filter(c => c.is_active && c.id_viaje === vid);
    const costosTotales = costosViaje.reduce((s, c) => s + Number(c.monto || 0), 0);

    const inconvenientesViaje = inconvenientes.filter(i => i.is_active && i.id_viaje === vid);
    const inconvenientesTotales = inconvenientesViaje.reduce((s, i) => s + Number(i.monto_descontado || 0), 0);

    const gananciaNeta = ingresosTotales - costosTotales - inconvenientesTotales;
    const margenPorcentaje = ingresosTotales > 0 ? ((gananciaNeta / ingresosTotales) * 100).toFixed(1) : 0;

    // Handlers Costos
    const handleGuardarCosto = async (e) => {
        e.preventDefault();
        if (!idViajeSeleccionado) return;
        try {
            const payload = {
                id_viaje: parseInt(idViajeSeleccionado),
                descripcion: formCosto.descripcion.trim(),
                monto: parseFloat(formCosto.monto)
            };
            if (idEditandoCosto) {
                await actualizarCostoViaje(idEditandoCosto, payload);
                setExito('Costo operativo actualizado.');
            } else {
                await crearCostoViaje(payload);
                setExito('Costo operativo registrado exitosamente.');
            }
            setFormCosto(FORM_COSTO_INICIAL);
            setIdEditandoCosto(null);
            setMostrarFormCosto(false);
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo guardar el costo.'));
        }
    };

    // Handlers Inconvenientes
    const handleGuardarInc = async (e) => {
        e.preventDefault();
        if (!idViajeSeleccionado) return;
        try {
            const payload = {
                id_viaje: parseInt(idViajeSeleccionado),
                descripcion: formInc.descripcion.trim(),
                monto_descontado: parseFloat(formInc.monto_descontado)
            };
            if (idEditandoInc) {
                await actualizarInconveniente(idEditandoInc, payload);
                setExito('Inconveniente actualizado.');
            } else {
                await crearInconveniente(payload);
                setExito('Inconveniente registrado exitosamente.');
            }
            setFormInc(FORM_INC_INICIAL);
            setIdEditandoInc(null);
            setMostrarFormInc(false);
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo guardar el inconveniente.'));
        }
    };

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Control Financiero y Rentabilidad de Viajes"
                subtitulo="Supervisa en un solo lugar los ingresos por reservas, gastos operativos, quejas y la ganancia neta real"
            >
                {puedeGestionar && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                setSubTab('costos');
                                setMostrarFormCosto(true);
                            }}
                        >
                            <Plus size={16} /> + Registrar Costo Operativo
                        </button>
                    </div>
                )}
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">{exito}</div>}

            {/* SELECTOR DEL VIAJE PARA ANÁLISIS */}
            <div className="card" style={{ marginBottom: 18, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'block' }}>
                            Selecciona el Viaje para auditar sus finanzas:
                        </label>
                        <select
                            value={idViajeSeleccionado}
                            onChange={(e) => setIdViajeSeleccionado(e.target.value)}
                            style={{ fontSize: '0.9rem', padding: '7px 10px', width: '100%', fontWeight: 600 }}
                        >
                            {viajes.map(v => {
                                const d = destinos.find(x => x.id_destino === v.id_destino);
                                return (
                                    <option key={v.id_viaje} value={String(v.id_viaje)}>
                                        Viaje #{v.id_viaje} · {d?.nombre_destino || 'Destino'} ({formatoFecha(v.fecha_salida + 'T00:00:00')})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            className={`btn ${subTab === 'resumen_global' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setSubTab('resumen_global')}
                            style={{ fontSize: '0.84rem' }}
                        >
                            <TrendingUp size={15} /> Ver Balance de Todos los Viajes
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI CARDS FINANCIEROS DEL VIAJE SELECCIONADO */}
            {viajeActual && subTab !== 'resumen_global' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
                    <div className="card" style={{ padding: 14 }}>
                        <div className="cell-sub">1. Ingresos por Reservas</div>
                        <strong style={{ fontSize: '1.35rem', color: '#0f766e' }}>{formatoMoneda(ingresosTotales)}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: 2 }}>
                            Cobrado: {formatoMoneda(ingresosCobrados)} {saldoPorCobrar > 0 ? `(Falta ${formatoMoneda(saldoPorCobrar)})` : ''}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                        <div className="cell-sub">2. Costos Operativos (Gastos)</div>
                        <strong style={{ fontSize: '1.35rem', color: '#b91c1c' }}>{formatoMoneda(costosTotales)}</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>
                            {costosViaje.length} egreso(s) registrados
                        </div>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                        <div className="cell-sub">3. Inconvenientes / Quejas</div>
                        <strong style={{ fontSize: '1.35rem', color: '#d97706' }}>{formatoMoneda(inconvenientesTotales)}</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>
                            {inconvenientesViaje.length} descuento(s) aplicados
                        </div>
                    </div>

                    <div className="card" style={{ padding: 14, border: gananciaNeta >= 0 ? '1.5px solid #10b981' : '1.5px solid #ef4444' }}>
                        <div className="cell-sub">Ganancia Neta Real</div>
                        <strong style={{ fontSize: '1.45rem', color: gananciaNeta >= 0 ? '#15803d' : '#b91c1c' }}>
                            {formatoMoneda(gananciaNeta)}
                        </strong>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: gananciaNeta >= 0 ? '#15803d' : '#b91c1c', marginTop: 2 }}>
                            Margen de Ganancia: {margenPorcentaje}%
                        </div>
                    </div>
                </div>
            )}

            {/* PESTAÑAS INTERNAS DEL CONTROL FINANCIERO */}
            {subTab !== 'resumen_global' && (
                <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, borderBottom: '2px solid var(--border)', paddingBottom: 6 }}>
                        <button
                            type="button"
                            className={`btn ${subTab === 'costos' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setSubTab('costos')}
                            style={{ fontSize: '0.86rem' }}
                        >
                            <Receipt size={15} /> Costos Operativos del Viaje ({costosViaje.length})
                        </button>
                        <button
                            type="button"
                            className={`btn ${subTab === 'inconvenientes' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setSubTab('inconvenientes')}
                            style={{ fontSize: '0.86rem' }}
                        >
                            <TriangleAlert size={15} /> Inconvenientes en Ruta ({inconvenientesViaje.length})
                        </button>
                        <button
                            type="button"
                            className={`btn ${subTab === 'reservas' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setSubTab('reservas')}
                            style={{ fontSize: '0.86rem' }}
                        >
                            <DollarSign size={15} /> Balance de Reservas ({reservasViaje.length})
                        </button>
                    </div>

                    {/* SUBTAB 1: COSTOS OPERATIVOS */}
                    {subTab === 'costos' && (
                        <div className="fade-in">
                            {mostrarFormCosto && (
                                <form onSubmit={handleGuardarCosto} className="card fade-in" style={{ marginBottom: 16 }}>
                                    <div className="card-header">
                                        <div className="card-title">
                                            {idEditandoCosto ? 'Editar Costo Operativo' : `Registrar Costo para Viaje #${idViajeSeleccionado}`}
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="field">
                                            <label>Concepto / Descripción del Gasto</label>
                                            <input
                                                value={formCosto.descripcion}
                                                onChange={(e) => setFormCosto({ ...formCosto, descripcion: e.target.value })}
                                                placeholder="Ej. Combustible diésel, viáticos chofer, peaje, hotel guía..."
                                                required
                                            />
                                        </div>
                                        <div className="field">
                                            <label>Monto del Gasto ($ USD)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formCosto.monto}
                                                onChange={(e) => setFormCosto({ ...formCosto, monto: e.target.value })}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-actions" style={{ marginTop: 12 }}>
                                        <button type="button" className="btn btn-ghost" onClick={() => setMostrarFormCosto(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary">Guardar Costo</button>
                                    </div>
                                </form>
                            )}

                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">Desglose de Costos Operativos</div>
                                    {!mostrarFormCosto && puedeGestionar && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => {
                                                setIdEditandoCosto(null);
                                                setFormCosto(FORM_COSTO_INICIAL);
                                                setMostrarFormCosto(true);
                                            }}
                                        >
                                            <Plus size={14} /> + Agregar Costo
                                        </button>
                                    )}
                                </div>
                                {costosViaje.length === 0 ? <Vacio texto="No hay costos operativos registrados en este viaje aún" /> : (
                                    <div className="table-wrap">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Concepto</th>
                                                    <th>Monto</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {costosViaje.map(c => (
                                                    <tr key={c.id_costo}>
                                                        <td>#{c.id_costo}</td>
                                                        <td className="cell-main">{c.descripcion}</td>
                                                        <td className="money" style={{ color: '#b91c1c', fontWeight: 700 }}>
                                                            {formatoMoneda(c.monto)}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {puedeGestionar && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger-soft"
                                                                    style={{ padding: '4px 8px' }}
                                                                    onClick={async () => {
                                                                        if (confirm('¿Eliminar este costo?')) {
                                                                            await eliminarCostoViaje(c.id_costo);
                                                                            cargarDatos();
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash size={13} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SUBTAB 2: INCONVENIENTES */}
                    {subTab === 'inconvenientes' && (
                        <div className="fade-in">
                            {mostrarFormInc && (
                                <form onSubmit={handleGuardarInc} className="card fade-in" style={{ marginBottom: 16 }}>
                                    <div className="card-header">
                                        <div className="card-title">Registrar Inconveniente / Reclamo en Ruta</div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="field">
                                            <label>Detalle del Inconveniente o Reclamo</label>
                                            <input
                                                value={formInc.descripcion}
                                                onChange={(e) => setFormInc({ ...formInc, descripcion: e.target.value })}
                                                placeholder="Ej. Retraso por falla mecánica, indemnización almuerzo..."
                                                required
                                            />
                                        </div>
                                        <div className="field">
                                            <label>Monto Descontado o Reembolsado ($ USD)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formInc.monto_descontado}
                                                onChange={(e) => setFormInc({ ...formInc, monto_descontado: e.target.value })}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-actions" style={{ marginTop: 12 }}>
                                        <button type="button" className="btn btn-ghost" onClick={() => setMostrarFormInc(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary">Guardar Inconveniente</button>
                                    </div>
                                </form>
                            )}

                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">Incidencias y Descuentos del Viaje</div>
                                    {!mostrarFormInc && puedeGestionar && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => {
                                                setIdEditandoInc(null);
                                                setFormInc(FORM_INC_INICIAL);
                                                setMostrarFormInc(true);
                                            }}
                                        >
                                            <Plus size={14} /> + Registrar Inconveniente
                                        </button>
                                    )}
                                </div>
                                {inconvenientesViaje.length === 0 ? <Vacio texto="No hay inconvenientes reportados para este viaje" /> : (
                                    <div className="table-wrap">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Descripción</th>
                                                    <th>Fecha Reporte</th>
                                                    <th>Monto Descontado</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inconvenientesViaje.map(i => (
                                                    <tr key={i.id_inconveniente}>
                                                        <td>#{i.id_inconveniente}</td>
                                                        <td className="cell-main">{i.descripcion}</td>
                                                        <td>{formatoFecha(i.fecha_reporte)}</td>
                                                        <td className="money" style={{ color: '#d97706', fontWeight: 700 }}>
                                                            {formatoMoneda(i.monto_descontado)}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {puedeGestionar && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger-soft"
                                                                    style={{ padding: '4px 8px' }}
                                                                    onClick={async () => {
                                                                        if (confirm('¿Eliminar este reporte?')) {
                                                                            await eliminarInconveniente(i.id_inconveniente);
                                                                            cargarDatos();
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash size={13} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SUBTAB 3: RESERVAS DEL VIAJE */}
                    {subTab === 'reservas' && (
                        <div className="fade-in">
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">Reservaciones y Cobros del Viaje #{idViajeSeleccionado}</div>
                                </div>
                                {reservasViaje.length === 0 ? <Vacio texto="Sin reservaciones en este viaje" /> : (
                                    <div className="table-wrap">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Reserva</th>
                                                    <th>Titular</th>
                                                    <th>Total</th>
                                                    <th>Cobrado</th>
                                                    <th>Pendiente</th>
                                                    <th>Estatus</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reservasViaje.map(r => {
                                                    const pagosR = pagos.filter(p => p.id_reserva === r.id_reserva && p.is_active);
                                                    const abonado = pagosR.reduce((s, p) => s + Number(p.monto || 0), 0);
                                                    const falta = Math.max(Number(r.monto_total || 0) - abonado, 0);
                                                    return (
                                                        <tr key={r.id_reserva}>
                                                            <td><strong>#{r.id_reserva}</strong></td>
                                                            <td><strong>{r.id_cliente}</strong></td>
                                                            <td className="money">{formatoMoneda(r.monto_total)}</td>
                                                            <td className="money" style={{ color: '#15803d' }}>{formatoMoneda(abonado)}</td>
                                                            <td className="money" style={{ color: falta > 0 ? '#b45309' : '#15803d', fontWeight: 700 }}>
                                                                {falta > 0 ? formatoMoneda(falta) : '✓ Liquidado'}
                                                            </td>
                                                            <td>
                                                                <Badge tipo={falta <= 0.01 ? 'success' : 'warning'}>
                                                                    {falta <= 0.01 ? 'Pagado' : 'Abonado'}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA RESUMEN GLOBAL DE TODOS LOS VIAJES */}
            {subTab === 'resumen_global' && (
                <div className="card fade-in">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Balance y Rentabilidad Comparativa de Todos los Viajes</div>
                            <div className="card-sub">{viajes.length} viajes registrados</div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setSubTab('costos')}
                        >
                            Volver al Viaje Seleccionado
                        </button>
                    </div>

                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Viaje</th>
                                    <th>Destino</th>
                                    <th>Salida</th>
                                    <th>Ingresos</th>
                                    <th>Costos</th>
                                    <th>Inconvenientes</th>
                                    <th>Ganancia Neta</th>
                                    <th>Margen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viajes.map(v => {
                                    const d = destinos.find(x => x.id_destino === v.id_destino);
                                    const resV = reservas.filter(r => r.is_active && r.id_viaje === v.id_viaje);
                                    const ingV = resV.reduce((s, r) => s + Number(r.monto_total || 0), 0);
                                    const cosV = costos.filter(c => c.is_active && c.id_viaje === v.id_viaje).reduce((s, c) => s + Number(c.monto || 0), 0);
                                    const incV = inconvenientes.filter(i => i.is_active && i.id_viaje === v.id_viaje).reduce((s, i) => s + Number(i.monto_descontado || 0), 0);
                                    const ganV = ingV - cosV - incV;
                                    const margen = ingV > 0 ? ((ganV / ingV) * 100).toFixed(0) : 0;

                                    return (
                                        <tr
                                            key={v.id_viaje}
                                            className="row-clickable"
                                            onClick={() => {
                                                setIdViajeSeleccionado(String(v.id_viaje));
                                                setSubTab('costos');
                                            }}
                                            title="Toca para ver el detalle de costos e ingresos de este viaje"
                                        >
                                            <td><strong>#{v.id_viaje}</strong></td>
                                            <td><strong>{d?.nombre_destino || 'Destino'}</strong></td>
                                            <td>{formatoFecha(v.fecha_salida + 'T00:00:00')}</td>
                                            <td className="money">{formatoMoneda(ingV)}</td>
                                            <td className="money" style={{ color: '#b91c1c' }}>{formatoMoneda(cosV)}</td>
                                            <td className="money" style={{ color: '#d97706' }}>{formatoMoneda(incV)}</td>
                                            <td className="money" style={{ color: ganV >= 0 ? '#15803d' : '#b91c1c', fontWeight: 800 }}>
                                                {formatoMoneda(ganV)}
                                            </td>
                                            <td>
                                                <Badge tipo={ganV >= 0 ? 'success' : 'danger'}>{margen}%</Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
