import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCallback, useEffect } from 'react';

function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Обработка события logout из axios interceptor
  useEffect(() => {
    const handleLogoutEvent = () => {
      // Используем navigate для SPA-навигации
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, [navigate]);

  // Редирект на логин если не авторизован
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    // Используем navigate вместо window.location для сохранения SPA поведения
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinkStyle = (path) => ({
    marginLeft: '10px',
    marginRight: '10px',
    textDecoration: 'none',
    color: isActive(path) ? '#007bff' : '#495057',
    fontWeight: isActive(path) ? '600' : '400',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: isActive(path) ? '#e7f1ff' : 'transparent'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '16px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link 
            to="/dashboard" 
            style={{ 
              fontWeight: 'bold', 
              fontSize: '20px',
              color: 'white',
              textDecoration: 'none',
              marginRight: '24px'
            }}
          >
            💰 Budget App
          </Link>
          
          <nav>
            <Link 
              to="/dashboard" 
              style={navLinkStyle('/dashboard')}
            >
              📊 Мои бюджеты
            </Link>
            <Link 
              to="/statistics" 
              style={navLinkStyle('/statistics')}
            >
              📈 Статистика
            </Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user?.email && (
            <span style={{ 
              fontSize: '14px',
              opacity: 0.9
            }}>
              {user.email}
            </span>
          )}
          
          <button 
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
          >
            🚪 Выйти
          </button>
        </div>
      </header>

      <main style={{ 
        flex: 1,
        padding: '24px',
        backgroundColor: '#f8f9fa'
      }}>
        <Outlet />
      </main>

      <footer style={{
        padding: '16px 24px',
        backgroundColor: '#fff',
        borderTop: '1px solid #dee2e6',
        textAlign: 'center',
        color: '#6c757d',
        fontSize: '14px'
      }}>
        Budget App © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default Layout;
