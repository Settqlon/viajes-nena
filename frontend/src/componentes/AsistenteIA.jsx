import { useEffect, useRef, useState } from 'react';
import {
    Bot, X, Send, Sparkles, Lightbulb, HelpCircle, KeyRound, CheckCircle2,
    Calculator, Calendar, Users, DollarSign, ArrowRight
} from 'lucide-react';
import {
    obtenerRecomendacionesIA,
    enviarMensajeAsistente,
    cotizarPorPresupuesto,
    configurarApiKeyIA
} from '../servicios/asistenteServicios';

const AYUDA_POR_SECCION = {
    dashboard: 'Estás en Estadísticas: consulta KPIs, semáforo de próximas salidas y rentabilidad.',
    catalogo: 'Estás en Catálogo Turístico: administra los destinos y sus paquetes promocionales.',
    viajes: 'Estás en Viajes Programados: gestiona fechas de salida, transporte (Bus Cama 60 / Avión 150) y cupos.',
    clientes: 'Estás en Clientes: registra al titular, acompañantes, asientos y abono en un flujo paso a paso.',
    reservas: 'Estás en Reservas: filtra por saldo pendiente, liquida en 1 clic o envía comprobantes por WhatsApp.',
    integrantes: 'Estás en Manifiesto de Abordaje: marca pasajeros a bordo, cobra saldos pendientes e imprime la lista.',
    pagos: 'Estás en Pagos: registra cobros multidivisa (USD, Bs BCV, COP) y liquida reservas.',
    'control-financiero': 'Estás en Control Financiero: audita ingresos, costos operativos, incidentes y ganancia neta.',
    procesos: 'Estás en Procesos Operativos: seguimiento logístico sincronizado con cada viaje.',
    usuarios: 'Estás en Usuarios y Roles: administra las cuentas y permisos del personal.',
    auditoria: 'Estás en Auditoría: bitácora inmutable de operaciones del sistema.'
};

const PREGUNTAS_RAPIDAS = [
    '💰 Cliente con presupuesto de $250 para 1 adulto, ¿qué viajes le convienen?',
    '👨‍👩‍👧 Pareja con 1 niño y $450 de presupuesto, ¿qué paquetes alcanzan?',
    '🌴 ¿Cuáles son los paquetes más económicos y sus fechas de salida?',
    '📊 Dame el balance financiero y cuánto falta por cobrar hoy'
];

export default function AsistenteIA({ seccionActiva = 'dashboard', onNavegar, onIrAClientes }) {
    const [abierto, setAbierto] = useState(false);
    const [tab, setTab] = useState('chat'); // 'chat' | 'cotizador' | 'recomendaciones' | 'config'
    const [recomendaciones, setRecomendaciones] = useState([]);
    const [apiKeyActiva, setApiKeyActiva] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [guardandoKey, setGuardandoKey] = useState(false);
    const [interactionId, setInteractionId] = useState(null);
    const [input, setInput] = useState('');
    const [cargando, setCargando] = useState(false);

    const [presupuesto, setPresupuesto] = useState('300');
    const [adultos, setAdultos] = useState(2);
    const [ninos, setNinos] = useState(0);
    const [infantes, setInfantes] = useState(0);
    const [filtroTexto, setFiltroTexto] = useState('');
    const [resultadoCotizacion, setResultadoCotizacion] = useState(null);
    const [cargandoCotizacion, setCargandoCotizacion] = useState(false);

    const [mensajes, setMensajes] = useState([
        {
            rol: 'asistente',
            texto: '¡Hola! Soy **Nena AI**, tu asesor comercial y operativo.\n\n• **Cotiza por presupuesto:** Escríbeme por ejemplo *"Cliente con $350 para 2 adultos y 1 niño"* o usa la pestaña **💰 Cotizador**.\n• **Busca clientes:** Escribe una cédula (ej. `V-14523890`) para ver sus reservas y saldo.'
        }
    ]);

    const scrollRef = useRef(null);

    const cargarRecomendaciones = async () => {
        try {
            const data = await obtenerRecomendacionesIA();
            setRecomendaciones(data.recomendaciones || []);
            setApiKeyActiva(Boolean(data.api_key_configurada));
        } catch {
        }
    };

    const ejecutarCotizacion = async (e) => {
        if (e) e.preventDefault();
        const monto = parseFloat(presupuesto);
        if (!monto || monto <= 0) return;
        setCargandoCotizacion(true);
        try {
            const data = await cotizarPorPresupuesto({
                presupuesto: monto,
                adultos: Number(adultos) || 1,
                ninos: Number(ninos) || 0,
                infantes: Number(infantes) || 0,
                filtro_texto: filtroTexto.trim()
            });
            setResultadoCotizacion(data);
        } catch {
        } finally {
            setCargandoCotizacion(false);
        }
    };

    useEffect(() => {
        if (abierto) {
            cargarRecomendaciones();
            if (tab === 'cotizador' && !resultadoCotizacion) {
                ejecutarCotizacion();
            }
        }
    }, [abierto, seccionActiva, tab]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [mensajes, cargando, tab]);

    const enviarPregunta = async (textoPregunta) => {
        const pregunta = (textoPregunta ?? input).trim();
        if (!pregunta || cargando) return;

        setTab('chat');
        setMensajes(prev => [...prev, { rol: 'usuario', texto: pregunta }]);
        if (!textoPregunta) setInput('');
        setCargando(true);

        try {
            const res = await enviarMensajeAsistente({
                mensaje: pregunta,
                previous_interaction_id: interactionId
            });
            if (res.interaction_id) setInteractionId(res.interaction_id);
            if (typeof res.api_key_configurada === 'boolean') setApiKeyActiva(res.api_key_configurada);

            setMensajes(prev => [
                ...prev,
                { rol: 'asistente', texto: res.respuesta }
            ]);
        } catch {
            setMensajes(prev => [
                ...prev,
                { rol: 'asistente', texto: 'Ocurrió un error al consultar el asistente. Intenta nuevamente.' }
            ]);
        } finally {
            setCargando(false);
        }
    };

    const handleGuardarApiKey = async (e) => {
        e.preventDefault();
        setGuardandoKey(true);
        try {
            const res = await configurarApiKeyIA(apiKeyInput);
            setApiKeyActiva(Boolean(res.api_key_configurada));
            setApiKeyInput('');
            setTab('chat');
            setMensajes(prev => [
                ...prev,
                {
                    rol: 'asistente',
                    texto: res.api_key_configurada
                        ? '✅ **API Key configurada correctamente**. Ahora combino Gemini con el motor cotizador en vivo de PostgreSQL.'
                        : 'ℹ️ **Usando Motor Cotizador Local conectado a PostgreSQL**.'
                }
            ]);
        } finally {
            setGuardandoKey(false);
        }
    };

    const renderTexto = (texto) => {
        return texto.split('\n').map((linea, idx) => {
            const partes = linea.split(/(\*\*.*?\*\*|`.*?`)/g);
            return (
                <div key={idx} style={{ minHeight: linea.trim() === '' ? 6 : 'auto', marginBottom: 3 }}>
                    {partes.map((p, i) => {
                        if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={i}>{p.slice(2, -2)}</strong>;
                        }
                        if (p.startsWith('`') && p.endsWith('`')) {
                            return (
                                <code
                                    key={i}
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.08)',
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    {p.slice(1, -1)}
                                </code>
                            );
                        }
                        return <span key={i}>{p}</span>;
                    })}
                </div>
            );
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setAbierto(!abierto)}
                className="no-print"
                title="Asesor IA y Cotizador por Presupuesto"
                style={{
                    position: 'fixed',
                    right: 24,
                    bottom: 24,
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 18px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, #0ea5a4 0%, #6366f1 100%)',
                    boxShadow: '0 12px 28px rgba(14, 165, 164, 0.38)',
                    transition: 'transform 0.18s ease'
                }}
            >
                <Sparkles size={18} />
                <span>{abierto ? 'Cerrar Asesor IA' : 'Asesor IA & Cotizador'}</span>
                {recomendaciones.length > 0 && !abierto && (
                    <span
                        style={{
                            background: '#f97316',
                            color: '#fff',
                            borderRadius: 999,
                            padding: '1px 7px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                        }}
                    >
                        {recomendaciones.length}
                    </span>
                )}
            </button>

            {abierto && (
                <div
                    className="no-print"
                    style={{
                        position: 'fixed',
                        right: 24,
                        bottom: 82,
                        width: 440,
                        maxWidth: 'calc(100vw - 32px)',
                        height: 610,
                        maxHeight: 'calc(100vh - 110px)',
                        background: '#ffffff',
                        borderRadius: 18,
                        border: '1px solid var(--border)',
                        boxShadow: '0 22px 50px rgba(15, 27, 45, 0.22)',
                        zIndex: 999,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    {/* Cabecera */}
                    <div
                        style={{
                            padding: '13px 16px',
                            background: 'linear-gradient(135deg, #0f1b2d 0%, #1e293b 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    background: 'linear-gradient(135deg, #0ea5a4, #6366f1)',
                                    display: 'grid',
                                    placeItems: 'center'
                                }}
                            >
                                <Bot size={19} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.93rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    Nena AI — Asesor Comercial
                                    <span
                                        style={{
                                            fontSize: '0.65rem',
                                            padding: '2px 6px',
                                            borderRadius: 999,
                                            background: 'rgba(34, 197, 94, 0.22)',
                                            color: '#86efac',
                                            fontWeight: 700
                                        }}
                                    >
                                        En vivo con BD
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    Cotizador por presupuesto, fechas, paquetes y clientes
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setAbierto(false)}
                            style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Ayuda contextual de la sección actual */}
                    <div
                        style={{
                            padding: '7px 14px',
                            background: '#f0fdfa',
                            borderBottom: '1px solid #ccfbf1',
                            fontSize: '0.75rem',
                            color: '#0f766e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <HelpCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{AYUDA_POR_SECCION[seccionActiva] || AYUDA_POR_SECCION.dashboard}</span>
                    </div>

                    {/* Pestañas */}
                    <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                        <button
                            type="button"
                            className={`viaje-pill ${tab === 'chat' ? 'active' : ''}`}
                            onClick={() => setTab('chat')}
                            style={{ flex: 1, justifyContent: 'center', padding: '5px 8px', fontSize: '0.76rem' }}
                        >
                            💬 Chat Asesor
                        </button>
                        <button
                            type="button"
                            className={`viaje-pill ${tab === 'cotizador' ? 'active' : ''}`}
                            onClick={() => setTab('cotizador')}
                            style={{ flex: 1, justifyContent: 'center', padding: '5px 8px', fontSize: '0.76rem' }}
                        >
                            💰 Cotizador
                        </button>
                        <button
                            type="button"
                            className={`viaje-pill ${tab === 'recomendaciones' ? 'active' : ''}`}
                            onClick={() => setTab('recomendaciones')}
                            style={{ flex: 1, justifyContent: 'center', padding: '5px 8px', fontSize: '0.76rem' }}
                        >
                            💡 Alertas ({recomendaciones.length})
                        </button>
                        <button
                            type="button"
                            className={`viaje-pill ${tab === 'config' ? 'active' : ''}`}
                            onClick={() => setTab('config')}
                            style={{ padding: '5px 8px', fontSize: '0.76rem' }}
                            title="Configurar Gemini API Key"
                        >
                            <KeyRound size={13} />
                        </button>
                    </div>

                    {/* VISTA 1: CHAT INTERACTIVO */}
                    {tab === 'chat' && (
                        <>
                            <div
                                ref={scrollRef}
                                style={{
                                    flex: 1,
                                    padding: 14,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    background: '#f8fafc'
                                }}
                            >
                                {mensajes.map((m, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            alignSelf: m.rol === 'usuario' ? 'flex-end' : 'flex-start',
                                            maxWidth: '90%',
                                            padding: '10px 13px',
                                            borderRadius: m.rol === 'usuario' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                            background: m.rol === 'usuario' ? 'var(--primary)' : '#ffffff',
                                            color: m.rol === 'usuario' ? '#ffffff' : 'var(--text)',
                                            border: m.rol === 'usuario' ? 'none' : '1px solid var(--border)',
                                            fontSize: '0.82rem',
                                            lineHeight: 1.45,
                                            boxShadow: '0 2px 6px rgba(15,27,45,0.04)'
                                        }}
                                    >
                                        {renderTexto(m.texto)}
                                    </div>
                                ))}

                                {cargando && (
                                    <div
                                        style={{
                                            alignSelf: 'flex-start',
                                            padding: '9px 13px',
                                            borderRadius: 12,
                                            background: '#fff',
                                            border: '1px solid var(--border)',
                                            fontSize: '0.8rem',
                                            color: 'var(--muted)'
                                        }}
                                    >
                                        Analizando paquetes, fechas y disponibilidad en vivo...
                                    </div>
                                )}

                                <div style={{ marginTop: 4 }}>
                                    <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                                        Consultas rápidas de ejemplo:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {PREGUNTAS_RAPIDAS.map((preg, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => enviarPregunta(preg)}
                                                style={{
                                                    textAlign: 'left',
                                                    padding: '6px 10px',
                                                    borderRadius: 8,
                                                    border: '1px solid #cbd5e1',
                                                    background: '#ffffff',
                                                    fontSize: '0.75rem',
                                                    color: '#1e293b',
                                                    cursor: 'pointer',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {preg}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    enviarPregunta();
                                }}
                                style={{
                                    padding: 10,
                                    borderTop: '1px solid var(--border)',
                                    background: '#fff',
                                    display: 'flex',
                                    gap: 8
                                }}
                            >
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ej: Cliente con $350 para 2 adultos y 1 niño..."
                                    style={{
                                        flex: 1,
                                        padding: '9px 12px',
                                        borderRadius: 10,
                                        border: '1px solid var(--border)',
                                        fontSize: '0.83rem'
                                    }}
                                />
                                <button type="submit" className="btn btn-primary" disabled={cargando} style={{ padding: '9px 13px' }}>
                                    <Send size={16} />
                                </button>
                            </form>
                        </>
                    )}

                    {/* VISTA 2: COTIZADOR INTERACTIVO POR PRESUPUESTO */}
                    {tab === 'cotizador' && (
                        <div style={{ flex: 1, padding: 14, overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <form onSubmit={ejecutarCotizacion} style={{ background: '#fff', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Calculator size={15} color="var(--primary)" /> Cotizador Inteligente por Presupuesto
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                                            Presupuesto Total ($ USD)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            min="10"
                                            value={presupuesto}
                                            onChange={(e) => setPresupuesto(e.target.value)}
                                            placeholder="Ej. 300"
                                            style={{ width: '100%', padding: '6px 9px', borderRadius: 8, border: '1px solid var(--border)', fontWeight: 700 }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                                            Destino o Mes (Opcional)
                                        </label>
                                        <input
                                            value={filtroTexto}
                                            onChange={(e) => setFiltroTexto(e.target.value)}
                                            placeholder="Ej. Mérida, diciembre..."
                                            style={{ width: '100%', padding: '6px 9px', borderRadius: 8, border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>

                                {/* Botones rápidos de presupuesto */}
                                <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                                    {[120, 250, 400, 600, 1000].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setPresupuesto(String(val))}
                                            style={{
                                                padding: '2px 8px',
                                                fontSize: '0.72rem',
                                                borderRadius: 6,
                                                border: Number(presupuesto) === val ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                                background: Number(presupuesto) === val ? 'var(--primary-soft)' : '#f8fafc',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ${val}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block' }}>Adultos (+13)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={adultos}
                                            onChange={(e) => setAdultos(e.target.value)}
                                            style={{ width: '100%', padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block' }}>Niños (3-12, -25%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="15"
                                            value={ninos}
                                            onChange={(e) => setNinos(e.target.value)}
                                            style={{ width: '100%', padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block' }}>Infantes (&lt;3, $0)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={infantes}
                                            onChange={(e) => setInfantes(e.target.value)}
                                            style={{ width: '100%', padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary" disabled={cargandoCotizacion} style={{ width: '100%', justifyContent: 'center', padding: '7px' }}>
                                    {cargandoCotizacion ? 'Calculando opciones...' : '🔍 Buscar Paquetes que le Convienen'}
                                </button>
                            </form>

                            {resultadoCotizacion && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ fontSize: '0.75rem', color: '#475569', background: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <strong>Presupuesto: ${resultadoCotizacion.presupuesto}</strong> (Bs. {resultadoCotizacion.presupuesto_bs.toLocaleString('es-VE')} · ${resultadoCotizacion.presupuesto_cop.toLocaleString('es-CO')} COP) · Abono mín. grupo: <strong>${resultadoCotizacion.abono_minimo_requerido}</strong>
                                    </div>

                                    {resultadoCotizacion.opciones_completas.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#15803d', marginBottom: 6 }}>
                                                ✅ Cubre el 100% de Contado ({resultadoCotizacion.opciones_completas.length} viajes):
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {resultadoCotizacion.opciones_completas.map(op => (
                                                    <div key={op.id_viaje} style={{ background: '#fff', border: '1.5px solid #86efac', borderRadius: 10, padding: 10 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{op.destino}</strong>
                                                                <div style={{ fontSize: '0.74rem', color: '#0f766e', fontWeight: 700 }}>{op.paquete} ({op.duracion})</div>
                                                            </div>
                                                            <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.8rem', padding: '2px 8px', borderRadius: 6 }}>
                                                                Total: ${op.costo_total_grupo}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: 5 }}>
                                                            📅 <strong>Salida:</strong> {op.fecha_salida} al {op.fecha_retorno} · {op.metodo_transporte} ({op.cupos_disponibles} libres)
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                                                            🎁 {op.incluye}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                                                            <span style={{ fontSize: '0.73rem', color: '#15803d', fontWeight: 700 }}>
                                                                {op.sobrante > 0 ? `✓ Le sobran $${op.sobrante}` : '✓ Presupuesto exacto'}
                                                            </span>
                                                            {onIrAClientes && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary"
                                                                    style={{ padding: '4px 10px', fontSize: '0.73rem' }}
                                                                    onClick={() => {
                                                                        setAbierto(false);
                                                                        onIrAClientes();
                                                                    }}
                                                                >
                                                                    Reservar <ArrowRight size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {resultadoCotizacion.opciones_con_abono.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#b45309', marginBottom: 6 }}>
                                                📌 Puede Apartar Hoy (Abonando ${resultadoCotizacion.abono_minimo_requerido}+):
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {resultadoCotizacion.opciones_con_abono.slice(0, 4).map(op => (
                                                    <div key={op.id_viaje} style={{ background: '#fff', border: '1px solid #fcd34d', borderRadius: 10, padding: 10 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <strong style={{ fontSize: '0.84rem' }}>{op.destino} — {op.paquete}</strong>
                                                                <div style={{ fontSize: '0.73rem', color: '#64748b' }}>📅 Salida: {op.fecha_salida} · {op.cupos_disponibles} cupos</div>
                                                            </div>
                                                            <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>Total: ${op.costo_total_grupo}</strong>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                                            <span style={{ fontSize: '0.73rem', color: '#b45309', fontWeight: 700 }}>
                                                                Abona hoy ${resultadoCotizacion.presupuesto} → Resta ${op.falta_para_total}
                                                            </span>
                                                            {onIrAClientes && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost"
                                                                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                                                    onClick={() => {
                                                                        setAbierto(false);
                                                                        onIrAClientes();
                                                                    }}
                                                                >
                                                                    Apartar <ArrowRight size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* VISTA 3: RECOMENDACIONES OPERATIVAS CON NAVEGACIÓN DIRECTA */}
                    {tab === 'recomendaciones' && (
                        <div style={{ flex: 1, padding: 14, overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {recomendaciones.map((r, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: '#fff',
                                        border: '1px solid var(--border)',
                                        borderRadius: 12,
                                        padding: 12,
                                        borderLeft: '4px solid var(--primary)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary-dark)', textTransform: 'uppercase' }}>
                                        <Lightbulb size={14} /> {r.categoria}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: 4, color: 'var(--text)' }}>
                                        {r.titulo}
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '6px 0 8px', lineHeight: 1.4 }}>
                                        {r.detalle}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onNavegar && r.seccion_destino) {
                                                onNavegar(r.seccion_destino);
                                                setAbierto(false);
                                            }
                                        }}
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: '#4338ca',
                                            background: '#eef2ff',
                                            border: '1px solid #c7d2fe',
                                            padding: '5px 10px',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5
                                        }}
                                    >
                                        👉 {r.accion_sugerida}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* VISTA 4: CONFIGURAR GEMINI API KEY */}
                    {tab === 'config' && (
                        <form onSubmit={handleGuardarApiKey} style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc' }}>
                            <div className="card" style={{ padding: 14 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle2 size={16} color="#16a34a" />
                                    Motor Cotizador + Google Gemini
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.45, margin: '0 0 12px' }}>
                                    El asistente cotiza presupuestos, fechas, descuentos de niños y busca clientes directamente sobre tu base de datos PostgreSQL. Opcionalmente puedes agregar una API Key de Gemini:
                                </p>
                                <div className="field">
                                    <label>GEMINI_API_KEY (Opcional)</label>
                                    <input
                                        type="password"
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        placeholder="AIzaSy..."
                                    />
                                </div>
                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="submit" className="btn btn-primary" disabled={guardandoKey}>
                                        {guardandoKey ? 'Guardando...' : 'Guardar Configuración'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}
