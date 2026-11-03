import { useEffect, useState } from 'react';
import { Plus, X, Shield, Compass, Briefcase, CheckCircle2 } from 'lucide-react';
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from '../servicios/authServicios';
import { PageHeader, EstadoActivo, BotonBaja, BotonEditar, Vacio, BadgeRol, mensajeError } from '../componentes/UI';

const FORM_INICIAL = { nombre: '', correo_electronico: '', contrasena: '', rol: 'Vendedor' };

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [form, setForm] = useState(FORM_INICIAL);

    const cargarUsuarios = async () => {
        try {
            setUsuarios(await obtenerUsuarios());
        } catch (err) {
            setError('Error al obtener la lista de usuarios.');
        }
    };

    useEffect(() => { cargarUsuarios(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const iniciarEdicion = (u) => {
        setIdEditando(u.id_usuario);
        setForm({
            nombre: u.nombre || '',
            correo_electronico: u.correo_electronico || '',
            contrasena: '',
            rol: u.rol || 'Vendedor'
        });
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarFormulario = () => {
        setIdEditando(null);
        setForm(FORM_INICIAL);
        setMostrarForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (idEditando) {
                const payload = {
                    nombre: form.nombre.trim(),
                    correo_electronico: form.correo_electronico.trim(),
                    rol: form.rol
                };
                if (form.contrasena.trim()) {
                    payload.contrasena = form.contrasena;
                }
                await actualizarUsuario(idEditando, payload);
            } else {
                await crearUsuario(form);
            }
            cancelarFormulario();
            cargarUsuarios();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el usuario.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este usuario? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarUsuario(id);
                cargarUsuarios();
            } catch (err) {
                alert('No se pudo desactivar el usuario.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarUsuario(id, { is_active: true });
            cargarUsuarios();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el usuario.'));
        }
    };

    return (
        <div className="fade-in">
            <PageHeader titulo="Usuarios y Roles del Sistema" subtitulo="Administración de cuentas con seguridad RBAC (3 Roles)">
                <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Empleado</>}
                </button>
            </PageHeader>

            {/* Matriz de Roles Informativa */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ borderTop: '4px solid #6366f1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.25rem' }}>👑</span>
                        <strong style={{ fontSize: '0.98rem', color: '#4338ca' }}>Administrador (Admin)</strong>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
                        Dirección general, finanzas netas y auditoría integral del sistema.
                    </p>
                    <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Acceso a todas las estadísticas y KPIs</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Finanzas completas (Ganancias netas)</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Gestión y creación de Usuarios y Roles</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Auditoría de acciones y bajas definitivas</div>
                    </div>
                </div>

                <div className="card" style={{ borderTop: '4px solid #0284c7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.25rem' }}>🧭</span>
                        <strong style={{ fontSize: '0.98rem', color: '#0369a1' }}>Operador (Operaciones)</strong>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
                        Logística de viajes, itinerarios, transporte y resolución en ruta.
                    </p>
                    <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Creación y edición de Viajes, Paquetes y Destinos</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Manifiesto de Pasajeros y listas de viaje</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Registro de Inconvenientes / Incidencias en ruta</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Registro de Costos de Viaje operativos</div>
                    </div>
                </div>

                <div className="card" style={{ borderTop: '4px solid #059669' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.25rem' }}>💼</span>
                        <strong style={{ fontSize: '0.98rem', color: '#15803d' }}>Vendedor (Comercial)</strong>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
                        Atención comercial, emisión de reservaciones y cobranza multimoneda.
                    </p>
                    <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Registro de Clientes (Cédula, Pasaporte, Menores)</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Creación de Reservas y asignación de asientos</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Registro de Pagos y Liquidación (USD, Bs BCV, COP)</div>
                        <div><CheckCircle2 size={13} color="#059669" style={{ display: 'inline', marginRight: 5 }} />Consulta de Catálogo y cotización rápida</div>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div className="card-title">{idEditando ? `Editar Cuenta #${idEditando}` : 'Registrar Nuevo Empleado'}</div>
                    </div>
                    <div className="form-grid">
                        <div className="field">
                            <label>Nombre completo (solo letras)</label>
                            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Carlos Mendoza" required />
                        </div>
                        <div className="field">
                            <label>Rol Asignado</label>
                            <select name="rol" value={form.rol} onChange={handleChange} required>
                                <option value="Admin">👑 Administrador (Acceso Total: Finanzas, Estadísticas, Usuarios)</option>
                                <option value="Operador">🧭 Operador (Logística: Viajes, Catálogo, Manifiesto, Incidencias, Costos)</option>
                                <option value="Vendedor">💼 Vendedor (Comercial: Clientes, Reservas, Pasajeros, Pagos)</option>
                            </select>
                        </div>
                        <div className="field">
                            <label>Correo electrónico (Usuario para inicio de sesión)</label>
                            <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={handleChange} placeholder="usuario@viajesnena.com" required />
                        </div>
                        <div className="field">
                            <label>{idEditando ? 'Nueva contraseña (opcional, deja vacío para mantener)' : 'Contraseña de acceso'}</label>
                            <input type="password" name="contrasena" value={form.contrasena} onChange={handleChange} placeholder="••••••••" required={!idEditando} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Cuenta' : 'Crear Cuenta'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header"><div className="card-title">Cuentas Registradas en el Sistema</div></div>
                {usuarios.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre del Empleado</th>
                                    <th>Correo Electrónico</th>
                                    <th>Rol Asignado</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map((u) => (
                                    <tr key={u.id_usuario} className={u.is_active ? '' : 'inactive'}>
                                        <td>#{u.id_usuario}</td>
                                        <td className="cell-main">{u.nombre}</td>
                                        <td>{u.correo_electronico}</td>
                                        <td><BadgeRol rol={u.rol} /></td>
                                        <td><EstadoActivo activo={u.is_active} /></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <BotonEditar onClick={() => iniciarEdicion(u)} titulo="Editar cuenta" />
                                            <BotonBaja
                                                activo={u.is_active}
                                                onClick={() => handleEliminar(u.id_usuario)}
                                                onRestaurar={() => handleRestaurar(u.id_usuario)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
