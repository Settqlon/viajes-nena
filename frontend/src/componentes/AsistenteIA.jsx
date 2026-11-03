import { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Sparkles, Lightbulb, HelpCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { obtenerRecomendacionesIA, enviarMensajeAsistente, configurarApiKeyIA } from '../servicios/asistenteServicios';

const AYUDA_POR_SECCION = {
    dashboard: 'Estás en Estadísticas: aquí ves KPIs, viaje más vendido, ocupación real (Bus Cama 60 / Avión 150) y rentabilidad.',
    destinos: 'Estás en Destinos: gestiona los lugares turísticos y su tarifa base por viajero.',
    paquetes: 'Estás en Paquetes: configura días, noches y precio fijo por persona para cada destino.',
    viajes: 'Estás en Viajes: elige Bus Cama (60 asientos) o Avión (150 asientos) y la cantidad de unidades para calcular los cupos solos.',
    clientes: 'Estás en Clientes: documento, teléfono y correo son únicos. Puedes registrar al cliente y asignarle su viaje en un solo paso.',
    reservas: 'Estás en Reservas: ley de $30.00 de abono mínimo por viajero. Toca cualquier fila para ver todo, editar o imprimir el Voucher PDF.',
    integrantes: 'Estás en Nómina de Viajeros: filtra por viaje y pulsa "Imprimir Manifiesto" para generar la lista de abordaje.',
    pagos: 'Estás en Pagos: registra abonos o liquidaciones; al cubrir el monto total, la reserva pasa sola a Pagado.',
    costos: 'Estás en Costos de Viaje: cada gasto operativo actualiza automáticamente el balance de Ganancias del viaje.',
    inconvenientes: 'Estás en Inconvenientes: cada descuento registrado ajusta en tiempo real la Ganancia Neta del viaje.',
    ganancias: 'Estás en Ganancias: el balance se sincroniza automáticamente con las reservas, costos e inconvenientes de cada viaje.',
    procesos: 'Estás en Procesos Operativos: cada viaje programado genera automáticamente su proceso logístico de unidades y embarque.',
    usuarios: 'Estás en Usuarios: administra cuentas y roles del personal de la agencia.',
    auditoria: 'Estás en Auditoría: bitácora automática de todas las creaciones, ediciones y bajas lógicas del sistema.'
};

const PREGUNTAS_RAPIDAS = [
    '💡 Dame recomendaciones para mejorar ventas y cobranzas',
    '🚌 ¿Cuántos cupos quedan en los viajes programados?',
    '📋 ¿Cómo funciona la ley de los $30 de abono e integrantes?',
    '📊 ¿Cuál es el viaje más vendido y el resumen financiero?',
    '🔄 ¿Cómo edito o restauro un registro dado de baja?'
];

export default function AsistenteIA({ seccionActiva = 'dashboard' }) {
    const [abierto, setAbierto] = useState(false);
    const [tab, setTab] = useState('chat'); // 'chat' | 'recomendaciones' | 'config'
    const [recomendaciones, setRecomendaciones] = useState([]);
    const [apiKeyActiva, setApiKeyActiva] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [guardandoKey, setGuardandoKey] = useState(false);
    const [interactionId, setInteractionId] = useState(null);
    const [modoActual, setModoActual] = useState('motor-local-bd');
    const [input, setInput] = useState('');
    const [cargando, setCargando] = useState(false);
    const [mensajes, setMensajes] = useState([
        {
            rol: 'asistente',
            texto: '¡Hola! Soy **Nena AI**, tu asistente inteligente de **Viajes La Nena**. Tengo acceso en tiempo real a los viajes, cupos, reservas y estadísticas del sistema. ¿En qué te ayudo hoy o qué recomendación deseas revisar?'
        }
    ]);

    const scrollRef = useRef(null);

    const cargarRecomendaciones = async () => {
        try {
            const data = await obtenerRecomendacionesIA();
            setRecomendaciones(data.recomendaciones || []);
            setApiKeyActiva(Boolean(data.api_key_configurada));
        } catch {
            // Silencioso si aún no carga
        }
    };

    useEffect(() => {
        if (abierto) cargarRecomendaciones();
    }, [abierto, seccionActiva]);

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
            if (res.modo) setModoActual(res.modo);
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

    const handleGuardarKey = async (e) => {
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
                        ? '✅ **API Key de Google Gemini configurada correctamente (`gemini-3.8-flash`)**. Ahora responderé usando la nube de Gemini combinada con los datos en vivo de tu base de datos PostgreSQL.'
                        : 'ℹ️ Se activó el **Motor Inteligente Local conectado a PostgreSQL**.'
                }
            ]);
        } finally {
            setGuardandoKey(false);
        }
    };

    const renderTextoFormateado = (texto = '') => {
        return texto.split('\n').map((linea, idx) => {
            const partes = linea.split(/(\*\*.*?\*\*)/g).map((seg, i) => {
                if (seg.startsWith('**') && seg.endsWith('**')) {
                    return <strong key={i}>{seg.slice(2, -2)}</strong>;
                }
                return seg;
            });
            return (
                <div key={idx} style={{ minHeight: linea.trim() ? 'auto' : 8, marginBottom: 3 }}>
                    {partes}
                </div>
            );
        });
    };

    return (
        <>
            {/* Botón Flotante Principal */}
            <button
                type="button"
                onClick={() => setAbierto(!abierto)}
                title="Asistente IA y Recomendaciones"
                style={{
                    position: 'fixed',
                    right: 24,
                    bottom: 24,
                    zIndex: 1100,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '13px 18px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #0ea5a4 0%, #6366f1 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: '0 14px 32px rgba(14, 165, 164, 0.38)'
                }}
            >
                <Sparkles size={18} />
                <span>{abierto ? 'Cerrar Nena AI' : 'Asistente IA & Recomendaciones'}</span>
            </button>

            {/* Panel Flotante del Asistente */}
            {abierto && (
                <div
                    className="fade-in"
                    style={{
                        position: 'fixed',
                        right: 24,
                        bottom: 84,
                        width: 420,
                        maxWidth: 'calc(100vw - 32px)',
                        height: 600,
                        maxHeight: 'calc(100vh - 120px)',
                        background: '#ffffff',
                        borderRadius: 18,
                        border: '1px solid var(--border)',
                        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        zIndex: 1100
                    }}
                >
                    {/* Cabecera */}
                    <div
                        style={{
                            padding: '14px 16px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            color: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    background: 'linear-gradient(135deg, #0ea5a4, #6366f1)',
                                    display: 'grid',
                                    placeItems: 'center'
                                }}
                            >
                                <Bot size={20} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    Nena AI
                                    <span
                                        style={{
                                            fontSize: '0.68rem',
                                            padding: '2px 7px',
                                            borderRadius: 99,
                                            background: apiKeyActiva ? 'rgba(34,197,94,0.22)' : 'rgba(14,165,164,0.25)',
                                            color: apiKeyActiva ? '#86efac' : '#5eead4'
                                        }}
                                    >
                                        {apiKeyActiva ? 'Gemini 3.8 Flash' : 'Conectado a BD'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                    Recomendaciones en vivo y ayuda del sistema
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setAbierto(false)}
                            style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 4 }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Cinta de ayuda contextual de la pantalla actual */}
                    <div
                        style={{
                            padding: '8px 14px',
                            background: '#f0fdfa',
                            borderBottom: '1px solid #ccfbf1',
                            fontSize: '0.76rem',
                            color: '#0f766e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <HelpCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{AYUDA_POR_SECCION[seccionActiva] || AYUDA_POR_SECCION.dashboard}</span>
                    </div>

                    {/* Pestañas: Chat / Recomendaciones / API Key */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr auto',
                            gap: 6,
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderBottom: '1px solid var(--border)'
                        }}
                    >
                        <button
                            type="button"
                            className={`viaje-pill ${tab === 'chat' ? 'active' : ''}`}
                            onClick={() => setTab('chat')}
                            style={{ justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            <Bot size={13} /> Chat de Ayuda
                        </button>
                        <button
                            type="button"
                            className={`viaje-pill ${tab === 'recomendaciones' ? 'active' : ''}`}
                            onClick={() => setTab('recomendaciones')}
                            style={{ justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            <Lightbulb size={13} /> Recomendaciones ({recomendaciones.length})
                        </button>
                        <button
                            type="button"
                            className={`viaje-pill ${tab === 'config' ? 'active' : ''}`}
                            onClick={() => setTab('config')}
                            title="Configurar Gemini API Key"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            <KeyRound size={13} /> API
                        </button>
                    </div>

                    {/* Contenido según pestaña */}
                    {tab === 'chat' && (
                        <>
                            <div
                                ref={scrollRef}
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: 14,
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
                                            maxWidth: '88%',
                                            padding: '10px 13px',
                                            borderRadius: m.rol === 'usuario' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                            background: m.rol === 'usuario' ? 'var(--primary)' : '#ffffff',
                                            color: m.rol === 'usuario' ? '#ffffff' : 'var(--text)',
                                            border: m.rol === 'usuario' ? 'none' : '1px solid var(--border)',
                                            fontSize: '0.83rem',
                                            lineHeight: 1.45,
                                            boxShadow: '0 2px 6px rgba(15,23,42,0.04)'
                                        }}
                                    >
                                        {renderTextoFormateado(m.texto)}
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
                                        Analizando base de datos y generando respuesta...
                                    </div>
                                )}

                                {/* Chips de preguntas sugeridas */}
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                                        CONSULTAS Y RECOMENDACIONES RÁPIDAS:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {PREGUNTAS_RAPIDAS.map((preg, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => enviarPregunta(preg)}
                                                style={{
                                                    textAlign: 'left',
                                                    fontSize: '0.75rem',
                                                    padding: '6px 10px',
                                                    borderRadius: 10,
                                                    border: '1px solid #cbd5e1',
                                                    background: '#ffffff',
                                                    color: '#0f172a',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {preg}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Input de envío */}
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
                                    className="input"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe tu duda o pide una recomendación..."
                                    style={{ fontSize: '0.84rem' }}
                                />
                                <button type="submit" className="btn btn-primary" disabled={cargando} style={{ padding: '9px 13px' }}>
                                    <Send size={15} />
                                </button>
                            </form>
                        </>
                    )}

                    {tab === 'recomendaciones' && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: 2 }}>
                                Diagnóstico automático generado a partir de tus viajes, ocupación de unidades, reservas y cuentas por cobrar:
                            </div>
                            {recomendaciones.map((r, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: '#fff',
                                        border: '1px solid var(--border)',
                                        borderLeft: '4px solid var(--primary)',
                                        borderRadius: 12,
                                        padding: 12
                                    }}
                                >
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary-dark)', textTransform: 'uppercase' }}>
                                        {r.categoria}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: 3 }}>{r.titulo}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
                                        {r.detalle}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => enviarPregunta(`Explícame cómo aplicar esta recomendación: ${r.titulo}`)}
                                        style={{ marginTop: 8, padding: '5px 10px', fontSize: '0.75rem' }}
                                    >
                                        <Sparkles size={12} /> Preguntar al asistente cómo hacerlo
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'config' && (
                        <form onSubmit={handleGuardarKey} style={{ flex: 1, padding: 16, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ background: '#fff', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle2 size={16} color="#0ea5a4" />
                                    Modo Híbrido (Gemini 3.8 Flash + Motor Local BD)
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                                    El asistente funciona <strong>de inmediato sin API Key</strong> consultando directamente tu base de datos PostgreSQL.
                                    Si deseas conectarlo además con <strong>Google Gemini (`gemini-3.8-flash`)</strong>, pega aquí tu clave de Google AI Studio:
                                </p>
                                <div className="field" style={{ marginTop: 12 }}>
                                    <label>GEMINI_API_KEY (Opcional)</label>
                                    <input
                                        type="password"
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        placeholder="AIzaSy..."
                                    />
                                </div>
                                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
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
