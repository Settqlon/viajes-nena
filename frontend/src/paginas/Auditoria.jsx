import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { obtenerAuditorias } from '../servicios/auditoriaServicios';
import { obtenerUsuarios } from '../servicios/authServicios';
import { PageHeader, Buscador, Vacio, Badge, BotonesExportar, PantallaCarga } from '../componentes/UI';

const TIPO_ACCION = {
    'INSERT': 'success',
    'UPDATE': 'warning',
    'DELETE': 'danger',
    'Creación': 'success',
    'Modificación': 'warning',
    'Desactivación': 'danger',
    'Exportación': 'info'
};

const ETIQUETA_ACCION = {
    'INSERT': 'Nuevo registro',
    'UPDATE': 'Modificación',
    'DELETE': 'Desactivación',
    'EXPORT': 'Descarga de reporte'
};

const ETIQUETA_MODULO = {
    'clientes': 'Clientes',
    'destinos': 'Destinos Turísticos',
    'paquetes': 'Paquetes Turísticos',
    'viajes': 'Viajes Programados',
    'reservas': 'Reservas',
    'pagos': 'Pagos y Cobranzas',
    'integrantes': 'Pasajeros / Manifiesto',
    'costos_viaje': 'Costos Operativos',
    'inconvenientes': 'Inconvenientes en Ruta',
    'ganancias': 'Ganancias',
    'procesos': 'Procesos Operativos',
    'usuarios': 'Usuarios y Roles',
    'auditoria': 'Auditoría',
    'reportes': 'Reportes'
};

const FILTROS_ACCION = [
    { valor: '', etiqueta: 'Todas las operaciones' },
    { valor: 'INSERT', etiqueta: 'Nuevos registros' },
    { valor: 'UPDATE', etiqueta: 'Modificaciones' },
    { valor: 'DELETE', etiqueta: 'Desactivaciones' }
];

const traducirAccion = (acc) => ETIQUETA_ACCION[acc] || acc;
const traducirModulo = (tabla) => ETIQUETA_MODULO[(tabla || '').toLowerCase()] || tabla;

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
        return `${a.id_auditoria} ${a.tabla_afectada} ${traducirModulo(a.tabla_afectada)} ${a.accion} ${traducirAccion(a.accion)} ${a.detalles || ''} ${nombreUsuario(a.id_usuario)}`.toLowerCase().includes(q);
    });

    if (cargando) return <PantallaCarga texto="Cargando historial de actividades..." />;

    return (
        <div className="fade-in">
            <PageHeader
                titulo="Historial de Actividades y Auditoría"
                subtitulo="Registro histórico de solo lectura de todos los movimientos realizados en el sistema"
            >
                <BotonesExportar ruta="/reportes/auditoria" nombreArchivo="Reporte_Auditoria_ViajesLaNena" />
            </PageHeader>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldCheck size={18} color="#0ea5a4" />
                            <span>Movimientos Registrados ({filtradas.length})</span>
                        </div>
                        <div className="card-sub">Historial permanente de operaciones (No se puede editar ni eliminar)</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className="viaje-destino-pills">
                            {FILTROS_ACCION.map(f => (
                                <button
                                    key={f.valor || 'ALL'}
                                    type="button"
                                    className={`viaje-pill ${accion === f.valor ? 'active' : ''}`}
                                    onClick={() => {
                                        setAccion(f.valor);
                                        cargarAuditorias(f.valor);
                                    }}
                                >
                                    {f.etiqueta}
                                </button>
                            ))}
                        </div>
                        <Buscador
                            valor={busqueda}
                            onChange={setBusqueda}
                            placeholder="Buscar por módulo, usuario o detalle..."
                        />
                    </div>
                </div>

                {filtradas.length === 0 ? <Vacio texto="No hay movimientos registrados para mostrar" /> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>N.°</th>
                                    <th>Tipo de Movimiento</th>
                                    <th>Módulo del Sistema</th>
                                    <th>Realizado por</th>
                                    <th>Fecha y Hora</th>
                                    <th>Descripción de la Actividad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map((a) => (
                                    <tr key={a.id_auditoria}>
                                        <td><strong>#{a.id_auditoria}</strong></td>
                                        <td><Badge tipo={TIPO_ACCION[a.accion] || 'info'}>{traducirAccion(a.accion)}</Badge></td>
                                        <td className="cell-main">{traducirModulo(a.tabla_afectada)}</td>
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
