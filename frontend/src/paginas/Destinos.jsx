import { useEffect, useState } from 'react';
import { Plus, X, MapPin } from 'lucide-react';
import { obtenerDestinos, crearDestino, actualizarDestino, eliminarDestino } from '../servicios/destinosServicios';
import { PageHeader, Buscador, EstadoActivo, BotonBaja, BotonEditar, Vacio, formatoMoneda, mensajeError } from '../componentes/UI';

const FORM_INICIAL = { nombre_destino: '', descripcion: '', precio_base: '' };

export default function Destinos({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const puedeGestionar = esAdmin || esOperador;
    const [destinos, setDestinos] = useState([]);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [form, setForm] = useState(FORM_INICIAL);

    const cargarDestinos = async () => {
        try {
            setDestinos(await obtenerDestinos());
        } catch (err) {
            setError('Error al obtener la lista de destinos.');
        }
    };

    useEffect(() => { cargarDestinos(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const iniciarEdicion = (d) => {
        setIdEditando(d.id_destino);
        setForm({
            nombre_destino: d.nombre_destino || '',
            descripcion: d.descripcion || '',
            precio_base: String(d.precio_base)
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
            const payload = {
                nombre_destino: form.nombre_destino.trim(),
                descripcion: form.descripcion.trim() || null,
                precio_base: parseFloat(form.precio_base)
            };
            if (idEditando) {
                await actualizarDestino(idEditando, payload);
            } else {
                await crearDestino(payload);
            }
            cancelarFormulario();
            cargarDestinos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el destino.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este destino? Podrás restaurarlo cuando quieras.')) {
            try {
                await eliminarDestino(id);
                cargarDestinos();
            } catch (err) {
                alert('No se pudo desactivar el destino.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarDestino(id, { is_active: true });
            cargarDestinos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el destino.'));
        }
    };

    const filtrados = destinos.filter(d => d.nombre_destino.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <div className="fade-in">
            <PageHeader titulo="Destinos Turísticos" subtitulo={`${destinos.filter(d => d.is_active).length} destinos activos`}>
                {puedeGestionar ? (
                    <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                        {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Destino</>}
                    </button>
                ) : (
                    <span style={{ fontSize: '0.82rem', padding: '6px 12px', background: '#f1f5f9', borderRadius: 8, color: '#475569', fontWeight: 600 }}>
                        👁️ Catálogo para Cotización
                    </span>
                )}
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div className="card-title">{idEditando ? `Editar Destino #${idEditando}` : 'Registrar Destino'}</div>
                    </div>
                    <div className="form-grid">
                        <div className="field">
                            <label>Nombre del destino</label>
                            <input name="nombre_destino" value={form.nombre_destino} onChange={handleChange} placeholder="Ej. Los Roques" required />
                        </div>
                        <div className="field">
                            <label>Precio base por viajero ($)</label>
                            <input type="number" step="0.01" name="precio_base" value={form.precio_base} onChange={handleChange} placeholder="0.00" required />
                        </div>
                        <div className="field full">
                            <label>Descripción</label>
                            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Describe el destino..." />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Destino' : 'Guardar Destino'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Listado de destinos</div>
                    <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar destino..." />
                </div>
                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>ID</th><th>Destino</th><th>Precio base</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {filtrados.map((d) => (
                                    <tr key={d.id_destino} className={d.is_active ? '' : 'inactive'}>
                                        <td>#{d.id_destino}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                <div className="stat-icon c-accent" style={{ width: 38, height: 38 }}><MapPin size={18} /></div>
                                                <div>
                                                    <div className="cell-main">{d.nombre_destino}</div>
                                                    <div className="cell-sub">{d.descripcion || 'Sin descripción'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="money">{formatoMoneda(d.precio_base)}</td>
                                        <td><EstadoActivo activo={d.is_active} /></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {puedeGestionar ? (
                                                <>
                                                    <BotonEditar onClick={() => iniciarEdicion(d)} titulo="Editar destino" />
                                                    {esAdmin && (
                                                        <BotonBaja
                                                            activo={d.is_active}
                                                            onClick={() => handleEliminar(d.id_destino)}
                                                            onRestaurar={() => handleRestaurar(d.id_destino)}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Disponible</span>
                                            )}
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
