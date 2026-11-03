import { useEffect, useState } from 'react';
import { Plus, X, CreditCard, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { obtenerPagos, crearPago, actualizarPago, eliminarPago } from '../servicios/pagosServicios';
import { obtenerReservas } from '../servicios/reservasServicios';
import {
    PageHeader, Buscador, EstadoActivo, BotonBaja, BotonEditar, Vacio, Badge, StatCard, formatoMoneda, formatoFecha, mensajeError,
    METODOS_PAGO, BadgeMetodoPago, CalculadoraDivisas, ModalLiquidarSaldo
} from '../componentes/UI';

const FORM_INICIAL = { id_reserva: '', monto: '', metodo_pago: 'Transferencia', referencia: '' };

export default function Pagos({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const [pagos, setPagos] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [documentoClienteForm, setDocumentoClienteForm] = useState('');
    const [busquedaDocumento, setBusquedaDocumento] = useState('');
    const [reservaParaLiquidarDirecta, setReservaParaLiquidarDirecta] = useState(null);
    const [form, setForm] = useState(FORM_INICIAL);

    const cargarDatos = async () => {
        try {
            const [pData, rData] = await Promise.all([obtenerPagos(), obtenerReservas()]);
            setPagos(pData);
            setReservas(rData);
        } catch (err) {
            setError('Error al obtener la lista de pagos.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    // Helpers de estado de cuenta por reserva
    const obtenerEstadoCuentaReserva = (idRes) => {
        const r = reservas.find(x => x.id_reserva === Number(idRes));
        if (!r) return null;
        const pagosRes = pagos.filter(p => p.id_reserva === r.id_reserva && p.is_active);
        const abonado = pagosRes.reduce((s, p) => s + Number(p.monto), 0);
        const total = Number(r.monto_total) || 0;
        const falta = Math.max(total - abonado, 0);
        const porcentaje = total > 0 ? Math.min(Math.round((abonado / total) * 100), 100) : 0;
        return { reserva: r, abonado, total, falta, porcentaje };
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const seleccionarReservaParaPago = (idRes, prellenarSaldo = true) => {
        const info = obtenerEstadoCuentaReserva(idRes);
        setForm(prev => ({
            ...prev,
            id_reserva: String(idRes),
            monto: prellenarSaldo && info && info.falta > 0 ? String(info.falta.toFixed(2)) : prev.monto,
            referencia: prellenarSaldo && info && info.falta > 0 && !prev.referencia ? `LIQ-RES-${idRes}` : prev.referencia
        }));
        if (info?.reserva) {
            setDocumentoClienteForm(info.reserva.id_cliente);
        }
    };

    const buscarReservaPorDocumento = (doc) => {
        setDocumentoClienteForm(doc);
        const limpio = doc.trim().toLowerCase();
        const encontrada = reservas.find(r => r.is_active && r.id_cliente.toLowerCase() === limpio);
        if (encontrada) {
            seleccionarReservaParaPago(encontrada.id_reserva, true);
        }
    };

    const iniciarLiquidacionRapida = (idRes) => {
        setIdEditando(null);
        const info = obtenerEstadoCuentaReserva(idRes);
        setDocumentoClienteForm(info?.reserva?.id_cliente || '');
        setForm({
            id_reserva: String(idRes),
            monto: info ? String(info.falta.toFixed(2)) : '',
            metodo_pago: 'Transferencia',
            referencia: `LIQ-RES-${idRes}`
        });
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const iniciarEdicion = (p) => {
        setIdEditando(p.id_pago);
        setForm({
            id_reserva: String(p.id_reserva),
            monto: String(p.monto),
            metodo_pago: p.metodo_pago || 'Transferencia',
            referencia: p.referencia || ''
        });
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarFormulario = () => {
        setIdEditando(null);
        setForm(FORM_INICIAL);
        setDocumentoClienteForm('');
        setMostrarForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (idEditando) {
                await actualizarPago(idEditando, {
                    metodo_pago: form.metodo_pago,
                    referencia: form.referencia.trim()
                });
            } else {
                await crearPago({
                    id_reserva: parseInt(form.id_reserva),
                    monto: parseFloat(form.monto),
                    metodo_pago: form.metodo_pago,
                    referencia: form.referencia.trim()
                });
            }
            cancelarFormulario();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el pago.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este pago? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarPago(id);
                cargarDatos();
            } catch (err) {
                alert(mensajeError(err, 'No se pudo desactivar el pago.'));
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarPago(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el pago.'));
        }
    };

    const documentoClienteDeReserva = (idRes) => {
        const r = reservas.find(x => x.id_reserva === Number(idRes));
        return r ? r.id_cliente : '—';
    };

    const activos = pagos.filter(p => p.is_active);
    const totalCobrado = activos.reduce((s, p) => s + Number(p.monto), 0);

    // Reservas activas que aún tienen saldo pendiente
    const reservasConSaldo = reservas
        .filter(r => r.is_active)
        .map(r => obtenerEstadoCuentaReserva(r.id_reserva))
        .filter(info => info && info.falta > 0.01);

    const saldoTotalPorCobrar = reservasConSaldo.reduce((s, x) => s + x.falta, 0);
    const infoReservaSeleccionada = form.id_reserva ? obtenerEstadoCuentaReserva(form.id_reserva) : null;

    const q = busquedaDocumento.trim().toLowerCase();
    const filtrados = pagos.filter(p => {
        if (!q) return true;
        return documentoClienteDeReserva(p.id_reserva).toLowerCase().includes(q) || p.referencia.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <PageHeader titulo="Pagos y Liquidaciones" subtitulo="Registro de cobros, barras de progreso por reserva y liquidación de saldos en 1 clic">
                <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Registrar Pago / Liquidar</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">{exito}</div>}

            <div className="grid grid-3" style={{ marginBottom: 20 }}>
                <StatCard icono={Wallet} color="success" etiqueta="Total cobrado" valor={formatoMoneda(totalCobrado)} />
                <StatCard icono={CreditCard} color="indigo" etiqueta="Pagos registrados" valor={activos.length}
                    pie={activos.length ? `Promedio ${formatoMoneda(totalCobrado / activos.length)}` : ''} />
                <StatCard icono={AlertCircle} color="accent" etiqueta="Saldo pendiente por cobrar" valor={formatoMoneda(saldoTotalPorCobrar)}
                    pie={`${reservasConSaldo.length} reserva${reservasConSaldo.length === 1 ? '' : 's'} por liquidar`} />
            </div>

            {/* Panel rápido de Reservas con Saldo Pendiente para liquidar en 1 clic */}
            {reservasConSaldo.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Reservas con Saldo Pendiente de Liquidación ({reservasConSaldo.length})</div>
                            <div className="card-sub">Haz clic en "Liquidar Saldo" para cargar automáticamente el monto exacto restante</div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {reservasConSaldo.map(({ reserva, abonado, total, falta, porcentaje }) => (
                            <div
                                key={reserva.id_reserva}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 12,
                                    padding: '12px 14px',
                                    background: '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong>Reserva #{reserva.id_reserva}</strong>
                                        <span className="cell-sub" style={{ marginLeft: 8 }}>Doc: {reserva.id_cliente}</span>
                                    </div>
                                    <Badge tipo="warning">{porcentaje}% pagado</Badge>
                                </div>
                                <div className="progress" style={{ height: 8 }}>
                                    <div style={{ width: `${porcentaje}%`, background: '#f59e0b' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span>Abonado: <strong style={{ color: '#15803d' }}>{formatoMoneda(abonado)}</strong> / {formatoMoneda(total)}</span>
                                    <span style={{ color: '#b45309', fontWeight: 700 }}>Falta: {formatoMoneda(falta)}</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', padding: '7px 12px', fontSize: '0.82rem' }}
                                    onClick={() => setReservaParaLiquidarDirecta({ reserva, abonado, total, falta })}
                                >
                                    <CreditCard size={14} /> Liquidar Saldo ({formatoMoneda(falta)})
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div className="card-title">{idEditando ? `Editar Pago #${idEditando}` : 'Registrar Abono o Liquidación de Saldo'}</div>
                    </div>
                    <div className="form-grid">
                        {!idEditando && (
                            <>
                                <div className="field">
                                    <label>Seleccionar Reserva con Saldo Pendiente (o escribe abajo)</label>
                                    <select
                                        value={form.id_reserva}
                                        onChange={(e) => seleccionarReservaParaPago(e.target.value, true)}
                                    >
                                        <option value="">— Selecciona una reserva —</option>
                                        {reservas.filter(r => r.is_active).map(r => {
                                            const info = obtenerEstadoCuentaReserva(r.id_reserva);
                                            return (
                                                <option key={r.id_reserva} value={r.id_reserva}>
                                                    Reserva #{r.id_reserva} · Cliente {r.id_cliente} · {info && info.falta > 0 ? `Falta ${formatoMoneda(info.falta)} (${info.porcentaje}% pagado)` : '100% Pagada'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Documento del cliente (autocompleta # de reserva)</label>
                                    <input
                                        value={documentoClienteForm}
                                        onChange={(e) => buscarReservaPorDocumento(e.target.value)}
                                        placeholder="Ej. V-10000000"
                                    />
                                </div>
                                <div className="field">
                                    <label>Número de Reserva (#)</label>
                                    <input
                                        type="number"
                                        name="id_reserva"
                                        value={form.id_reserva}
                                        onChange={handleChange}
                                        placeholder="ID de la reserva"
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <label>Monto a Pagar ($)</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="monto"
                                            max={infoReservaSeleccionada?.falta || undefined}
                                            value={form.monto}
                                            onChange={handleChange}
                                            required
                                        />
                                        {infoReservaSeleccionada && infoReservaSeleccionada.falta > 0 && (
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => setForm(prev => ({ ...prev, monto: String(infoReservaSeleccionada.falta.toFixed(2)) }))}
                                            >
                                                Liquidar ({formatoMoneda(infoReservaSeleccionada.falta)})
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="field">
                            <label>Método de pago</label>
                            <select name="metodo_pago" value={form.metodo_pago} onChange={handleChange}>
                                {METODOS_PAGO.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.icono} {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label>
                                Referencia {['Nequi', 'Bancolombia'].includes(form.metodo_pago) ? '(Nº Comprobante / Aprobación Colombia)' : (form.metodo_pago === 'Pago Móvil' ? '(Nº Referencia / 4 dígitos)' : '')}
                            </label>
                            <input
                                name="referencia"
                                value={form.referencia}
                                onChange={handleChange}
                                placeholder={['Nequi', 'Bancolombia'].includes(form.metodo_pago) ? 'Ej. M12345678 (Nequi/Bancolombia)' : 'Ej. REF-987654'}
                                required
                            />
                        </div>

                        {/* Conversor en tiempo real a Bolívares (BCV) y Pesos (COP) */}
                        <div className="field full">
                            <CalculadoraDivisas
                                montoUSD={parseFloat(form.monto) || 0}
                                metodoSeleccionado={form.metodo_pago}
                                onCambiarMontoUSD={(usd) => setForm(prev => ({ ...prev, monto: String(usd) }))}
                            />
                        </div>

                        {infoReservaSeleccionada && (
                            <div className="field full">
                                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
                                        <span>Estado de Cuenta — Reserva #{infoReservaSeleccionada.reserva.id_reserva} (Cliente: {infoReservaSeleccionada.reserva.id_cliente})</span>
                                        <span style={{ color: infoReservaSeleccionada.porcentaje >= 100 ? '#15803d' : '#b45309' }}>
                                            {infoReservaSeleccionada.porcentaje}% Pagado ({formatoMoneda(infoReservaSeleccionada.abonado)} de {formatoMoneda(infoReservaSeleccionada.total)})
                                        </span>
                                    </div>
                                    <div className="progress" style={{ height: 9, marginBottom: 6 }}>
                                        <div
                                            style={{
                                                width: `${infoReservaSeleccionada.porcentaje}%`,
                                                background: infoReservaSeleccionada.porcentaje >= 100 ? '#22c55e' : '#f59e0b'
                                            }}
                                        />
                                    </div>
                                    <div className="cell-sub" style={{ fontWeight: 600 }}>
                                        {infoReservaSeleccionada.falta > 0
                                            ? `Saldo restante por liquidar: ${formatoMoneda(infoReservaSeleccionada.falta)} (Al pagar este monto la reserva cambiará automáticamente a Pagado)`
                                            : '✓ Esta reserva ya tiene el 100% de su monto cubierto.'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Pago' : 'Guardar Pago'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Historial de pagos</div>
                        <div className="card-sub">{filtrados.length} pagos mostrados</div>
                    </div>
                    <Buscador
                        valor={busquedaDocumento}
                        onChange={setBusquedaDocumento}
                        placeholder="Buscar por documento del cliente (ej. V-10000000)..."
                    />
                </div>
                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Reserva</th>
                                    <th>Documento Cliente</th>
                                    <th>Método</th>
                                    <th>Referencia</th>
                                    <th>Fecha</th>
                                    <th>Monto Pago</th>
                                    <th>Progreso Reserva</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map((p) => {
                                    const info = obtenerEstadoCuentaReserva(p.id_reserva);
                                    return (
                                        <tr key={p.id_pago} className={p.is_active ? '' : 'inactive'}>
                                            <td>#{p.id_pago}</td>
                                            <td><strong>Reserva #{p.id_reserva}</strong></td>
                                            <td><strong>{documentoClienteDeReserva(p.id_reserva)}</strong></td>
                                            <td><BadgeMetodoPago metodo={p.metodo_pago} /></td>
                                            <td>{p.referencia}</td>
                                            <td>{formatoFecha(p.fecha_pago)}</td>
                                            <td className="money" style={{ color: '#15803d' }}>{formatoMoneda(p.monto)}</td>
                                            <td style={{ minWidth: 190 }}>
                                                {info ? (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 700 }}>
                                                            <span>{formatoMoneda(info.abonado)} / {formatoMoneda(info.total)}</span>
                                                            <span style={{ color: info.porcentaje >= 100 ? '#15803d' : '#b45309' }}>{info.porcentaje}%</span>
                                                        </div>
                                                        <div className="progress" style={{ height: 6, marginTop: 4, marginBottom: 3 }}>
                                                            <div
                                                                style={{
                                                                    width: `${info.porcentaje}%`,
                                                                    background: info.porcentaje >= 100 ? '#22c55e' : '#f59e0b'
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="cell-sub" style={{ fontSize: '0.73rem', color: info.falta > 0 ? '#b45309' : '#15803d', fontWeight: 600 }}>
                                                            {info.falta > 0 ? `Falta ${formatoMoneda(info.falta)}` : '✓ 100% Liquidado'}
                                                        </div>
                                                    </>
                                                ) : '—'}
                                            </td>
                                            <td><EstadoActivo activo={p.is_active} /></td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                {info && info.falta > 0 && info.reserva?.is_active && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        style={{ padding: '5px 9px', fontSize: '0.75rem', marginRight: 6 }}
                                                        onClick={() => setReservaParaLiquidarDirecta(info)}
                                                        title={`Liquidar resto de la Reserva #${p.id_reserva}`}
                                                    >
                                                        Liquidar ({formatoMoneda(info.falta)})
                                                    </button>
                                                )}
                                                <BotonEditar onClick={() => iniciarEdicion(p)} titulo="Editar método o referencia" />
                                                {esAdmin && (
                                                    <BotonBaja
                                                        activo={p.is_active}
                                                        onClick={() => handleEliminar(p.id_pago)}
                                                        onRestaurar={() => handleRestaurar(p.id_pago)}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ModalLiquidarSaldo
                infoReserva={reservaParaLiquidarDirecta}
                abierto={!!reservaParaLiquidarDirecta}
                onCerrar={() => setReservaParaLiquidarDirecta(null)}
                onLiquidado={() => {
                    setExito('¡Reserva liquidada exitosamente!');
                    cargarDatos();
                }}
            />
        </div>
    );
}
