import { useEffect, useState } from 'react';
import { Plus, X, TriangleAlert } from 'lucide-react';
import { obtenerInconvenientes, crearInconveniente, actualizarInconveniente, eliminarInconveniente } from '../servicios/inconvenientesServicios';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { PageHeader, Buscador, EstadoActivo, BotonBaja, BotonEditar, Vacio, StatCard, SelectorViaje, formatoMoneda, formatoFecha, mensajeError } from '../componentes/UI';

const FORM_INICIAL = { id_viaje: '', descripcion: '', monto_descontado: '' };

export default function Inconvenientes({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const [inconvenientes, setInconvenientes] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [form, setForm] = useState(FORM_INICIAL);

    const cargarDatos = async () => {
        try {
            const [incData, vData, dData, pData] = await Promise.all([
                obtenerInconvenientes(), obtenerViajes(), obtenerDestinos(), obtenerPaquetes()
            ]);
            setInconvenientes(incData);
            setViajes(vData);
            setDestinos(dData);
            setPaquetes(pData);
        } catch (err) {
            setError('Error al obtener la lista de inconvenientes.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const iniciarEdicion = (inc) => {
        setIdEditando(inc.id_inconveniente);
        setForm({
            id_viaje: String(inc.id_viaje),
            descripcion: inc.descripcion || '',
            monto_descontado: String(inc.monto_descontado)
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
        if (!form.id_viaje) {
            alert('Por favor selecciona un viaje.');
            return;
        }
        try {
            const payload = {
                id_viaje: parseInt(form.id_viaje),
                descripcion: form.descripcion.trim(),
                monto_descontado: parseFloat(form.monto_descontado)
            };
            if (idEditando) {
                await actualizarInconveniente(idEditando, payload);
            } else {
                await crearInconveniente(payload);
            }
            cancelarFormulario();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el inconveniente.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este inconveniente? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarInconveniente(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar el inconveniente.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarInconveniente(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el inconveniente.'));
        }
    };

    const etiquetaViaje = (id) => {
        const v = viajes.find(v => v.id_viaje === id);
        if (!v) return `Viaje #${id}`;
        const d = destinos.find(d => d.id_destino === v.id_destino);
        return `#${id} ${d?.nombre_destino || ''}`;
    };

    const activos = inconvenientes.filter(i => i.is_active);
    const totalDescontado = activos.reduce((s, i) => s + Number(i.monto_descontado), 0);
    const filtrados = inconvenientes.filter(i =>
        `${i.descripcion} ${etiquetaViaje(i.id_viaje)}`.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="fade-in">
            <PageHeader titulo="Inconvenientes" subtitulo="Incidencias y compensaciones reportadas en viajes">
                <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Reportar Inconveniente</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid grid-2" style={{ marginBottom: 20 }}>
                <StatCard icono={TriangleAlert} color="danger" etiqueta="Total descontado" valor={formatoMoneda(totalDescontado)} />
                <StatCard icono={TriangleAlert} color="warning" etiqueta="Incidencias activas" valor={activos.length} />
            </div>

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div className="card-title">{idEditando ? `Editar Inconveniente #${idEditando}` : 'Reportar Inconveniente'}</div>
                    </div>
                    <div className="form-grid">
                        <div className="field full">
                            <label>Viaje</label>
                            <SelectorViaje
                                viajes={viajes}
                                destinos={destinos}
                                paquetes={paquetes}
                                valor={form.id_viaje}
                                onChange={(id) => setForm({ ...form, id_viaje: id })}
                            />
                        </div>
                        <div className="field">
                            <label>Descripción</label>
                            <input name="descripcion" value={form.descripcion} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label>Monto descontado ($)</label>
                            <input type="number" step="0.01" name="monto_descontado" value={form.monto_descontado} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Inconveniente' : 'Guardar Inconveniente'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Listado de inconvenientes</div>
                    <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Descripción o viaje..." />
                </div>
                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>ID</th><th>Viaje</th><th>Descripción</th><th>Fecha</th><th>Descuento</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {filtrados.map((inc) => (
                                    <tr key={inc.id_inconveniente} className={inc.is_active ? '' : 'inactive'}>
                                        <td>#{inc.id_inconveniente}</td>
                                        <td className="cell-main">{etiquetaViaje(inc.id_viaje)}</td>
                                        <td>{inc.descripcion}</td>
                                        <td>{formatoFecha(inc.fecha_reporte)}</td>
                                        <td className="money" style={{ color: '#b91c1c' }}>-{formatoMoneda(inc.monto_descontado)}</td>
                                        <td><EstadoActivo activo={inc.is_active} /></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <BotonEditar onClick={() => iniciarEdicion(inc)} titulo="Editar inconveniente" />
                                            {esAdmin && (
                                                <BotonBaja
                                                    activo={inc.is_active}
                                                    onClick={() => handleEliminar(inc.id_inconveniente)}
                                                    onRestaurar={() => handleRestaurar(inc.id_inconveniente)}
                                                />
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
