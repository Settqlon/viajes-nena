import { useEffect, useState } from 'react';
import { Plus, X, MapPin, Package, CheckCircle2, DollarSign, Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { obtenerDestinos, crearDestino, actualizarDestino, eliminarDestino } from '../servicios/destinosServicios';
import { obtenerPaquetes, crearPaquete, actualizarPaquete, eliminarPaquete } from '../servicios/paquetesServicios';
import {
    PageHeader, Buscador, EstadoActivo, BotonEditar, BotonBaja, Vacio, Badge, formatoMoneda, mensajeError
} from '../componentes/UI';

const FORM_DESTINO_INICIAL = { nombre_destino: '', descripcion: '', precio_base: '' };
const FORM_PAQUETE_INICIAL = {
    id_destino: '', nombre_paquete: '', resumen: '', descripcion: '', incluye: '', no_incluye: '',
    duracion_dias: 1, duracion_noches: 0, precio_paquete: ''
};

export default function Catalogo({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const puedeGestionar = esAdmin || esOperador;
    const [tabActiva, setTabActiva] = useState('destinos'); // 'destinos' | 'paquetes'

    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // Estado Destinos
    const [mostrarFormDestino, setMostrarFormDestino] = useState(false);
    const [idEditandoDestino, setIdEditandoDestino] = useState(null);
    const [formDestino, setFormDestino] = useState(FORM_DESTINO_INICIAL);

    // Estado Paquetes
    const [mostrarFormPaquete, setMostrarFormPaquete] = useState(false);
    const [idEditandoPaquete, setIdEditandoPaquete] = useState(null);
    const [formPaquete, setFormPaquete] = useState(FORM_PAQUETE_INICIAL);
    const [filtroDestinoPaquetes, setFiltroDestinoPaquetes] = useState('todos');

    const cargarDatos = async () => {
        try {
            const [dData, pData] = await Promise.all([obtenerDestinos(), obtenerPaquetes()]);
            setDestinos(dData);
            setPaquetes(pData);
        } catch (err) {
            setError('Error al obtener los datos del catálogo.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    // Handlers Destino
    const handleDestinoChange = (e) => setFormDestino({ ...formDestino, [e.target.name]: e.target.value });

    const iniciarEdicionDestino = (d) => {
        setIdEditandoDestino(d.id_destino);
        setFormDestino({
            nombre_destino: d.nombre_destino || '',
            descripcion: d.descripcion || '',
            precio_base: String(d.precio_base)
        });
        setMostrarFormDestino(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarDestino = () => {
        setIdEditandoDestino(null);
        setFormDestino(FORM_DESTINO_INICIAL);
        setMostrarFormDestino(false);
    };

    const handleSubmitDestino = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                nombre_destino: formDestino.nombre_destino.trim(),
                descripcion: formDestino.descripcion.trim() || null,
                precio_base: parseFloat(formDestino.precio_base)
            };
            if (idEditandoDestino) {
                await actualizarDestino(idEditandoDestino, payload);
                setExito('Destino actualizado exitosamente.');
            } else {
                await crearDestino(payload);
                setExito('Destino creado exitosamente.');
            }
            cancelarDestino();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el destino.'));
        }
    };

    // Handlers Paquete
    const handlePaqueteChange = (e) => setFormPaquete({ ...formPaquete, [e.target.name]: e.target.value });

    const iniciarEdicionPaquete = (p) => {
        setIdEditandoPaquete(p.id_paquete);
        setFormPaquete({
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
        setMostrarFormPaquete(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarPaquete = () => {
        setIdEditandoPaquete(null);
        setFormPaquete(FORM_PAQUETE_INICIAL);
        setMostrarFormPaquete(false);
    };

    const handleSubmitPaquete = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                id_destino: formPaquete.id_destino ? parseInt(formPaquete.id_destino) : null,
                nombre_paquete: formPaquete.nombre_paquete.trim(),
                resumen: formPaquete.resumen.trim() || null,
                descripcion: formPaquete.descripcion.trim(),
                incluye: formPaquete.incluye.trim() || null,
                no_incluye: formPaquete.no_incluye.trim() || null,
                duracion_dias: parseInt(formPaquete.duracion_dias) || 1,
                duracion_noches: parseInt(formPaquete.duracion_noches) || 0,
                precio_paquete: parseFloat(formPaquete.precio_paquete)
            };
            if (idEditandoPaquete) {
                await actualizarPaquete(idEditandoPaquete, payload);
                setExito('Paquete actualizado exitosamente.');
            } else {
                await crearPaquete(payload);
                setExito('Paquete creado exitosamente.');
            }
            cancelarPaquete();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el paquete.'));
        }
    };

    const nombreDestino = (id) => destinos.find(d => d.id_destino === id)?.nombre_destino || `Destino #${id}`;

    const destinosFiltrados = destinos.filter(d =>
        !busqueda || d.nombre_destino.toLowerCase().includes(busqueda.toLowerCase()) ||
        (d.descripcion && d.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
    );

    const paquetesFiltrados = paquetes.filter(p => {
        const coincideDestino = filtroDestinoPaquetes === 'todos' || String(p.id_destino) === filtroDestinoPaquetes;
        const coincideTexto = !busqueda ||
            p.nombre_paquete.toLowerCase().includes(busqueda.toLowerCase()) ||
            nombreDestino(p.id_destino).toLowerCase().includes(busqueda.toLowerCase());
        return coincideDestino && coincideTexto;
    });

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Catálogo Turístico"
                subtitulo="Administra los destinos turísticos y paquetes promocionales de la agencia en un solo lugar"
            >
                {puedeGestionar && (
                    tabActiva === 'destinos' ? (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                if (mostrarFormDestino) cancelarDestino();
                                else setMostrarFormDestino(true);
                            }}
                        >
                            {mostrarFormDestino ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> + Nuevo Destino</>}
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                if (mostrarFormPaquete) cancelarPaquete();
                                else setMostrarFormPaquete(true);
                            }}
                        >
                            {mostrarFormPaquete ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> + Nuevo Paquete</>}
                        </button>
                    )
                )}
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">{exito}</div>}

            {/* SELECTOR DE PESTAÑAS DEL CATÁLOGO */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, borderBottom: '2px solid var(--border)', paddingBottom: 8 }}>
                <button
                    type="button"
                    className={`btn ${tabActiva === 'destinos' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', fontWeight: 700 }}
                    onClick={() => { setTabActiva('destinos'); setBusqueda(''); }}
                >
                    <MapPin size={16} /> Destinos Turísticos ({destinos.length})
                </button>
                <button
                    type="button"
                    className={`btn ${tabActiva === 'paquetes' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', fontWeight: 700 }}
                    onClick={() => { setTabActiva('paquetes'); setBusqueda(''); }}
                >
                    <Package size={16} /> Paquetes Turísticos ({paquetes.length})
                </button>
            </div>

            {/* ======================================================== */}
            {/* PESTAÑA 1: DESTINOS TURÍSTICOS                            */}
            {/* ======================================================== */}
            {tabActiva === 'destinos' && (
                <div className="fade-in">
                    {/* FORMULARIO DE DESTINO */}
                    {mostrarFormDestino && (
                        <form onSubmit={handleSubmitDestino} className="card fade-in" style={{ marginBottom: 20 }}>
                            <div className="card-header">
                                <div className="card-title">{idEditandoDestino ? `Editar Destino #${idEditandoDestino}` : 'Registrar Nuevo Destino'}</div>
                            </div>
                            <div className="form-grid">
                                <div className="field">
                                    <label>Nombre del Destino</label>
                                    <input
                                        name="nombre_destino"
                                        value={formDestino.nombre_destino}
                                        onChange={handleDestinoChange}
                                        placeholder="Ej. Isla de Margarita, Mérida, Los Roques"
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <label>Precio Base por Persona ($ USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="precio_base"
                                        value={formDestino.precio_base}
                                        onChange={handleDestinoChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div className="field full">
                                    <label>Descripción / Atractivos Turísticos</label>
                                    <textarea
                                        name="descripcion"
                                        value={formDestino.descripcion}
                                        onChange={handleDestinoChange}
                                        rows={2}
                                        placeholder="Playas paradisíacas, paseos guiados, clima templado..."
                                    />
                                </div>
                            </div>
                            <div className="form-actions" style={{ marginTop: 14 }}>
                                <button type="button" className="btn btn-ghost" onClick={cancelarDestino}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    {idEditandoDestino ? 'Actualizar Destino' : 'Guardar Destino'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* LISTA DE DESTINOS */}
                    {!mostrarFormDestino && (
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Destinos Registrados</div>
                                    <div className="card-sub">{destinosFiltrados.length} destinos disponibles</div>
                                </div>
                                <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar destino turístico..." />
                            </div>
                            {destinosFiltrados.length === 0 ? <Vacio texto="No se encontraron destinos" /> : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Destino</th>
                                                <th>Descripción</th>
                                                <th>Precio Base</th>
                                                <th>Paquetes</th>
                                                <th>Estado</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {destinosFiltrados.map(d => {
                                                const cantPaquetes = paquetes.filter(p => p.id_destino === d.id_destino && p.is_active).length;
                                                return (
                                                    <tr key={d.id_destino} className={d.is_active ? '' : 'inactive'}>
                                                        <td><strong>#{d.id_destino}</strong></td>
                                                        <td>
                                                            <div className="cell-main" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <MapPin size={15} color="var(--primary)" />
                                                                <strong>{d.nombre_destino}</strong>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="cell-sub" style={{ maxWidth: 300, whiteSpace: 'normal' }}>
                                                                {d.descripcion || 'Sin descripción'}
                                                            </div>
                                                        </td>
                                                        <td className="money" style={{ fontWeight: 800, color: '#047857' }}>
                                                            {formatoMoneda(d.precio_base)}
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost"
                                                                style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                                                                onClick={() => {
                                                                    setTabActiva('paquetes');
                                                                    setFiltroDestinoPaquetes(String(d.id_destino));
                                                                }}
                                                            >
                                                                <Package size={13} /> {cantPaquetes} paquete(s)
                                                            </button>
                                                        </td>
                                                        <td><EstadoActivo activo={d.is_active} /></td>
                                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <div style={{ display: 'inline-flex', gap: 6 }}>
                                                                {puedeGestionar && <BotonEditar onClick={() => iniciarEdicionDestino(d)} />}
                                                                {esAdmin && (
                                                                    <BotonBaja
                                                                        activo={d.is_active}
                                                                        onClick={async () => {
                                                                            if (confirm('¿Dar de baja este destino?')) {
                                                                                await eliminarDestino(d.id_destino);
                                                                                cargarDatos();
                                                                            }
                                                                        }}
                                                                        onRestaurar={async () => {
                                                                            await actualizarDestino(d.id_destino, { is_active: true });
                                                                            cargarDatos();
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* PESTAÑA 2: PAQUETES TURÍSTICOS                            */}
            {/* ======================================================== */}
            {tabActiva === 'paquetes' && (
                <div className="fade-in">
                    {/* FORMULARIO DE PAQUETE */}
                    {mostrarFormPaquete && (
                        <form onSubmit={handleSubmitPaquete} className="card fade-in" style={{ marginBottom: 20 }}>
                            <div className="card-header">
                                <div className="card-title">{idEditandoPaquete ? `Editar Paquete #${idEditandoPaquete}` : 'Registrar Nuevo Paquete Turístico'}</div>
                            </div>
                            <div className="form-grid">
                                <div className="field">
                                    <label>Destino Asociado</label>
                                    <select
                                        name="id_destino"
                                        value={formPaquete.id_destino}
                                        onChange={handlePaqueteChange}
                                        required
                                    >
                                        <option value="">-- Selecciona el destino --</option>
                                        {destinos.filter(d => d.is_active).map(d => (
                                            <option key={d.id_destino} value={d.id_destino}>{d.nombre_destino}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field">
                                    <label>Nombre del Paquete</label>
                                    <input
                                        name="nombre_paquete"
                                        value={formPaquete.nombre_paquete}
                                        onChange={handlePaqueteChange}
                                        placeholder="Ej. Plan Full Day, Margarita Todo Incluido"
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label>Precio del Paquete por Persona ($ USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="precio_paquete"
                                        value={formPaquete.precio_paquete}
                                        onChange={handlePaqueteChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label>Duración (Días / Noches)</label>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <input
                                            type="number"
                                            min="1"
                                            name="duracion_dias"
                                            value={formPaquete.duracion_dias}
                                            onChange={handlePaqueteChange}
                                            placeholder="Días"
                                            title="Cantidad de días"
                                            style={{ flex: 1 }}
                                            required
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            name="duracion_noches"
                                            value={formPaquete.duracion_noches}
                                            onChange={handlePaqueteChange}
                                            placeholder="Noches"
                                            title="Cantidad de noches"
                                            style={{ flex: 1 }}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="field full">
                                    <label>Descripción General</label>
                                    <textarea
                                        name="descripcion"
                                        value={formPaquete.descripcion}
                                        onChange={handlePaqueteChange}
                                        rows={2}
                                        placeholder="Detalla en qué consiste el paquete turístico..."
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label>Qué Incluye</label>
                                    <textarea
                                        name="incluye"
                                        value={formPaquete.incluye}
                                        onChange={handlePaqueteChange}
                                        rows={2}
                                        placeholder="Traslados, desayunos, paseos en lancha, hidratación..."
                                    />
                                </div>

                                <div className="field">
                                    <label>Qué No Incluye</label>
                                    <textarea
                                        name="no_incluye"
                                        value={formPaquete.no_incluye}
                                        onChange={handlePaqueteChange}
                                        rows={2}
                                        placeholder="Gastos personales, bebidas alcohólicas no descritas..."
                                    />
                                </div>
                            </div>
                            <div className="form-actions" style={{ marginTop: 14 }}>
                                <button type="button" className="btn btn-ghost" onClick={cancelarPaquete}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    {idEditandoPaquete ? 'Actualizar Paquete' : 'Guardar Paquete'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* LISTA DE PAQUETES */}
                    {!mostrarFormPaquete && (
                        <div className="card">
                            <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
                                <div>
                                    <div className="card-title">Paquetes Turísticos Disponibles</div>
                                    <div className="card-sub">{paquetesFiltrados.length} paquetes registrados</div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <select
                                        value={filtroDestinoPaquetes}
                                        onChange={(e) => setFiltroDestinoPaquetes(e.target.value)}
                                        style={{ fontSize: '0.84rem', padding: '6px 10px' }}
                                    >
                                        <option value="todos">Todos los destinos</option>
                                        {destinos.map(d => (
                                            <option key={d.id_destino} value={String(d.id_destino)}>{d.nombre_destino}</option>
                                        ))}
                                    </select>
                                    <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar paquete..." />
                                </div>
                            </div>
                            {paquetesFiltrados.length === 0 ? <Vacio texto="No se encontraron paquetes turísticos" /> : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Paquete Turístico</th>
                                                <th>Destino</th>
                                                <th>Duración</th>
                                                <th>Precio / pers.</th>
                                                <th>Estado</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paquetesFiltrados.map(p => (
                                                <tr key={p.id_paquete} className={p.is_active ? '' : 'inactive'}>
                                                    <td><strong>#{p.id_paquete}</strong></td>
                                                    <td>
                                                        <div className="cell-main">{p.nombre_paquete}</div>
                                                        <div className="cell-sub">{p.resumen || p.descripcion}</div>
                                                    </td>
                                                    <td>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                                            <MapPin size={13} color="var(--primary)" /> {nombreDestino(p.id_destino)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.84rem' }}>
                                                            <Clock size={13} color="var(--muted)" /> {p.duracion_dias}D / {p.duracion_noches}N
                                                        </span>
                                                    </td>
                                                    <td className="money" style={{ fontWeight: 800, color: '#047857' }}>
                                                        {formatoMoneda(p.precio_paquete)}
                                                    </td>
                                                    <td><EstadoActivo activo={p.is_active} /></td>
                                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'inline-flex', gap: 6 }}>
                                                            {puedeGestionar && <BotonEditar onClick={() => iniciarEdicionPaquete(p)} />}
                                                            {esAdmin && (
                                                                <BotonBaja
                                                                    activo={p.is_active}
                                                                    onClick={async () => {
                                                                        if (confirm('¿Dar de baja este paquete?')) {
                                                                            await eliminarPaquete(p.id_paquete);
                                                                            cargarDatos();
                                                                        }
                                                                    }}
                                                                    onRestaurar={async () => {
                                                                        await actualizarPaquete(p.id_paquete, { is_active: true });
                                                                        cargarDatos();
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
