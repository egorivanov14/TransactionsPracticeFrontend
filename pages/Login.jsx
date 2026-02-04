import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем куда редиректить после логина
  const from = useCallback(() => {
    // Приоритет: location.state.from > localStorage > /dashboard
    const locationFrom = location.state?.from?.pathname;
    const storageFrom = localStorage.getItem('redirectAfterLogin');
    
    if (locationFrom && locationFrom !== '/login') {
      return locationFrom;
    }
    if (storageFrom && storageFrom !== '/login') {
      return storageFrom;
    }
    return '/dashboard';
  }, [location.state]);

  // Редирект если уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = from();
      // Очищаем сохраненный путь
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Очистка полей при монтировании и ошибок
  useEffect(() => {
    setEmail('');
    setPassword('');
    setLocalError('');
    clearError();
  }, [clearError]);

  // Синхронизация ошибок из AuthContext
  useEffect(() => {
    if (authError) {
      setLocalError(authError);
    }
  }, [authError]);

  const validateForm = useCallback(() => {
    if (!email.trim()) {
      return 'Введите email';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Введите корректный email';
    }
    if (!password) {
      return 'Введите пароль';
    }
    if (password.length < 6) {
      return 'Пароль должен быть не менее 6 символов';
    }
    return null;
  }, [email, password]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        // Редирект произойдет автоматически через useEffect выше
        const redirectTo = from();
        navigate(redirectTo, { replace: true });
      } else {
        setLocalError(result.error || 'Ошибка входа');
        setPassword('');
      }
    } catch (err) {
      setLocalError('Неожиданная ошибка. Попробуйте позже.');
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, login, navigate, from, validateForm, clearError]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '24px',
            color: '#212529'
          }}>
            Вход в Budget App
          </h1>
        </div>

        {localError && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          >
            <span>⚠️</span>
            {localError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#495057'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (localError) setLocalError('');
              }}
              required
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#80bdff'}
              onBlur={(e) => e.target.style.borderColor = '#ced4da'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#495057'
            }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (localError) setLocalError('');
              }}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#80bdff'}
              onBlur={(e) => e.target.style.borderColor = '#ced4da'}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>⏳</span>
                Вход...
              </span>
            ) : 'Войти'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          Нет аккаунта?{' '}
          <Link 
            to="/register" 
            style={{
              color: '#007bff',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
