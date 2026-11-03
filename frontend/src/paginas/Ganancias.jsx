import { useEffect, useState } from 'react';
import { Plus, X, TrendingUp, PiggyBank, Receipt } from 'lucide-react';
import { obtenerGanancias, crearGanancia, actualizarGanancia, eliminarGanancia } from '../servicios/gananciasServicios';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { obtenerReservas } from '../servicios/reservasServicios';
import { obtenerCostosViaje } from '../servicios/costosViajeServicios';
import { obtenerInconvenientes } from '../servicios/inconvenientesServicios';
import { PageHeader, EstadoActivo, BotonBaja, BotonEditar, Vacio, StatCard, SelectorViaje, formatoMoneda, formatoFecha, mensajeError } from '../componentes/UI';

const FORM_INICIAL = { id_viaje: '', ingresos_totales: '0', costos_totales: '0', inconvenientes_totales: '0' };

export default function Ganancias() {
    const [ganancias, setGanancias] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [costosViaje, setCostosViaje] = useState([]);
    const [inconvenientesViaje, setInconvenientesViaje] = useState([]);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [form, setForm] = useState(FORM_INICIAL);

    const cargarDatos = async () => {
        try {
            const [gData, vData, dData, pData, rData, cData, incData] = await Promise.all([
                obtenerGanancias(),
                obtenerViajes(),
                obtenerDestinos(),
                obtenerPaquetes(),
                obtenerReservas(),
                obtenerCostosViaje(),
                obtenerInconvenientes()
            ]);
            setGanancias(gData);
            setViajes(vData);
            setDestinos(dData);
            setPaquetes(pData);
            setReservas(rData);
            setCostosViaje(cData);
            setInconvenientesViaje(incData);
        } catch (err) {
            setError('Error al obtener el registro de ganancias.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleSeleccionarViaje = (idViajeStr) => {
        const vid = Number(idViajeStr);
        const ing = reservas
            .filter(r => r.is_active && r.id_viaje === vid)
            .reduce((s, r) => s + Number(r.monto_total), 0);
        const cos = costosViaje
            .filter(c => c.is_active && c.id_viaje === vid)
            .reduce((s, c) => s + Number(c.monto), 0);
        const inc = inconvenientesViaje
            .filter(i => i.is_active && i.id_viaje === vid)
            .reduce((s, i) => s + Number(i.monto_descontado), 0);

        setForm({
            id_viaje: idViajeStr,
            ingresos_totales: ing.toFixed(2),
            costos_totales: cos.toFixed(2),
            inconvenientes_totales: inc.toFixed(2)
        });
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const iniciarEdicion = (g) => {
        setIdEditando(g.id_ganancia);
        setForm({
            id_viaje: String(g.id_viaje),
            ingresos_totales: String(g.ingresos_totales),
            costos_totales: String(g.costos_totales),
            inconvenientes_totales: String(g.inconvenientes_totales)
        });
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarFormulario = () => {
        setIdEditando(null);
        setForm(FORM_INICIAL);
        setMostrarForm(false);
    };

    const ingresos = parseFloat(form.ingresos_totales) || 0;
    const costos = parseFloat(form.costos_totales) || 0;
    const inconvenientes = parseFloat(form.inconvenientes_totales) || 0;
    const gananciaCalculada = ingresos - costos - inconvenientes;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.id_viaje) {
            alert('Por favor selecciona un viaje.');
            return;
        }
        try {
            const payload = {
                id_viaje: parseInt(form.id_viaje),
                ingresos_totales: ingresos,
                costos_totales: costos,
                inconvenientes_totales: inconvenientes,
                ganancia_neta: parseFloat(gananciaCalculada.toFixed(2))
            };
            if (idEditando) {
                await actualizarGanancia(idEditando, payload);
            } else {
                await crearGanancia(payload);
            }
            cancelarFormulario();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar la ganancia.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este registro de ganancia? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarGanancia(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar la ganancia.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarGanancia(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar la ganancia.'));
        }
    };

    const etiquetaViaje = (id) => {
        const v = viajes.find(v => v.id_viaje === id);
        if (!v) return `Viaje #${id}`;
        const d = destinos.find(d => d.id_destino === v.id_destino);
        return `#${id} ${d?.nombre_destino || ''}`;
    };

    const activas = ganancias.filter(g => g.is_active);
    const sumaIngresos = activas.reduce((s, g) => s + Number(g.ingresos_totales), 0);
    const sumaCostos = activas.reduce((s, g) => s + Number(g.costos_totales) + Number(g.inconvenientes_totales), 0);
    const sumaNeta = activas.reduce((s, g) => s + Number(g.ganancia_neta), 0);

    return (
        <div className="fade-in">
            <PageHeader titulo="Ganancias por Viaje" subtitulo="Balance financiero automático de ingresos, costos e inconvenientes">
                <button className="btn btn-primary" onClick={() => mostrarForm ? cancelarFormulario() : setMostrarForm(true)}>
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Cerrar Balance de Viaje</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid grid-3" style={{ marginBottom: 20 }}>
                <StatCard icono={TrendingUp} color="indigo" etiqueta="Ingresos cerrados" valor={formatoMoneda(sumaIngresos)} />
                <StatCard icono={Receipt} color="accent" etiqueta="Costos + inconvenientes" valor={formatoMoneda(sumaCostos)} />
                <StatCard icono={PiggyBank} color="success" etiqueta="Ganancia neta acumulada" valor={formatoMoneda(sumaNeta)} />
            </div>

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">{idEditando ? `Editar Cierre de Ganancia #${idEditando}` : 'Calcular y Registrar Ganancia'}</div>
                            <div className="card-sub">Al elegir el viaje se cargan automáticamente sus reservas, costos e inconvenientes registrados</div>
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="field full">
                            <label>Viaje</label>
                            <SelectorViaje
                                viajes={viajes}
                                destinos={destinos}
                                paquetes={paquetes}
                                valor={form.id_viaje}
                                onChange={handleSeleccionarViaje}
                            />
                        </div>
                        <div className="field">
                            <label>Ingresos totales por reservas ($)</label>
                            <input type="number" step="0.01" name="ingresos_totales" value={form.ingresos_totales} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label>Costos operativos del viaje ($)</label>
                            <input type="number" step="0.01" name="costos_totales" value={form.costos_totales} onChange={handleChange} required />
                        </div>
                        <div className="field full">
                            <label>Descuentos por inconvenientes ($)</label>
                            <input type="number" step="0.01" name="inconvenientes_totales" value={form.inconvenientes_totales} onChange={handleChange} required />
                        </div>
                        <div className="calc-box">
                            <span>Ganancia neta calculada automáticamente</span>
                            <strong>{formatoMoneda(gananciaCalculada)}</strong>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {idEditando ? 'Actualizar Ganancia' : 'Guardar Cierre de Ganancia'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header"><div className="card-title">Cierres por viaje</div></div>
                {ganancias.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Viaje</th><th>Ingresos</th><th>Costos</th><th>Inconvenientes</th><th>Ganancia neta</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {ganancias.map((g) => (
                                    <tr key={g.id_ganancia} className={g.is_active ? '' : 'inactive'}>
                                        <td className="cell-main">{etiquetaViaje(g.id_viaje)}</td>
                                        <td className="money">{formatoMoneda(g.ingresos_totales)}</td>
                                        <td className="money">{formatoMoneda(g.costos_totales)}</td>
                                        <td className="money">{formatoMoneda(g.inconvenientes_totales)}</td>
                                        <td className="money" style={{ color: Number(g.ganancia_neta) >= 0 ? '#15803d' : '#b91c1c' }}>
                                            {formatoMoneda(g.ganancia_neta)}
                                        </td>
                                        <td>{formatoFecha(g.fecha_calculo)}</td>
                                        <td><EstadoActivo activo={g.is_active} /></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <BotonEditar onClick={() => iniciarEdicion(g)} titulo="Editar ganancia" />
                                            <BotonBaja
                                                activo={g.is_active}
                                                onClick={() => handleEliminar(g.id_ganancia)}
                                                onRestaurar={() => handleRestaurar(g.id_ganancia)}
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
