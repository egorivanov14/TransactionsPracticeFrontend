import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, fallback = null }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Показываем fallback (или null) пока проверяется авторизация
  if (loading) {
    return fallback || (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100vh'
      }}>
        Загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Сохраняем текущий путь для возврата после логина
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Если авторизован — показываем содержимое
  return children;
}

export default ProtectedRoute;
