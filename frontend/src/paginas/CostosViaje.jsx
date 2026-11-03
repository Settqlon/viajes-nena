import { useEffect, useState } from 'react';
import { Plus, X, Receipt, DollarSign } from 'lucide-react';
import { obtenerCostosViaje, crearCostoViaje, actualizarCostoViaje, eliminarCostoViaje } from '../servicios/costosViajeServicios';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { PageHeader, Buscador, EstadoActivo, BotonBaja, BotonEditar, Vacio, StatCard, SelectorViaje, formatoMoneda, formatoFecha, mensajeError } from '../componentes/UI';

const FORM_INICIAL = { id_viaje: '', descripcion: '', monto: '' };

export default function CostosViaje({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const [costos, setCostos] = useState([]);
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
            const [cData, vData, dData, pData] = await Promise.all([
                obtenerCostosViaje(), obtenerViajes(), obtenerDestinos(), obtenerPaquetes()
            ]);
            setCostos(cData);
            setViajes(vData);
            setDestinos(dData);
            setPaquetes(pData);
        } catch (err) {
            setError('Error al obtener los costos de viaje.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const iniciarEdicion = (c) => {
        setIdEditando(c.id_costo);
        setForm({
            id_viaje: String(c.id_viaje),
            descripcion: c.descripcion || '',
            monto: String(c.monto)
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
                monto: parseFloat(form.monto)
            };
            if (idEditando) {
                await actualizarCostoViaje(idEditando, payload);
            } else {
                await crearCostoViaje(payload);
            }
            cancelarFormulario();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el costo de viaje.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este costo? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarCostoViaje(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar el costo.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarCostoViaje(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el costo.'));
        }
    };

    const etiquetaViaje = (id) => {
        const v = viajes.find(v => v.id_viaje === id);
        if (!v) return `Viaje #${id}`;
        const d = destinos.find(d => d.id_destino === v.id_destino);
        return `#${id} ${d?.nombre_destino || ''} (${formatoFecha(v.fecha_salida + 'T00:00:00')})`;
    };

    const activos = costos.filter(c => c.is_active);
    const totalCostos = activos.reduce((s, c) => s + Number(c.monto), 0);
    const filtrados = costos.filter(c =>
        `${c.descripcion} ${etiquetaViaje(c.id_viaje)}`.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="fade-in">
            <PageHeader titulo="Costos de Viaje" subtitulo="Gastos operativos asociados a cada viaje">
                <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Registrar Costo</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid grid-2" style={{ marginBottom: 20 }}>
                <StatCard icono={DollarSign} color="accent" etiqueta="Total en costos" valor={formatoMoneda(totalCostos)} />
                <StatCard icono={Receipt} color="indigo" etiqueta="Gastos activos" valor={activos.length} />
            </div>

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div className="card-title">{idEditando ? `Editar Costo #${idEditando}` : 'Registrar Costo Operativo'}</div>
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
                            <label>Descripción del gasto</label>
                            <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Transporte, hospedaje, guía..." required />
                        </div>
                        <div className="field">
                            <label>Monto ($)</label>
                            <input type="number" step="0.01" name="monto" value={form.monto} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Costo' : 'Guardar Costo'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Listado de costos</div>
                    <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Descripción o viaje..." />
                </div>
                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>ID</th><th>Viaje</th><th>Descripción</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {filtrados.map((c) => (
                                    <tr key={c.id_costo} className={c.is_active ? '' : 'inactive'}>
                                        <td>#{c.id_costo}</td>
                                        <td className="cell-main">{etiquetaViaje(c.id_viaje)}</td>
                                        <td>{c.descripcion}</td>
                                        <td className="money">{formatoMoneda(c.monto)}</td>
                                        <td><EstadoActivo activo={c.is_active} /></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <BotonEditar onClick={() => iniciarEdicion(c)} titulo="Editar costo" />
                                            {esAdmin && (
                                                <BotonBaja
                                                    activo={c.is_active}
                                                    onClick={() => handleEliminar(c.id_costo)}
                                                    onRestaurar={() => handleRestaurar(c.id_costo)}
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
