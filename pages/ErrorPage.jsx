import { useRouteError, Link, useNavigate } from 'react-router-dom';

function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  
  console.error('Route error:', error);

  const getErrorMessage = () => {
    if (error?.status === 404) {
      return 'Страница не найдена';
    }
    if (error?.status === 403) {
      return 'Доступ запрещен';
    }
    if (error?.status === 500) {
      return 'Ошибка сервера';
    }
    return error?.statusText || error?.message || 'Неизвестная ошибка';
  };

  const getErrorCode = () => {
    return error?.status || '⚠️';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '16px'
        }}>
          🙈
        </div>
        
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#dc3545',
          marginBottom: '8px'
        }}>
          {getErrorCode()}
        </div>
        
        <h1 style={{
          fontSize: '24px',
          marginBottom: '8px',
          color: '#212529'
        }}>
          Упс! Что-то пошло не так
        </h1>
        
        <p style={{
          color: '#6c757d',
          marginBottom: '24px',
          fontSize: '16px'
        }}>
          {getErrorMessage()}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Назад
          </button>
          
          <Link 
            to="/dashboard"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              display: 'inline-block'
            }}
          >
            🏠 На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
