import { useEffect, useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
    Wallet, CalendarCheck, Users, Plane, Trophy, TrendingUp, PiggyBank, Receipt, MapPin, Globe, Clock, AlertTriangle
} from 'lucide-react';
import { obtenerResumenEstadisticas } from '../servicios/estadisticasServicios';
import { StatCard, Badge, formatoMoneda, formatoFecha, Vacio } from '../componentes/UI';

const COLORES = ['#0ea5a4', '#6366f1', '#f97316', '#22c55e', '#f59e0b', '#ec4899', '#64748b'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const nombreMes = (yyyyMM) => {
    const [anio, mes] = yyyyMM.split('-');
    return `${MESES[parseInt(mes) - 1]} ${anio.slice(2)}`;
};

const tooltipMoneda = (valor) => formatoMoneda(valor);

function Ranking({ datos, campoValor, formato = (v) => v, campoSub, formatoSub = (v) => v }) {
    if (!datos.length) return <Vacio texto="Sin datos aún" />;
    const maximo = Math.max(...datos.map(d => d[campoValor]));
    return (
        <ul className="rank-list">
            {datos.map((d, i) => (
                <li key={i} className="rank-item">
                    <div className="rank-pos">{i + 1}</div>
                    <div className="rank-info">
                        <div className="rank-name">{d.nombre}</div>
                        <div className="rank-bar"><div style={{ width: `${(d[campoValor] / maximo) * 100}%` }} /></div>
                    </div>
                    <div className="rank-value">
                        {formato(d[campoValor])}
                        {campoSub && <small>{formatoSub(d[campoSub])}</small>}
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function Dashboard() {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        obtenerResumenEstadisticas()
            .then(setDatos)
            .catch(() => setError('No se pudieron cargar las estadísticas. Verifica que tengas rol de Administrador.'));
    }, []);

    if (error) return <div className="alert alert-error">{error}</div>;
    if (!datos) return <div className="empty">Cargando estadísticas...</div>;

    const { kpis, viaje_mas_vendido: top } = datos;

    // Combina ingresos y reservas por mes en un solo arreglo
    const meses = {};
    datos.reservas_por_mes.forEach(r => { meses[r.mes] = { mes: nombreMes(r.mes), ventas: r.ventas, reservas: r.reservas, ingresos: 0 }; });
    datos.ingresos_por_mes.forEach(p => {
        meses[p.mes] = meses[p.mes] || { mes: nombreMes(p.mes), ventas: 0, reservas: 0 };
        meses[p.mes].ingresos = p.ingresos;
    });
    const serieMensual = Object.keys(meses).sort().map(k => meses[k]);

    const porcentajeCobrado = kpis.ventas_totales ? Math.round((kpis.ingresos_cobrados / kpis.ventas_totales) * 100) : 0;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Panel de Estadísticas</h1>
                    <p className="page-sub">Resumen del rendimiento de Viajes La Nena con los datos registrados en el sistema</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-4" style={{ marginBottom: 20 }}>
                <StatCard icono={Wallet} color="primary" etiqueta="Ventas totales" valor={formatoMoneda(kpis.ventas_totales)}
                    pie={`${porcentajeCobrado}% cobrado · ${formatoMoneda(kpis.por_cobrar)} por cobrar`} />
                <StatCard icono={PiggyBank} color="success" etiqueta="Ganancia estimada" valor={formatoMoneda(kpis.ganancia_estimada)}
                    pie={`Costos: ${formatoMoneda(kpis.costos_totales)}`} />
                <StatCard icono={CalendarCheck} color="indigo" etiqueta="Reservas activas" valor={kpis.total_reservas}
                    pie={`Ticket promedio ${formatoMoneda(kpis.ticket_promedio)}`} />
                <StatCard icono={Users} color="accent" etiqueta="Clientes" valor={kpis.total_clientes}
                    pie={`${kpis.total_viajeros} viajeros registrados`} />
            </div>

            {/* Semáforo de Cuenta Regresiva y Alertas Pre-Salida */}
            {datos.semaforo_salidas && datos.semaforo_salidas.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Semáforo de Cuenta Regresiva y Liquidación Pre-Viaje</div>
                            <div className="card-sub">Monitoreo de próximas salidas, ocupación de unidades y saldos pendientes por cobrar antes del abordaje</div>
                        </div>
                        <Clock color="#0ea5a4" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
                        {datos.semaforo_salidas
                            .filter(s => s.nivel !== 'cancelado')
                            .slice(0, 6)
                            .map((s) => {
                                const badgeTipo = s.nivel === 'urgente' ? 'danger'
                                    : s.nivel === 'en_curso' || s.nivel === 'proximo' ? 'warning'
                                    : s.nivel === 'finalizado' ? 'neutral' : 'success';
                                return (
                                    <div
                                        key={s.id_viaje}
                                        style={{
                                            border: s.reservas_con_deuda > 0 && (s.nivel === 'urgente' || s.nivel === 'proximo')
                                                ? '1.5px solid #f59e0b'
                                                : '1px solid var(--border)',
                                            borderRadius: 12,
                                            padding: '12px 14px',
                                            background: '#f8fafc',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                            <strong style={{ fontSize: '0.9rem' }}>#{s.id_viaje} · {s.destino}</strong>
                                            <Badge tipo={badgeTipo}>{s.etiqueta_tiempo}</Badge>
                                        </div>
                                        <div className="cell-sub">
                                            Salida: <strong>{formatoFecha(s.fecha_salida + 'T00:00:00')}</strong> · {s.metodo_transporte} ({s.ocupados}/{s.capacidad} cupos · {s.ocupacion}%)
                                        </div>
                                        <div className="progress" style={{ height: 6 }}>
                                            <div style={{
                                                width: `${s.ocupacion}%`,
                                                background: s.ocupacion >= 70 ? '#22c55e' : s.ocupacion >= 40 ? '#0ea5a4' : '#f59e0b'
                                            }} />
                                        </div>
                                        {s.reservas_con_deuda > 0 ? (
                                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                                <AlertTriangle size={14} color="#d97706" />
                                                <span>{s.reservas_con_deuda} reserva(s) por liquidar ({formatoMoneda(s.saldo_pendiente)})</span>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', marginTop: 2 }}>
                                                ✓ Sin saldos pendientes de cobro
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Viaje más vendido + Evolución mensual */}
            <div className="grid grid-3" style={{ marginBottom: 20 }}>
                <div className="card hero-card">
                    <span className="hero-badge"><Trophy size={14} /> Viaje más vendido</span>
                    {top ? (
                        <>
                            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: 18 }}>{top.destino}</h2>
                            <div style={{ opacity: 0.85, marginTop: 4 }}>Viaje #{top.id_viaje} · Salida {formatoFecha(top.fecha_salida + 'T00:00:00')}</div>
                            <div className="hero-metrics">
                                <div><span>Reservas</span><strong>{top.reservas}</strong></div>
                                <div><span>Ventas</span><strong>{formatoMoneda(top.ventas)}</strong></div>
                            </div>
                            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                                <Globe size={14} style={{ verticalAlign: -2 }} /> Destino estrella: <strong>{datos.top_destinos[0]?.nombre}</strong>
                                <br />
                                <Plane size={14} style={{ verticalAlign: -2 }} /> Paquete estrella: <strong>{datos.top_paquetes[0]?.nombre}</strong>
                            </div>
                        </>
                    ) : <p style={{ marginTop: 20 }}>Aún no hay reservas registradas.</p>}
                </div>

                <div className="card span-2">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Evolución mensual</div>
                            <div className="card-sub">Ventas generadas vs. ingresos cobrados</div>
                        </div>
                        <TrendingUp color="#0ea5a4" />
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={serieMensual}>
                            <defs>
                                <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0ea5a4" stopOpacity={0.35} />
                                    <stop offset="100%" stopColor="#0ea5a4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                            <Tooltip formatter={tooltipMoneda} />
                            <Legend />
                            <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#6366f1" strokeWidth={2.5} fill="url(#gVentas)" />
                            <Area type="monotone" dataKey="ingresos" name="Cobrado" stroke="#0ea5a4" strokeWidth={2.5} fill="url(#gIngresos)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-3" style={{ marginBottom: 20 }}>
                <div className="card">
                    <div className="card-header">
                        <div><div className="card-title">Destinos más vendidos</div><div className="card-sub">Por número de reservas</div></div>
                        <MapPin color="#f97316" />
                    </div>
                    <Ranking datos={datos.top_destinos} campoValor="reservas" formato={(v) => `${v} res.`} campoSub="ventas" formatoSub={formatoMoneda} />
                </div>
                <div className="card">
                    <div className="card-header">
                        <div><div className="card-title">Paquetes más vendidos</div><div className="card-sub">Por número de reservas</div></div>
                        <Plane color="#6366f1" />
                    </div>
                    <Ranking datos={datos.top_paquetes} campoValor="reservas" formato={(v) => `${v} res.`} campoSub="ventas" formatoSub={formatoMoneda} />
                </div>
                <div className="card">
                    <div className="card-header">
                        <div><div className="card-title">Mejores clientes</div><div className="card-sub">Por monto total reservado</div></div>
                        <Trophy color="#f59e0b" />
                    </div>
                    <Ranking datos={datos.top_clientes} campoValor="total_gastado" formato={formatoMoneda} campoSub="reservas" formatoSub={(v) => `${v} reservas`} />
                </div>
            </div>

            {/* Ganancias por viaje + Métodos de pago */}
            <div className="grid grid-3" style={{ marginBottom: 20 }}>
                <div className="card span-2">
                    <div className="card-header">
                        <div><div className="card-title">Rentabilidad por viaje</div><div className="card-sub">Ingresos, costos y ganancia neta de viajes finalizados</div></div>
                        <Receipt color="#22c55e" />
                    </div>
                    {datos.ganancias_por_viaje.length ? (
                        <ResponsiveContainer width="100%" height={290}>
                            <BarChart data={datos.ganancias_por_viaje}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                                <XAxis dataKey="viaje" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                                <Tooltip formatter={tooltipMoneda} />
                                <Legend />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="costos" name="Costos" fill="#f97316" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="ganancia" name="Ganancia" fill="#0ea5a4" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <Vacio texto="Registra ganancias para ver la rentabilidad" />}
                </div>

                <div className="card">
                    <div className="card-header">
                        <div><div className="card-title">Métodos de pago</div><div className="card-sub">Preferencia de los clientes</div></div>
                    </div>
                    {datos.metodos_pago.length ? (
                        <ResponsiveContainer width="100%" height={290}>
                            <PieChart>
                                <Pie data={datos.metodos_pago} dataKey="cantidad" nameKey="metodo" innerRadius={60} outerRadius={95} paddingAngle={3}>
                                    {datos.metodos_pago.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v, n, p) => [`${v} pagos (${formatoMoneda(p.payload.monto)})`, n]} />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <Vacio texto="Sin pagos registrados" />}
                </div>
            </div>

            {/* Ocupación + Estatus + Edades */}
            <div className="grid grid-3">
                <div className="card">
                    <div className="card-header">
                        <div><div className="card-title">Ocupación de viajes</div><div className="card-sub">Reservas sobre capacidad total</div></div>
                    </div>
                    <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 6 }}>
                        {[...datos.ocupacion_viajes].sort((a, b) => b.ocupacion - a.ocupacion).map((o, i) => (
                            <div key={i} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 5 }}>
                                    <span style={{ fontWeight: 600 }}>{o.viaje}</span>
                                    <span style={{ color: '#64748b' }}>{o.ocupacion}%</span>
                                </div>
                                <div className="progress">
                                    <div style={{
                                        width: `${o.ocupacion}%`,
                                        background: o.ocupacion >= 70 ? '#22c55e' : o.ocupacion >= 40 ? '#0ea5a4' : '#f59e0b'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div><div className="card-title">Estado de cobro</div><div className="card-sub">Reservas según estatus de pago</div></div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={datos.estatus_reservas} dataKey="cantidad" nameKey="estatus" outerRadius={90} label>
                                {datos.estatus_reservas.map((e, i) => (
                                    <Cell key={i} fill={e.estatus === 'Pagado' ? '#22c55e' : e.estatus === 'Abonado' ? '#f59e0b' : '#ef4444'} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div><div className="card-title">Perfil de viajeros</div><div className="card-sub">Distribución por rango de edad</div></div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={datos.edades_viajeros}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                            <XAxis dataKey="rango" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="cantidad" name="Viajeros" radius={[6, 6, 0, 0]}>
                                {datos.edades_viajeros.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
