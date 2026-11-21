import api from './api';

export const descargarReporte = async (endpoint, formato = 'pdf', nombrePorDefecto = 'Reporte_ViajesLaNena') => {
    const separador = endpoint.includes('?') ? '&' : '?';
    const url = `${endpoint}${separador}formato=${formato}`;
    const res = await api.get(url, { responseType: 'blob' });

    const ext = formato === 'excel' ? 'xlsx' : 'pdf';
    let filename = `${nombrePorDefecto}.${ext}`;

    const disposition = res.headers?.['content-disposition'];
    if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/i);
        if (match && match[1]) {
            filename = match[1];
        }
    }

    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
};
