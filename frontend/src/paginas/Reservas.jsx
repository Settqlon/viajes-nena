import { useEffect, useState } from 'react';
import {
    Plus, X, Users, UserPlus, CreditCard, Search, Trash, Eye, Printer
} from 'lucide-react';
import { obtenerReservas, crearReserva, actualizarReserva, eliminarReserva } from '../servicios/reservasServicios';
import { obtenerClientes, crearCliente } from '../servicios/clientesServicios';
import { obtenerViajes } from '../servicios/viajesServicios';
import { obtenerDestinos } from '../servicios/destinosServicios';
import { obtenerPaquetes } from '../servicios/paquetesServicios';
import { obtenerIntegrantes, crearIntegrante, actualizarIntegrante, eliminarIntegrante } from '../servicios/integrantesServicios';
import { obtenerPagos, crearPago, actualizarPago, eliminarPago } from '../servicios/pagosServicios';
import {
    PageHeader, Buscador, EstadoActivo, BotonEditar, BotonBaja, Vacio, Badge, SelectorViaje, formatoMoneda, formatoFecha, mensajeError,
    BadgeDocumento, formatearDocumento, coincideBusquedaAvanzada, TIPOS_DOC_TITULAR, TIPOS_DOC_VIAJERO,
    METODOS_PAGO, BadgeMetodoPago, CalculadoraDivisas, formatoBs, formatoCOP, ModalLiquidarSaldo
} from '../componentes/UI';
import { obtenerTasasLocales } from '../servicios/tasasServicios';
import MapaAsientos from '../componentes/MapaAsientos';

const ABONO_POR_INTEGRANTE = 30;
const TIPO_PAGO = { 'Pagado': 'success', 'Abonado': 'warning' };

const INTEGRANTE_VACIO = { tipo_documento: 'Cédula', nombre: '', apellido: '', documento_id: '', edad: 25, autocompletado: false };
const CLIENTE_NUEVO_VACIO = { tipo_documento: 'Cédula', nombre: '', apellido: '', telefono: '', correo_electronico: '', direccion: '' };

export default function Reservas({ esAdmin = true, esOperador = false, esVendedor = false }) {
    const [reservas, setReservas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [destinos, setDestinos] = useState([]);
    const [paquetes, setPaquetes] = useState([]);
    const [integrantes, setIntegrantes] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [error, setError] = useState('');
    const [reservaParaLiquidarDirecta, setReservaParaLiquidarDirecta] = useState(null);

    // Formulario de nueva reserva (sin redundancia: el titular se incluye automáticamente y si no existe se registra ahí mismo)
    const [mostrarForm, setMostrarForm] = useState(false);
    const [documentoInput, setDocumentoInput] = useState('');
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [nuevoClienteRapido, setNuevoClienteRapido] = useState({ ...CLIENTE_NUEVO_VACIO });
    const [mensajeCliente, setMensajeCliente] = useState('');
    const [idViaje, setIdViaje] = useState('');
    const [titularViaja, setTitularViaja] = useState(true);
    const [edadTitular, setEdadTitular] = useState(30);
    const [asientoTitular, setAsientoTitular] = useState(null);
    const [acompanantes, setAcompanantes] = useState([]);
    const [borradorAcompanante, setBorradorAcompanante] = useState({ ...INTEGRANTE_VACIO });
    const [mostrarInputAcompanante, setMostrarInputAcompanante] = useState(false);
    const [mostrarMapaForm, setMostrarMapaForm] = useState(true);
    const [montoAbono, setMontoAbono] = useState('30');
    const [metodoPago, setMetodoPago] = useState('Transferencia');
    const [referencia, setReferencia] = useState('');

    // Búsqueda en tabla por número de documento del cliente
    const [busquedaDocumento, setBusquedaDocumento] = useState('');
    const [filtroEstatus, setFiltroEstatus] = useState('');

    // Reserva seleccionada para ver todo su detalle en modal
    const [idReservaDetalle, setIdReservaDetalle] = useState(null);
    const [mostrarMapaModal, setMostrarMapaModal] = useState(false);
    const [editandoViajeModal, setEditandoViajeModal] = useState(false);
    const [nuevoViajeIdModal, setNuevoViajeIdModal] = useState('');
    const [idIntegranteEditandoModal, setIdIntegranteEditandoModal] = useState(null);
    const [nuevoIntegranteModal, setNuevoIntegranteModal] = useState({ ...INTEGRANTE_VACIO });
    const [mostrarFormIntegranteModal, setMostrarFormIntegranteModal] = useState(false);
    const [idPagoEditandoModal, setIdPagoEditandoModal] = useState(null);
    const [nuevoPagoModal, setNuevoPagoModal] = useState({ monto: '', metodo_pago: 'Transferencia', referencia: '' });
    const [mostrarFormPagoModal, setMostrarFormPagoModal] = useState(false);

    const cargarDatos = async () => {
        try {
            const [rData, cData, vData, dData, pData, iData, pgData] = await Promise.all([
                obtenerReservas(),
                obtenerClientes(),
                obtenerViajes(),
                obtenerDestinos(),
                obtenerPaquetes(),
                obtenerIntegrantes(),
                obtenerPagos()
            ]);
            setReservas(rData);
            setClientes(cData);
            setViajes(vData);
            setDestinos(dData);
            setPaquetes(pData);
            setIntegrantes(iData);
            setPagos(pgData);
        } catch (err) {
            setError('Error al obtener los datos de reservas.');
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    // Helpers de precio y nombres
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

    const obtenerCliente = (id) => clientes.find(c => c.id_cliente === id);
    const nombreCliente = (id) => {
        const c = obtenerCliente(id);
        return c ? `${c.nombre} ${c.apellido}` : id;
    };

    const descripcionViaje = (id) => {
        const v = viajes.find(v => v.id_viaje === Number(id));
        if (!v) return `Viaje #${id}`;
        const d = destinos.find(d => d.id_destino === v.id_destino);
        const p = paquetes.find(p => p.id_paquete === v.id_paquete);
        return `${d?.nombre_destino || 'Destino'}${p ? ` (${p.nombre_paquete})` : ''} · ${formatoFecha(v.fecha_salida + 'T00:00:00')}`;
    };

    // Busca si un documento ya existe en clientes o en integrantes previos para no escribir sus datos dos veces
    const buscarPersonaConocida = (docTexto) => {
        const limpio = docTexto.trim().toLowerCase();
        if (!limpio) return null;
        const intPrevio = integrantes.find(i => i.documento_id.toLowerCase() === limpio);
        const cli = clientes.find(c => c.id_cliente.toLowerCase() === limpio);
        if (cli) {
            return {
                nombre: cli.nombre,
                apellido: cli.apellido,
                documento_id: cli.id_cliente,
                edad: intPrevio ? intPrevio.edad : 30
            };
        }
        if (intPrevio) {
            return {
                nombre: intPrevio.nombre,
                apellido: intPrevio.apellido,
                documento_id: intPrevio.documento_id,
                edad: intPrevio.edad
            };
        }
        return null;
    };

    // Buscar cliente únicamente por su número de documento (e incluirlo automáticamente como viajero titular)
    const buscarClientePorDocumento = (docTexto) => {
        setDocumentoInput(docTexto);
        const limpio = docTexto.trim().toLowerCase();
        if (!limpio) {
            setClienteSeleccionado(null);
            setMensajeCliente('');
            return;
        }
        const exacto = clientes.find(c => c.is_active && c.id_cliente.toLowerCase() === limpio);
        const intPrevio = integrantes.find(i => i.documento_id.toLowerCase() === limpio);
        if (intPrevio && intPrevio.edad < 18) {
            setClienteSeleccionado(null);
            setEdadTitular(intPrevio.edad);
            setMensajeCliente(`Esta cédula pertenece a un menor de edad (${intPrevio.edad} años). El cliente titular que hace la reservación debe ser mayor de 18 años.`);
            return;
        }
        if (exacto) {
            setClienteSeleccionado(exacto);
            setMensajeCliente('');
            if (intPrevio) setEdadTitular(Math.max(intPrevio.edad, 18));
        } else {
            setClienteSeleccionado(null);
            setMensajeCliente('No se encontró un cliente activo con ese documento.');
        }
    };

    // Datos del titular actual (ya sea existente o que se esté registrando en el mismo paso)
    const titularDatos = clienteSeleccionado || (
        documentoInput.trim() && nuevoClienteRapido.nombre.trim() && nuevoClienteRapido.apellido.trim()
            ? {
                id_cliente: documentoInput.trim(),
                nombre: nuevoClienteRapido.nombre.trim(),
                apellido: nuevoClienteRapido.apellido.trim()
            }
            : null
    );

    // Lista final de viajeros = (Titular si viaja) + Acompañantes
    const listaIntegrantes = [
        ...(titularViaja && titularDatos ? [{
            nombre: titularDatos.nombre,
            apellido: titularDatos.apellido,
            documento_id: titularDatos.id_cliente,
            edad: parseInt(edadTitular) || 30,
            numero_asiento: asientoTitular,
            esTitular: true
        }] : []),
        ...acompanantes
    ];

    // Asignar puesto desde el mapa interactivo en el formulario de Nueva Reserva
    const handleAsignarAsientoForm = (indexPasajero, numAsiento) => {
        const pasajero = listaIntegrantes[indexPasajero];
        if (!pasajero) return;
        if (numAsiento !== null) {
            if (asientoTitular === numAsiento && !pasajero.esTitular) {
                setAsientoTitular(null);
            }
            setAcompanantes(prev => prev.map(a =>
                a.documento_id !== pasajero.documento_id && a.numero_asiento === numAsiento
                    ? { ...a, numero_asiento: null }
                    : a
            ));
        }
        if (pasajero.esTitular) {
            setAsientoTitular(numAsiento);
        } else {
            setAcompanantes(prev => prev.map(a =>
                a.documento_id === pasajero.documento_id
                    ? { ...a, numero_asiento: numAsiento }
                    : a
            ));
        }
    };

    // Regla de tarifas por edad: <3 años gratis ($0), <13 años -25% descuento, >=13 años tarifa completa (100%)
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

    // Cálculos automáticos para nueva reserva según la edad de cada integrante
    const precioUnitario = obtenerPrecioViaje(idViaje);
    const cantidadViajeros = Math.max(listaIntegrantes.length, 1);
    const cantidadPagantes = Math.max(
        listaIntegrantes.filter(i => (parseInt(i.edad) || 0) >= 3).length,
        1
    );
    const montoTotalCalculado = listaIntegrantes.length > 0
        ? Number(listaIntegrantes.reduce((s, i) => s + calcularTarifaPorEdad(precioUnitario, i.edad).monto, 0).toFixed(2))
        : precioUnitario;
    const abonoMinimoRequerido = ABONO_POR_INTEGRANTE * cantidadPagantes;
    const abonoNumerico = parseFloat(montoAbono) || 0;
    const saldoRestanteForm = Math.max(montoTotalCalculado - abonoNumerico, 0);

    const actualizarAbonoMinimo = (totalPagantes) => {
        const nuevoMinimo = ABONO_POR_INTEGRANTE * Math.max(totalPagantes, 1);
        if ((parseFloat(montoAbono) || 0) < nuevoMinimo) {
            setMontoAbono(String(nuevoMinimo));
        }
    };

    // Autocompletar acompañante al escribir su documento (y limpiar si cambia a una cédula no registrada)
    const handleDocumentoAcompanante = (doc) => {
        const conocida = buscarPersonaConocida(doc);
        if (conocida) {
            setBorradorAcompanante({
                documento_id: doc,
                nombre: conocida.nombre,
                apellido: conocida.apellido,
                edad: conocida.edad,
                autocompletado: true
            });
        } else {
            setBorradorAcompanante(prev => ({
                documento_id: doc,
                nombre: prev.autocompletado ? '' : prev.nombre,
                apellido: prev.autocompletado ? '' : prev.apellido,
                edad: prev.autocompletado ? 25 : prev.edad,
                autocompletado: false
            }));
        }
    };

    const confirmarAcompanante = () => {
        const tipoDoc = borradorAcompanante.tipo_documento || 'Cédula';
        const nom = borradorAcompanante.nombre.trim();
        const ape = borradorAcompanante.apellido.trim();
        const ed = parseInt(borradorAcompanante.edad);
        if (!nom || !ape || isNaN(ed) || ed < 0) {
            alert('Completa nombre, apellido y edad del acompañante.');
            return;
        }
        if (tipoDoc === 'Sin Documento' && ed > 17) {
            alert('Solo los menores de edad (0 a 17 años) pueden viajar sin documento de identidad.');
            return;
        }
        let doc = borradorAcompanante.documento_id.trim();
        if (tipoDoc !== 'Sin Documento' && !doc) {
            alert(`Debes ingresar el número de ${tipoDoc.toLowerCase()} del acompañante.`);
            return;
        }
        if (tipoDoc === 'Sin Documento') {
            const numHijo = acompanantes.filter(a => a.tipo_documento === 'Sin Documento').length + 1;
            doc = `MENOR-${documentoInput.trim() || 'TITULAR'}-${numHijo}`;
        } else if (listaIntegrantes.some(i => i.documento_id.toLowerCase() === doc.toLowerCase())) {
            alert('Esta persona ya está incluida en la lista de viajeros de esta reserva.');
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
        setBorradorAcompanante({ ...INTEGRANTE_VACIO });
        setMostrarInputAcompanante(false);
        const pagantesNuevos = nuevos.filter(a => (parseInt(a.edad) || 0) >= 3).length;
        actualizarAbonoMinimo((titularViaja && titularDatos ? 1 : 0) + pagantesNuevos);
    };

    const quitarAcompanante = (doc) => {
        const nuevos = acompanantes.filter(a => a.documento_id !== doc);
        setAcompanantes(nuevos);
    };

    const handleSubmitReserva = async (e) => {
        e.preventDefault();
        if (!documentoInput.trim()) {
            alert('Debes ingresar el número de documento del cliente.');
            return;
        }
        const edadTitularNum = parseInt(edadTitular);
        if (isNaN(edadTitularNum) || edadTitularNum < 18) {
            alert('El cliente titular que realiza la reservación no puede ser menor de edad (debe tener mínimo 18 años).');
            return;
        }
        const intMenorTitular = integrantes.find(i => i.documento_id.toLowerCase() === documentoInput.trim().toLowerCase() && i.edad < 18);
        if (intMenorTitular) {
            alert(`El documento ${documentoInput.trim()} pertenece a un menor de edad (${intMenorTitular.edad} años) y no puede ser titular de una reservación.`);
            return;
        }
        if (!idViaje) {
            alert('Debes seleccionar un viaje disponible.');
            return;
        }
        if (listaIntegrantes.length === 0) {
            alert('La reserva debe tener al menos 1 viajero (el cliente titular o un acompañante).');
            return;
        }
        if (abonoNumerico < abonoMinimoRequerido) {
            alert(`Por ley del sistema se requieren mínimo $${abonoMinimoRequerido.toFixed(2)} de abono ($30.00 × ${cantidadViajeros} integrante(s)).`);
            return;
        }
        try {
            let titularFinal = clienteSeleccionado;
            if (!titularFinal) {
                const telDup = clientes.some(c => c.telefono.trim() === nuevoClienteRapido.telefono.trim());
                const mailDup = clientes.some(c => c.correo_electronico.toLowerCase() === nuevoClienteRapido.correo_electronico.trim().toLowerCase());
                if (telDup) {
                    alert('El número de teléfono ingresado ya pertenece a otro cliente.');
                    return;
                }
                if (mailDup) {
                    alert('El correo electrónico ingresado ya pertenece a otro cliente.');
                    return;
                }
                titularFinal = await crearCliente({
                    id_cliente: documentoInput.trim(),
                    tipo_documento: nuevoClienteRapido.tipo_documento || 'Cédula',
                    nombre: nuevoClienteRapido.nombre.trim(),
                    apellido: nuevoClienteRapido.apellido.trim(),
                    telefono: nuevoClienteRapido.telefono.trim(),
                    correo_electronico: nuevoClienteRapido.correo_electronico.trim().toLowerCase(),
                    direccion: nuevoClienteRapido.direccion.trim()
                });
            }

            await crearReserva({
                id_cliente: titularFinal.id_cliente,
                id_viaje: parseInt(idViaje),
                integrantes: listaIntegrantes.map(i => ({
                    nombre: i.nombre.trim(),
                    apellido: i.apellido.trim(),
                    tipo_documento: i.tipo_documento || 'Cédula',
                    documento_id: (i.tipo_documento === 'Sin Documento' ? '' : (i.documento_id || '')).trim(),
                    edad: parseInt(i.edad),
                    numero_asiento: i.numero_asiento ? parseInt(i.numero_asiento) : null
                })),
                monto_abono: abonoNumerico,
                metodo_pago: metodoPago,
                referencia: referencia.trim() || 'ABONO-INICIAL'
            });
            setDocumentoInput('');
            setClienteSeleccionado(null);
            setNuevoClienteRapido({ ...CLIENTE_NUEVO_VACIO });
            setIdViaje('');
            setTitularViaja(true);
            setAsientoTitular(null);
            setAcompanantes([]);
            setBorradorAcompanante({ ...INTEGRANTE_VACIO });
            setMostrarInputAcompanante(false);
            setMontoAbono('30');
            setReferencia('');
            setMostrarForm(false);
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'Error al crear la reserva.'));
        }
    };

    const handleEliminar = async (e, id) => {
        e.stopPropagation();
        if (confirm('¿Deseas dar de baja esta reserva? Se liberarán sus cupos en el viaje y podrás restaurarla después.')) {
            try {
                await eliminarReserva(id);
                cargarDatos();
            } catch (err) {
                alert('No se pudo desactivar la reserva.');
            }
        }
    };

    const handleRestaurarReserva = async (e, id) => {
        e.stopPropagation();
        try {
            await actualizarReserva(id, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar la reserva.'));
        }
    };

    const handleCambiarViajeModal = async (e) => {
        e.preventDefault();
        if (!nuevoViajeIdModal) return;
        try {
            await actualizarReserva(idReservaDetalle, { id_viaje: parseInt(nuevoViajeIdModal) });
            setEditandoViajeModal(false);
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo cambiar el viaje de la reserva.'));
        }
    };

    // Acciones dentro del modal de detalle de reserva
    const handleAgregarIntegranteModal = async (e) => {
        e.preventDefault();
        try {
            const tipoDoc = nuevoIntegranteModal.tipo_documento || 'Cédula';
            if (tipoDoc === 'Sin Documento' && parseInt(nuevoIntegranteModal.edad) > 17) {
                alert('Solo los menores de edad (0 a 17 años) pueden viajar sin documento de identidad.');
                return;
            }
            if (tipoDoc !== 'Sin Documento' && !nuevoIntegranteModal.documento_id.trim()) {
                alert(`Debes ingresar el número de ${tipoDoc.toLowerCase()} del integrante.`);
                return;
            }
            if (idIntegranteEditandoModal) {
                await actualizarIntegrante(idIntegranteEditandoModal, {
                    nombre: nuevoIntegranteModal.nombre.trim(),
                    apellido: nuevoIntegranteModal.apellido.trim(),
                    tipo_documento: tipoDoc,
                    documento_id: tipoDoc === 'Sin Documento' ? '' : nuevoIntegranteModal.documento_id.trim(),
                    edad: parseInt(nuevoIntegranteModal.edad)
                });
            } else {
                await crearIntegrante({
                    id_reserva: idReservaDetalle,
                    nombre: nuevoIntegranteModal.nombre.trim(),
                    apellido: nuevoIntegranteModal.apellido.trim(),
                    tipo_documento: tipoDoc,
                    documento_id: tipoDoc === 'Sin Documento' ? '' : nuevoIntegranteModal.documento_id.trim(),
                    edad: parseInt(nuevoIntegranteModal.edad)
                });
            }
            setIdIntegranteEditandoModal(null);
            setNuevoIntegranteModal({ ...INTEGRANTE_VACIO });
            setMostrarFormIntegranteModal(false);
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo guardar el integrante.'));
        }
    };

    const iniciarEdicionIntegranteModal = (i) => {
        setIdIntegranteEditandoModal(i.id_integrante);
        setNuevoIntegranteModal({
            tipo_documento: i.tipo_documento || (i.documento_id?.startsWith('MENOR-') ? 'Sin Documento' : 'Cédula'),
            documento_id: i.documento_id?.startsWith('MENOR-') ? '' : i.documento_id,
            nombre: i.nombre,
            apellido: i.apellido,
            edad: i.edad,
            autocompletado: false
        });
        setMostrarFormIntegranteModal(true);
    };

    const handleEliminarIntegranteModal = async (idIntegrante) => {
        if (confirm('¿Dar de baja a este integrante? El monto de la reserva se ajustará automáticamente.')) {
            try {
                await eliminarIntegrante(idIntegrante);
                cargarDatos();
            } catch (err) {
                alert('No se pudo dar de baja al integrante.');
            }
        }
    };

    const handleRestaurarIntegranteModal = async (idIntegrante) => {
        try {
            await actualizarIntegrante(idIntegrante, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar al integrante.'));
        }
    };

    const handleRegistrarPagoModal = async (e) => {
        e.preventDefault();
        try {
            if (idPagoEditandoModal) {
                await actualizarPago(idPagoEditandoModal, {
                    monto: parseFloat(nuevoPagoModal.monto),
                    metodo_pago: nuevoPagoModal.metodo_pago,
                    referencia: nuevoPagoModal.referencia.trim()
                });
            } else {
                await crearPago({
                    id_reserva: idReservaDetalle,
                    monto: parseFloat(nuevoPagoModal.monto),
                    metodo_pago: nuevoPagoModal.metodo_pago,
                    referencia: nuevoPagoModal.referencia.trim()
                });
            }
            setIdPagoEditandoModal(null);
            setNuevoPagoModal({ monto: '', metodo_pago: 'Transferencia', referencia: '' });
            setMostrarFormPagoModal(false);
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo guardar el pago.'));
        }
    };

    const iniciarEdicionPagoModal = (p) => {
        setIdPagoEditandoModal(p.id_pago);
        setNuevoPagoModal({
            monto: String(p.monto),
            metodo_pago: p.metodo_pago,
            referencia: p.referencia
        });
        setMostrarFormPagoModal(true);
    };

    const handleEliminarPagoModal = async (idPago) => {
        if (confirm('¿Anular este pago? El estatus de la reserva se recalculará automáticamente.')) {
            try {
                await eliminarPago(idPago);
                cargarDatos();
            } catch (err) {
                alert('No se pudo anular el pago.');
            }
        }
    };

    const handleRestaurarPagoModal = async (idPago) => {
        try {
            await actualizarPago(idPago, { is_active: true });
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el pago.'));
        }
    };

    // Solo aparecen reservas que cumplen con el monto mínimo obligatorio ($30 × integrante), manteniendo visibles las dadas de baja para poder restaurarlas
    const filtradas = reservas.filter(r => {
        if (r.is_active) {
            const intsRes = integrantes.filter(i => i.id_reserva === r.id_reserva && i.is_active);
            const pagosRes = pagos.filter(p => p.id_reserva === r.id_reserva && p.is_active);
            const totalAbonado = pagosRes.reduce((s, p) => s + Number(p.monto), 0);
            const pagantesRes = intsRes.filter(i => (parseInt(i.edad) || 0) >= 3).length;
            const minimoLey = ABONO_POR_INTEGRANTE * Math.max(pagantesRes, 1);
            if (totalAbonado < minimoLey) return false;
        }
        if (filtroEstatus && r.estatus_pago !== filtroEstatus) return false;
        if (!busquedaDocumento.trim()) return true;
        const cli = obtenerCliente(r.id_cliente);
        const intsRes = integrantes.filter(i => i.id_reserva === r.id_reserva);
        return coincideBusquedaAvanzada(busquedaDocumento, {
            id_cliente: r.id_cliente,
            tipo_documento: cli?.tipo_documento,
            nombre: cli?.nombre,
            apellido: cli?.apellido
        }) || intsRes.some(i => coincideBusquedaAvanzada(busquedaDocumento, i));
    });

    const totalFiltrado = filtradas.reduce((suma, r) => suma + Number(r.monto_total), 0);

    // Datos de la reserva abierta en el modal
    const reservaDetalle = reservas.find(r => r.id_reserva === idReservaDetalle);
    const clienteDetalle = reservaDetalle ? obtenerCliente(reservaDetalle.id_cliente) : null;
    const viajeDetalle = reservaDetalle ? viajes.find(v => v.id_viaje === reservaDetalle.id_viaje) : null;
    const integrantesTodosDetalle = reservaDetalle
        ? integrantes.filter(i => i.id_reserva === reservaDetalle.id_reserva)
        : [];
    const integrantesDetalle = integrantesTodosDetalle.filter(i => i.is_active);
    const pagosTodosDetalle = reservaDetalle
        ? pagos.filter(p => p.id_reserva === reservaDetalle.id_reserva)
        : [];
    const pagosDetalle = pagosTodosDetalle.filter(p => p.is_active);
    const totalPagadoDetalle = pagosDetalle.reduce((s, p) => s + Number(p.monto), 0);
    const saldoPendienteDetalle = reservaDetalle
        ? Math.max(Number(reservaDetalle.monto_total) - totalPagadoDetalle, 0)
        : 0;
    const porcentajePagadoDetalle = reservaDetalle && Number(reservaDetalle.monto_total) > 0
        ? Math.min(Math.round((totalPagadoDetalle / Number(reservaDetalle.monto_total)) * 100), 100)
        : 0;

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Reservas"
                subtitulo="Toca cualquier reserva para ver sus integrantes, puestos asignados, pagos y estado de cuenta completo"
            >
                <button className="btn btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
                    {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nueva Reserva</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            {mostrarForm && (
                <form onSubmit={handleSubmitReserva} className="card fade-in" style={{ marginBottom: 22 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Crear Nueva Reserva</div>
                            <div className="card-sub">
                                Ley de apartado: se requieren mínimo <strong>$30.00 de abono por cada integrante</strong> para reservar cupos.
                            </div>
                        </div>
                    </div>

                    {/* Paso 1: Cliente por número de documento y selección de viaje ordenada */}
                    <div className="form-grid" style={{ marginBottom: 18 }}>
                        <div className="field full">
                            <label>1. Número de documento del cliente (si no existe, puedes registrarlo aquí mismo)</label>
                            <input
                                type="text"
                                value={documentoInput}
                                onChange={(e) => buscarClientePorDocumento(e.target.value)}
                                placeholder="Escribe el documento del cliente (ej. V-14523890)..."
                                required
                            />
                            {clienteSeleccionado && (
                                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--success-soft)', color: '#15803d', fontSize: '0.84rem', fontWeight: 600 }}>
                                    Cliente registrado: {clienteSeleccionado.nombre} {clienteSeleccionado.apellido} ({clienteSeleccionado.id_cliente}) · Tel: {clienteSeleccionado.telefono} · {clienteSeleccionado.correo_electronico}
                                </div>
                            )}
                            {!clienteSeleccionado && documentoInput.trim() && (
                                <div style={{ marginTop: 10, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 10 }}>
                                        Documento nuevo ({documentoInput.trim()}) — Completa los datos para registrar al cliente y asignarle este viaje de una vez:
                                    </div>
                                    <div className="form-grid">
                                        <div className="field">
                                            <label>Tipo de Documento</label>
                                            <select
                                                value={nuevoClienteRapido.tipo_documento}
                                                onChange={(e) => setNuevoClienteRapido({ ...nuevoClienteRapido, tipo_documento: e.target.value })}
                                            >
                                                <option value="Cédula">🪪 Cédula de Identidad (V-/E-)</option>
                                                <option value="Pasaporte">🛂 Pasaporte</option>
                                            </select>
                                        </div>
                                        <div className="field">
                                            <label>Nombre</label>
                                            <input
                                                value={nuevoClienteRapido.nombre}
                                                onChange={(e) => setNuevoClienteRapido({ ...nuevoClienteRapido, nombre: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="field">
                                            <label>Apellido</label>
                                            <input
                                                value={nuevoClienteRapido.apellido}
                                                onChange={(e) => setNuevoClienteRapido({ ...nuevoClienteRapido, apellido: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="field">
                                            <label>Teléfono (único)</label>
                                            <input
                                                placeholder="0414-1234567"
                                                value={nuevoClienteRapido.telefono}
                                                onChange={(e) => setNuevoClienteRapido({ ...nuevoClienteRapido, telefono: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="field">
                                            <label>Correo electrónico (único)</label>
                                            <input
                                                type="email"
                                                value={nuevoClienteRapido.correo_electronico}
                                                onChange={(e) => setNuevoClienteRapido({ ...nuevoClienteRapido, correo_electronico: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="field full">
                                            <label>Dirección</label>
                                            <input
                                                value={nuevoClienteRapido.direccion}
                                                onChange={(e) => setNuevoClienteRapido({ ...nuevoClienteRapido, direccion: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="field full">
                            <label>2. Seleccionar Viaje (filtra por destino y haz clic en la salida deseada)</label>
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
                    </div>

                    {/* Paso 2: Viajeros sin redundancia (el titular ya queda incluido automáticamente + acompañantes por documento) */}
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                            <div>
                                <strong style={{ fontSize: '0.95rem' }}>
                                    3. Viajeros de la Reserva ({listaIntegrantes.length} viajero{listaIntegrantes.length === 1 ? '' : 's'})
                                </strong>
                                <div className="cell-sub">
                                    El cliente titular se incluye automáticamente. Solo agrega acompañantes si viaja con más personas.
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                {clienteSeleccionado && (
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
                                        <input
                                            type="checkbox"
                                            checked={titularViaja}
                                            onChange={(e) => setTitularViaja(e.target.checked)}
                                        />
                                        El cliente titular viaja
                                    </label>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setMostrarInputAcompanante(!mostrarInputAcompanante)}
                                    style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                                >
                                    <UserPlus size={15} /> {mostrarInputAcompanante ? 'Cerrar acompañante' : '+ Añadir acompañante'}
                                </button>
                            </div>
                        </div>

                        {/* Tarjetas / Chips de los viajeros actuales */}
                        {listaIntegrantes.length === 0 ? (
                            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#fff', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: '0.84rem' }}>
                                Ingresa arriba el documento del cliente titular (o añade un acompañante si el titular no viaja).
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                                {listaIntegrantes.map((item, idx) => (
                                    <div
                                        key={item.documento_id + idx}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 10,
                                            background: '#fff',
                                            border: item.esTitular ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                            borderRadius: 10,
                                            padding: '10px 12px'
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <span className="viaje-id-chip">#{idx + 1}</span>
                                                <strong style={{ fontSize: '0.88rem' }}>{item.nombre} {item.apellido}</strong>
                                                {item.esTitular && <Badge tipo="info">Titular</Badge>}
                                                <Badge tipo={item.numero_asiento ? 'success' : 'neutral'}>
                                                    {item.numero_asiento
                                                        ? `💺 Puesto #${String(item.numero_asiento).padStart(2, '0')}`
                                                        : '💺 Puesto automático'}
                                                </Badge>
                                            </div>
                                            <div className="cell-sub" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <BadgeDocumento doc={item.documento_id} tipo={item.tipo_documento} />
                                                <span>· {item.edad} años</span>
                                                <Badge tipo={calcularTarifaPorEdad(precioUnitario, item.edad).tipo}>
                                                    {calcularTarifaPorEdad(precioUnitario, item.edad).etiqueta}
                                                    {precioUnitario > 0 ? ` (${formatoMoneda(calcularTarifaPorEdad(precioUnitario, item.edad).monto)})` : ''}
                                                </Badge>
                                            </div>
                                        </div>

                                        {item.esTitular ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span className="cell-sub">Edad (+18):</span>
                                                    <input
                                                        type="number"
                                                        min="18"
                                                        className="input"
                                                        value={edadTitular}
                                                        onChange={(e) => setEdadTitular(e.target.value)}
                                                        style={{ width: 68, padding: '5px 8px', fontSize: '0.82rem' }}
                                                    />
                                                </div>
                                                {(parseInt(edadTitular) || 0) < 18 && (
                                                    <small style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.72rem' }}>
                                                        Mín. 18 años
                                                    </small>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-danger-soft"
                                                onClick={() => quitarAcompanante(item.documento_id)}
                                                title="Quitar acompañante"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Barra rápida para añadir acompañante (Cédula, Pasaporte o Menor sin documento) */}
                        {mostrarInputAcompanante && (
                            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: '#fff', border: '1px solid var(--border)' }}>
                                <div className="cell-sub" style={{ marginBottom: 8, fontWeight: 600 }}>
                                    Selecciona el tipo de identificación: para niños pequeños sin cédula elige &quot;Menor sin cédula&quot; y se asociará automáticamente al titular.
                                </div>
                                <div className="integrante-row" style={{ gridTemplateColumns: '155px 1fr 1fr 1fr 85px auto', marginBottom: 0 }}>
                                    <select
                                        className="input"
                                        value={borradorAcompanante.tipo_documento}
                                        onChange={(e) => {
                                            const t = e.target.value;
                                            setBorradorAcompanante(prev => ({
                                                ...prev,
                                                tipo_documento: t,
                                                documento_id: t === 'Sin Documento' ? '' : prev.documento_id,
                                                edad: t === 'Sin Documento' && prev.edad > 17 ? 8 : prev.edad
                                            }));
                                        }}
                                        title="Tipo de identificación"
                                    >
                                        <option value="Cédula">🪪 Cédula</option>
                                        <option value="Pasaporte">🛂 Pasaporte</option>
                                        <option value="Sin Documento">👶 Menor sin cédula</option>
                                    </select>
                                    <input
                                        className="input"
                                        placeholder={borradorAcompanante.tipo_documento === 'Sin Documento' ? 'Se asocia al titular (auto)' : (borradorAcompanante.tipo_documento === 'Pasaporte' ? 'Nro. de Pasaporte' : '1. Cédula (V-12345678)')}
                                        value={borradorAcompanante.tipo_documento === 'Sin Documento' ? '(Menor sin cédula)' : borradorAcompanante.documento_id}
                                        onChange={(e) => handleDocumentoAcompanante(e.target.value)}
                                        disabled={borradorAcompanante.tipo_documento === 'Sin Documento'}
                                    />
                                    <input
                                        className="input"
                                        placeholder="Nombre"
                                        value={borradorAcompanante.nombre}
                                        onChange={(e) => setBorradorAcompanante({ ...borradorAcompanante, nombre: e.target.value })}
                                    />
                                    <input
                                        className="input"
                                        placeholder="Apellido"
                                        value={borradorAcompanante.apellido}
                                        onChange={(e) => setBorradorAcompanante({ ...borradorAcompanante, apellido: e.target.value })}
                                    />
                                    <input
                                        className="input"
                                        type="number"
                                        min="0"
                                        max={borradorAcompanante.tipo_documento === 'Sin Documento' ? '17' : '120'}
                                        placeholder="Edad"
                                        value={borradorAcompanante.edad}
                                        onChange={(e) => setBorradorAcompanante({ ...borradorAcompanante, edad: e.target.value })}
                                    />
                                    <button type="button" className="btn btn-primary" onClick={confirmarAcompanante}>
                                        Añadir
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mapa Interactivo de Puestos (Bus Cama 2 Pisos 60 puestos / Avión 150 puestos) */}
                        {idViaje && listaIntegrantes.length > 0 && (
                            <div style={{ marginTop: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                                        🗺️ Selección de Puestos en el Transporte (Opcional: si no eliges uno, se asigna el siguiente libre)
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                                        onClick={() => setMostrarMapaForm(!mostrarMapaForm)}
                                    >
                                        {mostrarMapaForm ? 'Ocultar Mapa de Puestos' : 'Mostrar Mapa de Puestos'}
                                    </button>
                                </div>
                                {mostrarMapaForm && (
                                    <MapaAsientos
                                        viaje={viajes.find(v => v.id_viaje === Number(idViaje))}
                                        integrantesViaje={integrantes.filter(i => {
                                            if (!i.is_active) return false;
                                            const res = reservas.find(r => r.id_reserva === i.id_reserva);
                                            return res && res.is_active && res.id_viaje === Number(idViaje);
                                        })}
                                        pasajerosGrupo={listaIntegrantes}
                                        onAsignarAsiento={handleAsignarAsientoForm}
                                        onAutoAsignar={(nuevosNums) => {
                                            let offset = 0;
                                            if (titularViaja && titularDatos) {
                                                setAsientoTitular(nuevosNums[0] || null);
                                                offset = 1;
                                            }
                                            setAcompanantes(prev => prev.map((a, i) => ({
                                                ...a,
                                                numero_asiento: nuevosNums[i + offset] || null
                                            })));
                                        }}
                                        titulo="Mapa de Puestos — Haz clic en un pasajero y luego en su asiento numerado"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Paso 3: Abono inicial y resumen automático */}
                    <div className="form-grid">
                        <div className="field">
                            <label>4. Abono inicial ($) — Mínimo obligatorio: {formatoMoneda(abonoMinimoRequerido)} ($30 × {cantidadViajeros})</label>
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
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setMontoAbono(String(abonoMinimoRequerido))}
                                >
                                    Mínimo (${abonoMinimoRequerido})
                                </button>
                                {montoTotalCalculado > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => setMontoAbono(String(montoTotalCalculado))}
                                    >
                                        Total (${montoTotalCalculado})
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="field">
                            <label>Método de pago y Referencia del abono</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ flex: 1 }}>
                                    {METODOS_PAGO.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.icono} {m.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    placeholder={['Nequi', 'Bancolombia'].includes(metodoPago) ? 'Nº Comprobante / Aprobación (Colombia)' : (metodoPago === 'Pago Móvil' ? 'Nº Referencia / 4 dígitos' : 'Nro. de referencia')}
                                    value={referencia}
                                    onChange={(e) => setReferencia(e.target.value)}
                                    required
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>

                        {/* Conversor en tiempo real a Bolívares BCV y Pesos Colombianos (Nequi / Bancolombia) */}
                        <div className="field full">
                            <CalculadoraDivisas
                                montoUSD={parseFloat(montoAbono) || 0}
                                metodoSeleccionado={metodoPago}
                                onCambiarMontoUSD={(usd) => setMontoAbono(String(usd))}
                            />
                        </div>

                        <div className="calc-box" style={{ flexWrap: 'wrap', gap: 16 }}>
                            <div>
                                <div className="cell-sub">Precio fijo por viajero</div>
                                <strong>{formatoMoneda(precioUnitario)}</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Viajeros (cupos)</div>
                                <strong>{cantidadViajeros}</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Abono mínimo ($30 × {cantidadViajeros})</div>
                                <strong style={{ color: abonoNumerico >= abonoMinimoRequerido ? '#15803d' : '#b91c1c' }}>
                                    {formatoMoneda(abonoMinimoRequerido)}
                                </strong>
                            </div>
                            <div>
                                <div className="cell-sub">Monto Total Automático</div>
                                <strong>{formatoMoneda(montoTotalCalculado)}</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Restante por pagar</div>
                                <strong>{formatoMoneda(saldoRestanteForm)}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            Confirmar Reserva y Registrar Abono
                        </button>
                    </div>
                </form>
            )}

            {/* Tabla principal con búsqueda directa por documento del cliente */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Listado de reservas</div>
                        <div className="card-sub">
                            {filtradas.length} reservas · Total {formatoMoneda(totalFiltrado)} · Haz clic en una reserva para ver todo su detalle
                        </div>
                    </div>
                    <div className="filter-bar">
                        <Buscador
                            valor={busquedaDocumento}
                            onChange={setBusquedaDocumento}
                            placeholder="Buscar por documento del cliente (ej. V-10000000)..."
                        />
                        <select className="input" value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)} style={{ width: 160 }}>
                            <option value="">Todos los estatus</option>
                            {Object.keys(TIPO_PAGO).map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                </div>

                {filtradas.length === 0 ? <Vacio /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Documento Cliente</th>
                                    <th>Nombre Cliente</th>
                                    <th>Viaje / Destino</th>
                                    <th>Integrantes</th>
                                    <th>Abonado / Total</th>
                                    <th>Pago</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map((r) => {
                                    const intsReserva = integrantes.filter(i => i.id_reserva === r.id_reserva && i.is_active);
                                    const pagosReserva = pagos.filter(p => p.id_reserva === r.id_reserva && p.is_active);
                                    const abonado = pagosReserva.reduce((s, p) => s + Number(p.monto), 0);
                                    const totalMonto = Number(r.monto_total) || 0;
                                    const faltaPagar = Math.max(totalMonto - abonado, 0);
                                    const pctPago = totalMonto > 0 ? Math.min(Math.round((abonado / totalMonto) * 100), 100) : 0;
                                    return (
                                        <tr
                                            key={r.id_reserva}
                                            className={`row-clickable ${r.is_active ? '' : 'inactive'}`}
                                            onClick={() => setIdReservaDetalle(r.id_reserva)}
                                            title="Haz clic para ver integrantes, puestos, pagos y detalle completo"
                                        >
                                            <td><strong>#{r.id_reserva}</strong></td>
                                            <td><strong>{r.id_cliente}</strong></td>
                                            <td className="cell-main">{nombreCliente(r.id_cliente)}</td>
                                            <td>
                                                <div className="cell-main">{descripcionViaje(r.id_viaje)}</div>
                                                <div className="cell-sub">Reservado el {formatoFecha(r.fecha_reserva)}</div>
                                            </td>
                                            <td>
                                                <Badge tipo="info">{intsReserva.length} viajero{intsReserva.length === 1 ? '' : 's'}</Badge>
                                                {(() => {
                                                    const puestos = intsReserva.map(i => i.numero_asiento).filter(Boolean);
                                                    if (puestos.length > 0) {
                                                        return (
                                                            <div style={{ marginTop: 4 }}>
                                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '2px 6px', borderRadius: 4 }}>
                                                                    💺 #{puestos.sort((a,b)=>a-b).join(', #')}
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div style={{ marginTop: 4 }}>
                                                            <span style={{ fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>
                                                                ⚠️ Sin asientos
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ minWidth: 215 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                                                    <span className="money">{formatoMoneda(abonado)} <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.78rem' }}>/ {formatoMoneda(totalMonto)}</span></span>
                                                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: pctPago >= 100 ? '#15803d' : '#b45309' }}>
                                                        {pctPago}%
                                                    </span>
                                                </div>
                                                <div className="progress" style={{ marginTop: 5, marginBottom: 4, height: 7 }}>
                                                    <div
                                                        style={{
                                                            width: `${pctPago}%`,
                                                            background: pctPago >= 100 ? '#22c55e' : '#f59e0b'
                                                        }}
                                                    />
                                                </div>
                                                <div className="cell-sub" style={{ fontSize: '0.75rem', fontWeight: 600, color: faltaPagar > 0 ? '#b45309' : '#15803d' }}>
                                                    {faltaPagar > 0 ? `Falta: ${formatoMoneda(faltaPagar)}` : '✓ 100% Liquidado'}
                                                </div>
                                            </td>
                                            <td><Badge tipo={TIPO_PAGO[r.estatus_pago] || 'neutral'}>{r.estatus_pago}</Badge></td>
                                            <td><EstadoActivo activo={r.is_active} /></td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                    {r.is_active && faltaPagar > 0 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary"
                                                            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                                            title={`Liquidar el saldo pendiente de ${formatoMoneda(faltaPagar)}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReservaParaLiquidarDirecta({
                                                                    reserva: r,
                                                                    id_reserva: r.id_reserva,
                                                                    id_cliente: r.id_cliente,
                                                                    total: Number(r.monto_total),
                                                                    abonado: totalAbonado,
                                                                    falta: faltaPagar
                                                                });
                                                            }}
                                                        >
                                                            <CreditCard size={14} /> Liquidar ({formatoMoneda(faltaPagar)})
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '6px 10px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditandoViajeModal(false);
                                                            setIdIntegranteEditandoModal(null);
                                                            setIdPagoEditandoModal(null);
                                                            setIdReservaDetalle(r.id_reserva);
                                                        }}
                                                    >
                                                        <Eye size={15} /> Ver / Editar
                                                    </button>
                                                    {esAdmin && (
                                                        <BotonBaja
                                                            activo={r.is_active}
                                                            onClick={(e) => handleEliminar(e, r.id_reserva)}
                                                            onRestaurar={(e) => handleRestaurarReserva(e, r.id_reserva)}
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

            {/* MODAL DE DETALLE COMPLETO AL TOCAR UNA RESERVA */}
            {reservaDetalle && (
                <div className="modal-backdrop" onClick={() => setIdReservaDetalle(null)}>
                    <div className="modal-card fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <h2 style={{ fontSize: '1.35rem' }}>Reserva #{reservaDetalle.id_reserva}</h2>
                                    <Badge tipo={TIPO_PAGO[reservaDetalle.estatus_pago] || 'neutral'}>{reservaDetalle.estatus_pago}</Badge>
                                    <EstadoActivo activo={reservaDetalle.is_active} />
                                </div>
                                <div className="card-sub">
                                    Fecha de reserva: {formatoFecha(reservaDetalle.fecha_reserva)} · Precio fijo por viajero: {formatoMoneda(obtenerPrecioViaje(reservaDetalle.id_viaje))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        const filasInts = [...integrantesDetalle]
                                            .sort((a, b) => (a.numero_asiento || 999) - (b.numero_asiento || 999))
                                            .map((i, idx) => {
                                                const docInfo = formatearDocumento(i.documento_id, i.tipo_documento);
                                                const docTexto = docInfo.tipo === 'Sin Documento'
                                                    ? `Menor s/cédula (${docInfo.detalle})`
                                                    : docInfo.tipo === 'Pasaporte'
                                                        ? `Pasaporte: ${i.documento_id}`
                                                        : i.documento_id;
                                                return `<tr><td>${idx + 1}</td><td><strong>Puesto #${i.numero_asiento ? String(i.numero_asiento).padStart(2, '0') : 'S/A'}</strong></td><td>${docTexto}</td><td>${i.nombre} ${i.apellido}</td><td>${i.edad} años</td></tr>`;
                                            }).join('');
                                        const tasasVoucher = obtenerTasasLocales();
                                        const filasPagos = pagosDetalle.map(p => {
                                            let equivMoneda = '';
                                            if (['Nequi', 'Bancolombia'].includes(p.metodo_pago)) {
                                                equivMoneda = ` <small style="color:#831843;">(${formatoCOP(Number(p.monto) * tasasVoucher.tasa_cop)})</small>`;
                                            } else if (p.metodo_pago === 'Pago Móvil') {
                                                equivMoneda = ` <small style="color:#1e40af;">(${formatoBs(Number(p.monto) * tasasVoucher.tasa_bcv)})</small>`;
                                            }
                                            return `<tr><td>#${p.id_pago}</td><td>${formatoFecha(p.fecha_pago)}</td><td><strong>${p.metodo_pago}</strong></td><td>${p.referencia}</td><td>${formatoMoneda(p.monto)}${equivMoneda}</td></tr>`;
                                        }).join('');
                                        const win = window.open('', '_blank', 'width=860,height=720');
                                        if (!win) return;
                                        win.document.write(`
                                            <html>
                                            <head>
                                                <title>Voucher Reserva #${reservaDetalle.id_reserva} - Viajes La Nena</title>
                                                <style>
                                                    body { font-family: system-ui, sans-serif; color: #0f172a; padding: 28px; }
                                                    .head { display: flex; justify-content: space-between; border-bottom: 2px solid #0ea5a4; padding-bottom: 14px; margin-bottom: 18px; }
                                                    .brand { font-size: 22px; font-weight: 800; color: #0ea5a4; }
                                                    .box-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
                                                    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; font-size: 13px; }
                                                    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px; }
                                                    th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
                                                    th { background: #f1f5f9; font-weight: 700; }
                                                    .totales { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 14px; display: flex; justify-content: space-between; font-size: 14px; }
                                                </style>
                                            </head>
                                            <body>
                                                <div class="head">
                                                    <div>
                                                        <div class="brand">✈️ Viajes La Nena</div>
                                                        <div style="font-size:12px;color:#64748b;">Comprobante Oficial de Reserva y Estado de Cuenta</div>
                                                    </div>
                                                    <div style="text-align:right;">
                                                        <div style="font-size:18px;font-weight:800;">Reserva #${reservaDetalle.id_reserva}</div>
                                                        <div style="font-size:12px;color:#64748b;">Fecha: ${formatoFecha(reservaDetalle.fecha_reserva)} · Estatus: ${reservaDetalle.estatus_pago}</div>
                                                    </div>
                                                </div>
                                                <div class="box-grid">
                                                    <div class="box">
                                                        <strong>CLIENTE TITULAR</strong><br/>
                                                        ${clienteDetalle ? `${clienteDetalle.nombre} ${clienteDetalle.apellido}` : reservaDetalle.id_cliente}<br/>
                                                        Documento: <strong>${reservaDetalle.id_cliente}</strong><br/>
                                                        ${clienteDetalle ? `Tel: ${clienteDetalle.telefono} · ${clienteDetalle.correo_electronico}` : ''}
                                                    </div>
                                                    <div class="box">
                                                        <strong>VIAJE RESERVADO</strong><br/>
                                                        ${descripcionViaje(reservaDetalle.id_viaje)}<br/>
                                                        ${viajeDetalle ? `Transporte: <strong>${viajeDetalle.metodo_transporte || 'Bus Cama'}</strong> · Salida: ${formatoFecha(viajeDetalle.fecha_salida + 'T00:00:00')} al ${formatoFecha(viajeDetalle.fecha_retorno + 'T00:00:00')}` : ''}
                                                    </div>
                                                </div>
                                                <h3>Pasajeros / Integrantes (${integrantesDetalle.length})</h3>
                                                <table>
                                                    <thead><tr><th>#</th><th>Puesto Asignado</th><th>Documento</th><th>Nombre Completo</th><th>Edad</th></tr></thead>
                                                    <tbody>${filasInts}</tbody>
                                                </table>
                                                <h3>Pagos y Abonos Registrados</h3>
                                                <table>
                                                    <thead><tr><th>ID Pago</th><th>Fecha</th><th>Método</th><th>Referencia</th><th>Monto</th></tr></thead>
                                                    <tbody>${filasPagos}</tbody>
                                                </table>
                                                <div class="totales">
                                                    <div>Monto Total: <strong>${formatoMoneda(reservaDetalle.monto_total)}</strong></div>
                                                    <div>Total Abonado: <strong style="color:#15803d;">${formatoMoneda(totalPagadoDetalle)}</strong></div>
                                                    <div>Saldo Pendiente: <strong style="color:${saldoPendienteDetalle > 0 ? '#b45309' : '#15803d'};">${formatoMoneda(saldoPendienteDetalle)}</strong></div>
                                                </div>
                                                <div style="margin-top:14px;padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:11px;color:#64748b;">
                                                    * Tasas referenciales del sistema: <strong>Tasa BCV: ${tasasVoucher.tasa_bcv ? Number(tasasVoucher.tasa_bcv).toFixed(2) : '55.20'} Bs/$</strong> · <strong>Pesos Colombianos (Nequi/Bancolombia): $ ${tasasVoucher.tasa_cop ? Math.round(Number(tasasVoucher.tasa_cop)).toLocaleString('es-CO') : '4.250'} COP/$</strong>
                                                </div>
                                                <script>window.onload = () => window.print();</script>
                                            </body>
                                            </html>
                                        `);
                                        win.document.close();
                                    }}
                                >
                                    <Printer size={16} /> Imprimir Voucher / PDF
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ color: '#16a34a', border: '1px solid #bbf7d0', background: '#f0fdf4', padding: '6px 12px', fontSize: '0.84rem' }}
                                    onClick={() => {
                                        if (!clienteDetalle || !reservaDetalle) return;
                                        const telLimpio = (clienteDetalle.telefono || '').replace(/\D/g, '');
                                        let telFinal = telLimpio;
                                        if (telLimpio.startsWith('0')) {
                                            telFinal = '58' + telLimpio.substring(1);
                                        } else if (telLimpio.length === 10 && !telLimpio.startsWith('58') && !telLimpio.startsWith('57')) {
                                            telFinal = '58' + telLimpio;
                                        }

                                        const t = obtenerTasasLocales();
                                        const puestosTexto = integrantesDetalle
                                            .map(i => `${i.nombre} ${i.apellido} (Puesto #${i.numero_asiento ? String(i.numero_asiento).padStart(2, '0') : 'Auto'})`)
                                            .join(', ');

                                        const bsFalta = (saldoPendienteDetalle * t.tasa_bcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        const copFalta = Math.round(saldoPendienteDetalle * t.tasa_cop).toLocaleString('es-CO');

                                        let msg = `🌴 *VIAJES LA NENA* — Comprobante de Reserva\n\n`;
                                        msg += `¡Hola *${clienteDetalle.nombre}*! Aquí tienes los detalles de tu reservación:\n\n`;
                                        msg += `📋 *Reserva:* #${reservaDetalle.id_reserva}\n`;
                                        msg += `📍 *Destino:* ${descripcionViaje(reservaDetalle.id_viaje)}\n`;
                                        msg += `👥 *Pasajeros y Puestos:* ${puestosTexto || 'Asignados'}\n`;
                                        msg += `💵 *Monto Total:* ${formatoMoneda(reservaDetalle.monto_total)}\n`;
                                        msg += `✅ *Abonado:* ${formatoMoneda(totalPagadoDetalle)}\n`;

                                        if (saldoPendienteDetalle > 0) {
                                            msg += `⚠️ *Saldo Pendiente:* ${formatoMoneda(saldoPendienteDetalle)}\n`;
                                            msg += `   • En Bolívares (BCV): *Bs. ${bsFalta}*\n`;
                                            msg += `   • En Pesos (Nequi/Bancolombia): *$ ${copFalta} COP*\n\n`;
                                            msg += `📲 *Métodos de pago recibidos:*\n`;
                                            msg += `• Pago Móvil / Transferencia Nacional (Bs)\n`;
                                            msg += `• Nequi / Bancolombia (Pesos COP)\n`;
                                            msg += `• Zelle / Efectivo Divisas\n`;
                                        } else {
                                            msg += `🎉 *Estado:* ¡100% Pagado y confirmado!\n`;
                                        }

                                        const url = telFinal
                                            ? `https://wa.me/${telFinal}?text=${encodeURIComponent(msg)}`
                                            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                                        window.open(url, '_blank');
                                    }}
                                    title="Enviar estado de cuenta, puestos asignados y saldo pendiente por WhatsApp"
                                >
                                    📲 WhatsApp
                                </button>
                                <button className="btn btn-ghost" onClick={() => setIdReservaDetalle(null)}>
                                    <X size={18} /> Cerrar
                                </button>
                            </div>
                        </div>

                        {/* Tarjetas de Cliente + Viaje */}
                        <div className="grid grid-2" style={{ marginBottom: 18 }}>
                            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div className="cell-sub" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Cliente Titular</div>
                                <div className="cell-main" style={{ fontSize: '1.05rem', marginTop: 4 }}>
                                    {clienteDetalle ? `${clienteDetalle.nombre} ${clienteDetalle.apellido}` : reservaDetalle.id_cliente}
                                </div>
                                <div className="cell-sub">Documento: <strong>{reservaDetalle.id_cliente}</strong></div>
                                {clienteDetalle && (
                                    <div className="cell-sub">
                                        Tel: {clienteDetalle.telefono} · {clienteDetalle.correo_electronico}
                                        <br />Dirección: {clienteDetalle.direccion}
                                    </div>
                                )}
                            </div>

                            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="cell-sub" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Viaje Reservado</div>
                                    <BotonEditar
                                        onClick={() => {
                                            setNuevoViajeIdModal(String(reservaDetalle.id_viaje));
                                            setEditandoViajeModal(!editandoViajeModal);
                                        }}
                                        titulo="Cambiar viaje asignado"
                                    />
                                </div>
                                <div className="cell-main" style={{ fontSize: '1.05rem', marginTop: 4 }}>
                                    {descripcionViaje(reservaDetalle.id_viaje)}
                                </div>
                                {viajeDetalle && (
                                    <div className="cell-sub">
                                        Salida: {formatoFecha(viajeDetalle.fecha_salida + 'T00:00:00')} → Retorno: {formatoFecha(viajeDetalle.fecha_retorno + 'T00:00:00')}
                                        <br />Estatus del viaje: <strong>{viajeDetalle.estatus}</strong> · Cupos restantes en el viaje: <strong>{viajeDetalle.cupos_disponibles}</strong>
                                    </div>
                                )}
                            </div>
                        </div>

                        {editandoViajeModal && (
                            <form onSubmit={handleCambiarViajeModal} style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <strong>Actualizar viaje asignado a esta reserva</strong>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" className="btn btn-ghost" onClick={() => setEditandoViajeModal(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary">Guardar Nuevo Viaje</button>
                                    </div>
                                </div>
                                <SelectorViaje
                                    viajes={viajes}
                                    destinos={destinos}
                                    paquetes={paquetes}
                                    valor={nuevoViajeIdModal}
                                    onChange={setNuevoViajeIdModal}
                                    soloConCupos={false}
                                />
                            </form>
                        )}

                        {/* Resumen Financiero de la Reserva + Barra de Progreso */}
                        <div className="calc-box" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 14 }}>
                            <div>
                                <div className="cell-sub">Monto Total ({integrantesDetalle.length} viajero{integrantesDetalle.length === 1 ? '' : 's'})</div>
                                <strong>{formatoMoneda(reservaDetalle.monto_total)}</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Abono Mínimo Ley ($30 × {integrantesDetalle.length})</div>
                                <strong>{formatoMoneda(integrantesDetalle.length * ABONO_POR_INTEGRANTE)}</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Total Abonado / Pagado</div>
                                <strong style={{ color: '#15803d' }}>{formatoMoneda(totalPagadoDetalle)} ({porcentajePagadoDetalle}%)</strong>
                            </div>
                            <div>
                                <div className="cell-sub">Saldo Pendiente por Pagar</div>
                                <strong style={{ color: saldoPendienteDetalle > 0 ? '#b45309' : '#15803d' }}>
                                    {formatoMoneda(saldoPendienteDetalle)}
                                </strong>
                            </div>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                                <span>Progreso de Liquidación de la Reserva #{reservaDetalle.id_reserva}</span>
                                <span style={{ color: porcentajePagadoDetalle >= 100 ? '#15803d' : '#b45309' }}>
                                    {porcentajePagadoDetalle}% ({formatoMoneda(totalPagadoDetalle)} de {formatoMoneda(reservaDetalle.monto_total)})
                                </span>
                            </div>
                            <div className="progress" style={{ height: 9 }}>
                                <div
                                    style={{
                                        width: `${porcentajePagadoDetalle}%`,
                                        background: porcentajePagadoDetalle >= 100 ? '#22c55e' : '#f59e0b'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Sección 1 del Modal: Integrantes de esta Reserva */}
                        <div style={{ marginBottom: 22 }}>
                            <div className="card-header" style={{ marginBottom: 10 }}>
                                <div>
                                    <div className="card-title">Integrantes de esta Reserva ({integrantesDetalle.length} activos / {integrantesTodosDetalle.length} total)</div>
                                    <div className="card-sub">Si agregas, actualizas, cambias de puesto, das de baja o restauras un integrante, el monto y los cupos se ajustan solos</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        style={{ padding: '7px 12px', fontSize: '0.8rem' }}
                                        onClick={() => setMostrarMapaModal(!mostrarMapaModal)}
                                    >
                                        💺 {mostrarMapaModal ? 'Ocultar Mapa de Puestos' : `Mapa de Puestos (${viajeDetalle?.metodo_transporte || 'Transporte'})`}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => {
                                            if (mostrarFormIntegranteModal) {
                                                setIdIntegranteEditandoModal(null);
                                                setNuevoIntegranteModal({ ...INTEGRANTE_VACIO });
                                                setMostrarFormIntegranteModal(false);
                                            } else {
                                                setIdIntegranteEditandoModal(null);
                                                setNuevoIntegranteModal({ ...INTEGRANTE_VACIO });
                                                setMostrarFormIntegranteModal(true);
                                            }
                                        }}
                                    >
                                        <UserPlus size={15} /> {mostrarFormIntegranteModal ? 'Cancelar' : '+ Agregar Integrante'}
                                    </button>
                                </div>
                            </div>

                            {mostrarMapaModal && viajeDetalle && integrantesDetalle.length > 0 && (
                                <div style={{ marginBottom: 14 }}>
                                    <MapaAsientos
                                        viaje={viajeDetalle}
                                        integrantesViaje={integrantes.filter(i => {
                                            if (!i.is_active) return false;
                                            const res = reservas.find(r => r.id_reserva === i.id_reserva);
                                            return res && res.is_active && res.id_viaje === reservaDetalle.id_viaje;
                                        })}
                                        pasajerosGrupo={integrantesDetalle}
                                        onAsignarAsiento={async (indexPasajero, numAsiento) => {
                                            const pasajero = integrantesDetalle[indexPasajero];
                                            if (!pasajero) return;
                                            try {
                                                await actualizarIntegrante(pasajero.id_integrante, {
                                                    numero_asiento: numAsiento
                                                });
                                                await cargarDatos();
                                            } catch (err) {
                                                alert(mensajeError(err, 'No se pudo cambiar el puesto del pasajero.'));
                                            }
                                        }}
                                        titulo={`Mapa de Puestos de la Reserva #${reservaDetalle.id_reserva} — Haz clic en un puesto libre para cambiar al pasajero seleccionado`}
                                    />
                                </div>
                            )}

                            {mostrarFormIntegranteModal && (
                                <form onSubmit={handleAgregarIntegranteModal} style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 12 }}>
                                    <div className="cell-sub" style={{ marginBottom: 8, fontWeight: 600 }}>
                                        {idIntegranteEditandoModal
                                            ? `Actualizando datos del integrante #${idIntegranteEditandoModal}`
                                            : 'Ingresa primero el documento: si ya está registrado en el sistema se completarán sus datos automáticamente.'}
                                    </div>
                                    <div className="integrante-row" style={{ gridTemplateColumns: '150px 1fr 1fr 1fr 85px auto', marginBottom: 0 }}>
                                        <select
                                            className="input"
                                            value={nuevoIntegranteModal.tipo_documento}
                                            onChange={(e) => {
                                                const t = e.target.value;
                                                setNuevoIntegranteModal(prev => ({
                                                    ...prev,
                                                    tipo_documento: t,
                                                    documento_id: t === 'Sin Documento' ? '' : prev.documento_id,
                                                    edad: t === 'Sin Documento' && prev.edad > 17 ? 8 : prev.edad
                                                }));
                                            }}
                                            title="Tipo de identificación"
                                        >
                                            <option value="Cédula">🪪 Cédula</option>
                                            <option value="Pasaporte">🛂 Pasaporte</option>
                                            <option value="Sin Documento">👶 Menor sin cédula</option>
                                        </select>
                                        <input
                                            className="input"
                                            placeholder={nuevoIntegranteModal.tipo_documento === 'Sin Documento' ? 'Se asocia al titular (auto)' : (nuevoIntegranteModal.tipo_documento === 'Pasaporte' ? 'Nro. de Pasaporte' : '1. Cédula ID')}
                                            value={nuevoIntegranteModal.tipo_documento === 'Sin Documento' ? '(Menor sin cédula)' : nuevoIntegranteModal.documento_id}
                                            disabled={nuevoIntegranteModal.tipo_documento === 'Sin Documento'}
                                            onChange={(e) => {
                                                const doc = e.target.value;
                                                const conocida = buscarPersonaConocida(doc);
                                                if (conocida) {
                                                    setNuevoIntegranteModal({
                                                        ...nuevoIntegranteModal,
                                                        documento_id: doc,
                                                        nombre: conocida.nombre,
                                                        apellido: conocida.apellido,
                                                        edad: conocida.edad,
                                                        autocompletado: true
                                                    });
                                                } else {
                                                    setNuevoIntegranteModal(prev => ({
                                                        ...prev,
                                                        documento_id: doc,
                                                        nombre: prev.autocompletado ? '' : prev.nombre,
                                                        apellido: prev.autocompletado ? '' : prev.apellido,
                                                        edad: prev.autocompletado ? 25 : prev.edad,
                                                        autocompletado: false
                                                    }));
                                                }
                                            }}
                                            required={nuevoIntegranteModal.tipo_documento !== 'Sin Documento'}
                                        />
                                        <input
                                            className="input"
                                            placeholder="Nombre"
                                            value={nuevoIntegranteModal.nombre}
                                            onChange={(e) => setNuevoIntegranteModal({ ...nuevoIntegranteModal, nombre: e.target.value })}
                                            required
                                        />
                                        <input
                                            className="input"
                                            placeholder="Apellido"
                                            value={nuevoIntegranteModal.apellido}
                                            onChange={(e) => setNuevoIntegranteModal({ ...nuevoIntegranteModal, apellido: e.target.value })}
                                            required
                                        />
                                        <input
                                            className="input"
                                            type="number"
                                            min="0"
                                            max={nuevoIntegranteModal.tipo_documento === 'Sin Documento' ? '17' : '120'}
                                            placeholder="Edad"
                                            value={nuevoIntegranteModal.edad}
                                            onChange={(e) => setNuevoIntegranteModal({ ...nuevoIntegranteModal, edad: e.target.value })}
                                            required
                                        />
                                        <button type="submit" className="btn btn-primary">{idIntegranteEditandoModal ? 'Actualizar' : 'Guardar'}</button>
                                    </div>
                                </form>
                            )}

                            {integrantesTodosDetalle.length === 0 ? (
                                <Vacio texto="No hay integrantes en esta reserva" />
                            ) : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr><th>Puesto</th><th>Nombre completo</th><th>Documento</th><th>Edad</th><th>Tarifa Aplicada</th><th>Estado</th><th></th></tr>
                                        </thead>
                                        <tbody>
                                            {[...integrantesTodosDetalle]
                                                .sort((a, b) => (a.numero_asiento || 999) - (b.numero_asiento || 999))
                                                .map(i => {
                                                    const pBase = obtenerPrecioViaje(reservaDetalle.id_viaje);
                                                    const tarifa = calcularTarifaPorEdad(pBase, i.edad);
                                                    return (
                                                        <tr key={i.id_integrante} className={i.is_active ? '' : 'inactive'}>
                                                            <td>
                                                                <Badge tipo={i.numero_asiento ? 'info' : 'neutral'}>
                                                                    {i.numero_asiento ? `💺 #${String(i.numero_asiento).padStart(2, '0')}` : 'S/A'}
                                                                </Badge>
                                                            </td>
                                                            <td className="cell-main">{i.nombre} {i.apellido}</td>
                                                            <td>
                                                                <BadgeDocumento doc={i.documento_id} tipo={i.tipo_documento} />
                                                            </td>
                                                            <td>{i.edad} años</td>
                                                            <td>
                                                                <Badge tipo={tarifa.tipo}>{tarifa.etiqueta}</Badge>
                                                                <span style={{ marginLeft: 8, fontWeight: 700, fontSize: '0.82rem' }}>
                                                                    {formatoMoneda(tarifa.monto)}
                                                                </span>
                                                            </td>
                                                            <td><EstadoActivo activo={i.is_active} /></td>
                                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                                                    <BotonEditar onClick={() => iniciarEdicionIntegranteModal(i)} />
                                                                    <BotonBaja
                                                                        activo={i.is_active}
                                                                        onClick={() => handleEliminarIntegranteModal(i.id_integrante)}
                                                                        onRestaurar={() => handleRestaurarIntegranteModal(i.id_integrante)}
                                                                    />
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

                        {/* Sección 2 del Modal: Pagos / Abonos de esta Reserva */}
                        <div>
                            <div className="card-header" style={{ marginBottom: 10 }}>
                                <div>
                                    <div className="card-title">Pagos y Abonos de esta Reserva ({pagosDetalle.length} activos)</div>
                                    <div className="card-sub">Al completar el monto total, la reserva pasa automáticamente a estado Pagado</div>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        if (mostrarFormPagoModal) {
                                            setIdPagoEditandoModal(null);
                                            setMostrarFormPagoModal(false);
                                        } else {
                                            setIdPagoEditandoModal(null);
                                            setNuevoPagoModal({
                                                monto: String(saldoPendienteDetalle > 0 ? saldoPendienteDetalle.toFixed(2) : '30.00'),
                                                metodo_pago: 'Transferencia',
                                                referencia: `LIQ-RES-${reservaDetalle.id_reserva}`
                                            });
                                            setMostrarFormPagoModal(true);
                                        }
                                    }}
                                >
                                    <CreditCard size={15} /> {mostrarFormPagoModal ? 'Cancelar' : (saldoPendienteDetalle > 0 ? `Registrar Abono / Liquidar (${formatoMoneda(saldoPendienteDetalle)})` : '+ Registrar Pago')}
                                </button>
                            </div>

                            {mostrarFormPagoModal && (
                                <form onSubmit={handleRegistrarPagoModal} style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 12 }}>
                                    <div className="cell-sub" style={{ marginBottom: 8, fontWeight: 600 }}>
                                        {idPagoEditandoModal ? `Actualizando pago #${idPagoEditandoModal}` : 'Registrar nuevo abono o liquidación'}
                                    </div>
                                    <div className="integrante-row" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', marginBottom: 8 }}>
                                        <input
                                            className="input"
                                            type="number"
                                            step="0.01"
                                            placeholder="Monto ($)"
                                            value={nuevoPagoModal.monto}
                                            onChange={(e) => setNuevoPagoModal({ ...nuevoPagoModal, monto: e.target.value })}
                                            required
                                        />
                                        <select
                                            className="input"
                                            value={nuevoPagoModal.metodo_pago}
                                            onChange={(e) => setNuevoPagoModal({ ...nuevoPagoModal, metodo_pago: e.target.value })}
                                        >
                                            {METODOS_PAGO.map(m => (
                                                <option key={m.id} value={m.id}>{m.icono} {m.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="input"
                                            placeholder={['Nequi', 'Bancolombia'].includes(nuevoPagoModal.metodo_pago) ? 'Nº Comprobante Colombia' : 'Nro. de Referencia'}
                                            value={nuevoPagoModal.referencia}
                                            onChange={(e) => setNuevoPagoModal({ ...nuevoPagoModal, referencia: e.target.value })}
                                            required
                                        />
                                        <button type="submit" className="btn btn-primary">{idPagoEditandoModal ? 'Actualizar Pago' : 'Guardar Pago'}</button>
                                    </div>
                                    <CalculadoraDivisas
                                        montoUSD={parseFloat(nuevoPagoModal.monto) || 0}
                                        metodoSeleccionado={nuevoPagoModal.metodo_pago}
                                        onCambiarMontoUSD={(usd) => setNuevoPagoModal(prev => ({ ...prev, monto: String(usd) }))}
                                        titulo="Conversión del Abono / Pago"
                                    />
                                </form>
                            )}

                            {pagosTodosDetalle.length === 0 ? (
                                <Vacio texto="No hay pagos registrados para esta reserva" />
                            ) : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr><th>ID Pago</th><th>Fecha</th><th>Método</th><th>Referencia</th><th>Monto</th><th>Estado</th><th></th></tr>
                                        </thead>
                                        <tbody>
                                            {pagosTodosDetalle.map(p => (
                                                <tr key={p.id_pago} className={p.is_active ? '' : 'inactive'}>
                                                    <td>#{p.id_pago}</td>
                                                    <td>{formatoFecha(p.fecha_pago)}</td>
                                                    <td><BadgeMetodoPago metodo={p.metodo_pago} /></td>
                                                    <td>{p.referencia}</td>
                                                    <td className="money" style={{ color: '#15803d' }}>{formatoMoneda(p.monto)}</td>
                                                    <td><EstadoActivo activo={p.is_active} /></td>
                                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'inline-flex', gap: 6 }}>
                                                            <BotonEditar onClick={() => iniciarEdicionPagoModal(p)} />
                                                            <BotonBaja
                                                                activo={p.is_active}
                                                                onClick={() => handleEliminarPagoModal(p.id_pago)}
                                                                onRestaurar={() => handleRestaurarPagoModal(p.id_pago)}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
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
                    cargarDatos();
                }}
            />
        </div>
    );
}
