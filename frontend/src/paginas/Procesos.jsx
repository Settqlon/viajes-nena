import { useEffect, useState } from 'react';
import { Plus, X, PlayCircle, CheckCircle2, PauseCircle } from 'lucide-react';
import { obtenerProcesos, crearProceso, actualizarProceso, eliminarProceso } from '../servicios/procesosServicios';
import { obtenerUsuarios } from '../servicios/authServicios';
import {
    PageHeader, Buscador, EstadoActivo, BotonBaja, BotonEditar, Vacio, Badge, StatCard, formatoFecha, mensajeError
} from '../componentes/UI';

const FORM_INICIAL = { id_usu: '', nom_pro: '', fec_inicio: '', fec_fin: '', est_pro: 'en ejecución', det_pro: '' };
const TIPO_EST = { 'en ejecución': 'info', 'completado': 'success', 'pausado': 'warning' };

export default function Procesos() {
    const [procesos, setProcesos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstatus, setFiltroEstatus] = useState('todos');
    const [form, setForm] = useState(FORM_INICIAL);

    const cargarDatos = async () => {
        try {
            const [pData, uData] = await Promise.all([obtenerProcesos(), obtenerUsuarios()]);
            setProcesos(pData);
            setUsuarios(uData);
        } catch (err) {
            setError('Error al obtener la lista de procesos.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const iniciarEdicion = (p) => {
        setIdEditando(p.id_pro);
        setForm({
            id_usu: String(p.id_usu),
            nom_pro: p.nom_pro || '',
            fec_inicio: p.fec_inicio || '',
            fec_fin: p.fec_fin || '',
            est_pro: p.est_pro || 'en ejecución',
            det_pro: p.det_pro || ''
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
        if (!form.id_usu) {
            alert('Selecciona un usuario responsable.');
            return;
        }
        try {
            const payload = {
                id_usu: parseInt(form.id_usu),
                nom_pro: form.nom_pro.trim(),
                fec_inicio: form.fec_inicio,
                fec_fin: form.fec_fin,
                est_pro: form.est_pro,
                det_pro: form.det_pro || null
            };
            if (idEditando) {
                await actualizarProceso(idEditando, payload);
            } else {
                await crearProceso(payload);
            }
            cancelarFormulario();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el proceso.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este proceso? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarProceso(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar el proceso.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarProceso(id, { act_pro: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el proceso.'));
        }
    };

    const nombreUsuario = (id) => usuarios.find(u => u.id_usuario === id)?.nombre || `Usuario #${id}`;

    const activos = procesos.filter(p => p.act_pro);
    const enEjecucion = activos.filter(p => p.est_pro === 'en ejecución').length;
    const completados = activos.filter(p => p.est_pro === 'completado').length;
    const pausados = activos.filter(p => p.est_pro === 'pausado').length;

    const q = busqueda.trim().toLowerCase();
    const filtrados = procesos.filter(p => {
        if (filtroEstatus !== 'todos' && p.est_pro !== filtroEstatus) return false;
        if (!q) return true;
        return `${p.id_pro} ${p.nom_pro} ${p.det_pro || ''} ${nombreUsuario(p.id_usu)}`.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Procesos Operativos y Logística"
                subtitulo="Cada viaje programado genera automáticamente su proceso logístico de transporte, hospedaje y embarque"
            >
                <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Proceso</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid grid-3" style={{ marginBottom: 20 }}>
                <StatCard icono={PlayCircle} color="primary" etiqueta="En ejecución" valor={enEjecucion} pie="Viajes y tareas en curso" />
                <StatCard icono={CheckCircle2} color="success" etiqueta="Completados" valor={completados} pie="Operaciones finalizadas" />
                <StatCard icono={PauseCircle} color="accent" etiqueta="Pausados" valor={pausados} pie="En espera o reprogramación" />
            </div>

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div className="card-title">{idEditando ? `Editar Proceso #${idEditando}` : 'Registrar Proceso Operativo'}</div>
                    </div>
                    <div className="form-grid">
                        <div className="field">
                            <label>Nombre del proceso</label>
                            <input name="nom_pro" value={form.nom_pro} onChange={handleChange} placeholder="Ej. Logística Viaje — Contratación de unidades" required />
                        </div>
                        <div className="field">
                            <label>Usuario responsable</label>
                            <div className="viaje-destino-pills" style={{ marginTop: 4 }}>
                                {usuarios.filter(u => u.is_active).map(u => (
                                    <button
                                        key={u.id_usuario}
                                        type="button"
                                        className={`viaje-pill ${parseInt(form.id_usu) === u.id_usuario ? 'active' : ''}`}
                                        onClick={() => setForm({ ...form, id_usu: String(u.id_usuario) })}
                                    >
                                        {u.nombre}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="field">
                            <label>Fecha inicio</label>
                            <input type="date" name="fec_inicio" value={form.fec_inicio} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label>Fecha fin</label>
                            <input type="date" name="fec_fin" value={form.fec_fin} onChange={handleChange} required />
                        </div>
                        <div className="field full">
                            <label>Estatus</label>
                            <div className="viaje-destino-pills">
                                {Object.keys(TIPO_EST).map(e => (
                                    <button
                                        key={e}
                                        type="button"
                                        className={`viaje-pill ${form.est_pro === e ? 'active' : ''}`}
                                        onClick={() => setForm({ ...form, est_pro: e })}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="field full">
                            <label>Detalles operativos</label>
                            <textarea name="det_pro" value={form.det_pro} onChange={handleChange} placeholder="Descripción de unidades asignadas, hospedaje, guías o permisología..." />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={cancelarFormulario}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Proceso' : 'Guardar Proceso'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Listado de procesos ({filtrados.length})</div>
                        <div className="card-sub">Sincronizados automáticamente con el estatus de los viajes programados</div>
                    </div>
                    <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar proceso, viaje o responsable..." />
                </div>

                <div className="viaje-destino-pills" style={{ marginBottom: 14 }}>
                    <button
                        type="button"
                        className={`viaje-pill ${filtroEstatus === 'todos' ? 'active' : ''}`}
                        onClick={() => setFiltroEstatus('todos')}
                    >
                        Todos ({procesos.length})
                    </button>
                    {Object.keys(TIPO_EST).map(est => (
                        <button
                            key={est}
                            type="button"
                            className={`viaje-pill ${filtroEstatus === est ? 'active' : ''}`}
                            onClick={() => setFiltroEstatus(est)}
                        >
                            {est} ({procesos.filter(p => p.est_pro === est).length})
                        </button>
                    ))}
                </div>

                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>ID</th><th>Proceso Operativo</th><th>Responsable</th><th>Inicio / Fin</th><th>Estatus</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {filtrados.map((p) => (
                                    <tr key={p.id_pro} className={p.act_pro ? '' : 'inactive'}>
                                        <td>#{p.id_pro}</td>
                                        <td>
                                            <div className="cell-main">{p.nom_pro}</div>
                                            <div className="cell-sub">{p.det_pro || 'Sin detalles'}</div>
                                        </td>
                                        <td>{nombreUsuario(p.id_usu)}</td>
                                        <td>{formatoFecha(p.fec_inicio + 'T00:00:00')} → {formatoFecha(p.fec_fin + 'T00:00:00')}</td>
                                        <td><Badge tipo={TIPO_EST[p.est_pro] || 'neutral'}>{p.est_pro}</Badge></td>
                                        <td><EstadoActivo activo={p.act_pro} /></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <BotonEditar onClick={() => iniciarEdicion(p)} titulo="Editar proceso" />
                                            <BotonBaja
                                                activo={p.act_pro}
                                                onClick={() => handleEliminar(p.id_pro)}
                                                onRestaurar={() => handleRestaurar(p.id_pro)}
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
