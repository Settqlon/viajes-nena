import { useState, useEffect } from 'react';
import { Bus, Plane, UserCheck, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { Badge } from './UI';

/**
 * Mapa interactivo de puestos para:
 * - Bus Cama de 2 Pisos (60 puestos por unidad: Piso 1 = 1..16 en 4 filas 2x2, Piso 2 = 17..60 en 11 filas 2x2)
 * - Avión Comercial (150 puestos por vuelo: 25 filas de 3x3 con pasillo central, ordenados del 1 al 150)
 *
 * Props:
 * - viaje: objeto del viaje seleccionado ({ id_viaje, metodo_transporte, cantidad_unidades })
 * - ocupadosExternos: mapa/array de asientos ya ocupados en ese viaje por otras reservas: [{ numero_asiento, nombre, apellido, documento_id, id_reserva }]
 * - pasajeros: lista de viajeros a quienes estamos asignando puesto: [{ id_temporal, nombre, apellido, documento_id, edad, numero_asiento }]
 * - onAsignarAsiento: (indexPasajero, numeroAsiento) => void
 * - onAutoAsignar: (nuevosAsientosArray) => void
 * - titulo: string opcional
 */
export default function MapaAsientos({
    viaje,
    ocupadosExternos = [],
    integrantesViaje = [],
    pasajeros = [],
    pasajerosGrupo = [],
    onAsignarAsiento,
    onAutoAsignar,
    titulo = 'Mapa Interactivo de Puestos'
}) {
    // Acepta indistintamente pasajeros / pasajerosGrupo y ocupadosExternos / integrantesViaje
    const listaPasajeros = pasajeros.length > 0 ? pasajeros : pasajerosGrupo;
    const listaOcupados = ocupadosExternos.length > 0 ? ocupadosExternos : integrantesViaje;

    const [pasajeroActivoIdx, setPasajeroActivoIdx] = useState(0);
    const [unidadActiva, setUnidadActiva] = useState(1);
    const [vistaPisoBus, setVistaPisoBus] = useState('ambos'); // 'ambos' | 'piso1' | 'piso2'
    const [asientoInspeccion, setAsientoInspeccion] = useState(null);

    useEffect(() => {
        if (pasajeroActivoIdx >= listaPasajeros.length) {
            setPasajeroActivoIdx(0);
        }
    }, [listaPasajeros.length, pasajeroActivoIdx]);

    if (!viaje) return null;

    const esAvion = viaje.metodo_transporte === 'Avión';
    const asientosPorUnidad = esAvion ? 150 : 60;
    const totalUnidades = Math.max(parseInt(viaje.cantidad_unidades) || 1, 1);
    const offsetUnidad = (unidadActiva - 1) * asientosPorUnidad;

    // Mapa rápido de asientos ocupados por otras reservas: { [num]: info }
    // Excluyendo a los pasajeros de mi propia lista actual (por si se están editando)
    const misIdsOcultar = new Set(listaPasajeros.map(p => p.id_integrante).filter(Boolean));
    const misDocsOcultar = new Set(listaPasajeros.map(p => (p.documento_id || '').toLowerCase()).filter(Boolean));

    const mapaOcupados = {};
    listaOcupados.forEach(item => {
        if (!item.numero_asiento) return;
        const num = Number(item.numero_asiento);
        const esMioPorId = item.id_integrante && misIdsOcultar.has(item.id_integrante);
        const esMioPorDoc = item.documento_id && misDocsOcultar.has(item.documento_id.toLowerCase());
        if (!esMioPorId && !esMioPorDoc) {
            mapaOcupados[num] = item;
        }
    });

    // Mapa rápido de asientos seleccionados por los pasajeros actuales: { [num]: { idx, pasajero } }
    const mapaMisPasajeros = {};
    listaPasajeros.forEach((p, idx) => {
        if (p.numero_asiento) {
            mapaMisPasajeros[Number(p.numero_asiento)] = { idx, pasajero: p };
        }
    });

    const handleClickAsiento = (numAsiento) => {
        const ocupado = mapaOcupados[numAsiento];
        const mio = mapaMisPasajeros[numAsiento];
        setAsientoInspeccion({ num: numAsiento, ocupado, mio });

        if (ocupado) return; // Ocupado por otra reserva
        if (listaPasajeros.length === 0) return; // En modo inspección solo muestra la ficha

        const actualPasajero = listaPasajeros[pasajeroActivoIdx];
        if (!actualPasajero) return;

        // Si el pasajero activo ya tenía este mismo asiento, hacer clic de nuevo lo desasigna
        if (actualPasajero.numero_asiento === numAsiento) {
            if (onAsignarAsiento) onAsignarAsiento(pasajeroActivoIdx, null);
            return;
        }

        // Si ya lo tiene otro pasajero de mi misma lista, se le reasigna al pasajero activo
        if (onAsignarAsiento) {
            onAsignarAsiento(pasajeroActivoIdx, numAsiento);
        }

        // Avanzar automáticamente al siguiente pasajero sin asiento para facilitar la selección
        if (listaPasajeros.length > 1) {
            const sigSinAsiento = listaPasajeros.findIndex((p, i) => i !== pasajeroActivoIdx && !p.numero_asiento);
            if (sigSinAsiento !== -1) {
                setPasajeroActivoIdx(sigSinAsiento);
            } else {
                setPasajeroActivoIdx((pasajeroActivoIdx + 1) % listaPasajeros.length);
            }
        }
    };

    const handleAutoAsignarConsecutivos = () => {
        const capacidadTotal = asientosPorUnidad * totalUnidades;
        const nuevos = [];
        let candidato = 1;
        for (let i = 0; i < listaPasajeros.length; i++) {
            while (candidato <= capacidadTotal && (mapaOcupados[candidato] || nuevos.includes(candidato))) {
                candidato++;
            }
            nuevos.push(candidato <= capacidadTotal ? candidato : null);
        }
        if (onAutoAsignar) {
            onAutoAsignar(nuevos);
        } else if (onAsignarAsiento) {
            nuevos.forEach((num, idx) => {
                if (num) onAsignarAsiento(idx, num);
            });
        }
    };

    const renderBotonAsiento = (numLocal) => {
        const numGlobal = offsetUnidad + numLocal;
        const ocupadoExt = mapaOcupados[numGlobal];
        const mio = mapaMisPasajeros[numGlobal];
        const esDelPasajeroActivo = mio && mio.idx === pasajeroActivoIdx;
        const esInspeccionado = asientoInspeccion && asientoInspeccion.num === numGlobal;

        let bg = '#ffffff';
        let border = '1.5px solid #cbd5e1';
        let color = '#0f172a';
        let cursor = 'pointer';
        let subTexto = 'Libre';
        let title = `Puesto #${numGlobal} — Disponible (Haz clic para ver o asignar)`;

        if (ocupadoExt) {
            bg = '#e2e8f0';
            border = '1.5px solid #94a3b8';
            color = '#475569';
            cursor = 'pointer';
            subTexto = (ocupadoExt.nombre || 'Ocup.').slice(0, 6);
            title = `Puesto #${numGlobal} — OCUPADO por ${ocupadoExt.nombre} ${ocupadoExt.apellido} (${ocupadoExt.documento_id}) · Clic para ver ficha`;
        } else if (esDelPasajeroActivo) {
            bg = 'linear-gradient(135deg, #0ea5a4 0%, #0d9488 100%)';
            border = '2px solid #0f766e';
            color = '#ffffff';
            subTexto = (mio.pasajero.nombre || `Viajero #${mio.idx + 1}`).slice(0, 7);
            title = `Puesto #${numGlobal} — Asignado a ${mio.pasajero.nombre} ${mio.pasajero.apellido} (Clic para liberar)`;
        } else if (mio) {
            bg = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
            border = '2px solid #4338ca';
            color = '#ffffff';
            subTexto = (mio.pasajero.nombre || `Viaj. #${mio.idx + 1}`).slice(0, 7);
            title = `Puesto #${numGlobal} — Asignado a ${mio.pasajero.nombre} ${mio.pasajero.apellido} (de esta reserva)`;
        }

        if (esInspeccionado) {
            border = '2.5px solid #f59e0b';
        }

        return (
            <button
                key={numGlobal}
                type="button"
                onClick={() => handleClickAsiento(numGlobal)}
                title={title}
                style={{
                    width: esAvion ? 44 : 52,
                    height: esAvion ? 42 : 46,
                    borderRadius: '10px 10px 6px 6px',
                    background: bg,
                    border,
                    color,
                    cursor,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 2,
                    transition: 'all 0.15s ease',
                    transform: esInspeccionado ? 'scale(1.08)' : 'none',
                    zIndex: esInspeccionado ? 2 : 1,
                    boxShadow: esInspeccionado
                        ? '0 0 0 3px rgba(245, 158, 11, 0.45), 0 4px 10px rgba(0,0,0,0.12)'
                        : mio
                        ? '0 3px 8px rgba(14,165,164,0.28)'
                        : '0 1px 2px rgba(15,23,42,0.05)',
                    position: 'relative'
                }}
            >
                <span style={{ fontSize: esAvion ? '0.76rem' : '0.82rem', fontWeight: 800, lineHeight: 1.05 }}>
                    #{String(numGlobal).padStart(2, '0')}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, opacity: 0.9, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {subTexto}
                </span>
            </button>
        );
    };

    // Generador de filas de 4 asientos (2 izquierda + pasillo + 2 derecha) para Bus Cama
    const renderFilasBus = (inicioLocal, finLocal) => {
        const filas = [];
        for (let n = inicioLocal; n <= finLocal; n += 4) {
            const numFila = Math.ceil(n / 4);
            filas.push(
                <div
                    key={n}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto auto 28px auto auto',
                        gap: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3px 0'
                    }}
                >
                    {renderBotonAsiento(n)}
                    {renderBotonAsiento(n + 1)}
                    <div style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8' }}>
                        F{numFila}
                    </div>
                    {renderBotonAsiento(n + 2)}
                    {renderBotonAsiento(n + 3)}
                </div>
            );
        }
        return filas;
    };

    // Generador de filas de 6 asientos (3 izquierda A-B-C + pasillo + 3 derecha D-E-F) para Avión (150 asientos = 25 filas)
    const renderFilasAvion = () => {
        const filas = [];
        for (let fila = 1; fila <= 25; fila++) {
            const base = (fila - 1) * 6 + 1;
            const enAla = fila >= 10 && fila <= 16;
            filas.push(
                <div
                    key={fila}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto auto auto 34px auto auto auto',
                        gap: 5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: enAla ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                        borderLeft: enAla ? '3px solid #6366f1' : '3px solid transparent',
                        borderRight: enAla ? '3px solid #6366f1' : '3px solid transparent'
                    }}
                >
                    {renderBotonAsiento(base)}
                    {renderBotonAsiento(base + 1)}
                    {renderBotonAsiento(base + 2)}
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: enAla ? '#4f46e5' : '#64748b' }}>
                        {fila}
                    </div>
                    {renderBotonAsiento(base + 3)}
                    {renderBotonAsiento(base + 4)}
                    {renderBotonAsiento(base + 5)}
                </div>
            );
        }
        return filas;
    };

    return (
        <div
            style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 16,
                marginTop: 12,
                marginBottom: 16
            }}
        >
            {/* Cabecera del Mapa */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {esAvion ? <Plane size={19} color="#4f46e5" /> : <Bus size={19} color="#0d9488" />}
                    <div>
                        <strong style={{ fontSize: '0.96rem' }}>
                            {titulo} — {esAvion ? 'Avión Comercial (150 puestos)' : 'Bus Cama de 2 Pisos (60 puestos)'}
                        </strong>
                        <div className="cell-sub">
                            Selecciona primero al pasajero abajo y luego haz clic en el número de puesto deseado en el mapa
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {totalUnidades > 1 && (
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                            {Array.from({ length: totalUnidades }, (_, idx) => idx + 1).map(u => (
                                <button
                                    key={u}
                                    type="button"
                                    className={`viaje-pill ${unidadActiva === u ? 'active' : ''}`}
                                    onClick={() => setUnidadActiva(u)}
                                >
                                    {esAvion ? `Vuelo #${u}` : `Bus #${u}`} ({(u - 1) * asientosPorUnidad + 1}-{u * asientosPorUnidad})
                                </button>
                            ))}
                        </div>
                    )}
                    {listaPasajeros.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={handleAutoAsignarConsecutivos}
                            style={{ padding: '6px 11px', fontSize: '0.78rem' }}
                        >
                            <Sparkles size={14} /> Auto-asignar puestos seguidos
                        </button>
                    )}
                </div>
            </div>

            {/* Modo Inspección Informativo */}
            {listaPasajeros.length === 0 && (
                <div style={{ marginBottom: 12, padding: '8px 14px', background: '#e0f2fe', borderRadius: 8, color: '#0369a1', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span>ℹ️ <strong>Croquis de Ocupación</strong>: Haz clic en cualquier asiento numerado para ver quién lo tiene asignado o comprobar si está libre.</span>
                    <span style={{ fontWeight: 700 }}>{Object.keys(mapaOcupados).length} ocupados / {asientosPorUnidad * totalUnidades - Object.keys(mapaOcupados).length} libres</span>
                </div>
            )}

            {/* Ficha de Asiento Inspeccionado */}
            {asientoInspeccion && (
                <div style={{
                    marginBottom: 14,
                    padding: '10px 14px',
                    background: '#ffffff',
                    borderRadius: 10,
                    border: '2px solid #f59e0b',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.92rem' }}>
                            #{asientoInspeccion.num}
                        </div>
                        <div>
                            {asientoInspeccion.ocupado ? (
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                        👤 {asientoInspeccion.ocupado.nombre} {asientoInspeccion.ocupado.apellido}
                                    </div>
                                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                        Doc: <strong>{asientoInspeccion.ocupado.documento_id}</strong> {asientoInspeccion.ocupado.edad ? `· ${asientoInspeccion.ocupado.edad} años` : ''} {asientoInspeccion.ocupado.id_reserva ? `· Reserva #${asientoInspeccion.ocupado.id_reserva}` : ''}
                                    </div>
                                </div>
                            ) : asientoInspeccion.mio ? (
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f766e' }}>
                                        ⭐ Asignado a tu viajero actual
                                    </div>
                                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                        Viajero: <strong>{asientoInspeccion.mio.pasajero.nombre} {asientoInspeccion.mio.pasajero.apellido}</strong>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#15803d' }}>
                                        🟢 Asiento #{asientoInspeccion.num} Disponible
                                    </div>
                                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                        Este puesto está completamente libre para nuevas reservaciones.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                        onClick={() => setAsientoInspeccion(null)}
                    >
                        ✕ Cerrar
                    </button>
                </div>
            )}

            {/* Selector de Pasajero al que le estamos otorgando puesto */}
            {listaPasajeros.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                        1. Elige el pasajero al que deseas asignar o cambiar puesto:
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {listaPasajeros.map((p, idx) => {
                            const activo = idx === pasajeroActivoIdx;
                            return (
                                <button
                                    key={(p.documento_id || 'p') + idx}
                                    type="button"
                                    onClick={() => setPasajeroActivoIdx(idx)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 12px',
                                        borderRadius: 10,
                                        border: activo ? '2px solid #0ea5a4' : '1px solid #cbd5e1',
                                        background: activo ? '#f0fdfa' : '#ffffff',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        boxShadow: activo ? '0 2px 8px rgba(14,165,164,0.18)' : 'none'
                                    }}
                                >
                                    <UserCheck size={15} color={activo ? '#0d9488' : '#64748b'} />
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                            {p.nombre ? `${p.nombre} ${p.apellido || ''}` : `Viajero #${idx + 1}`}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                            {p.documento_id || 'Sin doc.'} · {p.edad ?? 30} años
                                        </div>
                                    </div>
                                    <Badge tipo={p.numero_asiento ? 'success' : 'warning'}>
                                        {p.numero_asiento ? `Puesto #${String(p.numero_asiento).padStart(2, '0')}` : 'Sin puesto'}
                                    </Badge>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Leyenda de colores */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.78rem', marginBottom: 14, padding: '8px 12px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: '#ffffff', border: '1.5px solid #cbd5e1', display: 'inline-block' }} />
                    <strong>Libre</strong> (Clic para asignar)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: '#0ea5a4', display: 'inline-block' }} />
                    <strong>Pasajero seleccionado actual</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: '#6366f1', display: 'inline-block' }} />
                    <strong>Otro viajero de tu reserva</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: '#e2e8f0', border: '1px solid #94a3b8', display: 'inline-block' }} />
                    <strong>Ocupado por otra reserva</strong>
                </span>
            </div>

            {/* MAPA DE BUS CAMA DE 2 PISOS (60 ASIENTOS) */}
            {!esAvion && (
                <div>
                    <div className="viaje-destino-pills" style={{ marginBottom: 12 }}>
                        <button
                            type="button"
                            className={`viaje-pill ${vistaPisoBus === 'ambos' ? 'active' : ''}`}
                            onClick={() => setVistaPisoBus('ambos')}
                        >
                            Ver Ambos Pisos (01 al 60)
                        </button>
                        <button
                            type="button"
                            className={`viaje-pill ${vistaPisoBus === 'piso1' ? 'active' : ''}`}
                            onClick={() => setVistaPisoBus('piso1')}
                        >
                            Piso 1 · Planta Baja (Puestos 01 al 16)
                        </button>
                        <button
                            type="button"
                            className={`viaje-pill ${vistaPisoBus === 'piso2' ? 'active' : ''}`}
                            onClick={() => setVistaPisoBus('piso2')}
                        >
                            Piso 2 · Planta Alta Panorámica (Puestos 17 al 60)
                        </button>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: vistaPisoBus === 'ambos' ? 'repeat(auto-fit, minmax(290px, 1fr))' : '1fr',
                            gap: 16,
                            alignItems: 'start'
                        }}
                    >
                        {(vistaPisoBus === 'ambos' || vistaPisoBus === 'piso1') && (
                            <div
                                style={{
                                    background: '#ffffff',
                                    border: '2px solid #cbd5e1',
                                    borderRadius: '22px 22px 14px 14px',
                                    padding: 14,
                                    boxShadow: '0 4px 12px rgba(15,23,42,0.04)'
                                }}
                            >
                                <div style={{ textAlign: 'center', padding: '6px 10px', background: '#f1f5f9', borderRadius: 12, marginBottom: 10, fontWeight: 800, fontSize: '0.82rem', color: '#334155' }}>
                                    🚌 PISO 1 (PLANTA BAJA) — Puestos #{offsetUnidad + 1} al #{offsetUnidad + 16}
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                                        Frente: Cabina del Chofer · Escalera y Baño
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>
                                    <span>Ventana · Pasillo</span>
                                    <span>Pasillo · Ventana</span>
                                </div>
                                {renderFilasBus(1, 16)}
                            </div>
                        )}

                        {(vistaPisoBus === 'ambos' || vistaPisoBus === 'piso2') && (
                            <div
                                style={{
                                    background: '#ffffff',
                                    border: '2px solid #cbd5e1',
                                    borderRadius: '22px 22px 14px 14px',
                                    padding: 14,
                                    boxShadow: '0 4px 12px rgba(15,23,42,0.04)'
                                }}
                            >
                                <div style={{ textAlign: 'center', padding: '6px 10px', background: '#f0fdfa', borderRadius: 12, marginBottom: 10, fontWeight: 800, fontSize: '0.82rem', color: '#0f766e' }}>
                                    🚌 PISO 2 (PLANTA ALTA PANORÁMICA) — Puestos #{offsetUnidad + 17} al #{offsetUnidad + 60}
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0d9488' }}>
                                        Frente Panorámico · 11 Filas Numeradas (44 asientos)
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>
                                    <span>Ventana · Pasillo</span>
                                    <span>Pasillo · Ventana</span>
                                </div>
                                <div style={{ maxHeight: 390, overflowY: 'auto', paddingRight: 4 }}>
                                    {renderFilasBus(17, 60)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MAPA DE AVIÓN COMERCIAL (150 ASIENTOS) */}
            {esAvion && (
                <div
                    style={{
                        background: '#ffffff',
                        border: '2px solid #cbd5e1',
                        borderRadius: '36px 36px 16px 16px',
                        padding: 16,
                        maxWidth: 460,
                        margin: '0 auto',
                        boxShadow: '0 4px 14px rgba(15,23,42,0.05)'
                    }}
                >
                    <div style={{ textAlign: 'center', padding: '8px 12px', background: '#eef2ff', borderRadius: '22px 22px 10px 10px', marginBottom: 10, fontWeight: 800, fontSize: '0.84rem', color: '#3730a3' }}>
                        ✈️ CABINA DEL AVIÓN — Puestos #{offsetUnidad + 1} al #{offsetUnidad + 150}
                        <div style={{ fontSize: '0.71rem', fontWeight: 600, color: '#4f46e5' }}>
                            25 Filas de 6 Asientos (A B C · Pasillo · D E F) · Zona de Alas en Filas 10 a 16
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '44px 44px 44px 34px 44px 44px 44px',
                            gap: 5,
                            justifyContent: 'center',
                            textAlign: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#64748b',
                            marginBottom: 6
                        }}
                    >
                        <span>A (Vent.)</span>
                        <span>B (Cent.)</span>
                        <span>C (Pas.)</span>
                        <span>Fila</span>
                        <span>D (Pas.)</span>
                        <span>E (Cent.)</span>
                        <span>F (Vent.)</span>
                    </div>
                    <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                        {renderFilasAvion()}
                    </div>
                </div>
            )}
        </div>
    );
}
