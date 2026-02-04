import axios from 'axios';

// Базовый URL вынесен в переменную окружения
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // Увеличен таймаут для медленных сетей
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
            // Явное удаление заголовка если токена нет
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
            
            // Полная очистка состояния аутентификации
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('redirectAfterLogin');

            // Сброс заголовков axios
            delete api.defaults.headers.common['Authorization'];
            delete api.defaults.headers['Authorization'];

            // Проверяем что мы не на странице логина
            const isLoginPage = window.location.pathname === '/login' ||
                               window.location.pathname.includes('/login');

            if (!isLoginPage) {
                // Сохраняем путь для возврата после логина
                const currentPath = window.location.pathname + window.location.search;
                localStorage.setItem('redirectAfterLogin', currentPath);
                
                // Используем событие для навигации вместо прямого изменения location
                // Это позволяет React Router обработать переход правильно
                window.dispatchEvent(new CustomEvent('auth:logout', { 
                    detail: { redirectTo: '/login' } 
                }));
            }
            
            // Сбрасываем флаг через небольшую задержку
            setTimeout(() => { isRedirecting = false; }, 1000);
        }
        
        // Обработка ошибок сети
        if (!error.response) {
            error.message = 'Ошибка сети. Проверьте подключение к интернету.';
        }
        
        return Promise.reject(error);
    }
);

export default api;
