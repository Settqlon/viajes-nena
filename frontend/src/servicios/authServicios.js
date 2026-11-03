import api from './api';

export const login = async (correo, password) => {
    const formData = new URLSearchParams();
    formData.append('username', correo);
    formData.append('password', password);

    const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
};

export const obtenerUsuarios = async () => {
    const response = await api.get('/auth/');
    return response.data;
};

export const crearUsuario = async (datosUsuario) => {
    const response = await api.post('/auth/registro', datosUsuario);
    return response.data;
};

export const actualizarUsuario = async (idUsuario, datosUsuario) => {
    const response = await api.patch(`/auth/${idUsuario}`, datosUsuario);
    return response.data;
};

export const eliminarUsuario = async (idUsuario) => {
    const response = await api.delete(`/auth/${idUsuario}`);
    return response.data;
};
