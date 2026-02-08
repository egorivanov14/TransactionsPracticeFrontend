// src/api/axios.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Флаг для предотвращения множественных редиректов
let isRedirecting = false;

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !isRedirecting) {
            isRedirecting = true;
            
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('redirectAfterLogin');

            delete api.defaults.headers.common['Authorization'];
            delete api.defaults.headers['Authorization'];

            const isLoginPage = window.location.pathname === '/login' ||
                               window.location.pathname.includes('/login');

            if (!isLoginPage) {
                const currentPath = window.location.pathname + window.location.search;
                localStorage.setItem('redirectAfterLogin', currentPath);
                
                window.dispatchEvent(new CustomEvent('auth:logout', { 
                    detail: { redirectTo: '/login' } 
                }));
            }
            
            setTimeout(() => { isRedirecting = false; }, 1000);
        }
        
        if (!error.response) {
            error.message = 'Ошибка сети. Проверьте подключение к интернету.';
        }
        
        return Promise.reject(error);
    }
);

export default api;