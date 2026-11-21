import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { obtenerAuditorias } from '../servicios/auditoriaServicios';
import { obtenerUsuarios } from '../servicios/authServicios';
import { PageHeader, Buscador, Vacio, Badge, BotonesExportar, PantallaCarga } from '../componentes/UI';

const TIPO_ACCION = { 'INSERT': 'success', 'UPDATE': 'warning', 'DELETE': 'danger' };

export default function Auditoria() {
    const [auditorias, setAuditorias] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [accion, setAccion] = useState('');
    const [busqueda, setBusqueda] = useState('');

    const cargarAuditorias = async (filtro = accion) => {
        setCargando(true);
        try {
            const [aData, uData] = await Promise.all([
                obtenerAuditorias(filtro ? { accion: filtro } : {}),
                obtenerUsuarios()
            ]);
            setAuditorias(aData);
            setUsuarios(uData);
        } catch {
            setError('Error al obtener los registros de auditoría.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargarAuditorias(); }, []);

    const nombreUsuario = (id) => {
        if (!id) return 'Sistema';
        const u = usuarios.find(x => x.id_usuario === id);
        return u ? `${u.nombre} (${u.rol})` : `Usuario #${id}`;
    };

    const q = busqueda.trim().toLowerCase();
    const filtradas = auditorias.filter(a => {
        if (!q) return true;
        return `${a.id_auditoria} ${a.tabla_afectada} ${a.accion} ${a.detalles || ''} ${nombreUsuario(a.id_usuario)}`.toLowerCase().includes(q);
    });

    if (cargando) return <PantallaCarga texto="Cargando bitácora inmutable de auditoría..." />;

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Auditoría y Trazabilidad del Sistema"
                subtitulo="Bitácora histórica de solo lectura: los registros de auditoría son inmutables y no admiten edición ni eliminación"
            >
                <BotonesExportar ruta="/reportes/auditoria" nombreArchivo="Reporte_Auditoria_ViajesLaNena" />
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldCheck size={18} color="#0ea5a4" />
                            <span>Registros de Auditoría ({filtradas.length})</span>
                        </div>
                        <div className="card-sub">Trazabilidad inmutable de todas las operaciones del sistema (Solo lectura)</div>
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
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map((a) => (
                                    <tr key={a.id_auditoria}>
                                        <td><strong>#{a.id_auditoria}</strong></td>
                                        <td><Badge tipo={TIPO_ACCION[a.accion] || 'info'}>{a.accion}</Badge></td>
                                        <td className="cell-main">{a.tabla_afectada}</td>
                                        <td>{nombreUsuario(a.id_usuario)}</td>
                                        <td>{new Date(a.fecha_hora).toLocaleString('es-VE')}</td>
                                        <td>{a.detalles || '—'}</td>
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
