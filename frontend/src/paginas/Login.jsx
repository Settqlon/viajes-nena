import { useState } from 'react';
import { TreePalm, Mail, Lock, LogIn } from 'lucide-react';
import { login } from '../servicios/authServicios';

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
        } catch {
            setError('Credenciales incorrectas o problema de conexión.');
        } finally {
            setCargando(false);
        }
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
                        Plataforma integral para administración de clientes, reservaciones,
                        manifiesto de abordaje y control financiero en tiempo real.
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
                    <h2>Bienvenido al Sistema</h2>
                    <p className="page-sub" style={{ marginBottom: 24 }}>Ingresa tus credenciales para acceder</p>

                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="field">
                        <label>Correo electrónico</label>
                        <div className="search" style={{ background: '#fbfcfe' }}>
                            <Mail size={16} color="#94a3b8" />
                            <input
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                placeholder="ej. usuario@viajesnena.com"
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
