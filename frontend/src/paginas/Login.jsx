import { useState } from 'react';
import { TreePalm, Mail, Lock, LogIn, Shield, Compass, Briefcase } from 'lucide-react';
import { login } from '../servicios/authServicios';

const USUARIOS_DEMO = [
    {
        rol: 'Admin',
        etiqueta: '👑 Administrador',
        subtitulo: 'Acceso total y finanzas',
        correo: 'admin@viajesnena.com',
        clave: 'admin12345',
        color: '#6366f1',
        bg: '#eef2ff'
    },
    {
        rol: 'Operador',
        etiqueta: '🧭 Operador',
        subtitulo: 'Viajes, logística y ruta',
        correo: 'operador@viajesnena.com',
        clave: 'operador12345',
        color: '#0284c7',
        bg: '#e0f2fe'
    },
    {
        rol: 'Vendedor',
        etiqueta: '💼 Vendedor',
        subtitulo: 'Clientes, reservas y pagos',
        correo: 'vendedor@viajesnena.com',
        clave: 'vendedor12345',
        color: '#059669',
        bg: '#d1fae5'
    }
];

export default function Login({ onLoginSuccess }) {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setCargando(true);
        try {
            await login(correo.trim(), password.trim());
            onLoginSuccess();
        } catch (err) {
            setError('Credenciales incorrectas o problema de conexión.');
        } finally {
            setCargando(false);
        }
    };

    const cargarCredenciales = (u) => {
        setCorreo(u.correo);
        setPassword(u.clave);
        setError('');
    };

    return (
        <div className="login-page">
            <div className="login-hero">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="brand-logo"><TreePalm size={22} /></div>
                    <strong style={{ fontSize: '1.1rem' }}>Viajes La Nena</strong>
                </div>
                <div>
                    <h1>Gestiona cada viaje,<br />cada cliente y cada ganancia.</h1>
                    <p style={{ marginTop: 18 }}>
                        Plataforma integral con control de acceso por 3 roles especializados:
                        <strong> Administrador</strong>, <strong>Operador</strong> y <strong>Vendedor</strong>.
                    </p>
                </div>
                <div className="login-features">
                    <div><strong>3</strong><span>Roles definidos</span></div>
                    <div><strong>JWT</strong><span>Seguridad RBAC</span></div>
                    <div><strong>24/7</strong><span>Tasas en vivo</span></div>
                </div>
            </div>

            <div className="login-form-wrap">
                <form className="login-form fade-in" onSubmit={handleSubmit}>
                    <h2>Bienvenido de nuevo</h2>
                    <p className="page-sub" style={{ marginBottom: 20 }}>Ingresa tus credenciales para acceder al sistema</p>

                    {/* Acceso Rápido por Roles para Evaluadores/Usuarios */}
                    <div style={{ marginBottom: 20, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Acceso Rápido por Rol:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {USUARIOS_DEMO.map((u) => (
                                <button
                                    key={u.rol}
                                    type="button"
                                    onClick={() => cargarCredenciales(u)}
                                    style={{
                                        border: correo === u.correo ? `2px solid ${u.color}` : '1px solid var(--border)',
                                        background: correo === u.correo ? u.bg : '#ffffff',
                                        borderRadius: 8,
                                        padding: '8px 6px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: u.color }}>{u.etiqueta}</div>
                                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>{u.subtitulo}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="field">
                        <label>Correo electrónico</label>
                        <div className="search" style={{ background: '#fbfcfe' }}>
                            <Mail size={16} color="#94a3b8" />
                            <input
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                placeholder="ej. admin@viajesnena.com"
                                required
                                style={{ flex: 1, padding: '11px 0' }}
                            />
                        </div>
                    </div>
                    <div className="field">
                        <label>Contraseña</label>
                        <div className="search" style={{ background: '#fbfcfe' }}>
                            <Lock size={16} color="#94a3b8" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ flex: 1, padding: '11px 0' }}
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={cargando} style={{ marginTop: 8 }}>
                        <LogIn size={18} /> {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
