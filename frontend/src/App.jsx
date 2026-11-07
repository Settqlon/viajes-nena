import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
    LayoutDashboard, MapPin, Package, Users, Plane, CalendarCheck, CreditCard, UserPlus,
    Receipt, TriangleAlert, TrendingUp, Workflow, UserCog, ShieldCheck, LogOut, TreePalm, Shield
} from 'lucide-react';
import Login from './paginas/Login';
import Dashboard from './paginas/Dashboard';
import Catalogo from './paginas/Catalogo';
import Clientes from './paginas/Clientes';
import Viajes from './paginas/Viajes';
import Reservas from './paginas/Reservas';
import Pagos from './paginas/Pagos';
import Integrantes from './paginas/Integrantes';
import ControlFinanciero from './paginas/ControlFinanciero';
import Procesos from './paginas/Procesos';
import Usuarios from './paginas/Usuarios';
import Auditoria from './paginas/Auditoria';
import AsistenteIA from './componentes/AsistenteIA';
import { WidgetTasasTopBar } from './componentes/UI';
import { logout } from './servicios/authServicios';

export const INFO_ROLES = {
    Admin: {
        nombre: 'Administrador General',
        icono: '👑',
        color: '#6366f1',
        colorTexto: '#4338ca',
        bg: '#ede9fe',
        subtitulo: 'Acceso Total al Sistema',
        descripcion: 'Gestión global de la agencia: Finanzas, Estadísticas, Catálogo, Ventas, Usuarios y Auditoría'
    },
    Operador: {
        nombre: 'Coordinador de Operaciones',
        icono: '🧭',
        color: '#0284c7',
        colorTexto: '#0369a1',
        bg: '#e0f2fe',
        subtitulo: 'Logística y Operaciones en Ruta',
        descripcion: 'Planificación de Viajes, Catálogo, Pasajeros, Incidencias en Ruta y Costos Operativos'
    },
    Vendedor: {
        nombre: 'Asesor Comercial',
        icono: '💼',
        color: '#059669',
        colorTexto: '#15803d',
        bg: '#dcfce7',
        subtitulo: 'Ventas y Atención al Cliente',
        descripcion: 'Atención al viajero, Clientes (Cédula/Pasaporte/Menores), Reservas, Manifiesto y Pagos Multidivisa'
    }
};

const GRUPOS = [
    {
        titulo: 'General',
        roles: ['Admin'],
        items: [
            { id: 'dashboard', label: 'Estadísticas', icono: LayoutDashboard, componente: Dashboard, roles: ['Admin'] }
        ]
    },
    {
        titulo: 'Catálogo & Rutas',
        roles: ['Admin', 'Operador', 'Vendedor'],
        items: [
            { id: 'catalogo', label: 'Catálogo Turístico', icono: MapPin, componente: Catalogo, roles: ['Admin', 'Operador', 'Vendedor'] },
            { id: 'viajes', label: 'Viajes Programados', icono: Plane, componente: Viajes, roles: ['Admin', 'Operador', 'Vendedor'] }
        ]
    },
    {
        titulo: 'Ventas & Pasajeros',
        roles: ['Admin', 'Operador', 'Vendedor'],
        items: [
            { id: 'clientes', label: 'Clientes', icono: Users, componente: Clientes, roles: ['Admin', 'Operador', 'Vendedor'] },
            { id: 'reservas', label: 'Reservas', icono: CalendarCheck, componente: Reservas, roles: ['Admin', 'Operador', 'Vendedor'] },
            { id: 'integrantes', label: 'Manifiesto de Abordaje', icono: UserPlus, componente: Integrantes, roles: ['Admin', 'Operador', 'Vendedor'] },
            { id: 'pagos', label: 'Pagos & Cobranzas', icono: CreditCard, componente: Pagos, roles: ['Admin', 'Vendedor'] }
        ]
    },
    {
        titulo: 'Finanzas & Rentabilidad',
        roles: ['Admin', 'Operador'],
        items: [
            { id: 'control-financiero', label: 'Control Financiero', icono: TrendingUp, componente: ControlFinanciero, roles: ['Admin', 'Operador'] }
        ]
    },
    {
        titulo: 'Administración & Sistema',
        roles: ['Admin'],
        items: [
            { id: 'usuarios', label: 'Usuarios y Roles', icono: UserCog, componente: Usuarios, roles: ['Admin'] },
            { id: 'procesos', label: 'Procesos', icono: Workflow, componente: Procesos, roles: ['Admin'] },
            { id: 'auditoria', label: 'Auditoría', icono: ShieldCheck, componente: Auditoria, roles: ['Admin'] }
        ]
    }
];

const TODAS = GRUPOS.flatMap(g => g.items);

const leerUsuario = (token) => {
    try { return jwtDecode(token); } catch { return {}; }
};

export default function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [seccionActiva, setSeccionActiva] = useState('dashboard');
    const [rolSimulado, setRolSimulado] = useState(null);

    const usuario = token ? leerUsuario(token) : {};
    const rolReal = usuario.rol || 'Vendedor';
    const rolEfectivo = rolReal === 'Admin' && rolSimulado ? rolSimulado : rolReal;
    const esAdminEfectivo = rolEfectivo === 'Admin';
    const esOperadorEfectivo = rolEfectivo === 'Operador';
    const esVendedorEfectivo = rolEfectivo === 'Vendedor';

    const infoRolActual = INFO_ROLES[rolEfectivo] || INFO_ROLES.Vendedor;

    // Filtrar grupos y secciones según el rol efectivo
    const gruposVisibles = GRUPOS
        .filter(g => !g.roles || g.roles.includes(rolEfectivo))
        .map(g => ({
            ...g,
            items: g.items.filter(item => !item.roles || item.roles.includes(rolEfectivo))
        }))
        .filter(g => g.items.length > 0);

    const itemsPermitidos = gruposVisibles.flatMap(g => g.items);

    // Si la sección activa actual no es permitida para el rol, redirigir al área principal del rol
    useEffect(() => {
        if (!token) return;
        const permitido = itemsPermitidos.some(s => s.id === seccionActiva);
        if (!permitido && itemsPermitidos.length > 0) {
            if (esAdminEfectivo) setSeccionActiva('dashboard');
            else if (esOperadorEfectivo) setSeccionActiva('viajes');
            else setSeccionActiva('reservas');
        }
    }, [rolEfectivo, seccionActiva, token]);

    if (!token) {
        return <Login onLoginSuccess={() => setToken(localStorage.getItem('token'))} />;
    }

    const seccion = itemsPermitidos.find(s => s.id === seccionActiva) || itemsPermitidos[0] || TODAS[0];
    const Componente = seccion.componente;

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-logo"><TreePalm size={22} /></div>
                    <div>
                        <div className="brand-title">Viajes La Nena</div>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                marginTop: 3,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: infoRolActual.bg,
                                color: infoRolActual.colorTexto,
                                fontWeight: 700,
                                fontSize: '0.72rem'
                            }}
                        >
                            <span>{infoRolActual.icono}</span>
                            <span>{infoRolActual.nombre}</span>
                        </div>
                    </div>
                </div>

                {gruposVisibles.map((grupo) => (
                    <div key={grupo.titulo} className="nav-group">
                        <div className="nav-group-title">{grupo.titulo}</div>
                        {grupo.items.map(({ id, label, icono: Icono }) => (
                            <button
                                key={id}
                                className={`nav-item ${seccionActiva === id ? 'active' : ''}`}
                                onClick={() => setSeccionActiva(id)}
                            >
                                <Icono size={18} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                ))}

                <div className="sidebar-footer">
                    <button className="btn btn-logout" onClick={() => { logout(); setToken(null); setRolSimulado(null); }}>
                        <LogOut size={18} /> <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            <div className="main">
                <header className="topbar">
                    <div>
                        <div className="topbar-title">{seccion.label}</div>
                        <div className="topbar-sub">
                            {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <WidgetTasasTopBar />

                        {rolReal === 'Admin' && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#f8fafc',
                                    border: '1px solid var(--border)',
                                    borderRadius: 999,
                                    padding: '4px 12px',
                                    fontSize: '0.78rem'
                                }}
                                title="Cambia en vivo entre los 3 roles para verificar qué ve y qué puede hacer cada uno"
                            >
                                <Shield size={14} color={infoRolActual.color} />
                                <span style={{ fontWeight: 700, color: '#475569' }}>Simular Rol:</span>
                                <select
                                    value={rolEfectivo}
                                    onChange={(e) => setRolSimulado(e.target.value)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        fontWeight: 700,
                                        color: infoRolActual.colorTexto,
                                        cursor: 'pointer',
                                        outline: 'none',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    <option value="Admin">👑 Administrador (Acceso Total)</option>
                                    <option value="Operador">🧭 Operador (Logística & Operaciones)</option>
                                    <option value="Vendedor">💼 Vendedor (Ventas & Clientes)</option>
                                </select>
                            </div>
                        )}

                        <div className="user-chip">
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{usuario.sub}</div>
                                <div style={{ fontSize: '0.74rem', color: infoRolActual.colorTexto, fontWeight: 700 }}>
                                    {infoRolActual.icono} {rolEfectivo}
                                </div>
                            </div>
                            <div
                                className="avatar"
                                style={{ background: infoRolActual.color, color: '#fff' }}
                            >
                                {(usuario.sub || 'U')[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <section className="content" key={seccion.id}>
                    <Componente
                        rol={rolEfectivo}
                        esAdmin={esAdminEfectivo}
                        esOperador={esOperadorEfectivo}
                        esVendedor={esVendedorEfectivo}
                    />
                </section>
            </div>
            <AsistenteIA seccionActiva={seccionActiva} />
        </div>
    );
}
