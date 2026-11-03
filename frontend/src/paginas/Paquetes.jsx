import { useEffect, useState } from 'react';
import { Plus, X, MapPin, CheckCircle2 } from 'lucide-react';
import { obtenerPaquetes, crearPaquete, actualizarPaquete, eliminarPaquete } from "../servicios/paquetesServicios";
import { obtenerDestinos } from "../servicios/destinosServicios";
import { PageHeader, Buscador, EstadoActivo, BotonBaja, BotonEditar, Vacio, Badge, formatoMoneda, mensajeError } from '../componentes/UI';

const FORM_INICIAL = {
    id_destino: '', nombre_paquete: '', resumen: '', descripcion: '', incluye: '', no_incluye: '',
    duracion_dias: 1, duracion_noches: 0, precio_paquete: ''
};

export default function Paquetes({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const puedeGestionar = esAdmin || esOperador;
    const [paquetes, setPaquetes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [form, setForm] = useState(FORM_INICIAL);

    const cargarDatos = async () => {
        try {
            const [dataPaquetes, dataDestinos] = await Promise.all([obtenerPaquetes(), obtenerDestinos()]);
            setPaquetes(dataPaquetes);
            setDestinos(dataDestinos);
        } catch (err) {
            setError('Error al obtener la lista de paquetes.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const iniciarEdicion = (p) => {
        setIdEditando(p.id_paquete);
        setForm({
            id_destino: p.id_destino ? String(p.id_destino) : '',
            nombre_paquete: p.nombre_paquete || '',
            resumen: p.resumen || '',
            descripcion: p.descripcion || '',
            incluye: p.incluye || '',
            no_incluye: p.no_incluye || '',
            duracion_dias: p.duracion_dias || 1,
            duracion_noches: p.duracion_noches || 0,
            precio_paquete: String(p.precio_paquete)
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
                ...form,
                id_destino: form.id_destino ? parseInt(form.id_destino) : null,
                resumen: form.resumen || null,
                incluye: form.incluye || null,
                no_incluye: form.no_incluye || null,
                duracion_dias: parseInt(form.duracion_dias),
                duracion_noches: parseInt(form.duracion_noches),
                precio_paquete: parseFloat(form.precio_paquete)
            };
            if (idEditando) {
                await actualizarPaquete(idEditando, payload);
            } else {
                await crearPaquete(payload);
            }
            cancelarFormulario();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el paquete. Verifica que tengas rol de Administrador.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este paquete? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarPaquete(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar el paquete.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarPaquete(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el paquete.'));
        }
    };

    const nombreDestino = (id) => destinos.find(d => d.id_destino === id)?.nombre_destino || '—';
    const q = busqueda.trim().toLowerCase();
    const filtrados = paquetes.filter(p =>
        !q || `${p.nombre_paquete} ${nombreDestino(p.id_destino)} ${p.resumen || ''}`.toLowerCase().includes(q)
    );

    return (
        <div className="fade-in">
            <PageHeader titulo="Paquetes Turísticos" subtitulo={`${paquetes.filter(p => p.is_active).length} paquetes disponibles`}>
                {puedeGestionar ? (
                    <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                        {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Paquete</>}
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
                        <div className="card-title">{idEditando ? `Editar Paquete #${idEditando}` : 'Registrar Paquete'}</div>
                    </div>
                    <div className="form-grid">
                        <div className="field full">
                            <label>Seleccionar Destino del Paquete</label>
                            <div className="viaje-destino-pills">
                                <button
                                    type="button"
                                    className={`viaje-pill ${!form.id_destino ? 'active' : ''}`}
                                    onClick={() => setForm({ ...form, id_destino: '' })}
                                >
                                    Sin destino específico
                                </button>
                                {destinos.filter(d => d.is_active).map(d => (
                                    <button
                                        key={d.id_destino}
                                        type="button"
                                        className={`viaje-pill ${parseInt(form.id_destino) === d.id_destino ? 'active' : ''}`}
                                        onClick={() => setForm({ ...form, id_destino: String(d.id_destino) })}
                                    >
                                        <MapPin size={12} /> {d.nombre_destino}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="field">
                            <label>Nombre del paquete</label>
                            <input name="nombre_paquete" value={form.nombre_paquete} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label>Precio fijo por viajero ($)</label>
                            <input type="number" step="0.01" name="precio_paquete" value={form.precio_paquete} onChange={handleChange} required />
                        </div>
                        <div className="field full">
                            <label>Resumen</label>
                            <input name="resumen" value={form.resumen} onChange={handleChange} placeholder="Frase corta del paquete" />
                        </div>
                        <div className="field full">
                            <label>Descripción</label>
                            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label>Incluye</label>
                            <input name="incluye" value={form.incluye} onChange={handleChange} placeholder="Traslados, hotel..." />
                        </div>
                        <div className="field">
                            <label>No incluye</label>
                            <input name="no_incluye" value={form.no_incluye} onChange={handleChange} placeholder="Gastos personales..." />
                        </div>
                        <div className="field">
                            <label>Días / Noches</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input type="number" name="duracion_dias" value={form.duracion_dias} onChange={handleChange} min="1" required />
                                <input type="number" name="duracion_noches" value={form.duracion_noches} onChange={handleChange} min="0" required />
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Paquete' : 'Guardar Paquete'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Listado de paquetes</div>
                    <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar paquete o destino..." />
                </div>
                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>ID</th><th>Paquete</th><th>Destino</th><th>Duración</th><th>Precio / viajero</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {filtrados.map((p) => (
                                    <tr key={p.id_paquete} className={p.is_active ? '' : 'inactive'}>
                                        <td>#{p.id_paquete}</td>
                                        <td>
                                            <div className="cell-main">{p.nombre_paquete}</div>
                                            <div className="cell-sub">{p.resumen || p.descripcion}</div>
                                        </td>
                                        <td>{nombreDestino(p.id_destino)}</td>
                                        <td><Badge tipo="info">{p.duracion_dias}D / {p.duracion_noches}N</Badge></td>
                                        <td className="money">{formatoMoneda(p.precio_paquete)}</td>
                                        <td><EstadoActivo activo={p.is_active} /></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {puedeGestionar ? (
                                                <>
                                                    <BotonEditar onClick={() => iniciarEdicion(p)} titulo="Editar paquete" />
                                                    {esAdmin && (
                                                        <BotonBaja
                                                            activo={p.is_active}
                                                            onClick={() => handleEliminar(p.id_paquete)}
                                                            onRestaurar={() => handleRestaurar(p.id_paquete)}
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
