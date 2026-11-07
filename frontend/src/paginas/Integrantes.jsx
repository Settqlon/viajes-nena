import { useEffect, useState } from 'react';
import {
    Printer, MessageCircle, Bus, Plane, Users, CheckCircle2, AlertTriangle, Search,
    Calendar, MapPin, CheckSquare, Square
} from 'lucide-react';
import { obtenerIntegrantes } from '../servicios/integrantesServicios';
import { obtenerReservas } from '../servicios/reservasServicios';
import { obtenerClientes } from '../servicios/clientesServicios';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { obtenerPagos } from '../servicios/pagosServicios';
import {
    PageHeader, Buscador, Vacio, Badge, formatoFecha, formatoMoneda,
    BadgeDocumento, TIPOS_DOC_VIAJERO
} from '../componentes/UI';
import { calcularTarifaPorEdad, obtenerPrecioBaseViaje } from '../servicios/tarifasServicios';
import MapaAsientos from '../componentes/MapaAsientos';

export default function Integrantes({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const [integrantes, setIntegrantes] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [error, setError] = useState('');

    const [idViajeSeleccionado, setIdViajeSeleccionado] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [asistencias, setAsistencias] = useState({}); // { [id_integrante]: boolean }
    const [vistaActiva, setVistaActiva] = useState('lista'); // 'lista' | 'croquis'

    const cargarDatos = async () => {
        try {
            const [iData, rData, cData, vData, dData, pData, pgData] = await Promise.all([
                obtenerIntegrantes(),
                obtenerReservas(),
                obtenerClientes(),
                obtenerViajes(),
                obtenerDestinos(),
                obtenerPaquetes(),
                obtenerPagos()
            ]);
            setIntegrantes(iData || []);
            setReservas(rData || []);
            setClientes(cData || []);
            setViajes(vData || []);
            setDestinos(dData || []);
            setPaquetes(pData || []);
            setPagos(pgData || []);

            // Preseleccionar el primer viaje activo si no hay ninguno seleccionado
            if (vData.length > 0 && !idViajeSeleccionado) {
                const activo = vData.find(v => v.is_active && v.estatus !== 'Cancelado') || vData[0];
                setIdViajeSeleccionado(String(activo.id_viaje));
            }
        } catch (err) {
            setError('Error al obtener la información del manifiesto.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const viajeActual = viajes.find(v => v.id_viaje === Number(idViajeSeleccionado));
    const destinoActual = viajeActual ? destinos.find(d => d.id_destino === viajeActual.id_destino) : null;
    const paqueteActual = viajeActual?.id_paquete ? paquetes.find(p => p.id_paquete === viajeActual.id_paquete) : null;

    // Reservas activas asociadas a este viaje
    const reservasViajeIds = new Set(
        reservas.filter(r => r.id_viaje === Number(idViajeSeleccionado) && r.is_active).map(r => r.id_reserva)
    );

    // Integrantes activos de este viaje
    const integrantesViaje = integrantes.filter(i => i.is_active && reservasViajeIds.has(i.id_reserva));

    // Capacidad y ocupación
    const esAvion = viajeActual?.metodo_transporte === 'Avión';
    const asientosPorUnidad = esAvion ? 150 : 60;
    const capacidadTotal = asientosPorUnidad * (viajeActual?.cantidad_unidades || 1);
    const puestosOcupados = integrantesViaje.filter(i => i.numero_asiento).length;

    // Calcular estado financiero de la reserva del integrante
    const obtenerEstadoPagoReserva = (idReserva) => {
        const res = reservas.find(r => r.id_reserva === idReserva);
        if (!res) return { falta: 0, solvente: true, total: 0 };
        const abonado = pagos
            .filter(p => p.id_reserva === idReserva && p.is_active)
            .reduce((s, p) => s + Number(p.monto), 0);
        const total = Number(res.monto_total) || 0;
        const falta = Math.max(total - abonado, 0);
        return { total, abonado, falta, solvente: falta <= 0.01 };
    };

    const toggleAsistencia = (idIntegrante) => {
        setAsistencias(prev => ({
            ...prev,
            [idIntegrante]: !prev[idIntegrante]
        }));
    };

    const imprimirManifiesto = () => {
        window.print();
    };

    const compartirManifiestoWhatsApp = () => {
        if (!viajeActual || !destinoActual) return;
        const fecha = formatoFecha(viajeActual.fecha_salida + 'T00:00:00');
        let texto = `*📋 MANIFIESTO OFICIAL DE ABORDAJE*\n*Viajes La Nena* 🌴\n\n`;
        texto += `• *Viaje:* #${viajeActual.id_viaje} - ${destinoActual.nombre_destino}\n`;
        texto += `• *Salida:* ${fecha}\n`;
        texto += `• *Transporte:* ${viajeActual.metodo_transporte} (${viajeActual.cantidad_unidades || 1} unidad/es)\n`;
        texto += `• *Total Pasajeros:* ${integrantesViaje.length} abordando\n\n`;
        texto += `*LISTA DE PASAJEROS POR PUESTO:*\n`;

        const ordenados = integrantesViaje
            .slice()
            .sort((a, b) => (Number(a.numero_asiento) || 999) - (Number(b.numero_asiento) || 999));

        ordenados.forEach((i) => {
            const puestoStr = i.numero_asiento ? `#${String(i.numero_asiento).padStart(2, '0')}` : 'Sin puesto';
            const estado = obtenerEstadoPagoReserva(i.id_reserva);
            texto += `💺 ${puestoStr} | ${i.nombre} ${i.apellido} (${i.documento_id || 'MENOR'}) - ${i.edad} años ${estado.solvente ? '✓ Solvente' : `⚠️ Debe $${estado.falta.toFixed(2)}`}\n`;
        });

        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    };

    // Filtrado de la lista por nombre, documento o asiento
    const q = busqueda.trim().toLowerCase();
    const filtrados = integrantesViaje
        .slice()
        .sort((a, b) => (Number(a.numero_asiento) || 999) - (Number(b.numero_asiento) || 999))
        .filter(i => {
            if (!q) return true;
            const str = `${i.numero_asiento || ''} ${i.nombre} ${i.apellido} ${i.documento_id} ${i.edad}`.toLowerCase();
            return str.includes(q);
        });

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Manifiesto de Abordaje y Pasajeros"
                subtitulo="Lista oficial por viaje ordenada por número de puesto para choferes, guías y control de ruta"
            >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={compartirManifiestoWhatsApp}
                        style={{ color: '#16a34a', borderColor: '#86efac', fontWeight: 700 }}
                    >
                        <MessageCircle size={16} /> Compartir Manifiesto WhatsApp
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={imprimirManifiesto}
                    >
                        <Printer size={16} /> Imprimir Manifiesto
                    </button>
                </div>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            {/* SELECTOR DESTACADO DE VIAJE */}
            <div className="card" style={{ marginBottom: 18, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'block' }}>
                            Selecciona el Viaje para Generar el Manifiesto de Abordaje:
                        </label>
                        <select
                            value={idViajeSeleccionado}
                            onChange={(e) => setIdViajeSeleccionado(e.target.value)}
                            style={{ fontSize: '0.92rem', padding: '8px 12px', width: '100%', fontWeight: 600 }}
                        >
                            {viajes.map(v => {
                                const d = destinos.find(x => x.id_destino === v.id_destino);
                                return (
                                    <option key={v.id_viaje} value={String(v.id_viaje)}>
                                        Viaje #{v.id_viaje} · {d?.nombre_destino || 'Destino'} · Salida: {formatoFecha(v.fecha_salida + 'T00:00:00')} ({v.metodo_transporte})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {viajeActual && destinoActual && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ padding: '8px 14px', background: 'var(--primary-soft)', borderRadius: 10, border: '1px solid var(--primary)' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--primary-dark)', fontWeight: 700 }}>TRANSPORTE</div>
                                <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>
                                    {viajeActual.metodo_transporte === 'Avión' ? '✈️ Avión Comercial' : '🚌 Bus Cama 2 Pisos'} × {viajeActual.cantidad_unidades || 1}
                                </div>
                            </div>

                            <div style={{ padding: '8px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700 }}>OCUPACIÓN DEL VEHÍCULO</div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                                    {puestosOcupados} de {capacidadTotal} asientos ({((puestosOcupados / (capacidadTotal || 1)) * 100).toFixed(0)}%)
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* BARRA DE PESTAÑAS (LISTA VS CROQUIS) Y BUSCADOR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        className={`btn ${vistaActiva === 'lista' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setVistaActiva('lista')}
                    >
                        📋 Lista Oficial de Abordaje ({integrantesViaje.length})
                    </button>
                    <button
                        type="button"
                        className={`btn ${vistaActiva === 'croquis' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setVistaActiva('croquis')}
                    >
                        💺 Croquis y Asientos del Transporte
                    </button>
                </div>

                {vistaActiva === 'lista' && (
                    <Buscador
                        valor={busqueda}
                        onChange={setBusqueda}
                        placeholder="Buscar por puesto (#01), nombre o cédula..."
                    />
                )}
            </div>

            {/* VISTA 1: LISTA OFICIAL DE ABORDAJE (ORDENADA POR PUESTO) */}
            {vistaActiva === 'lista' && (
                <div className="card">
                    {filtrados.length === 0 ? (
                        <Vacio texto="Aún no hay pasajeros confirmados en este viaje" />
                    ) : (
                        <div className="table-wrap">
                            <table className="table" id="tabla-manifiesto">
                                <thead>
                                    <tr>
                                        <th style={{ width: 50, textAlign: 'center' }}>Check</th>
                                        <th>Puesto</th>
                                        <th>Pasajero / Viajero</th>
                                        <th>Documento de Identidad</th>
                                        <th>Edad</th>
                                        <th>Categoría Tarifa</th>
                                        <th>Contacto Titular</th>
                                        <th>Reserva & Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map((item) => {
                                        const res = reservas.find(r => r.id_reserva === item.id_reserva);
                                        const titular = res ? clientes.find(c => c.id_cliente.toLowerCase() === res.id_cliente.toLowerCase()) : null;
                                        const estadoPago = obtenerEstadoPagoReserva(item.id_reserva);
                                        const abordado = !!asistencias[item.id_integrante];

                                        const precioBase = viajeActual ? obtenerPrecioBaseViaje(viajeActual, destinos, paquetes) : 0;
                                        const tarifa = calcularTarifaPorEdad(precioBase, item.edad);

                                        return (
                                            <tr
                                                key={item.id_integrante}
                                                style={{ background: abordado ? '#f0fdf4' : 'transparent', transition: 'background 0.15s' }}
                                            >
                                                {/* Checkbox de Abordaje */}
                                                <td style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleAsistencia(item.id_integrante)}>
                                                    {abordado ? (
                                                        <CheckSquare size={18} color="#16a34a" />
                                                    ) : (
                                                        <Square size={18} color="var(--muted)" />
                                                    )}
                                                </td>

                                                {/* Número de Puesto */}
                                                <td>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '4px 8px',
                                                        borderRadius: 6,
                                                        fontWeight: 800,
                                                        fontSize: '0.85rem',
                                                        background: item.numero_asiento ? '#ccfbf1' : '#f1f5f9',
                                                        color: item.numero_asiento ? '#0f766e' : '#64748b'
                                                    }}>
                                                        💺 {item.numero_asiento ? `#${String(item.numero_asiento).padStart(2, '0')}` : 'Sin puesto'}
                                                    </span>
                                                </td>

                                                {/* Nombre */}
                                                <td>
                                                    <div className="cell-main" style={{ fontWeight: 700 }}>
                                                        {item.nombre} {item.apellido}
                                                    </div>
                                                    {abordado && (
                                                        <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                                                            ✓ A bordo
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Documento */}
                                                <td>
                                                    <BadgeDocumento doc={item.documento_id} tipo={item.tipo_documento} />
                                                </td>

                                                {/* Edad */}
                                                <td>
                                                    <strong>{item.edad}</strong> años
                                                </td>

                                                {/* Tarifa */}
                                                <td>
                                                    <Badge tipo={tarifa.tipo}>{tarifa.etiqueta}</Badge>
                                                </td>

                                                {/* Teléfono */}
                                                <td>
                                                    {titular?.telefono ? (
                                                        <a
                                                            href={`https://wa.me/${titular.telefono.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: '#0f766e', fontWeight: 600, fontSize: '0.82rem' }}
                                                        >
                                                            📞 {titular.telefono}
                                                        </a>
                                                    ) : (
                                                        <span className="cell-sub">Sin teléfono</span>
                                                    )}
                                                </td>

                                                {/* Estado de pago de la reserva */}
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <Badge tipo="neutral">#{item.id_reserva}</Badge>
                                                        {estadoPago.solvente ? (
                                                            <Badge tipo="success">Solvente</Badge>
                                                        ) : (
                                                            <Badge tipo="warning">Debe {formatoMoneda(estadoPago.falta)}</Badge>
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

            {/* VISTA 2: CROQUIS DE ASIENTOS Y OCUPACIÓN EN EL TRANSPORTE */}
            {vistaActiva === 'croquis' && viajeActual && (
                <div className="card fade-in">
                    <div className="card-header">
                        <div className="card-title">Distribución Visual de Asientos en el Transporte</div>
                        <div className="card-sub">
                            {viajeActual.metodo_transporte} · {puestosOcupados} asientos ocupados de {capacidadTotal}
                        </div>
                    </div>
                    <MapaAsientos
                        viaje={viajeActual}
                        ocupadosExternos={integrantesViaje}
                        titulo={`Croquis de ${viajeActual.metodo_transporte}`}
                    />
                </div>
            )}
        </div>
    );
}
