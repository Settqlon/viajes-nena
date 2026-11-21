import { useEffect, useState } from 'react';
import { obtenerAuditorias, actualizarAuditoria, eliminarAuditoria } from '../servicios/auditoriaServicios';
import { obtenerUsuarios } from '../servicios/authServicios';
import { PageHeader, Buscador, EstadoActivo, BotonBaja, Vacio, Badge, mensajeError, BotonesExportar } from '../componentes/UI';

const TIPO_ACCION = { 'INSERT': 'success', 'UPDATE': 'warning', 'DELETE': 'danger' };

export default function Auditoria() {
    const [auditorias, setAuditorias] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [error, setError] = useState('');
    const [accion, setAccion] = useState('');
    const [busqueda, setBusqueda] = useState('');

    const cargarAuditorias = async (filtro = accion) => {
        try {
            const [aData, uData] = await Promise.all([
                obtenerAuditorias(filtro ? { accion: filtro } : {}),
                obtenerUsuarios()
            ]);
            setAuditorias(aData);
            setUsuarios(uData);
        } catch {
            setError('Error al obtener los registros de auditoría.');
        }
    };

    useEffect(() => { cargarAuditorias(); }, []);

    const nombreUsuario = (id) => {
        if (!id) return 'Sistema';
        const u = usuarios.find(x => x.id_usuario === id);
        return u ? `${u.nombre} (${u.rol})` : `Usuario #${id}`;
    };

    const handleEliminar = async (id) => {
        if (confirm('¿Deseas dar de baja lógica este registro de auditoría? Podrás restaurarlo más adelante.')) {
            try {
                await eliminarAuditoria(id);
                cargarAuditorias();
            } catch (err) {
                alert(mensajeError(err, 'No se pudo desactivar el registro.'));
            }
        }
    };

    const handleRestaurar = async (id) => {
        try {
            await actualizarAuditoria(id, { is_active: true });
            cargarAuditorias();
        } catch (err) {
            alert(mensajeError(err, 'No se pudo restaurar el registro.'));
        }
    };

    const q = busqueda.trim().toLowerCase();
    const filtradas = auditorias.filter(a => {
        if (!q) return true;
        return `${a.id_auditoria} ${a.tabla_afectada} ${a.accion} ${a.detalles || ''} ${nombreUsuario(a.id_usuario)}`.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Auditoría y Trazabilidad del Sistema"
                subtitulo="Bitácora inmutable de creaciones (INSERT), actualizaciones (UPDATE) y bajas lógicas (DELETE)"
            >
                <BotonesExportar ruta="/reportes/auditoria" nombreArchivo="Reporte_Auditoria_ViajesLaNena" />
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div className="card-title">Registros de Auditoría ({filtradas.length})</div>
                        <div className="card-sub">Trazabilidad completa de todas las tablas del sistema</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className="viaje-destino-pills">
                            {['', 'INSERT', 'UPDATE', 'DELETE'].map(act => (
                                <button
                                    key={act || 'ALL'}
                                    type="button"
                                    className={`viaje-pill ${accion === act ? 'active' : ''}`}
                                    onClick={() => {
                                        setAccion(act);
                                        cargarAuditorias(act);
                                    }}
                                >
                                    {act || 'Todas'}
                                </button>
                            ))}
                        </div>
                        <Buscador
                            valor={busqueda}
                            onChange={setBusqueda}
                            placeholder="Buscar por tabla, usuario o detalle..."
                        />
                    </div>
                </div>

                {filtradas.length === 0 ? <Vacio texto="No hay registros de auditoría para mostrar" /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Acción</th>
                                    <th>Tabla</th>
                                    <th>Usuario Responsable</th>
                                    <th>Fecha y Hora</th>
                                    <th>Detalles de la Operación</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map((a) => (
                                    <tr key={a.id_auditoria} className={a.is_active ? '' : 'inactive'}>
                                        <td><strong>#{a.id_auditoria}</strong></td>
                                        <td><Badge tipo={TIPO_ACCION[a.accion] || 'info'}>{a.accion}</Badge></td>
                                        <td className="cell-main">{a.tabla_afectada}</td>
                                        <td>{nombreUsuario(a.id_usuario)}</td>
                                        <td>{new Date(a.fecha_hora).toLocaleString('es-VE')}</td>
                                        <td>{a.detalles || '—'}</td>
                                        <td><EstadoActivo activo={a.is_active} /></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <BotonBaja
                                                activo={a.is_active}
                                                onClick={() => handleEliminar(a.id_auditoria)}
                                                onRestaurar={() => handleRestaurar(a.id_auditoria)}
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
