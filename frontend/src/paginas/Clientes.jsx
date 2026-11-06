import { useEffect, useState } from 'react';
import {
    Plus, X, Plane, UserPlus, Trash, History, CalendarCheck, Wallet, AlertCircle,
    CreditCard, Check, ArrowRight, ArrowLeft, Sparkles, MessageCircle, Bus, CheckCircle2, User, Users
} from 'lucide-react';
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
    const [guardando, setGuardando] = useState(false);

    // Estado de Asistente Paso a Paso (Wizard)
    const [mostrarForm, setMostrarForm] = useState(false);
    const [pasoWizard, setPasoWizard] = useState(1);
    const [idEditando, setIdEditando] = useState(null);
    const [busquedaDocumento, setBusquedaDocumento] = useState('');
    const [form, setForm] = useState(FORM_INICIAL);

    // Expediente / Historial del viajero seleccionado
    const [clienteExpediente, setClienteExpediente] = useState(null);
    const [reservaParaLiquidarDirecta, setReservaParaLiquidarDirecta] = useState(null);

    // Pantalla de Confirmación de Reserva Exitosa
    const [reservaExitosa, setReservaExitosa] = useState(null);

    // Asignar viaje de una vez al crear el cliente (o a un cliente existente desde la tabla)
    const [asignarViajeAhora, setAsignarViajeAhora] = useState(true);
    const [clienteExistenteReserva, setClienteExistenteReserva] = useState(null);
    const [idViaje, setIdViaje] = useState('');
    const [edadTitular, setEdadTitular] = useState(30);
    const [asientoTitular, setAsientoTitular] = useState(null);
    const [acompanantes, setAcompanantes] = useState([]);
    const [borradorAcomp, setBorradorAcomp] = useState({ ...ACOMP_VACIO });
    const [montoAbono, setMontoAbono] = useState('30');
    const [metodoPago, setMetodoPago] = useState('Pago Móvil');
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

    // Detección en tiempo real de cliente existente por documento
    const clienteExistentePorDoc = !idEditando && form.id_cliente.trim() ? clientes.find(
        c => c.id_cliente.toLowerCase() === form.id_cliente.trim().toLowerCase()
    ) : null;

    const docRepetido = Boolean(clienteExistentePorDoc);
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

    const viajeSeleccionadoObj = viajes.find(v => v.id_viaje === Number(idViaje));
    const destinoSeleccionadoObj = viajeSeleccionadoObj ? destinos.find(d => d.id_destino === viajeSeleccionadoObj.id_destino) : null;
    const paqueteSeleccionadoObj = viajeSeleccionadoObj?.id_paquete ? paquetes.find(p => p.id_paquete === viajeSeleccionadoObj.id_paquete) : null;

    const cantidadViajeros = 1 + acompanantes.length;
    const cantidadPagantes = 1 + acompanantes.filter(a => (parseInt(a.edad) || 0) >= 3).length;
    const precioUnitario = obtenerPrecioViaje(idViaje);
    const montoTotalCalculado = Number((
        calcularTarifaPorEdad(precioUnitario, edadTitular).monto +
        acompanantes.reduce((s, a) => s + calcularTarifaPorEdad(precioUnitario, a.edad).monto, 0)
    ).toFixed(2));
    const abonoMinimoRequerido = ABONO_POR_INTEGRANTE * cantidadPagantes;
    const abonoNumerico = parseFloat(montoAbono) || 0;

    // Autocompletado de acompañante cuando se tipea su cédula
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
            alert('Por favor completa nombre, apellido y edad válida para el acompañante.');
            return;
        }
        if (tipoDoc === 'Sin Documento' && ed > 17) {
            alert('Solo los menores de edad (0 a 17 años) pueden registrarse sin documento de identidad.');
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
            alert('Este documento ya está registrado en el grupo de viaje.');
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

        const pagantesNuevos = 1 + nuevos.filter(a => (parseInt(a.edad) || 0) >= 3).length;
        const nuevoMin = ABONO_POR_INTEGRANTE * pagantesNuevos;
        if ((parseFloat(montoAbono) || 0) < nuevoMin) setMontoAbono(String(nuevoMin));
    };

    const quitarAcompanante = (doc) => {
        const nuevos = acompanantes.filter(a => a.documento_id !== doc);
        setAcompanantes(nuevos);
        const pagantesNuevos = 1 + nuevos.filter(a => (parseInt(a.edad) || 0) >= 3).length;
        const nuevoMin = ABONO_POR_INTEGRANTE * pagantesNuevos;
        if ((parseFloat(montoAbono) || 0) < nuevoMin) setMontoAbono(String(nuevoMin));
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
        setMontoAbono('30');
        setReferencia('');
        setPasoWizard(1);
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

    const abrirAsignarViajeClienteExistente = (c) => {
        setClienteExpediente(null);
        setIdEditando(null);
        setClienteExistenteReserva(c);
        setAsignarViajeAhora(true);
        setIdViaje('');
        setAsientoTitular(null);
        setAcompanantes([]);
        setPasoWizard(2); // Inicia automáticamente en el Módulo de Viaje
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Auto-asignación inteligente de asientos para el grupo
    const autoAsignarPuestosGrupo = () => {
        if (!viajeSeleccionadoObj) return;
        const totalIntegrantes = 1 + acompanantes.length;
        const ocupadosNums = new Set(
            integrantes
                .filter(i => {
                    if (!i.is_active) return false;
                    const res = reservas.find(r => r.id_reserva === i.id_reserva);
                    return res && res.is_active && res.id_viaje === viajeSeleccionadoObj.id_viaje;
                })
                .map(i => Number(i.numero_asiento))
                .filter(Boolean)
        );

        const asientosTotal = viajeSeleccionadoObj.metodo_transporte === 'Avión' ? 150 : 60;
        const asignados = [];

        // Buscar asientos consecutivos o los primeros libres
        for (let num = 1; num <= asientosTotal && asignados.length < totalIntegrantes; num++) {
            if (!ocupadosNums.has(num)) {
                asignados.push(num);
            }
        }

        if (asignados.length > 0) {
            setAsientoTitular(asignados[0]);
            setAcompanantes(prev => prev.map((a, idx) => ({
                ...a,
                numero_asiento: asignados[idx + 1] || null
            })));
        }
    };

    // Validación y avance entre pasos del Wizard
    const avanzarPaso = (siguiente) => {
        if (pasoWizard === 1) {
            if (!form.id_cliente.trim() || !form.nombre.trim() || !form.apellido.trim() || !form.telefono.trim() || !form.correo_electronico.trim() || !form.direccion.trim()) {
                alert('Por favor completa todos los campos requeridos del titular.');
                return;
            }
            if (docRepetido) {
                alert('El documento ya está registrado. Usa el botón "Continuar con este cliente" para asignarle un viaje.');
                return;
            }
            if (telRepetido) {
                alert('Ya existe otro cliente con este número de teléfono.');
                return;
            }
            if (correoRepetido) {
                alert('Ya existe otro cliente con este correo electrónico.');
                return;
            }
            const edNum = parseInt(edadTitular);
            if (isNaN(edNum) || edNum < 18) {
                alert('El titular de la reserva debe ser mayor de edad (mínimo 18 años).');
                return;
            }
        } else if (pasoWizard === 2) {
            if (!idViaje) {
                alert('Por favor selecciona un viaje disponible para continuar.');
                return;
            }
        }
        setPasoWizard(siguiente);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setExito('');
        setError('');

        // Modo Edición simple
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
                setGuardando(true);
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
            } finally {
                setGuardando(false);
            }
            return;
        }

        // Modo Solo Cliente (sin viaje)
        if (!asignarViajeAhora && !clienteExistenteReserva) {
            try {
                setGuardando(true);
                const nuevo = await crearCliente({
                    id_cliente: form.id_cliente.trim(),
                    tipo_documento: form.tipo_documento || 'Cédula',
                    nombre: form.nombre.trim(),
                    apellido: form.apellido.trim(),
                    telefono: form.telefono.trim(),
                    correo_electronico: form.correo_electronico.trim().toLowerCase(),
                    direccion: form.direccion.trim()
                });
                setExito(`Cliente ${nuevo.nombre} ${nuevo.apellido} (${nuevo.id_cliente}) registrado exitosamente.`);
                resetearTodo();
                cargarDatos();
            } catch (err) {
                alert(mensajeError(err, 'No se pudo registrar el cliente.'));
            } finally {
                setGuardando(false);
            }
            return;
        }

        // Modo Wizard Completo: Cliente + Reserva + Acompañantes + Asientos + Abono
        if (!idViaje) {
            alert('Por favor selecciona el viaje que deseas asignar.');
            setPasoWizard(2);
            return;
        }

        if (abonoNumerico < abonoMinimoRequerido) {
            alert(`El abono mínimo obligatorio es de $${abonoMinimoRequerido.toFixed(2)} ($30.00 × ${cantidadPagantes} pasajero(s) de 3 años o más).`);
            setPasoWizard(5);
            return;
        }

        try {
            setGuardando(true);
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

            const integrantesPayload = [
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
            ];

            const nuevaReserva = await crearReserva({
                id_cliente: titular.id_cliente,
                id_viaje: parseInt(idViaje),
                integrantes: integrantesPayload,
                monto_abono: abonoNumerico,
                metodo_pago: metodoPago,
                referencia: referencia.trim() || 'ABONO-INICIAL'
            });

            // Guardar datos para el modal de confirmación y recibo de WhatsApp
            const puestosAsignadosStr = [
                asientoTitular ? `#${String(asientoTitular).padStart(2, '0')}` : null,
                ...acompanantes.map(a => a.numero_asiento ? `#${String(a.numero_asiento).padStart(2, '0')}` : null)
            ].filter(Boolean).join(', ');

            setReservaExitosa({
                cliente: titular,
                reserva: nuevaReserva,
                viaje: viajeSeleccionadoObj,
                destino: destinoSeleccionadoObj,
                paquete: paqueteSeleccionadoObj,
                puestos: puestosAsignadosStr || 'Asignación Automática',
                cantViajeros: cantidadViajeros,
                total: montoTotalCalculado,
                abonado: abonoNumerico,
                saldo: Math.max(montoTotalCalculado - abonoNumerico, 0)
            });

            resetearTodo();
            cargarDatos();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo completar el registro de cliente y reserva.'));
        } finally {
            setGuardando(false);
        }
    };

    // Función para abrir WhatsApp con el comprobante formateado
    const enviarComprobanteWhatsApp = () => {
        if (!reservaExitosa) return;
        const { cliente, reserva, viaje, destino, puestos, total, abonado, saldo, cantViajeros } = reservaExitosa;
        let tel = (cliente.telefono || '').replace(/\D/g, '');
        if (tel.startsWith('0') && tel.length === 11) {
            tel = '58' + tel.slice(1);
        }
        const fechaSalida = viaje?.fecha_salida ? formatoFecha(viaje.fecha_salida + 'T00:00:00') : 'Próximamente';
        const texto = `*¡Hola ${cliente.nombre}!* 👋\n\nTu reservación con *Viajes La Nena* ha sido confirmada exitosamente. 🎉\n\n📋 *Detalles de tu Reserva:*\n• *Nº de Reserva:* #${reserva.id_reserva}\n• *Destino:* ${destino?.nombre_destino || 'Destino turístico'}\n• *Fecha de Salida:* ${fechaSalida}\n• *Transporte:* ${viaje?.metodo_transporte || 'Bus Cama'}\n• *Pasajeros:* ${cantViajeros} persona(s)\n• *Puestos Asignados:* ${puestos || 'Asignación automática'}\n• *Monto Total:* ${formatoMoneda(total)}\n• *Abono Inicial:* ${formatoMoneda(abonado)}\n• *Saldo Pendiente:* ${saldo > 0 ? formatoMoneda(saldo) : '✓ Liquidado'}\n\n¡Gracias por viajar con nosotros! 🌴🚍✨`;

        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank');
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
        return { resTitular, viajesComoPasajero, totalReservado, totalAbonado, saldoPendiente };
    };

    const filtrados = clientes.filter(c => coincideBusquedaAvanzada(busquedaDocumento, c));
    const datosExpediente = clienteExpediente ? obtenerResumenCliente(clienteExpediente.id_cliente) : null;

    const listaPasajerosParaCroquis = [
        {
            documento_id: (clienteExistenteReserva ? clienteExistenteReserva.id_cliente : form.id_cliente) || 'TITULAR',
            nombre: (clienteExistenteReserva ? clienteExistenteReserva.nombre : form.nombre) || 'Titular',
            apellido: (clienteExistenteReserva ? clienteExistenteReserva.apellido : form.apellido) || '',
            edad: edadTitular,
            numero_asiento: asientoTitular,
            esTitular: true
        },
        ...acompanantes
    ];

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Clientes y Reservaciones Asistidas"
                subtitulo="Crea clientes, acompaña a sus familiares, selecciona asientos y emite reservas módulo por módulo"
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
                            setPasoWizard(1);
                            setMostrarForm(true);
                        }
                    }}
                >
                    {mostrarForm ? <><X size={16} /> Cancelar Registro</> : <><Plus size={16} /> + Nuevo Cliente y Viaje Asistido</>}
                </button>
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">{exito}</div>}

            {/* FORMULARIO DIRECTO EN CASO DE EDICIÓN */}
            {mostrarForm && idEditando && (
                <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: 22 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Actualizar Datos de Cliente ({idEditando})</div>
                            <div className="card-sub">Modifica teléfono, correo o dirección del cliente</div>
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="field">
                            <label>Tipo de Documento</label>
                            <input value={form.tipo_documento} disabled />
                        </div>
                        <div className="field">
                            <label>Documento de Identidad</label>
                            <input value={form.id_cliente} disabled />
                        </div>
                        <div className="field">
                            <label>Teléfono</label>
                            <input name="telefono" value={form.telefono} onChange={handleChange} required />
                            {telRepetido && <small style={{ color: '#b91c1c', fontWeight: 600 }}>Teléfono ya en uso por otro cliente.</small>}
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
                            <label>Correo Electrónico</label>
                            <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={handleChange} required />
                            {correoRepetido && <small style={{ color: '#b91c1c', fontWeight: 600 }}>Correo ya en uso por otro cliente.</small>}
                        </div>
                        <div className="field full">
                            <label>Dirección</label>
                            <input name="direccion" value={form.direccion} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: 16 }}>
                        <button type="button" className="btn btn-ghost" onClick={resetearTodo}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={guardando}>
                            {guardando ? 'Guardando cambios...' : 'Guardar Actualización'}
                        </button>
                    </div>
                </form>
            )}

            {/* ASISTENTE MODULAR PASO A PASO (WIZARD) */}
            {mostrarForm && !idEditando && (
                <div className="card fade-in" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
                    {/* ENCABEZADO DEL STEPPER */}
                    <div className="wizard-header">
                        <div className="wizard-stepper">
                            {/* PASO 1 */}
                            <button
                                type="button"
                                className={`wizard-step-item ${pasoWizard === 1 ? 'active' : ''} ${pasoWizard > 1 ? 'completed' : ''}`}
                                onClick={() => !clienteExistenteReserva && setPasoWizard(1)}
                                disabled={!!clienteExistenteReserva}
                            >
                                <div className="wizard-step-badge">
                                    {pasoWizard > 1 || clienteExistenteReserva ? <Check size={16} /> : '1'}
                                </div>
                                <div className="wizard-step-text">
                                    <span className="wizard-step-title">1. Titular</span>
                                    <span className="wizard-step-sub">
                                        {clienteExistenteReserva ? `${clienteExistenteReserva.nombre} ${clienteExistenteReserva.apellido}` : (form.nombre ? `${form.nombre} ${form.apellido}` : 'Datos del cliente')}
                                    </span>
                                </div>
                            </button>

                            <div className="wizard-divider" />

                            {/* PASO 2 */}
                            <button
                                type="button"
                                className={`wizard-step-item ${pasoWizard === 2 ? 'active' : ''} ${pasoWizard > 2 ? 'completed' : ''}`}
                                onClick={() => pasoWizard > 2 && setPasoWizard(2)}
                                disabled={pasoWizard < 2}
                            >
                                <div className="wizard-step-badge">
                                    {pasoWizard > 2 ? <Check size={16} /> : '2'}
                                </div>
                                <div className="wizard-step-text">
                                    <span className="wizard-step-title">2. Viaje</span>
                                    <span className="wizard-step-sub">
                                        {viajeSeleccionadoObj ? (destinoSeleccionadoObj?.nombre_destino || 'Viaje elegido') : 'Elegir destino'}
                                    </span>
                                </div>
                            </button>

                            <div className="wizard-divider" />

                            {/* PASO 3 */}
                            <button
                                type="button"
                                className={`wizard-step-item ${pasoWizard === 3 ? 'active' : ''} ${pasoWizard > 3 ? 'completed' : ''}`}
                                onClick={() => pasoWizard > 3 && setPasoWizard(3)}
                                disabled={pasoWizard < 3}
                            >
                                <div className="wizard-step-badge">
                                    {pasoWizard > 3 ? <Check size={16} /> : '3'}
                                </div>
                                <div className="wizard-step-text">
                                    <span className="wizard-step-title">3. Acompañantes</span>
                                    <span className="wizard-step-sub">
                                        {acompanantes.length > 0 ? `+${acompanantes.length} acompañante(s)` : 'Viajeros'}
                                    </span>
                                </div>
                            </button>

                            <div className="wizard-divider" />

                            {/* PASO 4 */}
                            <button
                                type="button"
                                className={`wizard-step-item ${pasoWizard === 4 ? 'active' : ''} ${pasoWizard > 4 ? 'completed' : ''}`}
                                onClick={() => pasoWizard > 4 && setPasoWizard(4)}
                                disabled={pasoWizard < 4}
                            >
                                <div className="wizard-step-badge">
                                    {pasoWizard > 4 ? <Check size={16} /> : '4'}
                                </div>
                                <div className="wizard-step-text">
                                    <span className="wizard-step-title">4. Asientos</span>
                                    <span className="wizard-step-sub">
                                        {asientoTitular ? `Puesto #${asientoTitular}` : 'Croquis y puestos'}
                                    </span>
                                </div>
                            </button>

                            <div className="wizard-divider" />

                            {/* PASO 5 */}
                            <button
                                type="button"
                                className={`wizard-step-item ${pasoWizard === 5 ? 'active' : ''}`}
                                disabled={pasoWizard < 5}
                            >
                                <div className="wizard-step-badge">5</div>
                                <div className="wizard-step-text">
                                    <span className="wizard-step-title">5. Abono y Pago</span>
                                    <span className="wizard-step-sub">{formatoMoneda(montoAbono)}</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* CUERPO DEL ASISTENTE */}
                    <div className="wizard-body">
                        {/* ========================================================= */}
                        {/* MÓDULO 1: DATOS DEL TITULAR                                */}
                        {/* ========================================================= */}
                        {pasoWizard === 1 && (
                            <div className="fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                            Módulo 1: Datos Personales del Titular
                                        </h3>
                                        <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                                            Ingresa los datos del cliente responsable. Debe ser mayor de edad (+18).
                                        </p>
                                    </div>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', color: 'var(--primary-dark)', background: 'var(--primary-soft)', padding: '6px 12px', borderRadius: 8 }}>
                                        <input
                                            type="checkbox"
                                            checked={asignarViajeAhora}
                                            onChange={(e) => setAsignarViajeAhora(e.target.checked)}
                                        />
                                        Asignar viaje y reservar de inmediato
                                    </label>
                                </div>

                                {clienteExistentePorDoc && (
                                    <div style={{ background: '#ecfdf5', border: '1.5px solid #10b981', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                        <div>
                                            <strong style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Sparkles size={16} /> ¡Este cliente ya se encuentra registrado en el sistema!
                                            </strong>
                                            <div style={{ fontSize: '0.84rem', color: '#047857', marginTop: 2 }}>
                                                <strong>{clienteExistentePorDoc.nombre} {clienteExistentePorDoc.apellido}</strong> · Tel: {clienteExistentePorDoc.telefono} · {clienteExistentePorDoc.correo_electronico}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => {
                                                setClienteExistenteReserva(clienteExistentePorDoc);
                                                setPasoWizard(2);
                                            }}
                                        >
                                            Continuar con este cliente ➔
                                        </button>
                                    </div>
                                )}

                                <div className="form-grid">
                                    <div className="field">
                                        <label>Tipo de Documento</label>
                                        <select
                                            name="tipo_documento"
                                            value={form.tipo_documento || 'Cédula'}
                                            onChange={handleChange}
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
                                            required
                                        />
                                        {docRepetido && !clienteExistentePorDoc && (
                                            <small style={{ color: '#b91c1c', fontWeight: 600 }}>Este documento ya está registrado.</small>
                                        )}
                                    </div>
                                    <div className="field">
                                        <label>Nombre del Titular</label>
                                        <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Juan" required />
                                    </div>
                                    <div className="field">
                                        <label>Apellido del Titular</label>
                                        <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Ej. Pérez" required />
                                    </div>
                                    <div className="field">
                                        <label>Teléfono Móvil (WhatsApp)</label>
                                        <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej. 0414-1234567" required />
                                        {telRepetido && <small style={{ color: '#b91c1c', fontWeight: 600 }}>Teléfono ya registrado con otro cliente.</small>}
                                    </div>
                                    <div className="field">
                                        <label>Correo Electrónico</label>
                                        <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={handleChange} placeholder="cliente@correo.com" required />
                                        {correoRepetido && <small style={{ color: '#b91c1c', fontWeight: 600 }}>Correo ya registrado con otro cliente.</small>}
                                    </div>
                                    <div className="field">
                                        <label>Edad del Titular (+18 obligatorio)</label>
                                        <input
                                            type="number"
                                            min="18"
                                            value={edadTitular}
                                            onChange={(e) => setEdadTitular(e.target.value)}
                                            required
                                        />
                                        {(parseInt(edadTitular) || 0) < 18 && (
                                            <small style={{ color: '#b91c1c', fontWeight: 600 }}>El titular debe tener al menos 18 años.</small>
                                        )}
                                    </div>
                                    <div className="field">
                                        <label>Dirección de Residencia</label>
                                        <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Ciudad, Estado, Sector" required />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* MÓDULO 2: SELECCIÓN DE VIAJE DISPONIBLE                   */}
                        {/* ========================================================= */}
                        {pasoWizard === 2 && (
                            <div className="fade-in">
                                <div style={{ marginBottom: 16 }}>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                        Módulo 2: Selección de Viaje y Paquete Turístico
                                    </h3>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                                        Elige el viaje programado con cupos disponibles para {clienteExistenteReserva ? `${clienteExistenteReserva.nombre} ${clienteExistenteReserva.apellido}` : `${form.nombre} ${form.apellido}`}.
                                    </p>
                                </div>

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

                                {viajeSeleccionadoObj && destinoSeleccionadoObj && (
                                    <div style={{ marginTop: 16, background: '#f0fdfa', border: '1.5px solid #0d9488', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Badge tipo="info">Viaje #{viajeSeleccionadoObj.id_viaje}</Badge>
                                                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#134e4a' }}>
                                                    {destinoSeleccionadoObj.nombre_destino}
                                                </span>
                                                {paqueteSeleccionadoObj && (
                                                    <span style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>
                                                        ({paqueteSeleccionadoObj.nombre_paquete})
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.82rem', color: '#115e59', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                <span>🚌 Transporte: <strong>{viajeSeleccionadoObj.metodo_transporte}</strong></span>
                                                <span>📅 Salida: <strong>{formatoFecha(viajeSeleccionadoObj.fecha_salida + 'T00:00:00')}</strong></span>
                                                <span>💵 Precio base por persona: <strong>{formatoMoneda(precioUnitario)}</strong></span>
                                                <span>👥 Cupos disponibles: <strong>{viajeSeleccionadoObj.cupos_disponibles}</strong></span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => avanzarPaso(3)}
                                        >
                                            Confirmar Viaje y Añadir Acompañantes ➔
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* MÓDULO 3: ACOMPAÑANTES Y MENORES DE EDAD                  */}
                        {/* ========================================================= */}
                        {pasoWizard === 3 && (
                            <div className="fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                            Módulo 3: Acompañantes y Menores de Edad
                                        </h3>
                                        <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                                            Agrega familiares o amigos. Los niños menores de 3 años viajan gratis ($0) y de 3 a 12 años tienen 25% de descuento.
                                        </p>
                                    </div>

                                    {acompanantes.length === 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            style={{ borderColor: 'var(--primary)', color: 'var(--primary-dark)', fontWeight: 700 }}
                                            onClick={() => avanzarPaso(4)}
                                        >
                                            <User size={15} /> Viaja Solo (Sin Acompañantes) ➔ Pasar a Asientos
                                        </button>
                                    )}
                                </div>

                                {/* Tarjeta del Titular (Viajero #1) */}
                                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <Badge tipo="info">Viajero #1 (Titular)</Badge>
                                            <strong style={{ fontSize: '0.95rem' }}>
                                                {clienteExistenteReserva ? `${clienteExistenteReserva.nombre} ${clienteExistenteReserva.apellido}` : `${form.nombre} ${form.apellido}`}
                                            </strong>
                                            <BadgeDocumento
                                                doc={clienteExistenteReserva ? clienteExistenteReserva.id_cliente : form.id_cliente}
                                                tipo={clienteExistenteReserva ? clienteExistenteReserva.tipo_documento : form.tipo_documento}
                                                small
                                            />
                                            <span className="cell-sub">Edad: {edadTitular} años</span>
                                            <Badge tipo="neutral">Tarifa Adulto: {formatoMoneda(calcularTarifaPorEdad(precioUnitario, edadTitular).monto)}</Badge>
                                        </div>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>✓ Titular Registrado</span>
                                    </div>
                                </div>

                                {/* Formulario para agregar acompañantes */}
                                <div style={{ background: '#ffffff', border: '1.5px dashed var(--primary)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary-dark)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <UserPlus size={16} /> Agregar Nuevo Pasajero / Acompañante
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1.2fr 1fr 1fr 100px auto', gap: 10, alignItems: 'flex-end' }}>
                                        <div className="field" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '0.76rem' }}>Documento</label>
                                            <select
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
                                        </div>

                                        <div className="field" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '0.76rem' }}>
                                                {borradorAcomp.tipo_documento === 'Sin Documento' ? 'Identificador' : 'Nº de Documento'}
                                            </label>
                                            <input
                                                placeholder={borradorAcomp.tipo_documento === 'Sin Documento' ? 'Se autogenera (MENOR-...)' : 'V-12345678'}
                                                value={borradorAcomp.tipo_documento === 'Sin Documento' ? '(Autogenerado para el menor)' : borradorAcomp.documento_id}
                                                disabled={borradorAcomp.tipo_documento === 'Sin Documento'}
                                                onChange={(e) => handleDocAcompChange(e.target.value)}
                                            />
                                        </div>

                                        <div className="field" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '0.76rem' }}>Nombre</label>
                                            <input
                                                placeholder="Nombre"
                                                value={borradorAcomp.nombre}
                                                onChange={(e) => setBorradorAcomp({ ...borradorAcomp, nombre: e.target.value })}
                                            />
                                        </div>

                                        <div className="field" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '0.76rem' }}>Apellido</label>
                                            <input
                                                placeholder="Apellido"
                                                value={borradorAcomp.apellido}
                                                onChange={(e) => setBorradorAcomp({ ...borradorAcomp, apellido: e.target.value })}
                                            />
                                        </div>

                                        <div className="field" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '0.76rem' }}>Edad</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={borradorAcomp.tipo_documento === 'Sin Documento' ? 17 : 120}
                                                value={borradorAcomp.edad}
                                                onChange={(e) => setBorradorAcomp({ ...borradorAcomp, edad: e.target.value })}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={confirmarAcompanante}
                                            style={{ height: 40 }}
                                        >
                                            <Plus size={16} /> Añadir
                                        </button>
                                    </div>

                                    {/* Indicador de tarifa anticipada */}
                                    <div style={{ marginTop: 8, fontSize: '0.76rem', color: 'var(--muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <span>Tarifa calculada:</span>
                                        {(() => {
                                            const tarifa = calcularTarifaPorEdad(precioUnitario, borradorAcomp.edad);
                                            return (
                                                <Badge tipo={tarifa.tipo}>
                                                    {tarifa.etiqueta} — {formatoMoneda(tarifa.monto)}
                                                </Badge>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Lista de Acompañantes Agregados */}
                                {acompanantes.length > 0 ? (
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 8 }}>
                                            Acompañantes añadidos ({acompanantes.length}):
                                        </div>
                                        <div className="acomp-cards-grid">
                                            {acompanantes.map((a, idx) => {
                                                const t = calcularTarifaPorEdad(precioUnitario, a.edad);
                                                return (
                                                    <div key={a.documento_id} className="acomp-card fade-in">
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                                <span className="viaje-id-chip">#{idx + 2}</span>
                                                                <strong>{a.nombre} {a.apellido}</strong>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <BadgeDocumento doc={a.documento_id} tipo={a.tipo_documento} small />
                                                                <span className="cell-sub">{a.edad} años</span>
                                                                <Badge tipo={t.tipo}>{t.etiqueta}</Badge>
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                                                                Costo: {formatoMoneda(t.monto)}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger-soft"
                                                            onClick={() => quitarAcompanante(a.documento_id)}
                                                            title="Eliminar este acompañante"
                                                            style={{ padding: '6px 8px' }}
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                                        No has añadido acompañantes todavía. Si el titular viaja solo, puedes presionar "Siguiente".
                                    </div>
                                )}

                                {/* Resumen del grupo de viaje */}
                                <div className="calc-box" style={{ marginTop: 18, flexWrap: 'wrap', gap: 14 }}>
                                    <div>
                                        <div className="cell-sub">Total Viajeros</div>
                                        <strong>{cantidadViajeros} persona(s)</strong>
                                    </div>
                                    <div>
                                        <div className="cell-sub">Pasajeros Pagantes (≥3 años)</div>
                                        <strong>{cantidadPagantes} pagante(s)</strong>
                                    </div>
                                    <div>
                                        <div className="cell-sub">Abono Mínimo Obligatorio</div>
                                        <strong style={{ color: '#0d9488' }}>{formatoMoneda(abonoMinimoRequerido)}</strong>
                                    </div>
                                    <div>
                                        <div className="cell-sub">Monto Total Estimado</div>
                                        <strong style={{ color: '#047857' }}>{formatoMoneda(montoTotalCalculado)}</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* MÓDULO 4: ASIGNACIÓN INTERACTIVA DE ASIENTOS              */}
                        {/* ========================================================= */}
                        {pasoWizard === 4 && (
                            <div className="fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                            Módulo 4: Croquis y Asignación de Asientos
                                        </h3>
                                        <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                                            Selecciona los puestos en el croquis interactivo para el titular y cada acompañante.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd', fontWeight: 700 }}
                                        onClick={autoAsignarPuestosGrupo}
                                    >
                                        <Sparkles size={16} /> Auto-asignar Asientos Contiguos
                                    </button>
                                </div>

                                {/* Barra de Estado de Puestos Asignados a cada Pasajero */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                                    {listaPasajerosParaCroquis.map((p, idx) => (
                                        <div key={p.documento_id || idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                                            <span className="viaje-id-chip">#{idx + 1}</span>
                                            <strong>{p.nombre} {p.apellido}</strong>
                                            <Badge tipo={p.numero_asiento ? 'success' : 'neutral'}>
                                                {p.numero_asiento ? `💺 Puesto #${String(p.numero_asiento).padStart(2, '0')}` : '💺 Automático'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>

                                <MapaAsientos
                                    viaje={viajeSeleccionadoObj}
                                    integrantesViaje={integrantes.filter(i => {
                                        if (!i.is_active) return false;
                                        const res = reservas.find(r => r.id_reserva === i.id_reserva);
                                        return res && res.is_active && res.id_viaje === Number(idViaje);
                                    })}
                                    pasajerosGrupo={listaPasajerosParaCroquis}
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
                                    titulo={`Croquis de ${viajeSeleccionadoObj?.metodo_transporte || 'Transporte'} — Toca un pasajero y luego su asiento`}
                                />
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* MÓDULO 5: RESUMEN, ABONO INICIAL Y PAGO                    */}
                        {/* ========================================================= */}
                        {pasoWizard === 5 && (
                            <div className="fade-in">
                                <div style={{ marginBottom: 16 }}>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                        Módulo 5: Resumen de Reserva y Abono Inicial
                                    </h3>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                                        Revisa los detalles finales, define el monto del abono inicial y emite la reserva formalmente.
                                    </p>
                                </div>

                                {/* Tarjeta Resumen Consolidado */}
                                <div style={{ background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                        <div>
                                            <div className="cell-sub">Cliente Titular</div>
                                            <strong>{clienteExistenteReserva ? `${clienteExistenteReserva.nombre} ${clienteExistenteReserva.apellido}` : `${form.nombre} ${form.apellido}`}</strong>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                                {clienteExistenteReserva ? clienteExistenteReserva.id_cliente : form.id_cliente} · Tel: {clienteExistenteReserva ? clienteExistenteReserva.telefono : form.telefono}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="cell-sub">Destino y Fecha</div>
                                            <strong style={{ color: '#0f766e' }}>{destinoSeleccionadoObj?.nombre_destino}</strong>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                                Salida: {formatoFecha(viajeSeleccionadoObj?.fecha_salida + 'T00:00:00')} ({viajeSeleccionadoObj?.metodo_transporte})
                                            </div>
                                        </div>

                                        <div>
                                            <div className="cell-sub">Pasajeros y Puestos</div>
                                            <strong>{cantidadViajeros} persona(s)</strong>
                                            <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}>
                                                💺 {[asientoTitular ? `#${asientoTitular}` : null, ...acompanantes.map(a => a.numero_asiento ? `#${a.numero_asiento}` : null)].filter(Boolean).join(', ') || 'Automático'}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="cell-sub">Total de la Reserva</div>
                                            <strong style={{ fontSize: '1.25rem', color: '#047857' }}>
                                                {formatoMoneda(montoTotalCalculado)}
                                            </strong>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                Abono mín: {formatoMoneda(abonoMinimoRequerido)} ($30 × {cantidadPagantes})
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Formulario de Abono */}
                                <div className="form-grid" style={{ marginBottom: 18 }}>
                                    <div className="field">
                                        <label>Monto del Abono Inicial ($ USD) — Mínimo {formatoMoneda(abonoMinimoRequerido)}</label>
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
                                        <label>Método de Pago y Referencia Bancaria</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select
                                                value={metodoPago}
                                                onChange={(e) => setMetodoPago(e.target.value)}
                                                style={{ flex: 1 }}
                                            >
                                                {METODOS_PAGO.map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.icono} {m.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                placeholder={['Nequi', 'Bancolombia'].includes(metodoPago) ? 'Nº Comprobante Colombia' : (metodoPago === 'Pago Móvil' ? 'Nº Referencia / 4 dígitos' : 'Referencia o recibo')}
                                                value={referencia}
                                                onChange={(e) => setReferencia(e.target.value)}
                                                required
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Calculadora Multidivisa BCV y COP */}
                                    <div className="field full">
                                        <CalculadoraDivisas
                                            montoUSD={parseFloat(montoAbono) || 0}
                                            metodoSeleccionado={metodoPago}
                                            onCambiarMontoUSD={(usd) => setMontoAbono(String(usd))}
                                            titulo="Conversión Oficial del Abono a Bolívares (BCV) o Pesos Colombianos (COP)"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PIE DE NAVEGACIÓN DEL ASISTENTE */}
                    <div className="wizard-footer">
                        <div>
                            {pasoWizard === 1 ? (
                                <button type="button" className="btn btn-ghost" onClick={resetearTodo}>
                                    Cancelar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setPasoWizard(pasoWizard - 1)}
                                >
                                    <ArrowLeft size={16} /> Volver al Paso {pasoWizard - 1}
                                </button>
                            )}
                        </div>

                        <div>
                            {pasoWizard === 1 && (
                                !asignarViajeAhora ? (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleSubmit}
                                        disabled={guardando}
                                    >
                                        {guardando ? 'Guardando Cliente...' : 'Guardar Solo Cliente'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => avanzarPaso(2)}
                                    >
                                        Siguiente: Seleccionar Viaje <ArrowRight size={16} />
                                    </button>
                                )
                            )}

                            {pasoWizard === 2 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={!idViaje}
                                    onClick={() => avanzarPaso(3)}
                                >
                                    Siguiente: Acompañantes <ArrowRight size={16} />
                                </button>
                            )}

                            {pasoWizard === 3 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => avanzarPaso(4)}
                                >
                                    Siguiente: Elegir Asientos <ArrowRight size={16} />
                                </button>
                            )}

                            {pasoWizard === 4 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => avanzarPaso(5)}
                                >
                                    Siguiente: Resumen y Abono <ArrowRight size={16} />
                                </button>
                            )}

                            {pasoWizard === 5 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={guardando}
                                    style={{ background: 'linear-gradient(135deg, #0ea5a4, #10b981)', padding: '10px 22px', fontSize: '0.96rem', fontWeight: 800 }}
                                >
                                    {guardando ? 'Emitiendo Reserva...' : '🎉 Confirmar y Emitir Reserva'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN Y COMPROBANTE WHATSAPP DE RESERVA EXITOSA */}
            {reservaExitosa && (
                <div className="modal-backdrop" onClick={() => setReservaExitosa(null)}>
                    <div className="modal-card fade-in" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
                        <div className="reserva-success-banner">
                            <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: '#d1fae5', color: '#059669', marginBottom: 10 }}>
                                <CheckCircle2 size={36} />
                            </div>
                            <h2 style={{ fontSize: '1.4rem', color: '#065f46', fontWeight: 800 }}>
                                ¡Cliente y Reserva Creados Exitosamente!
                            </h2>
                            <p style={{ margin: '4px 0 0', color: '#047857', fontSize: '0.88rem' }}>
                                La reserva ha sido emitida y registrada en el sistema.
                            </p>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem' }}>
                                <div>
                                    <span className="cell-sub">Reserva Nº:</span>
                                    <div><strong style={{ fontSize: '1.05rem', color: 'var(--primary-dark)' }}>#{reservaExitosa.reserva.id_reserva}</strong></div>
                                </div>
                                <div>
                                    <span className="cell-sub">Cliente Titular:</span>
                                    <div><strong>{reservaExitosa.cliente.nombre} {reservaExitosa.cliente.apellido}</strong></div>
                                </div>
                                <div>
                                    <span className="cell-sub">Destino:</span>
                                    <div><strong>{reservaExitosa.destino?.nombre_destino}</strong></div>
                                </div>
                                <div>
                                    <span className="cell-sub">Fecha de Salida:</span>
                                    <div><strong>{formatoFecha(reservaExitosa.viaje?.fecha_salida + 'T00:00:00')}</strong></div>
                                </div>
                                <div>
                                    <span className="cell-sub">Asientos Asignados:</span>
                                    <div><strong style={{ color: '#0d9488' }}>💺 {reservaExitosa.puestos}</strong></div>
                                </div>
                                <div>
                                    <span className="cell-sub">Viajeros:</span>
                                    <div><strong>{reservaExitosa.cantViajeros} persona(s)</strong></div>
                                </div>
                                <div>
                                    <span className="cell-sub">Monto Total:</span>
                                    <div><strong>{formatoMoneda(reservaExitosa.total)}</strong></div>
                                </div>
                                <div>
                                    <span className="cell-sub">Abonado / Saldo:</span>
                                    <div>
                                        <span style={{ color: '#15803d', fontWeight: 700 }}>{formatoMoneda(reservaExitosa.abonado)}</span>
                                        {reservaExitosa.saldo > 0 ? (
                                            <span style={{ color: '#b45309', marginLeft: 6 }}>(Resta {formatoMoneda(reservaExitosa.saldo)})</span>
                                        ) : (
                                            <span style={{ color: '#15803d', marginLeft: 6 }}>(Solvente)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={enviarComprobanteWhatsApp}
                                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', justifyContent: 'center', padding: '12px', fontSize: '0.96rem', fontWeight: 800 }}
                            >
                                <MessageCircle size={18} /> Enviar Comprobante por WhatsApp al Cliente
                            </button>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                    onClick={() => {
                                        setReservaExitosa(null);
                                        setPasoWizard(1);
                                        setMostrarForm(true);
                                    }}
                                >
                                    <Plus size={16} /> Registrar Otro Cliente
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                    onClick={() => setReservaExitosa(null)}
                                >
                                    Cerrar y Ver Directorio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TABLA PRINCIPAL DE CLIENTES */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Directorio de Clientes</div>
                        <div className="card-sub">{filtrados.length} clientes · Toca cualquier cliente para ver su expediente e historial completo</div>
                    </div>
                    <Buscador
                        valor={busquedaDocumento}
                        onChange={setBusquedaDocumento}
                        placeholder="Buscar por cédula, pasaporte, nombre o palabra clave..."
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

                        {/* Historial de Reservaciones Realizadas como Titular */}
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

                        {/* Historial de Abordajes / Manifiestos como Viajero */}
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
