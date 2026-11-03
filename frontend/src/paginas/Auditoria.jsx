import { useEffect, useState } from 'react';
import { obtenerAuditorias, actualizarAuditoria, eliminarAuditoria } from '../servicios/auditoriaServicios';
import { PageHeader, EstadoActivo, BotonBaja, Vacio, Badge, mensajeError } from '../componentes/UI';

const TIPO_ACCION = { 'INSERT': 'success', 'UPDATE': 'warning', 'DELETE': 'danger' };

export default function Auditoria() {
    const [auditorias, setAuditorias] = useState([]);
    const [error, setError] = useState('');
    const [accion, setAccion] = useState('');

    const cargarAuditorias = async (filtro = accion) => {
        try {
            setAuditorias(await obtenerAuditorias(filtro ? { accion: filtro } : {}));
        } catch (err) {
            setError('Error al obtener los registros de auditoría.');
        }
    };

    useEffect(() => { cargarAuditorias(); }, []);

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

    return (
        <div className="fade-in">
            <PageHeader titulo="Auditoría del Sistema" subtitulo="Bitácora de operaciones realizadas en la base de datos" />

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Registros de auditoría</div>
                    <select className="input" value={accion} onChange={(e) => { setAccion(e.target.value); cargarAuditorias(e.target.value); }} style={{ width: 200 }}>
                        <option value="">Todas las acciones</option>
                        <option value="INSERT">INSERT</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                </div>
                {auditorias.length === 0 ? <Vacio texto="No hay registros de auditoría para mostrar" /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>ID</th><th>Acción</th><th>Tabla</th><th>Usuario</th><th>Fecha y hora</th><th>Detalles</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {auditorias.map((a) => (
                                    <tr key={a.id_auditoria} className={a.is_active ? '' : 'inactive'}>
                                        <td>#{a.id_auditoria}</td>
                                        <td><Badge tipo={TIPO_ACCION[a.accion] || 'info'}>{a.accion}</Badge></td>
                                        <td className="cell-main">{a.tabla_afectada}</td>
                                        <td>{a.id_usuario ? `#${a.id_usuario}` : '—'}</td>
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
