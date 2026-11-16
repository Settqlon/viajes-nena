import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
    LayoutDashboard, MapPin, Users, Plane, CalendarCheck, CreditCard, UserPlus,
    TrendingUp, Workflow, UserCog, ShieldCheck, LogOut, TreePalm,
    ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen
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
import { WidgetTasasTopBar } from './componentes/UI';
import { logout } from './servicios/authServicios';

const INFO_ROLES = {
    Admin: {
        nombre: 'Administrador',
        color: '#6366f1',
        colorTexto: '#4338ca',
        bg: '#ede9fe'
    },
    Operador: {
        nombre: 'Operador',
        color: '#0284c7',
        colorTexto: '#0369a1',
        bg: '#e0f2fe'
    },
    Vendedor: {
        nombre: 'Vendedor',
        color: '#059669',
        colorTexto: '#15803d',
        bg: '#dcfce7'
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
    const [sidebarColapsado, setSidebarColapsado] = useState(false);

    const usuario = token ? leerUsuario(token) : {};
    const rolEfectivo = usuario.rol || 'Vendedor';
    const esAdminEfectivo = rolEfectivo === 'Admin';
    const esOperadorEfectivo = rolEfectivo === 'Operador';
    const esVendedorEfectivo = rolEfectivo === 'Vendedor';

    const infoRolActual = INFO_ROLES[rolEfectivo] || INFO_ROLES.Vendedor;

    const gruposVisibles = GRUPOS
        .filter(g => !g.roles || g.roles.includes(rolEfectivo))
        .map(g => ({
            ...g,
            items: g.items.filter(item => !item.roles || item.roles.includes(rolEfectivo))
        }))
        .filter(g => g.items.length > 0);

    const itemsPermitidos = gruposVisibles.flatMap(g => g.items);

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
        <div className={`layout ${sidebarColapsado ? 'sidebar-collapsed' : ''}`}>
            <aside className={`sidebar ${sidebarColapsado ? 'collapsed' : ''}`}>
                <div
                    className="brand"
                    style={{
                        justifyContent: sidebarColapsado ? 'center' : 'space-between',
                        flexDirection: sidebarColapsado ? 'column' : 'row',
                        gap: sidebarColapsado ? 10 : 10
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="brand-logo"><TreePalm size={22} /></div>
                        {!sidebarColapsado && (
                            <div className="brand-info">
                                <div className="brand-title">Viajes La Nena</div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setSidebarColapsado(prev => !prev)}
                        title={sidebarColapsado ? 'Expandir menú' : 'Recoger menú'}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s'
                        }}
                    >
                        {sidebarColapsado ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {gruposVisibles.map((grupo) => (
                    <div key={grupo.titulo} className="nav-group">
                        {!sidebarColapsado && <div className="nav-group-title">{grupo.titulo}</div>}
                        {grupo.items.map(({ id, label, icono: Icono }) => (
                            <button
                                key={id}
                                className={`nav-item ${seccionActiva === id ? 'active' : ''}`}
                                onClick={() => setSeccionActiva(id)}
                                title={label}
                            >
                                <Icono size={19} />
                                {!sidebarColapsado && <span>{label}</span>}
                            </button>
                        ))}
                    </div>
                ))}

                <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                        type="button"
                        className="nav-item"
                        onClick={() => setSidebarColapsado(prev => !prev)}
                        title={sidebarColapsado ? 'Expandir menú' : 'Recoger menú'}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#cbd5e1',
                            justifyContent: sidebarColapsado ? 'center' : 'flex-start'
                        }}
                    >
                        {sidebarColapsado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                        {!sidebarColapsado && <span>Recoger Menú</span>}
                    </button>

                    <button
                        className="btn btn-logout"
                        onClick={() => { logout(); setToken(null); }}
                        title="Cerrar Sesión"
                    >
                        <LogOut size={18} />
                        {!sidebarColapsado && <span>Cerrar Sesión</span>}
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <WidgetTasasTopBar />

                        <div className="user-chip">
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{usuario.sub}</div>
                                <div style={{ fontSize: '0.75rem', color: infoRolActual.colorTexto, fontWeight: 700 }}>
                                    {infoRolActual.nombre}
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
        </div>
    );
}
