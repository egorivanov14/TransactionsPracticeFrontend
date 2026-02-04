import { createContext, useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import api from '../api/axios';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Ref для отслеживания состояния инициализации
  const isInitialized = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090/api';

  // Получение данных пользователя по токену
  // Используем axios напрямую чтобы избежать циклических интерцепторов
  const fetchUserFromToken = useCallback(async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
      return null;
    }
  }, [API_BASE_URL]);

  // Инициализация при загрузке
  useEffect(() => {
    const loadUser = async () => {
      // Предотвращаем повторную инициализацию
      if (isInitialized.current) return;
      isInitialized.current = true;

      const token = localStorage.getItem('token');

      if (token) {
        const userData = await fetchUserFromToken(token);
        if (userData) {
          setUser(userData);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          // Токен невалиден — очищаем
          performLogout();
        }
      }

      setLoading(false);
    };

    loadUser();
  }, [fetchUserFromToken]);

  // Слушатель события logout из axios interceptor
  useEffect(() => {
    const handleLogoutEvent = (event) => {
      performLogout();
      // Навигация будет обработана компонентом, который слушает это событие
      if (event.detail?.redirectTo) {
        window.location.href = event.detail.redirectTo;
      }
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    
    try {
      // Шаг 1: Логинимся
      const response = await api.post('/users/login', { email, password });
      const { token } = response.data;

      if (!token) {
        return { success: false, error: 'Токен не получен от сервера' };
      }

      // Шаг 2: Сразу сохраняем токен (до запроса данных пользователя)
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Шаг 3: Получаем данные пользователя
      const userData = await fetchUserFromToken(token);

      if (!userData) {
        // Если не удалось получить данные — откатываем сохранение токена
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        return { success: false, error: 'Не удалось получить данные пользователя' };
      }

      // Шаг 4: Устанавливаем пользователя и очищаем редирект
      setUser(userData);
      localStorage.removeItem('redirectAfterLogin');

      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка входа';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fetchUserFromToken]);

  const performLogout = useCallback(() => {
    setUser(null);
    setError(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('redirectAfterLogin');
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers['Authorization'];
  }, []);

  const logout = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // Очистка ошибки
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
    error,
    clearError
  }), [user, login, logout, loading, error, clearError]);

  if (loading && !isInitialized.current) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#6c757d'
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
