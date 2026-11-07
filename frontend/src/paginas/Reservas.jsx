import { useEffect, useState } from 'react';
import {
    Plus, X, Users, CreditCard, Search, Trash, Eye, Printer, MessageCircle, AlertTriangle,
    CheckCircle2, Plane, Calendar, Phone, DollarSign, ArrowRight
} from 'lucide-react';
import { obtenerReservas, actualizarReserva, eliminarReserva } from '../servicios/reservasServicios';
import { obtenerClientes } from '../servicios/clientesServicios';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { obtenerIntegrantes } from '../servicios/integrantesServicios';
import { obtenerPagos } from '../servicios/pagosServicios';
import {
    PageHeader, Buscador, EstadoActivo, BotonBaja, Vacio, Badge, formatoMoneda, formatoFecha, mensajeError,
    BadgeDocumento, ModalLiquidarSaldo
} from '../componentes/UI';
import { calcularTarifaPorEdad, obtenerPrecioBaseViaje } from '../servicios/tarifasServicios';
import MapaAsientos from '../componentes/MapaAsientos';

export default function Reservas({ esAdmin = true, esOperador = false, esVendedor = false, onIrAClientes }) {
    const [reservas, setReservas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [integrantes, setIntegrantes] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');

    // Filtros de búsqueda
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstadoPago, setFiltroEstadoPago] = useState('todos'); // 'todos' | 'deuda' | 'solvente' | 'canceladas'

    // Modal de liquidación y modal de detalle
    const [reservaParaLiquidarDirecta, setReservaParaLiquidarDirecta] = useState(null);
    const [reservaDetalle, setReservaDetalle] = useState(null);
    const [mostrarModalNuevaReserva, setMostrarModalNuevaReserva] = useState(false);

    const cargarDatos = async () => {
        try {
            const [rData, cData, vData, dData, pData, iData, pgData] = await Promise.all([
                obtenerReservas(),
                obtenerClientes(),
                obtenerViajes(),
                obtenerDestinos(),
                obtenerPaquetes(),
                obtenerIntegrantes(),
                obtenerPagos()
            ]);
            setReservas(rData);
            setClientes(cData);
            setViajes(vData);
            setDestinos(dData);
            setPaquetes(pData);
            setIntegrantes(iData);
            setPagos(pgData);
        } catch (err) {
            setError('Error al obtener los datos de reservaciones.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const obtenerCliente = (id) => clientes.find(c => c.id_cliente.toLowerCase() === (id || '').toLowerCase());
    const obtenerViaje = (id) => viajes.find(v => v.id_viaje === Number(id));
    const obtenerDestino = (id) => destinos.find(d => d.id_destino === Number(id));

    const descripcionViaje = (idViaje) => {
        const v = obtenerViaje(idViaje);
        if (!v) return `Viaje #${idViaje}`;
        const d = obtenerDestino(v.id_destino);
        const p = v.id_paquete ? paquetes.find(x => x.id_paquete === v.id_paquete) : null;
        return `${d?.nombre_destino || 'Destino'}${p ? ` (${p.nombre_paquete})` : ''} · Salida ${formatoFecha(v.fecha_salida + 'T00:00:00')}`;
    };

    const calcularFinanzasReserva = (reserva) => {
        const total = Number(reserva.monto_total) || 0;
        const abonado = pagos
            .filter(p => p.id_reserva === reserva.id_reserva && p.is_active)
            .reduce((s, p) => s + Number(p.monto), 0);
        const falta = Math.max(total - abonado, 0);
        return { total, abonado, falta, solvente: falta <= 0.01 };
    };

    // KPIs globales
    let totalFacturado = 0;
    let totalCobrado = 0;
    let totalPorCobrar = 0;
    reservas.filter(r => r.is_active).forEach(r => {
        const fin = calcularFinanzasReserva(r);
        totalFacturado += fin.total;
        totalCobrado += fin.abonado;
        totalPorCobrar += fin.falta;
    });

    const handleEliminarReserva = async (idReserva) => {
        if (confirm(`¿Deseas dar de baja la reserva #${idReserva}? Podrás reactivarla más adelante.`)) {
            try {
                await eliminarReserva(idReserva);
                setExito(`Reserva #${idReserva} dada de baja.`);
                cargarDatos();
            } catch (err) {
                alert(mensajeError(err, 'No se pudo dar de baja la reserva.'));
            }
        }
    };

    const enviarComprobanteWhatsApp = (r) => {
        const cli = obtenerCliente(r.id_cliente);
        if (!cli) return;
        const v = obtenerViaje(r.id_viaje);
        const dest = v ? obtenerDestino(v.id_destino) : null;
        const fin = calcularFinanzasReserva(r);
        const intsR = integrantes.filter(i => i.id_reserva === r.id_reserva && i.is_active);
        const puestos = intsR.map(i => i.numero_asiento).filter(Boolean).sort((a,b)=>a-b).map(n => `#${String(n).padStart(2,'0')}`).join(', ');

        let tel = (cli.telefono || '').replace(/\D/g, '');
        if (tel.startsWith('0') && tel.length === 11) tel = '58' + tel.slice(1);

        const fechaSalida = v?.fecha_salida ? formatoFecha(v.fecha_salida + 'T00:00:00') : 'Próximamente';
        const texto = `*¡Hola ${cli.nombre}!* 👋\n\nResumen de tu reserva con *Viajes La Nena*:\n\n📋 *Detalles:*\n• *Reserva:* #${r.id_reserva}\n• *Destino:* ${dest?.nombre_destino || 'Destino turístico'}\n• *Salida:* ${fechaSalida}\n• *Pasajeros:* ${intsR.length} persona(s)\n• *Puestos Asignados:* ${puestos || 'Asignación automática'}\n• *Total:* ${formatoMoneda(fin.total)}\n• *Abonado:* ${formatoMoneda(fin.abonado)}\n• *Saldo Pendiente:* ${fin.falta > 0 ? formatoMoneda(fin.falta) : '✓ Liquidado'}\n\n¡Gracias por viajar con nosotros! 🌴🚍✨`;

        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank');
    };

    // Filtrado
    const q = busqueda.trim().toLowerCase();
    const reservasFiltradas = reservas.filter(r => {
        const cli = obtenerCliente(r.id_cliente);
        const v = obtenerViaje(r.id_viaje);
        const dest = v ? obtenerDestino(v.id_destino) : null;
        const fin = calcularFinanzasReserva(r);

        // Filtro por píldoras de estado
        if (filtroEstadoPago === 'deuda' && (fin.solvente || !r.is_active)) return false;
        if (filtroEstadoPago === 'solvente' && (!fin.solvente || !r.is_active)) return false;
        if (filtroEstadoPago === 'canceladas' && r.is_active) return false;

        if (!q) return true;

        const strMatch = `${r.id_reserva} ${r.id_cliente} ${cli?.nombre || ''} ${cli?.apellido || ''} ${dest?.nombre_destino || ''} ${cli?.telefono || ''}`.toLowerCase();
        return strMatch.includes(q);
    });

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Control de Reservaciones"
                subtitulo="Supervisa estados de pago, emite comprobantes, liquida saldos y consulta manifiestos"
            >
                <button
                    className="btn btn-primary"
                    onClick={() => setMostrarModalNuevaReserva(true)}
                >
                    <Plus size={16} /> + Nueva Reserva Asistida
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">{exito}</div>}

            {/* TARJETAS DE ESTADÍSTICAS FINANCIERAS DE RESERVAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
                <div className="card" style={{ padding: 14 }}>
                    <div className="cell-sub">Reservas Activas</div>
                    <strong style={{ fontSize: '1.35rem', color: '#0f172a' }}>
                        {reservas.filter(r => r.is_active).length}
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>En itinerarios vigentes</div>
                </div>

                <div className="card" style={{ padding: 14 }}>
                    <div className="cell-sub">Total Facturado</div>
                    <strong style={{ fontSize: '1.35rem', color: '#0f766e' }}>
                        {formatoMoneda(totalFacturado)}
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Monto total en reservas</div>
                </div>

                <div className="card" style={{ padding: 14 }}>
                    <div className="cell-sub">Total Cobrado (Abonos)</div>
                    <strong style={{ fontSize: '1.35rem', color: '#15803d' }}>
                        {formatoMoneda(totalCobrado)}
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: 2 }}>✓ Ingresos confirmados</div>
                </div>

                <div className="card" style={{ padding: 14, border: totalPorCobrar > 0 ? '1.5px solid #f59e0b' : '1px solid var(--border)' }}>
                    <div className="cell-sub">Saldo por Cobrar</div>
                    <strong style={{ fontSize: '1.35rem', color: totalPorCobrar > 0 ? '#b45309' : '#15803d' }}>
                        {formatoMoneda(totalPorCobrar)}
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 2 }}>Pendiente por liquidar</div>
                </div>
            </div>

            {/* TABLA PRINCIPAL DE RESERVAS */}
            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div className="card-title">Listado General de Reservaciones</div>
                        <div className="card-sub">{reservasFiltradas.length} reservas encontradas</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Píldoras de filtro rápido */}
                        <div className="viaje-destino-pills">
                            <button
                                type="button"
                                className={`viaje-pill ${filtroEstadoPago === 'todos' ? 'active' : ''}`}
                                onClick={() => setFiltroEstadoPago('todos')}
                            >
                                Todas
                            </button>
                            <button
                                type="button"
                                className={`viaje-pill ${filtroEstadoPago === 'deuda' ? 'active' : ''}`}
                                onClick={() => setFiltroEstadoPago('deuda')}
                            >
                                ⚠️ Con Saldo Pendiente
                            </button>
                            <button
                                type="button"
                                className={`viaje-pill ${filtroEstadoPago === 'solvente' ? 'active' : ''}`}
                                onClick={() => setFiltroEstadoPago('solvente')}
                            >
                                ✓ Liquidado
                            </button>
                            <button
                                type="button"
                                className={`viaje-pill ${filtroEstadoPago === 'canceladas' ? 'active' : ''}`}
                                onClick={() => setFiltroEstadoPago('canceladas')}
                            >
                                Canceladas
                            </button>
                        </div>

                        <Buscador
                            valor={busqueda}
                            onChange={setBusqueda}
                            placeholder="Buscar por reserva, cliente o destino..."
                        />
                    </div>
                </div>

                {reservasFiltradas.length === 0 ? <Vacio texto="No se encontraron reservaciones con ese filtro" /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Reserva</th>
                                    <th>Cliente Titular</th>
                                    <th>Destino / Salida</th>
                                    <th>Pasajeros & Puestos</th>
                                    <th>Total</th>
                                    <th>Abonado</th>
                                    <th>Saldo Pendiente</th>
                                    <th>Estatus</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservasFiltradas.map(r => {
                                    const cli = obtenerCliente(r.id_cliente);
                                    const fin = calcularFinanzasReserva(r);
                                    const intsR = integrantes.filter(i => i.id_reserva === r.id_reserva && i.is_active);
                                    const puestos = intsR.map(i => i.numero_asiento).filter(Boolean).sort((a,b)=>a-b);

                                    return (
                                        <tr
                                            key={r.id_reserva}
                                            className={`row-clickable ${r.is_active ? '' : 'inactive'}`}
                                            onClick={() => setReservaDetalle(r)}
                                            title="Toca para ver el detalle completo de la reserva"
                                        >
                                            <td>
                                                <strong style={{ color: 'var(--primary-dark)', fontSize: '0.92rem' }}>#{r.id_reserva}</strong>
                                                <div className="cell-sub">{formatoFecha(r.fecha_reserva)}</div>
                                            </td>
                                            <td>
                                                <div className="cell-main">
                                                    {cli ? `${cli.nombre} ${cli.apellido}` : r.id_cliente}
                                                </div>
                                                <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <BadgeDocumento doc={r.id_cliente} tipo={cli?.tipo_documento} small />
                                                    {cli?.telefono && <span>· 📞 {cli.telefono}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="cell-main" style={{ maxWidth: 220 }}>{descripcionViaje(r.id_viaje)}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Badge tipo="info">{intsR.length} viajero(s)</Badge>
                                                    {puestos.length > 0 && (
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '2px 5px', borderRadius: 4 }}>
                                                            💺 #{puestos.join(', #')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="money">{formatoMoneda(fin.total)}</td>
                                            <td className="money" style={{ color: '#15803d' }}>{formatoMoneda(fin.abonado)}</td>
                                            <td className="money" style={{ color: fin.falta > 0 ? '#b45309' : '#15803d', fontWeight: 700 }}>
                                                {fin.falta > 0 ? formatoMoneda(fin.falta) : '✓ Liquidado'}
                                            </td>
                                            <td>
                                                <Badge tipo={fin.falta <= 0.01 ? 'success' : 'warning'}>
                                                    {fin.falta <= 0.01 ? 'Pagado' : 'Abonado'}
                                                </Badge>
                                            </td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        style={{ padding: '5px 8px', fontSize: '0.76rem' }}
                                                        onClick={() => setReservaDetalle(r)}
                                                        title="Ver detalle de pasajeros y pagos"
                                                    >
                                                        <Eye size={13} /> Detalle
                                                    </button>

                                                    {fin.falta > 0 && r.is_active && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary"
                                                            style={{ padding: '5px 9px', fontSize: '0.76rem' }}
                                                            onClick={() => setReservaParaLiquidarDirecta({
                                                                reserva: r,
                                                                id_reserva: r.id_reserva,
                                                                id_cliente: r.id_cliente,
                                                                total: fin.total,
                                                                abonado: fin.abonado,
                                                                falta: fin.falta
                                                            })}
                                                            title="Liquidar saldo pendiente"
                                                        >
                                                            <CreditCard size={13} /> Liquidar
                                                        </button>
                                                    )}

                                                    {cli?.telefono && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost"
                                                            style={{ padding: '5px 8px', color: '#16a34a', borderColor: '#86efac' }}
                                                            onClick={() => enviarComprobanteWhatsApp(r)}
                                                            title="Enviar comprobante por WhatsApp"
                                                        >
                                                            <MessageCircle size={14} />
                                                        </button>
                                                    )}

                                                    {esAdmin && r.is_active && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger-soft"
                                                            style={{ padding: '5px 7px' }}
                                                            onClick={() => handleEliminarReserva(r.id_reserva)}
                                                            title="Dar de baja la reserva"
                                                        >
                                                            <Trash size={13} />
                                                        </button>
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

            {/* MODAL PARA NUEVA RESERVA ASISTIDA (CONDUCE DIRECTAMENTE AL ASISTENTE LINEAL) */}
            {mostrarModalNuevaReserva && (
                <div className="modal-backdrop" onClick={() => setMostrarModalNuevaReserva(false)}>
                    <div className="modal-card fade-in" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                            <div className="card-title">Creación Asistida de Reserva</div>
                            <button className="btn btn-ghost" onClick={() => setMostrarModalNuevaReserva(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '16px 0', fontSize: '0.9rem', color: 'var(--text)' }}>
                            <p style={{ margin: '0 0 12px' }}>
                                Para garantizar que los datos del cliente, los acompañantes, los descuentos por edad y los asientos en el croquis queden perfectamente vinculados, utiliza el <strong>Asistente Modular</strong>.
                            </p>
                            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
                                <strong>El asistente te guiará paso a paso en:</strong>
                                <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: '0.84rem', color: 'var(--muted)' }}>
                                    <li>Datos y contacto de WhatsApp del cliente titular (+18)</li>
                                    <li>Selección de viaje con cupos disponibles en vivo</li>
                                    <li>Acompañantes y menores con cálculo automático de tarifas</li>
                                    <li>Croquis interactivo de puestos (Bus Cama o Avión)</li>
                                    <li>Abono inicial de $30 y cálculo en Bs BCV y Pesos COP</li>
                                </ul>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                                    onClick={() => {
                                        setMostrarModalNuevaReserva(false);
                                        if (onIrAClientes) {
                                            onIrAClientes();
                                        } else {
                                            window.location.hash = '#clientes';
                                        }
                                    }}
                                >
                                    Abrir Asistente en Clientes <ArrowRight size={16} />
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setMostrarModalNuevaReserva(false)}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE DETALLE COMPLETO DE RESERVA */}
            {reservaDetalle && (
                <div className="modal-backdrop" onClick={() => setReservaDetalle(null)}>
                    <div className="modal-card fade-in" style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Reserva #{reservaDetalle.id_reserva}</h2>
                                    <Badge tipo={calcularFinanzasReserva(reservaDetalle).solvente ? 'success' : 'warning'}>
                                        {calcularFinanzasReserva(reservaDetalle).solvente ? '✓ Pagado' : '⚠️ Abonado'}
                                    </Badge>
                                </div>
                                <div className="card-sub" style={{ marginTop: 2 }}>
                                    Registrada el {formatoFecha(reservaDetalle.fecha_reserva)}
                                </div>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setReservaDetalle(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Datos del Viaje y Titular */}
                        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid var(--border)', margin: '14px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                <div>
                                    <span className="cell-sub">Cliente Titular:</span>
                                    {(() => {
                                        const c = obtenerCliente(reservaDetalle.id_cliente);
                                        return (
                                            <div>
                                                <strong>{c ? `${c.nombre} ${c.apellido}` : reservaDetalle.id_cliente}</strong>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                                    {reservaDetalle.id_cliente} {c?.telefono ? `· 📞 ${c.telefono}` : ''}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div>
                                    <span className="cell-sub">Viaje / Destino:</span>
                                    <div><strong>{descripcionViaje(reservaDetalle.id_viaje)}</strong></div>
                                </div>

                                <div>
                                    <span className="cell-sub">Estado Financiero:</span>
                                    {(() => {
                                        const fin = calcularFinanzasReserva(reservaDetalle);
                                        return (
                                            <div>
                                                <strong>{formatoMoneda(fin.total)}</strong>
                                                <div style={{ fontSize: '0.78rem', color: fin.falta > 0 ? '#b45309' : '#15803d' }}>
                                                    Abonado: {formatoMoneda(fin.abonado)} {fin.falta > 0 ? `(Debe ${formatoMoneda(fin.falta)})` : '(Solvente)'}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Pasajeros de la Reserva */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
                                👥 Pasajeros Registrados en la Reserva ({integrantes.filter(i => i.id_reserva === reservaDetalle.id_reserva && i.is_active).length})
                            </div>
                            <div className="table-wrap">
                                <table className="table" style={{ fontSize: '0.84rem' }}>
                                    <thead>
                                        <tr>
                                            <th>Puesto</th>
                                            <th>Pasajero</th>
                                            <th>Documento</th>
                                            <th>Edad</th>
                                            <th>Tarifa Aplicada</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {integrantes
                                            .filter(i => i.id_reserva === reservaDetalle.id_reserva && i.is_active)
                                            .map(i => {
                                                const v = obtenerViaje(reservaDetalle.id_viaje);
                                                const pBase = obtenerPrecioBaseViaje(v, destinos, paquetes);
                                                const t = calcularTarifaPorEdad(pBase, i.edad);
                                                return (
                                                    <tr key={i.id_integrante}>
                                                        <td>
                                                            <Badge tipo={i.numero_asiento ? 'success' : 'neutral'}>
                                                                {i.numero_asiento ? `💺 #${String(i.numero_asiento).padStart(2, '0')}` : 'Auto'}
                                                            </Badge>
                                                        </td>
                                                        <td><strong>{i.nombre} {i.apellido}</strong></td>
                                                        <td><BadgeDocumento doc={i.documento_id} tipo={i.tipo_documento} small /></td>
                                                        <td>{i.edad} años</td>
                                                        <td>
                                                            <Badge tipo={t.tipo}>{t.etiqueta}</Badge>
                                                            <span style={{ marginLeft: 6, fontWeight: 700 }}>{formatoMoneda(t.monto)}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagos Realizados */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
                                💳 Historial de Pagos y Abonos de esta Reserva
                            </div>
                            <div className="table-wrap">
                                <table className="table" style={{ fontSize: '0.84rem' }}>
                                    <thead>
                                        <tr>
                                            <th>ID Pago</th>
                                            <th>Monto ($)</th>
                                            <th>Método</th>
                                            <th>Referencia</th>
                                            <th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagos
                                            .filter(p => p.id_reserva === reservaDetalle.id_reserva && p.is_active)
                                            .map(p => (
                                                <tr key={p.id_pago}>
                                                    <td>#{p.id_pago}</td>
                                                    <td className="money" style={{ color: '#15803d', fontWeight: 700 }}>
                                                        {formatoMoneda(p.monto)}
                                                    </td>
                                                    <td>{p.metodo_pago}</td>
                                                    <td>{p.referencia}</td>
                                                    <td>{formatoFecha(p.fecha_pago)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Botones de acción del modal */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => enviarComprobanteWhatsApp(reservaDetalle)}
                                style={{ color: '#16a34a', borderColor: '#86efac' }}
                            >
                                <MessageCircle size={15} /> Enviar Comprobante por WhatsApp
                            </button>

                            <div style={{ display: 'flex', gap: 8 }}>
                                {calcularFinanzasReserva(reservaDetalle).falta > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            const fin = calcularFinanzasReserva(reservaDetalle);
                                            setReservaParaLiquidarDirecta({
                                                reserva: reservaDetalle,
                                                id_reserva: reservaDetalle.id_reserva,
                                                id_cliente: reservaDetalle.id_cliente,
                                                total: fin.total,
                                                abonado: fin.abonado,
                                                falta: fin.falta
                                            });
                                            setReservaDetalle(null);
                                        }}
                                    >
                                        <CreditCard size={15} /> Liquidar Saldo Pendiente
                                    </button>
                                )}
                                <button type="button" className="btn btn-ghost" onClick={() => setReservaDetalle(null)}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
