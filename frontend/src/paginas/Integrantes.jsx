import { useEffect, useState } from 'react';
import { Plus, X, Plane, Printer } from 'lucide-react';
import { obtenerIntegrantes, crearIntegrante, actualizarIntegrante, eliminarIntegrante } from '../servicios/integrantesServicios';
import { obtenerReservas } from '../servicios/reservasServicios';
import { obtenerClientes } from '../servicios/clientesServicios';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import {
    PageHeader, Buscador, EstadoActivo, BotonEditar, BotonBaja, Vacio, Badge, formatoFecha, mensajeError,
    BadgeDocumento, formatearDocumento, coincideBusquedaAvanzada, TIPOS_DOC_VIAJERO
} from '../componentes/UI';
import MapaAsientos from '../componentes/MapaAsientos';

const tipoEdad = (edad) =>
    edad < 3 ? ['success', 'Bebé (<3 Gratis)'] : edad < 13 ? ['info', 'Niño (-25%)'] : edad < 18 ? ['warning', 'Adolescente'] : edad < 60 ? ['success', 'Adulto'] : ['neutral', 'Adulto mayor'];

export default function Integrantes({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const [integrantes, setIntegrantes] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);

    // Formulario rápido con autocompletado por documento + tipo (Cédula / Pasaporte / Menor sin documento)
    const [docTitularReserva, setDocTitularReserva] = useState('');
    const [idReserva, setIdReserva] = useState('');
    const [tipoDocumento, setTipoDocumento] = useState('Cédula');
    const [docPasajero, setDocPasajero] = useState('');
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [edad, setEdad] = useState(25);
    const [numeroAsiento, setNumeroAsiento] = useState(null);

    // Filtros de la nómina de pasajeros y vista del mapa por viaje
    const [busquedaDocumento, setBusquedaDocumento] = useState('');
    const [viajeFiltro, setViajeFiltro] = useState('todos');
    const [mostrarMapaViaje, setMostrarMapaViaje] = useState(true);

    const cargarDatos = async () => {
        try {
            const [iData, rData, cData, vData, dData] = await Promise.all([
                obtenerIntegrantes(),
                obtenerReservas(),
                obtenerClientes(),
                obtenerViajes(),
                obtenerDestinos()
            ]);
            setIntegrantes(iData);
            setReservas(rData);
            setClientes(cData);
            setViajes(vData);
            setDestinos(dData);
        } catch (err) {
            setError('Error al obtener la nómina de integrantes.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const reservaPorId = (id) => reservas.find(r => r.id_reserva === Number(id));
    const etiquetaViajePorReserva = (idRes) => {
        const res = reservaPorId(idRes);
        if (!res) return '—';
        const v = viajes.find(x => x.id_viaje === res.id_viaje);
        if (!v) return `Viaje #${res.id_viaje}`;
        const d = destinos.find(x => x.id_destino === v.id_destino);
        return `#${v.id_viaje} ${d?.nombre_destino.split(',')[0] || ''} (${formatoFecha(v.fecha_salida + 'T00:00:00')})`;
    };

    const handleBuscarReservaPorTitular = (doc) => {
        setDocTitularReserva(doc);
        const limpio = doc.trim().toLowerCase();
        const encontrada = reservas.find(r => r.is_active && r.id_cliente.toLowerCase() === limpio);
        setIdReserva(encontrada ? String(encontrada.id_reserva) : '');
        setNumeroAsiento(null);
    };

    // Autocompletar datos del pasajero si su documento ya existe en clientes o en viajes anteriores
    const [fueAutocompletado, setFueAutocompletado] = useState(false);

    const handleDocPasajeroChange = (doc) => {
        setDocPasajero(doc);
        const limpio = doc.trim().toLowerCase();
        const cli = limpio ? clientes.find(c => c.id_cliente.toLowerCase() === limpio) : null;
        const intPrev = limpio ? integrantes.find(i => i.documento_id.toLowerCase() === limpio) : null;
        if (cli) {
            setNombre(cli.nombre);
            setApellido(cli.apellido);
            if (intPrev) setEdad(intPrev.edad);
            setFueAutocompletado(true);
        } else if (intPrev) {
            setNombre(intPrev.nombre);
            setApellido(intPrev.apellido);
            setEdad(intPrev.edad);
            setFueAutocompletado(true);
        } else if (fueAutocompletado) {
            setNombre('');
            setApellido('');
            setEdad(25);
            setFueAutocompletado(false);
        }
    };

    const iniciarEdicion = (i) => {
        const res = reservaPorId(i.id_reserva);
        setIdEditando(i.id_integrante);
        setDocTitularReserva(res ? res.id_cliente : '');
        setIdReserva(String(i.id_reserva));
        setTipoDocumento(i.tipo_documento || (i.documento_id?.startsWith('MENOR-') ? 'Sin Documento' : 'Cédula'));
        setDocPasajero(i.documento_id?.startsWith('MENOR-') ? '' : i.documento_id);
        setNombre(i.nombre);
        setApellido(i.apellido);
        setEdad(i.edad);
        setNumeroAsiento(i.numero_asiento || null);
        setFueAutocompletado(false);
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarForm = () => {
        setIdEditando(null);
        setDocTitularReserva('');
        setIdReserva('');
        setTipoDocumento('Cédula');
        setDocPasajero('');
        setNombre('');
        setApellido('');
        setEdad(25);
        setNumeroAsiento(null);
        setFueAutocompletado(false);
        setMostrarForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!idReserva) {
            alert('Ingresa el documento de un cliente titular con reserva activa.');
            return;
        }
        if (tipoDocumento === 'Sin Documento' && parseInt(edad) > 17) {
            alert('Solo los menores de edad (0 a 17 años) pueden viajar sin documento de identidad.');
            return;
        }
        if (tipoDocumento !== 'Sin Documento' && !docPasajero.trim()) {
            alert(`Debes ingresar el número de ${tipoDocumento.toLowerCase()} del viajero.`);
            return;
        }
        try {
            if (idEditando) {
                await actualizarIntegrante(idEditando, {
                    id_reserva: parseInt(idReserva),
                    tipo_documento: tipoDocumento,
                    documento_id: tipoDocumento === 'Sin Documento' ? '' : docPasajero.trim(),
                    nombre: nombre.trim(),
                    apellido: apellido.trim(),
                    edad: parseInt(edad),
                    numero_asiento: numeroAsiento ? parseInt(numeroAsiento) : null
                });
            } else {
                await crearIntegrante({
                    id_reserva: parseInt(idReserva),
                    tipo_documento: tipoDocumento,
                    documento_id: tipoDocumento === 'Sin Documento' ? '' : docPasajero.trim(),
                    nombre: nombre.trim(),
                    apellido: apellido.trim(),
                    edad: parseInt(edad),
                    numero_asiento: numeroAsiento ? parseInt(numeroAsiento) : null
                });
            }
            cancelarForm();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al guardar el integrante.'));
        }
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este integrante? El monto de la reserva y los cupos se actualizarán automáticamente. Podrás restaurarlo después.')) {
            try {
                await eliminarIntegrante(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar el integrante.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarIntegrante(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el integrante.'));
        }
    };

    const reservasDelTitular = docTitularReserva.trim()
        ? reservas.filter(r => r.is_active && r.id_cliente.toLowerCase() === docTitularReserva.trim().toLowerCase())
        : [];

    const q = busquedaDocumento.trim();
    const filtrados = integrantes
        .filter(i => {
            const res = reservaPorId(i.id_reserva);
            if (viajeFiltro !== 'todos' && (!res || res.id_viaje !== Number(viajeFiltro))) return false;
            return coincideBusquedaAvanzada(q, {
                ...i,
                titular: res ? res.id_cliente : ''
            });
        })
        .sort((a, b) => (a.numero_asiento || 999) - (b.numero_asiento || 999));

    const reservaSeleccionadaForm = idReserva ? reservaPorId(idReserva) : null;
    const viajeSeleccionadoForm = reservaSeleccionadaForm
        ? viajes.find(v => v.id_viaje === reservaSeleccionadaForm.id_viaje)
        : null;

    const viajeSeleccionadoFiltro = viajeFiltro !== 'todos'
        ? viajes.find(v => v.id_viaje === Number(viajeFiltro))
        : null;

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Nómina de Viajeros y Mapa de Puestos"
                subtitulo="Consulta el manifiesto ordenado por número de asiento y asigna puestos en el Bus Cama de 2 pisos o en el Avión"
            >
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                        const activos = filtrados.filter(i => i.is_active);
                        const filas = activos.map((i, idx) => {
                            const res = reservaPorId(i.id_reserva);
                            const docInfo = formatearDocumento(i.documento_id, i.tipo_documento);
                            const docTexto = docInfo.tipo === 'Sin Documento'
                                ? `Menor s/cédula (${docInfo.detalle})`
                                : docInfo.tipo === 'Pasaporte'
                                    ? `Pasaporte: ${i.documento_id}`
                                    : i.documento_id;
                            return `<tr><td>${idx + 1}</td><td><strong>Puesto #${i.numero_asiento ? String(i.numero_asiento).padStart(2, '0') : 'S/A'}</strong></td><td><strong>${docTexto}</strong></td><td>${i.nombre} ${i.apellido}</td><td>${i.edad} años</td><td>#${i.id_reserva} (${res ? res.id_cliente : '—'})</td><td style="width:140px;"></td></tr>`;
                        }).join('');
                        const win = window.open('', '_blank', 'width=880,height=720');
                        if (!win) return;
                        win.document.write(`
                            <html>
                            <head>
                                <title>Manifiesto de Embarque - Viajes La Nena</title>
                                <style>
                                    body { font-family: system-ui, sans-serif; color: #0f172a; padding: 26px; }
                                    .head { display: flex; justify-content: space-between; border-bottom: 2px solid #0ea5a4; padding-bottom: 12px; margin-bottom: 16px; }
                                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                                    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
                                    th { background: #f1f5f9; }
                                </style>
                            </head>
                            <body>
                                <div class="head">
                                    <div>
                                        <div style="font-size:20px;font-weight:800;color:#0ea5a4;">✈️ Viajes La Nena — Manifiesto Oficial de Embarque</div>
                                        <div style="font-size:12px;color:#64748b;">Control de abordaje ordenado por puesto (${activos.length} viajeros activos en la lista)</div>
                                    </div>
                                    <div style="text-align:right;font-size:12px;color:#64748b;">Fecha de emisión: ${new Date().toLocaleDateString('es-VE')}</div>
                                </div>
                                <table>
                                    <thead><tr><th>#</th><th>Puesto</th><th>Documento / Cédula</th><th>Nombre y Apellido</th><th>Edad</th><th>Reserva / Titular</th><th>Firma / Abordaje</th></tr></thead>
                                    <tbody>${filas}</tbody>
                                </table>
                                <script>window.onload = () => window.print();</script>
                            </body>
                            </html>
                        `);
                        win.document.close();
                    }}
                >
                    <Printer size={16} /> Imprimir Manifiesto ({filtrados.filter(i => i.is_active).length})
                </button>
                <button className="btn btn-ghost" onClick={() => mostrarForm ? cancelarForm() : setMostrarForm(true)}>
                    {mostrarForm ? <><X size={16} /> Cerrar</> : <><Plus size={16} /> Añadir acompañante a reserva</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">{idEditando ? `Actualizar Integrante #${idEditando}` : 'Añadir acompañante rápido y asignar puesto'}</div>
                            <div className="card-sub">
                                Si el pasajero ya es cliente o ha viajado antes, al escribir su documento se autocompletan su nombre y edad
                            </div>
                        </div>
                    </div>

                    <div className="form-grid" style={{ marginBottom: 12 }}>
                        <div className="field">
                            <label>1. Documento del Cliente Titular de la reserva</label>
                            <input
                                value={docTitularReserva}
                                onChange={(e) => handleBuscarReservaPorTitular(e.target.value)}
                                placeholder="Ej. V-14523890"
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Reserva asociada</label>
                            {reservasDelTitular.length > 1 ? (
                                <div className="viaje-destino-pills" style={{ marginTop: 4 }}>
                                    {reservasDelTitular.map(r => (
                                        <button
                                            key={r.id_reserva}
                                            type="button"
                                            className={`viaje-pill ${Number(idReserva) === r.id_reserva ? 'active' : ''}`}
                                            onClick={() => {
                                                setIdReserva(String(r.id_reserva));
                                                setNumeroAsiento(null);
                                            }}
                                        >
                                            Reserva #{r.id_reserva} ({etiquetaViajePorReserva(r.id_reserva)})
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <input
                                    value={idReserva ? `Reserva #${idReserva} — ${etiquetaViajePorReserva(idReserva)}` : ''}
                                    readOnly
                                    placeholder="Se detecta automáticamente al ingresar el documento del titular"
                                />
                            )}
                        </div>
                    </div>

                    <div className="integrante-row" style={{ gridTemplateColumns: '150px 1fr 1fr 1fr 85px 110px auto', marginBottom: 12 }}>
                        <select
                            className="input"
                            value={tipoDocumento}
                            onChange={(e) => {
                                const t = e.target.value;
                                setTipoDocumento(t);
                                if (t === 'Sin Documento') {
                                    setDocPasajero('');
                                    if (edad > 17) setEdad(8);
                                }
                            }}
                            title="Tipo de identificación del viajero"
                        >
                            <option value="Cédula">🪪 Cédula</option>
                            <option value="Pasaporte">🛂 Pasaporte</option>
                            <option value="Sin Documento">👶 Menor sin cédula</option>
                        </select>
                        <input
                            className="input"
                            placeholder={tipoDocumento === 'Sin Documento' ? 'Se asocia al titular (auto)' : (tipoDocumento === 'Pasaporte' ? 'Nro. de Pasaporte' : '2. Cédula acompañante')}
                            value={tipoDocumento === 'Sin Documento' ? '(Menor sin cédula)' : docPasajero}
                            onChange={(e) => handleDocPasajeroChange(e.target.value)}
                            disabled={tipoDocumento === 'Sin Documento'}
                            required={tipoDocumento !== 'Sin Documento'}
                        />
                        <input
                            className="input"
                            placeholder="Nombre (se autocompleta si existe)"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                        <input
                            className="input"
                            placeholder="Apellido"
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                            required
                        />
                        <input
                            className="input"
                            type="number"
                            min="0"
                            max={tipoDocumento === 'Sin Documento' ? '17' : '120'}
                            placeholder="Edad"
                            value={edad}
                            onChange={(e) => setEdad(e.target.value)}
                            required
                        />
                        <input
                            className="input"
                            type="number"
                            min="1"
                            placeholder="Puesto (Auto)"
                            value={numeroAsiento || ''}
                            onChange={(e) => setNumeroAsiento(e.target.value ? parseInt(e.target.value) : null)}
                            title="Número de puesto (o selecciónalo abajo en el mapa)"
                        />
                        <button type="submit" className="btn btn-primary">{idEditando ? 'Actualizar' : 'Guardar'}</button>
                    </div>

                    {viajeSeleccionadoForm && (
                        <MapaAsientos
                            viaje={viajeSeleccionadoForm}
                            integrantesViaje={integrantes.filter(i => {
                                if (!i.is_active) return false;
                                if (idEditando && i.id_integrante === idEditando) return false;
                                const res = reservaPorId(i.id_reserva);
                                return res && res.is_active && res.id_viaje === viajeSeleccionadoForm.id_viaje;
                            })}
                            pasajerosGrupo={[{
                                id_integrante: idEditando || undefined,
                                documento_id: docPasajero || 'NUEVO',
                                nombre: nombre || 'Pasajero',
                                apellido: apellido || '',
                                edad: edad,
                                numero_asiento: numeroAsiento
                            }]}
                            onAsignarAsiento={(_idx, num) => setNumeroAsiento(num)}
                            titulo="Selecciona el puesto en el mapa para este pasajero"
                        />
                    )}
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Manifiesto de pasajeros ({filtrados.length})</div>
                        <div className="card-sub">Selecciona un viaje abajo para ver su Mapa Interactivo de Puestos (Bus Cama 2 pisos o Avión) y otorgar asientos</div>
                    </div>
                    <Buscador
                        valor={busquedaDocumento}
                        onChange={setBusquedaDocumento}
                        placeholder="Buscar por documento del viajero o titular..."
                    />
                </div>

                <div className="viaje-destino-pills" style={{ marginBottom: 16 }}>
                    <button
                        type="button"
                        className={`viaje-pill ${viajeFiltro === 'todos' ? 'active' : ''}`}
                        onClick={() => setViajeFiltro('todos')}
                    >
                        Todos los viajes ({integrantes.length})
                    </button>
                    {viajes.filter(v => v.is_active).map(v => {
                        const d = destinos.find(x => x.id_destino === v.id_destino);
                        return (
                            <button
                                key={v.id_viaje}
                                type="button"
                                className={`viaje-pill ${Number(viajeFiltro) === v.id_viaje ? 'active' : ''}`}
                                onClick={() => setViajeFiltro(String(v.id_viaje))}
                            >
                                <Plane size={12} /> #{v.id_viaje} {d?.nombre_destino.split(',')[0] || ''} · {v.metodo_transporte || 'Bus Cama'} ({formatoFecha(v.fecha_salida + 'T00:00:00')})
                            </button>
                        );
                    })}
                </div>

                {/* Si hay un viaje específico seleccionado en el filtro, mostramos el Mapa Interactivo completo de ese viaje */}
                {viajeSeleccionadoFiltro && (
                    <div style={{ marginBottom: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                                💺 Mapa General de Puestos del Viaje #{viajeSeleccionadoFiltro.id_viaje} ({viajeSeleccionadoFiltro.metodo_transporte || 'Bus Cama'})
                            </strong>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                                onClick={() => setMostrarMapaViaje(!mostrarMapaViaje)}
                            >
                                {mostrarMapaViaje ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                            </button>
                        </div>
                        {mostrarMapaViaje && (
                            <MapaAsientos
                                viaje={viajeSeleccionadoFiltro}
                                integrantesViaje={filtrados.filter(i => i.is_active)}
                                pasajerosGrupo={filtrados.filter(i => i.is_active)}
                                onAsignarAsiento={async (indexPasajero, numAsiento) => {
                                    const pasajero = filtrados.filter(i => i.is_active)[indexPasajero];
                                    if (!pasajero) return;
                                    try {
                                        await actualizarIntegrante(pasajero.id_integrante, {
                                            numero_asiento: numAsiento
                                        });
                                        await cargarDatos();
                                    } catch (err) {
                                        alert(mensajeError(err, 'No se pudo asignar el puesto.'));
                                    }
                                }}
                                titulo="Haz clic en cualquier pasajero de la lista superior y luego haz clic en el asiento numerado que deseas otorgarle"
                            />
                        )}
                    </div>
                )}

                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Puesto</th>
                                    <th>Documento Viajero</th>
                                    <th>Nombre Completo</th>
                                    <th>Edad</th>
                                    <th>Viaje / Salida</th>
                                    <th>Reserva / Titular</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map((i) => {
                                    const [tipo, etiqueta] = tipoEdad(i.edad);
                                    const res = reservaPorId(i.id_reserva);
                                    return (
                                        <tr key={i.id_integrante} className={i.is_active ? '' : 'inactive'}>
                                            <td>
                                                <Badge tipo={i.numero_asiento ? 'info' : 'neutral'}>
                                                    {i.numero_asiento ? `💺 Puesto #${String(i.numero_asiento).padStart(2, '0')}` : 'S/A'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <BadgeDocumento doc={i.documento_id} tipo={i.tipo_documento} />
                                            </td>
                                            <td className="cell-main">{i.nombre} {i.apellido}</td>
                                            <td>{i.edad} años <Badge tipo={tipo}>{etiqueta}</Badge></td>
                                            <td>{etiquetaViajePorReserva(i.id_reserva)}</td>
                                            <td>
                                                <div className="cell-main">Reserva #{i.id_reserva}</div>
                                                <div className="cell-sub">Titular: {res ? res.id_cliente : '—'}</div>
                                            </td>
                                            <td><EstadoActivo activo={i.is_active} /></td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                                    <BotonEditar onClick={() => iniciarEdicion(i)} />
                                                    {esAdmin && (
                                                        <BotonBaja
                                                            activo={i.is_active}
                                                            onClick={() => handleEliminar(i.id_integrante)}
                                                            onRestaurar={() => handleRestaurar(i.id_integrante)}
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
        </div>
    );
}
