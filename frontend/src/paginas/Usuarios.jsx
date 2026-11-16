import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
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
        } catch {
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
            } catch {
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
            <PageHeader titulo="Usuarios y Roles" subtitulo="Administración de cuentas y permisos de personal">
                <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Empleado</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20, border: '1.5px solid var(--primary)' }}>
                    <div className="card-header">
                        <div className="card-title">{idEditando ? `Editar Cuenta #${idEditando}` : 'Registrar Nuevo Empleado'}</div>
                        <button type="button" className="btn btn-ghost" onClick={cancelarFormulario}>
                            <X size={16} />
                        </button>
                    </div>
                    <div className="form-grid">
                        <div className="field">
                            <label>Nombre completo</label>
                            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Carlos Mendoza" autoFocus required />
                        </div>
                        <div className="field">
                            <label>Rol Asignado</label>
                            <select name="rol" value={form.rol} onChange={handleChange} required>
                                <option value="Admin">Administrador</option>
                                <option value="Operador">Operador</option>
                                <option value="Vendedor">Vendedor</option>
                            </select>
                        </div>
                        <div className="field">
                            <label>Correo electrónico</label>
                            <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={handleChange} placeholder="usuario@viajesnena.com" required />
                        </div>
                        <div className="field">
                            <label>{idEditando ? 'Nueva contraseña (opcional)' : 'Contraseña de acceso'}</label>
                            <input type="password" name="contrasena" value={form.contrasena} onChange={handleChange} placeholder="••••••••" required={!idEditando} />
                        </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: 14 }}>
                        <button type="button" className="btn btn-ghost" onClick={cancelarFormulario}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Cuenta' : 'Crear Cuenta'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header"><div className="card-title">Cuentas Registradas ({usuarios.length})</div></div>
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
