import { useEffect, useState } from 'react';
import { Plus, X, Plane, UserPlus, Trash, History, CalendarCheck, Wallet, AlertCircle, CreditCard } from 'lucide-react';
import { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente } from '../servicios/clientesServicios';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { obtenerReservas, crearReserva } from '../servicios/reservasServicios';
import { obtenerPagos } from '../servicios/pagosServicios';
import { obtenerIntegrantes } from '../servicios/integrantesServicios';
import {
    PageHeader, Buscador, EstadoActivo, BotonEditar, BotonBaja, Vacio, Badge, SelectorViaje, formatoMoneda, formatoFecha, mensajeError,
    BadgeDocumento, formatearDocumento, coincideBusquedaAvanzada, TIPOS_DOC_TITULAR, TIPOS_DOC_VIAJERO,
    METODOS_PAGO, BadgeMetodoPago, CalculadoraDivisas, ModalLiquidarSaldo
} from '../componentes/UI';
import MapaAsientos from '../componentes/MapaAsientos';

const ABONO_POR_INTEGRANTE = 30;
const FORM_INICIAL = { id_cliente: '', tipo_documento: 'Cédula', nombre: '', apellido: '', telefono: '', correo_electronico: '', direccion: '' };
const ACOMP_VACIO = { tipo_documento: 'Cédula', documento_id: '', nombre: '', apellido: '', edad: 25, autocompletado: false };

const calcularTarifaPorEdad = (precioBase, edad) => {
    const ed = parseInt(edad) || 0;
    if (ed < 3) {
        return { monto: 0, etiqueta: 'Gratis (<3 años)', tipo: 'success', pagaAbono: false };
    }
    if (ed < 13) {
        return { monto: Number((precioBase * 0.75).toFixed(2)), etiqueta: '-25% Niño (3-12)', tipo: 'warning', pagaAbono: true };
    }
    return { monto: precioBase, etiqueta: 'Tarifa Completa', tipo: 'neutral', pagaAbono: true };
};

export default function Clientes({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const [clientes, setClientes] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [integrantes, setIntegrantes] = useState([]);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [busquedaDocumento, setBusquedaDocumento] = useState('');
    const [form, setForm] = useState(FORM_INICIAL);

    // Expediente / Historial del viajero seleccionado
    const [clienteExpediente, setClienteExpediente] = useState(null);
    const [reservaParaLiquidarDirecta, setReservaParaLiquidarDirecta] = useState(null);

    // Asignar viaje de una vez al crear el cliente (o a un cliente existente desde la tabla)
    const [asignarViajeAhora, setAsignarViajeAhora] = useState(true);
    const [clienteExistenteReserva, setClienteExistenteReserva] = useState(null);
    const [idViaje, setIdViaje] = useState('');
    const [edadTitular, setEdadTitular] = useState(30);
    const [asientoTitular, setAsientoTitular] = useState(null);
    const [acompanantes, setAcompanantes] = useState([]);
    const [borradorAcomp, setBorradorAcomp] = useState({ ...ACOMP_VACIO });
    const [mostrarInputAcomp, setMostrarInputAcomp] = useState(false);
    const [mostrarMapaAsignar, setMostrarMapaAsignar] = useState(true);
    const [montoAbono, setMontoAbono] = useState('30');
    const [metodoPago, setMetodoPago] = useState('Transferencia');
    const [referencia, setReferencia] = useState('');

    const cargarDatos = async () => {
        try {
            const [cData, vData, dData, pData, rData, pgData, iData] = await Promise.all([
                obtenerClientes(),
                obtenerViajes(),
                obtenerDestinos(),
                obtenerPaquetes(),
                obtenerReservas(),
                obtenerPagos(),
                obtenerIntegrantes()
            ]);
            setClientes(cData);
            setViajes(vData);
            setDestinos(dData);
            setPaquetes(pData);
            setReservas(rData);
            setPagos(pgData);
            setIntegrantes(iData);
        } catch (err) {
            setError('Error al obtener los datos de clientes.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    // Validaciones en tiempo real de valores únicos (documento, teléfono y correo)
    const docRepetido = !idEditando && form.id_cliente.trim() && clientes.some(
        c => c.id_cliente.toLowerCase() === form.id_cliente.trim().toLowerCase()
    );
    const telRepetido = form.telefono.trim() && clientes.some(
        c => c.id_cliente !== idEditando && c.telefono.trim() === form.telefono.trim()
    );
    const correoRepetido = form.correo_electronico.trim() && clientes.some(
        c => c.id_cliente !== idEditando && c.correo_electronico.toLowerCase() === form.correo_electronico.trim().toLowerCase()
    );

    const obtenerPrecioViaje = (viajeId) => {
        const v = viajes.find(x => x.id_viaje === Number(viajeId));
        if (!v) return 0;
        if (v.id_paquete) {
            const paq = paquetes.find(p => p.id_paquete === v.id_paquete);
            if (paq) return Number(paq.precio_paquete);
        }
        const dest = destinos.find(d => d.id_destino === v.id_destino);
        return dest ? Number(dest.precio_base) : 0;
    };

    const descripcionViaje = (viajeId) => {
        const v = viajes.find(x => x.id_viaje === Number(viajeId));
        if (!v) return `Viaje #${viajeId}`;
        const d = destinos.find(x => x.id_destino === v.id_destino);
        const p = paquetes.find(x => x.id_paquete === v.id_paquete);
        return `${d?.nombre_destino || 'Destino'}${p ? ` (${p.nombre_paquete})` : ''} · Salida ${formatoFecha(v.fecha_salida + 'T00:00:00')}`;
    };

    const cantidadViajeros = 1 + acompanantes.length;
    const cantidadPagantes = 1 + acompanantes.filter(a => (parseInt(a.edad) || 0) >= 3).length;
    const precioUnitario = obtenerPrecioViaje(idViaje);
    const montoTotalCalculado = Number((
        calcularTarifaPorEdad(precioUnitario, edadTitular).monto +
        acompanantes.reduce((s, a) => s + calcularTarifaPorEdad(precioUnitario, a.edad).monto, 0)
    ).toFixed(2));
    const abonoMinimoRequerido = ABONO_POR_INTEGRANTE * cantidadPagantes;
    const abonoNumerico = parseFloat(montoAbono) || 0;

    const handleDocAcompChange = (doc) => {
        const limpio = doc.trim().toLowerCase();
        const cli = limpio ? clientes.find(c => c.id_cliente.toLowerCase() === limpio) : null;
        if (cli) {
            setBorradorAcomp({
                documento_id: doc,
                nombre: cli.nombre,
                apellido: cli.apellido,
                edad: 30,
                autocompletado: true
            });
        } else {
            setBorradorAcomp(prev => ({
                documento_id: doc,
                nombre: prev.autocompletado ? '' : prev.nombre,
                apellido: prev.autocompletado ? '' : prev.apellido,
                edad: prev.autocompletado ? 25 : prev.edad,
                autocompletado: false
            }));
        }
    };

    const confirmarAcompanante = () => {
        const tipoDoc = borradorAcomp.tipo_documento || 'Cédula';
        const nom = borradorAcomp.nombre.trim();
        const ape = borradorAcomp.apellido.trim();
        const ed = parseInt(borradorAcomp.edad);
        if (!nom || !ape || isNaN(ed) || ed < 0) {
            alert('Completa nombre, apellido y edad del acompañante.');
            return;
        }
        if (tipoDoc === 'Sin Documento' && ed > 17) {
            alert('Solo los menores de edad (0 a 17 años) pueden viajar sin documento de identidad.');
            return;
        }
        let doc = borradorAcomp.documento_id.trim();
        if (tipoDoc !== 'Sin Documento' && !doc) {
            alert(`Debes ingresar el número de ${tipoDoc.toLowerCase()} del acompañante.`);
            return;
        }
        const docTitularActual = (clienteExistenteReserva ? clienteExistenteReserva.id_cliente : form.id_cliente).trim();
        if (tipoDoc === 'Sin Documento') {
            const numHijo = acompanantes.filter(a => a.tipo_documento === 'Sin Documento').length + 1;
            doc = `MENOR-${docTitularActual || 'TITULAR'}-${numHijo}`;
        } else if (doc.toLowerCase() === docTitularActual.toLowerCase() || acompanantes.some(a => a.documento_id.toLowerCase() === doc.toLowerCase())) {
            alert('Este documento ya está incluido en los viajeros.');
            return;
        }
        const nuevos = [...acompanantes, {
            tipo_documento: tipoDoc,
            documento_id: doc,
            nombre: nom,
            apellido: ape,
            edad: ed,
            numero_asiento: null
        }];
        setAcompanantes(nuevos);
        setBorradorAcomp({ ...ACOMP_VACIO });
        setMostrarInputAcomp(false);
        const pagantesNuevos = 1 + nuevos.filter(a => (parseInt(a.edad) || 0) >= 3).length;
        const nuevoMin = ABONO_POR_INTEGRANTE * pagantesNuevos;
        if ((parseFloat(montoAbono) || 0) < nuevoMin) setMontoAbono(String(nuevoMin));
    };

    const quitarAcompanante = (doc) => {
        setAcompanantes(acompanantes.filter(a => a.documento_id !== doc));
    };

    const resetearTodo = () => {
        setForm(FORM_INICIAL);
        setIdEditando(null);
        setClienteExistenteReserva(null);
        setIdViaje('');
        setEdadTitular(30);
        setAsientoTitular(null);
        setAcompanantes([]);
        setBorradorAcomp({ ...ACOMP_VACIO });
        setMostrarInputAcomp(false);
        setMontoAbono('30');
        setReferencia('');
        setMostrarForm(false);
    };

    const iniciarEdicion = (c) => {
        setIdEditando(c.id_cliente);
        setClienteExistenteReserva(null);
        setAsignarViajeAhora(false);
        setForm({
            id_cliente: c.id_cliente,
            tipo_documento: c.tipo_documento || 'Cédula',
            nombre: c.nombre,
            apellido: c.apellido,
            telefono: c.telefono,
            correo_electronico: c.correo_electronico,
            direccion: c.direccion
        });
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setExito('');

        if (idEditando) {
            if (telRepetido) {
                alert('Ya existe otro cliente registrado con ese número de teléfono.');
                return;
            }
            if (correoRepetido) {
                alert('Ya existe otro cliente registrado con ese correo electrónico.');
                return;
            }
            try {
                await actualizarCliente(idEditando, {
                    tipo_documento: form.tipo_documento || 'Cédula',
                    nombre: form.nombre.trim(),
                    apellido: form.apellido.trim(),
                    telefono: form.telefono.trim(),
                    correo_electronico: form.correo_electronico.trim().toLowerCase(),
                    direccion: form.direccion.trim()
                });
                setExito(`Datos del cliente ${form.nombre.trim()} ${form.apellido.trim()} (${idEditando}) actualizados exitosamente.`);
                resetearTodo();
                cargarDatos();
            } catch (err) {
                alert(mensajeError(err, 'No se pudo actualizar la información del cliente.'));
            }
            return;
        }

        if (!clienteExistenteReserva) {
            if (docRepetido) {
                alert('Ya existe un cliente registrado con ese número de documento.');
                return;
            }
            if (telRepetido) {
                alert('Ya existe un cliente registrado con ese número de teléfono.');
                return;
            }
            if (correoRepetido) {
                alert('Ya existe un cliente registrado con ese correo electrónico.');
                return;
            }
        }

        const edadTitularNum = parseInt(edadTitular);
        if (isNaN(edadTitularNum) || edadTitularNum < 18) {
            alert('El cliente titular que realiza la reservación no puede ser menor de edad (debe tener mínimo 18 años).');
            return;
        }

        const deseaViaje = clienteExistenteReserva || asignarViajeAhora;
        if (deseaViaje) {
            if (!idViaje) {
                alert('Selecciona el viaje que deseas asignar al cliente.');
                return;
            }
            if (abonoNumerico < abonoMinimoRequerido) {
                alert(`El abono mínimo obligatorio es de $${abonoMinimoRequerido.toFixed(2)} ($30.00 × ${cantidadPagantes} pasajero(s) de 3 años o más).`);
                return;
            }
        }

        try {
            let titular = clienteExistenteReserva;
            if (!titular) {
                titular = await crearCliente({
                    id_cliente: form.id_cliente.trim(),
                    tipo_documento: form.tipo_documento || 'Cédula',
                    nombre: form.nombre.trim(),
                    apellido: form.apellido.trim(),
                    telefono: form.telefono.trim(),
                    correo_electronico: form.correo_electronico.trim().toLowerCase(),
                    direccion: form.direccion.trim()
                });
            }

            if (deseaViaje) {
                await crearReserva({
                    id_cliente: titular.id_cliente,
                    id_viaje: parseInt(idViaje),
                    integrantes: [
                        {
                            nombre: titular.nombre,
                            apellido: titular.apellido,
                            tipo_documento: titular.tipo_documento || 'Cédula',
                            documento_id: titular.id_cliente,
                            edad: parseInt(edadTitular) || 30,
                            numero_asiento: asientoTitular ? parseInt(asientoTitular) : null
                        },
                        ...acompanantes.map(a => ({
                            nombre: a.nombre.trim(),
                            apellido: a.apellido.trim(),
                            tipo_documento: a.tipo_documento || 'Cédula',
                            documento_id: (a.tipo_documento === 'Sin Documento' ? '' : (a.documento_id || '')).trim(),
                            edad: parseInt(a.edad),
                            numero_asiento: a.numero_asiento ? parseInt(a.numero_asiento) : null
                        }))
                    ],
                    monto_abono: abonoNumerico,
                    metodo_pago: metodoPago,
                    referencia: referencia.trim() || 'ABONO-INICIAL'
                });
                setExito(`Cliente ${titular.nombre} ${titular.apellido} (${titular.id_cliente}) y su reserva de viaje fueron registrados exitosamente.`);
            } else {
                setExito(`Cliente ${titular.nombre} ${titular.apellido} (${titular.id_cliente}) registrado exitosamente.`);
            }

            resetearTodo();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo completar el registro.'));
        }
    };

    const abrirAsignarViajeClienteExistente = (c) => {
        setClienteExpediente(null);
        setIdEditando(null);
        setClienteExistenteReserva(c);
        setAsignarViajeAhora(true);
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja este cliente? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarCliente(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar el cliente.');
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarCliente(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el cliente.'));
        }
    };

    // Resumen rápido de reservas por cliente para la tabla y el modal de expediente
    const obtenerResumenCliente = (idCliente) => {
        const resTitular = reservas.filter(r => r.id_cliente.toLowerCase() === idCliente.toLowerCase() && r.is_active);
        const viajesComoPasajero = integrantes.filter(i => i.documento_id.toLowerCase() === idCliente.toLowerCase() && i.is_active);
        let totalReservado = 0;
        let totalAbonado = 0;
        resTitular.forEach(r => {
            totalReservado += Number(r.monto_total) || 0;
            const abonadoRes = pagos
                .filter(p => p.id_reserva === r.id_reserva && p.is_active)
                .reduce((s, p) => s + Number(p.monto), 0);
            totalAbonado += abonadoRes;
        });
        const saldoPendiente = Math.max(totalReservado - totalAbonado, 0);
        return {
            resTitular,
            viajesComoPasajero,
            totalReservado,
            totalAbonado,
            saldoPendiente
        };
    };

    const q = busquedaDocumento.trim().toLowerCase();
    const filtrados = clientes.filter(c => coincideBusquedaAvanzada(busquedaDocumento, c));

    const datosExpediente = clienteExpediente ? obtenerResumenCliente(clienteExpediente.id_cliente) : null;

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Clientes y Expediente de Viajero"
                subtitulo="Toca cualquier cliente para ver su historial completo de viajes, abonos y estado de cuenta"
            >
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        if (mostrarForm) {
                            resetearTodo();
                        } else {
                            setIdEditando(null);
                            setClienteExistenteReserva(null);
                            setAsignarViajeAhora(true);
                            setMostrarForm(true);
                        }
                    }}
                >
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Cliente + Viaje</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">{exito}</div>}

            {mostrarForm && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 22 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">
                                {idEditando
                                    ? `Actualizar Cliente (${idEditando})`
                                    : clienteExistenteReserva
                                        ? `Asignar Viaje a ${clienteExistenteReserva.nombre} ${clienteExistenteReserva.apellido} (${clienteExistenteReserva.id_cliente})`
                                        : 'Registrar Cliente (con opción de asignar viaje de una vez)'}
                            </div>
                            <div className="card-sub">
                                El titular debe ser mayor de 18 años. Niños &lt;3 años no pagan ($0) y menores de 13 años tienen 25% de descuento.
                            </div>
                        </div>
                        {!clienteExistenteReserva && !idEditando && (
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', color: 'var(--primary-dark)' }}>
                                <input
                                    type="checkbox"
                                    checked={asignarViajeAhora}
                                    onChange={(e) => setAsignarViajeAhora(e.target.checked)}
                                />
                                Asignar viaje y crear reserva de una vez
                            </label>
                        )}
                    </div>

                    {!clienteExistenteReserva && (
                        <div className="form-grid" style={{ marginBottom: (asignarViajeAhora && !idEditando) ? 18 : 0 }}>
                            <div className="field">
                                <label>Tipo de Documento</label>
                                <select
                                    name="tipo_documento"
                                    value={form.tipo_documento || 'Cédula'}
                                    onChange={handleChange}
                                    disabled={!!idEditando}
                                >
                                    {TIPOS_DOC_TITULAR.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>{form.tipo_documento === 'Pasaporte' ? 'Nº de Pasaporte (titular)' : 'Cédula de Identidad (titular)'}</label>
                                <input
                                    name="id_cliente"
                                    value={form.id_cliente}
                                    onChange={handleChange}
                                    placeholder={form.tipo_documento === 'Pasaporte' ? 'P-12345678' : 'V-12345678'}
                                    disabled={!!idEditando}
                                    required
                                />
                                {docRepetido && <small style={{ color: '#b91c1c', fontWeight: 600 }}>Este documento ya está registrado.</small>}
                            </div>
                            <div className="field">
                                <label>Teléfono (único)</label>
                                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="0414-1234567" required />
                                {telRepetido && <small style={{ color: '#b91c1c', fontWeight: 600 }}>Este número de teléfono ya pertenece a otro cliente.</small>}
                            </div>
                            <div className="field">
                                <label>Nombre</label>
                                <input name="nombre" value={form.nombre} onChange={handleChange} required />
                            </div>
                            <div className="field">
                                <label>Apellido</label>
                                <input name="apellido" value={form.apellido} onChange={handleChange} required />
                            </div>
                            <div className="field">
                                <label>Correo electrónico (único)</label>
                                <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={handleChange} required />
                                {correoRepetido && <small style={{ color: '#b91c1c', fontWeight: 600 }}>Este correo electrónico ya pertenece a otro cliente.</small>}
                            </div>
                            <div className="field">
                                <label>Dirección</label>
                                <input name="direccion" value={form.direccion} onChange={handleChange} required />
                            </div>
                            {!idEditando && !asignarViajeAhora && (
                                <div className="field">
                                    <label>Edad del cliente titular (mínimo 18 años)</label>
                                    <input
                                        type="number"
                                        min="18"
                                        value={edadTitular}
                                        onChange={(e) => setEdadTitular(e.target.value)}
                                        required
                                    />
                                    {(parseInt(edadTitular) || 0) < 18 && (
                                        <small style={{ color: '#b91c1c', fontWeight: 600 }}>El cliente no puede ser menor de edad (mín. 18 años).</small>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {!idEditando && (asignarViajeAhora || clienteExistenteReserva) && (
                        <div style={{ borderTop: clienteExistenteReserva ? 'none' : '1px solid var(--border)', paddingTop: clienteExistenteReserva ? 0 : 18 }}>
                            <div className="field full" style={{ marginBottom: 16 }}>
                                <label>Seleccionar Viaje Disponible</label>
                                <SelectorViaje
                                    viajes={viajes}
                                    destinos={destinos}
                                    paquetes={paquetes}
                                    valor={idViaje}
                                    onChange={(val) => {
                                        setIdViaje(val);
                                        setAsientoTitular(null);
                                        setAcompanantes(prev => prev.map(a => ({ ...a, numero_asiento: null })));
                                    }}
                                    soloConCupos={true}
                                />
                            </div>

                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <Badge tipo="info">Viajero #1 (Titular +18)</Badge>
                                        <strong>
                                            {clienteExistenteReserva
                                                ? `${clienteExistenteReserva.nombre} ${clienteExistenteReserva.apellido} (${clienteExistenteReserva.id_cliente})`
                                                : (form.nombre ? `${form.nombre} ${form.apellido} (${form.id_cliente})` : 'El cliente titular queda incluido automáticamente')}
                                        </strong>
                                        <Badge tipo={asientoTitular ? 'success' : 'neutral'}>
                                            {asientoTitular ? `💺 Puesto #${String(asientoTitular).padStart(2, '0')}` : '💺 Puesto automático'}
                                        </Badge>
                                        <span className="cell-sub">Edad (+18):</span>
                                        <input
                                            type="number"
                                            min="18"
                                            className="input"
                                            value={edadTitular}
                                            onChange={(e) => setEdadTitular(e.target.value)}
                                            style={{ width: 68, padding: '5px 8px' }}
                                            required
                                        />
                                        {(parseInt(edadTitular) || 0) < 18 && (
                                            <small style={{ color: '#b91c1c', fontWeight: 700 }}>
                                                El titular no puede ser menor de edad (mín. 18 años)
                                            </small>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => setMostrarInputAcomp(!mostrarInputAcomp)}
                                        style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                                    >
                                        <UserPlus size={14} /> {mostrarInputAcomp ? 'Cerrar acompañante' : '+ Añadir acompañante'}
                                    </button>
                                </div>

                                {acompanantes.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                                        {acompanantes.map((a, idx) => {
                                            const t = calcularTarifaPorEdad(precioUnitario, a.edad);
                                            return (
                                                <div
                                                    key={a.documento_id}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: '0.82rem' }}
                                                >
                                                    <span className="viaje-id-chip">#{idx + 2}</span>
                                                    <BadgeDocumento doc={a.documento_id} tipo={a.tipo_documento} small />
                                                    <strong>{a.nombre} {a.apellido}</strong>
                                                    <span className="cell-sub">({a.edad} años)</span>
                                                    <Badge tipo={a.numero_asiento ? 'success' : 'neutral'}>
                                                        {a.numero_asiento ? `💺 #${String(a.numero_asiento).padStart(2, '0')}` : '💺 Auto'}
                                                    </Badge>
                                                    <Badge tipo={t.tipo}>{t.etiqueta}</Badge>
                                                    <button type="button" className="btn btn-danger-soft" onClick={() => quitarAcompanante(a.documento_id)} style={{ padding: '3px 6px' }}>
                                                        <Trash size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {mostrarInputAcomp && (
                                    <div className="integrante-row" style={{ gridTemplateColumns: '130px 1fr 1fr 1fr 75px auto', marginTop: 10, marginBottom: 0 }}>
                                        <select
                                            className="input"
                                            value={borradorAcomp.tipo_documento || 'Cédula'}
                                            onChange={(e) => {
                                                const nuevoTipo = e.target.value;
                                                setBorradorAcomp(prev => ({
                                                    ...prev,
                                                    tipo_documento: nuevoTipo,
                                                    documento_id: nuevoTipo === 'Sin Documento' ? '' : prev.documento_id,
                                                    edad: nuevoTipo === 'Sin Documento' && prev.edad > 17 ? 8 : prev.edad
                                                }));
                                            }}
                                        >
                                            {TIPOS_DOC_VIAJERO.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="input"
                                            placeholder={borradorAcomp.tipo_documento === 'Sin Documento' ? 'Se asocia al titular' : (borradorAcomp.tipo_documento === 'Pasaporte' ? 'Nº Pasaporte' : 'Cédula (V-...)')}
                                            value={borradorAcomp.tipo_documento === 'Sin Documento' ? 'Sin cédula (asociado al titular)' : borradorAcomp.documento_id}
                                            disabled={borradorAcomp.tipo_documento === 'Sin Documento'}
                                            onChange={(e) => handleDocAcompChange(e.target.value)}
                                        />
                                        <input
                                            className="input"
                                            placeholder="Nombre"
                                            value={borradorAcomp.nombre}
                                            onChange={(e) => setBorradorAcomp({ ...borradorAcomp, nombre: e.target.value })}
                                        />
                                        <input
                                            className="input"
                                            placeholder="Apellido"
                                            value={borradorAcomp.apellido}
                                            onChange={(e) => setBorradorAcomp({ ...borradorAcomp, apellido: e.target.value })}
                                        />
                                        <input
                                            className="input"
                                            type="number"
                                            min="0"
                                            max={borradorAcomp.tipo_documento === 'Sin Documento' ? 17 : undefined}
                                            placeholder="Edad"
                                            value={borradorAcomp.edad}
                                            onChange={(e) => setBorradorAcomp({ ...borradorAcomp, edad: e.target.value })}
                                        />
                                        <button type="button" className="btn btn-primary" onClick={confirmarAcompanante}>Añadir</button>
                                    </div>
                                )}

                                {/* Mapa interactivo de puestos para asignación */}
                                {idViaje && (
                                    <div style={{ marginTop: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                                                🗺️ Selección de Puestos en el Transporte (Opcional)
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                                                onClick={() => setMostrarMapaAsignar(!mostrarMapaAsignar)}
                                            >
                                                {mostrarMapaAsignar ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                                            </button>
                                        </div>
                                        {mostrarMapaAsignar && (
                                            <MapaAsientos
                                                viaje={viajes.find(v => v.id_viaje === Number(idViaje))}
                                                integrantesViaje={integrantes.filter(i => {
                                                    if (!i.is_active) return false;
                                                    const res = reservas.find(r => r.id_reserva === i.id_reserva);
                                                    return res && res.is_active && res.id_viaje === Number(idViaje);
                                                })}
                                                pasajerosGrupo={[
                                                    {
                                                        documento_id: (clienteExistenteReserva ? clienteExistenteReserva.id_cliente : form.id_cliente) || 'TITULAR',
                                                        nombre: (clienteExistenteReserva ? clienteExistenteReserva.nombre : form.nombre) || 'Titular',
                                                        apellido: (clienteExistenteReserva ? clienteExistenteReserva.apellido : form.apellido) || '',
                                                        edad: edadTitular,
                                                        numero_asiento: asientoTitular,
                                                        esTitular: true
                                                    },
                                                    ...acompanantes
                                                ]}
                                                onAsignarAsiento={(idxPasajero, numAsiento) => {
                                                    if (idxPasajero === 0) {
                                                        if (numAsiento !== null) {
                                                            setAcompanantes(prev => prev.map(a => a.numero_asiento === numAsiento ? { ...a, numero_asiento: null } : a));
                                                        }
                                                        setAsientoTitular(numAsiento);
                                                    } else {
                                                        const idxAcomp = idxPasajero - 1;
                                                        if (numAsiento !== null && asientoTitular === numAsiento) {
                                                            setAsientoTitular(null);
                                                        }
                                                        setAcompanantes(prev => prev.map((a, i) => {
                                                            if (i === idxAcomp) return { ...a, numero_asiento: numAsiento };
                                                            if (numAsiento !== null && a.numero_asiento === numAsiento) return { ...a, numero_asiento: null };
                                                            return a;
                                                        }));
                                                    }
                                                }}
                                                onAutoAsignar={(nuevosNums) => {
                                                    setAsientoTitular(nuevosNums[0] || null);
                                                    setAcompanantes(prev => prev.map((a, i) => ({
                                                        ...a,
                                                        numero_asiento: nuevosNums[i + 1] || null
                                                    })));
                                                }}
                                                titulo="Mapa de Puestos — Selecciona al pasajero y luego su asiento en el mapa"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-grid">
                                <div className="field">
                                    <label>Abono inicial ($) — Mínimo obligatorio: {formatoMoneda(abonoMinimoRequerido)} ($30 × {cantidadPagantes} pagante{cantidadPagantes === 1 ? '' : 's'})</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={abonoMinimoRequerido}
                                            max={montoTotalCalculado || undefined}
                                            value={montoAbono}
                                            onChange={(e) => setMontoAbono(e.target.value)}
                                            required
                                        />
                                        <button type="button" className="btn btn-ghost" onClick={() => setMontoAbono(String(abonoMinimoRequerido))}>
                                            Mínimo (${abonoMinimoRequerido})
                                        </button>
                                        {montoTotalCalculado > 0 && (
                                            <button type="button" className="btn btn-ghost" onClick={() => setMontoAbono(String(montoTotalCalculado))}>
                                                Total (${montoTotalCalculado})
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="field">
                                    <label>Método de pago y Referencia</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ flex: 1 }}>
                                            {METODOS_PAGO.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.icono} {m.label}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            placeholder={['Nequi', 'Bancolombia'].includes(metodoPago) ? 'Nº Comprobante Colombia' : (metodoPago === 'Pago Móvil' ? 'Nº Referencia / 4 dígitos' : 'Referencia del abono')}
                                            value={referencia}
                                            onChange={(e) => setReferencia(e.target.value)}
                                            required
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>

                                {/* Conversor multimoneda en tiempo real (BCV y Pesos COP) */}
                                <div className="field full">
                                    <CalculadoraDivisas
                                        montoUSD={parseFloat(montoAbono) || 0}
                                        metodoSeleccionado={metodoPago}
                                        onCambiarMontoUSD={(usd) => setMontoAbono(String(usd))}
                                        titulo="Conversión Multidivisa del Abono Inicial"
                                    />
                                </div>
                                <div className="calc-box" style={{ flexWrap: 'wrap', gap: 14 }}>
                                    <div>
                                        <div className="cell-sub">Viajeros (cupos)</div>
                                        <strong>{cantidadViajeros}</strong>
                                    </div>
                                    <div>
                                        <div className="cell-sub">Abono mínimo ($30 × {cantidadPagantes})</div>
                                        <strong>{formatoMoneda(abonoMinimoRequerido)}</strong>
                                    </div>
                                    <div>
                                        <div className="cell-sub">Monto Total (con descuentos por edad)</div>
                                        <strong>{formatoMoneda(montoTotalCalculado)}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={resetearTodo}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">
                            {idEditando
                                ? `Actualizar Cliente (${idEditando})`
                                : clienteExistenteReserva
                                    ? 'Confirmar Viaje y Reserva'
                                    : (asignarViajeAhora ? 'Guardar Cliente y Asignar Viaje' : 'Guardar Solo Cliente')}
                        </button>
                    </div>
                </form>
            )}

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Directorio de clientes</div>
                        <div className="card-sub">{filtrados.length} clientes · Haz clic en un cliente para abrir su Expediente e Historial de Viajero</div>
                    </div>
                    <Buscador
                        valor={busquedaDocumento}
                        onChange={setBusquedaDocumento}
                        placeholder="Buscar por cédula, pasaporte, nombre o palabra clave (ej. pasaporte, menor)..."
                    />
                </div>
                {filtrados.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Documento</th>
                                    <th>Cliente</th>
                                    <th>Contacto Único</th>
                                    <th>Historial de Viajes</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map((c) => {
                                    const resumen = obtenerResumenCliente(c.id_cliente);
                                    return (
                                        <tr
                                            key={c.id_cliente}
                                            className={`row-clickable ${c.is_active ? '' : 'inactive'}`}
                                            onClick={() => setClienteExpediente(c)}
                                            title="Haz clic para abrir el expediente e historial de viajes del cliente"
                                        >
                                            <td>
                                                <BadgeDocumento doc={c.id_cliente} tipo={c.tipo_documento} />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.85rem', background: 'linear-gradient(135deg,#0ea5a4,#6366f1)' }}>
                                                        {c.nombre[0]}{c.apellido[0]}
                                                    </div>
                                                    <div>
                                                        <div className="cell-main">{c.nombre} {c.apellido}</div>
                                                        <div className="cell-sub">{c.direccion}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div>{c.correo_electronico}</div>
                                                <div className="cell-sub">{c.telefono}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <Badge tipo="info">{resumen.resTitular.length} reserva{resumen.resTitular.length === 1 ? '' : 's'}</Badge>
                                                    {resumen.saldoPendiente > 0 ? (
                                                        <Badge tipo="warning">Debe {formatoMoneda(resumen.saldoPendiente)}</Badge>
                                                    ) : resumen.resTitular.length > 0 ? (
                                                        <Badge tipo="success">Solvente</Badge>
                                                    ) : null}
                                                </div>
                                                <div className="cell-sub" style={{ marginTop: 3 }}>
                                                    Total abonado: <strong>{formatoMoneda(resumen.totalAbonado)}</strong>
                                                </div>
                                            </td>
                                            <td><EstadoActivo activo={c.is_active} /></td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                                        onClick={() => setClienteExpediente(c)}
                                                    >
                                                        <History size={14} /> Historial
                                                    </button>
                                                    {c.is_active && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost"
                                                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                                            onClick={() => abrirAsignarViajeClienteExistente(c)}
                                                        >
                                                            <Plane size={14} /> Asignar viaje
                                                        </button>
                                                    )}
                                                    <BotonEditar onClick={() => iniciarEdicion(c)} />
                                                    {esAdmin && (
                                                        <BotonBaja
                                                            activo={c.is_active}
                                                            onClick={() => handleEliminar(c.id_cliente)}
                                                            onRestaurar={() => handleRestaurar(c.id_cliente)}
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

            {/* MODAL DE EXPEDIENTE E HISTORIAL DEL VIAJERO */}
            {clienteExpediente && datosExpediente && (
                <div className="modal-backdrop" onClick={() => setClienteExpediente(null)}>
                    <div className="modal-card fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="avatar" style={{ width: 46, height: 46, fontSize: '1.05rem', background: 'linear-gradient(135deg,#0ea5a4,#6366f1)' }}>
                                    {clienteExpediente.nombre[0]}{clienteExpediente.apellido[0]}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <h2 style={{ fontSize: '1.3rem' }}>
                                            {clienteExpediente.nombre} {clienteExpediente.apellido}
                                        </h2>
                                        <BadgeDocumento doc={clienteExpediente.id_cliente} tipo={clienteExpediente.tipo_documento} />
                                        <EstadoActivo activo={clienteExpediente.is_active} />
                                    </div>
                                    <div className="card-sub">
                                        Tel: <strong>{clienteExpediente.telefono}</strong> · Correo: <strong>{clienteExpediente.correo_electronico}</strong> · Dirección: {clienteExpediente.direccion}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {clienteExpediente.is_active && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => abrirAsignarViajeClienteExistente(clienteExpediente)}
                                    >
                                        <Plane size={15} /> Asignar Nuevo Viaje
                                    </button>
                                )}
                                <button className="btn btn-ghost" onClick={() => setClienteExpediente(null)}>
                                    <X size={18} /> Cerrar
                                </button>
                            </div>
                        </div>

                        {/* Resumen Financiero y de Viajes del Cliente */}
                        <div className="calc-box" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 16 }}>
                            <div>
                                <div className="cell-sub">Reservas como Titular</div>
                                <strong>{datosExpediente.resTitular.length} reserva(s)</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Viajes como Pasajero</div>
                                <strong>{datosExpediente.viajesComoPasajero.length} abordaje(s)</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Total Histórico Reservado</div>
                                <strong>{formatoMoneda(datosExpediente.totalReservado)}</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Total Abonado / Pagado</div>
                                <strong style={{ color: '#15803d' }}>{formatoMoneda(datosExpediente.totalAbonado)}</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Saldo Pendiente Actual</div>
                                <strong style={{ color: datosExpediente.saldoPendiente > 0 ? '#b45309' : '#15803d' }}>
                                    {formatoMoneda(datosExpediente.saldoPendiente)}
                                </strong>
                            </div>
                        </div>

                        {/* Tabla 1: Historial de Reservaciones Realizadas como Titular */}
                        <div style={{ marginBottom: 20 }}>
                            <div className="card-title" style={{ marginBottom: 8 }}>
                                Reservaciones Realizadas como Titular ({datosExpediente.resTitular.length})
                            </div>
                            {datosExpediente.resTitular.length === 0 ? (
                                <Vacio texto="Este cliente aún no tiene reservaciones registradas como titular" />
                            ) : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Reserva</th>
                                                <th>Viaje / Destino</th>
                                                <th>Pasajeros</th>
                                                <th>Monto Total</th>
                                                <th>Abonado</th>
                                                <th>Saldo Pendiente</th>
                                                <th>Estatus</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datosExpediente.resTitular.map(r => {
                                                const intsR = integrantes.filter(i => i.id_reserva === r.id_reserva && i.is_active);
                                                const abonadoR = pagos
                                                    .filter(p => p.id_reserva === r.id_reserva && p.is_active)
                                                    .reduce((s, p) => s + Number(p.monto), 0);
                                                const faltaR = Math.max((Number(r.monto_total) || 0) - abonadoR, 0);
                                                return (
                                                    <tr key={r.id_reserva}>
                                                        <td><strong>#{r.id_reserva}</strong></td>
                                                        <td>
                                                            <div className="cell-main">{descripcionViaje(r.id_viaje)}</div>
                                                            <div className="cell-sub">Reservado el {formatoFecha(r.fecha_reserva)}</div>
                                                        </td>
                                                        <td>
                                                            <Badge tipo="info">{intsR.length} viajero{intsR.length === 1 ? '' : 's'}</Badge>
                                                            {(() => {
                                                                const puestos = intsR.map(i => i.numero_asiento).filter(Boolean);
                                                                if (puestos.length > 0) {
                                                                    return (
                                                                        <div style={{ marginTop: 3 }}>
                                                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '2px 5px', borderRadius: 4 }}>
                                                                                💺 #{puestos.sort((a,b)=>a-b).join(', #')}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </td>
                                                        <td className="money">{formatoMoneda(r.monto_total)}</td>
                                                        <td className="money" style={{ color: '#15803d' }}>{formatoMoneda(abonadoR)}</td>
                                                        <td className="money" style={{ color: faltaR > 0 ? '#b45309' : '#15803d' }}>
                                                            {faltaR > 0 ? formatoMoneda(faltaR) : '✓ Liquidado'}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <Badge tipo={r.estatus_pago === 'Pagado' ? 'success' : 'warning'}>
                                                                    {r.estatus_pago}
                                                                </Badge>
                                                                {faltaR > 0 && r.is_active && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary"
                                                                        style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                                                                        onClick={() => setReservaParaLiquidarDirecta({
                                                                            reserva: r,
                                                                            id_reserva: r.id_reserva,
                                                                            id_cliente: r.id_cliente,
                                                                            total: Number(r.monto_total),
                                                                            abonado: abonadoR,
                                                                            falta: faltaR
                                                                        })}
                                                                    >
                                                                        <CreditCard size={12} /> Liquidar ({formatoMoneda(faltaR)})
                                                                    </button>
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

                        {/* Tabla 2: Historial de Abordajes / Manifiestos como Viajero */}
                        <div>
                            <div className="card-title" style={{ marginBottom: 8 }}>
                                Historial de Viajes en Manifiesto de Pasajeros ({datosExpediente.viajesComoPasajero.length})
                            </div>
                            {datosExpediente.viajesComoPasajero.length === 0 ? (
                                <Vacio texto="Sin registros de abordaje en manifiestos" />
                            ) : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>ID Pasajero</th>
                                                <th>Documento Registrado</th>
                                                <th>Reserva</th>
                                                <th>Viaje / Salida</th>
                                                <th>Puesto</th>
                                                <th>Edad Registrada</th>
                                                <th>Tarifa Aplicada</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datosExpediente.viajesComoPasajero.map(i => {
                                                const resAsoc = reservas.find(r => r.id_reserva === i.id_reserva);
                                                const pBase = resAsoc ? obtenerPrecioViaje(resAsoc.id_viaje) : 0;
                                                const tarifa = calcularTarifaPorEdad(pBase, i.edad);
                                                return (
                                                    <tr key={i.id_integrante}>
                                                        <td>#{i.id_integrante}</td>
                                                        <td>
                                                            <BadgeDocumento doc={i.documento_id} tipo={i.tipo_documento} small />
                                                        </td>
                                                        <td>Reserva #{i.id_reserva}</td>
                                                        <td>{resAsoc ? descripcionViaje(resAsoc.id_viaje) : '—'}</td>
                                                        <td>
                                                            <Badge tipo={i.numero_asiento ? 'info' : 'neutral'}>
                                                                {i.numero_asiento ? `💺 #${String(i.numero_asiento).padStart(2, '0')}` : 'Sin puesto'}
                                                            </Badge>
                                                        </td>
                                                        <td>{i.edad} años</td>
                                                        <td>
                                                            <Badge tipo={tarifa.tipo}>{tarifa.etiqueta}</Badge>
                                                            <span style={{ marginLeft: 8, fontWeight: 700, fontSize: '0.82rem' }}>
                                                                {formatoMoneda(tarifa.monto)}
                                                            </span>
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
                </div>
            )}

            <ModalLiquidarSaldo
                infoReserva={reservaParaLiquidarDirecta}
                abierto={!!reservaParaLiquidarDirecta}
                onCerrar={() => setReservaParaLiquidarDirecta(null)}
                onLiquidado={() => {
                    setExito('¡Reserva liquidada exitosamente!');
                    cargarDatos();
                }}
            />
        </div>
    );
}
