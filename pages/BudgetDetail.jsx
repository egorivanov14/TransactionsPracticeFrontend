import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import AddTransactionForm from '../components/AddTransactionForm';
import TransactionList from '../components/TransactionList';

function BudgetDetail() {
  const { budgetId } = useParams();
  const navigate = useNavigate();

  const [budget, setBudget] = useState(null);
  const [transactionsPage, setTransactionsPage] = useState(null); // Теперь храним Page объект
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Состояние пагинации
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);

  const parsedBudgetId = useMemo(() => {
    const id = parseInt(budgetId, 10);
    return isNaN(id) ? null : id;
  }, [budgetId]);

  const loadData = useCallback(async (showRefreshing = false, page = currentPage) => {
    if (!parsedBudgetId) {
      setError('Некорректный ID бюджета');
      setLoading(false);
      return;
    }

    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Параллельная загрузка: бюджет, транзакции (с пагинацией), статус
      const [budgetRes, transactionsRes, statusRes] = await Promise.all([
        api.get(`/budgets/id/${parsedBudgetId}`),
        api.get(`/transactions/budgetId/${parsedBudgetId}`, {
          params: {
            page: page,
            size: pageSize,
            sort: 'id,desc' // Новые сначала
          }
        }),
        api.get(`/budgets/status/${parsedBudgetId}`)
      ]);

      setBudget(budgetRes.data);
      setTransactionsPage(transactionsRes.data); // Сохраняем Page объект
      setBudgetStatus(statusRes.data);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);

      if (err.response?.status === 404) {
        setError('Бюджет не найден');
      } else if (err.response?.status === 403) {
        setError('У вас нет доступа к этому бюджету');
      } else {
        setError(err.response?.data?.message || 'Ошибка загрузки данных');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [parsedBudgetId, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData, currentPage]); // Перезагружаем при смене страницы

  // Вычисление статистики из budgetStatus (бэкенд уже считает)
  const stats = useMemo(() => {
    // Используем данные из budgetStatus если есть, иначе считаем из видимых транзакций
    const totalSpent = budgetStatus?.totalSpent || 0;
    const remains = budgetStatus?.remains || 0;
    const initialAmount = budget?.initialAmount || 0;

    // Доходы = начальная сумма + доходы - расходы = остаток
    // Но лучше получать это с бэкенда. Пока приближенно:
    const income = Math.max(0, remains - initialAmount + totalSpent);
    const expenditure = totalSpent;

    return {
      income,
      expenditure,
      total: income - expenditure
    };
  }, [budgetStatus, budget]);

  const status = useMemo(() => {
    const remains = budgetStatus?.remains ?? 0;
    const initialAmount = budget?.initialAmount ?? 0;

    if (remains < 0) return { text: '🔴 Перерасход', color: '#dc3545', bgColor: '#f8d7da' };
    if (initialAmount > 0 && remains < initialAmount * 0.2) {
      return { text: '🟠 Заканчивается', color: '#fd7e14', bgColor: '#fff3cd' };
    }
    return { text: '🟢 OK', color: '#28a745', bgColor: '#d4edda' };
  }, [budgetStatus?.remains, budget?.initialAmount]);

  const handleTransactionAdded = useCallback(() => {
    setCurrentPage(0); // Сбрасываем на первую страницу
    loadData(true, 0);
  }, [loadData]);

  const handleTransactionDeleted = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  // Рендер состояний загрузки и ошибок
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 20px',
        color: '#6c757d'
      }}>
        <div>
          <div style={{ textAlign: 'center', fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          Загрузка бюджета...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{
          padding: '30px',
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          color: '#721c24',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <h2 style={{ marginTop: 0 }}>😕 Ошибка</h2>
          <p>{error}</p>
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              ← Назад к списку
            </button>
            <button
              onClick={() => loadData()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6c757d' }}>
        <p>Бюджет не найден</p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Назад к списку
        </button>
      </div>
    );
  }

  const remains = budgetStatus?.remains ?? 0;
  const totalSpent = budgetStatus?.totalSpent ?? 0;
  const initialAmount = budget.initialAmount ?? 0;

  // Данные пагинации
  const transactions = transactionsPage?.content || [];
  const totalPages = transactionsPage?.totalPages || 1;
  const totalElements = transactionsPage?.totalElements || 0;
  const currentPageNumber = transactionsPage?.number || 0;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return '—';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Кнопка назад */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ← Назад
        </button>
        {isRefreshing && <span style={{ color: '#6c757d' }}>🔄 Обновление...</span>}
      </div>

      {/* Информация о бюджете */}
      <div style={{
        padding: '24px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        marginBottom: '24px',
        borderLeft: `6px solid ${status.color}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>{budget.account}</h1>
          <span
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              color: status.color,
              backgroundColor: status.bgColor
            }}
          >
            {status.text}
          </span>
        </div>

        {/* Блок статистики */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginTop: '24px',
          marginBottom: '16px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px', textTransform: 'uppercase' }}>
              Начальная сумма
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {initialAmount.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: remains < 0 ? '#f8d7da' : '#d4edda',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `2px solid ${remains < 0 ? '#dc3545' : '#28a745'}`
          }}>
            <div style={{ fontSize: '12px', color: remains < 0 ? '#721c24' : '#155724', marginBottom: '8px', textTransform: 'uppercase' }}>
              Остаток
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: remains < 0 ? '#dc3545' : '#28a745',
              fontFamily: 'monospace'
            }}>
              {remains.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#d4edda',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#155724', marginBottom: '8px', textTransform: 'uppercase' }}>
              💰 Всего доходов
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#155724', fontFamily: 'monospace' }}>
              +{stats.income.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#f8d7da',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#721c24', marginBottom: '8px', textTransform: 'uppercase' }}>
              💸 Всего расходов
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#721c24', fontFamily: 'monospace' }}>
              -{stats.expenditure.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>

        <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '16px' }}>
          <span style={{ marginRight: '16px' }}>📅 Создан: {formatDate(budget.startDate)}</span>
          <span style={{ marginRight: '16px' }}>📝 Транзакций: {totalElements}</span>
          <span>💵 Потрачено: {totalSpent.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>

      {/* Форма добавления */}
      <AddTransactionForm
        budgetId={parsedBudgetId}
        onTransactionAdded={handleTransactionAdded}
      />

      {/* Список транзакций с пагинацией */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ margin: 0 }}>История транзакций</h2>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            style={{
              padding: '6px 12px',
              backgroundColor: isRefreshing ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {isRefreshing ? '🔄' : '🔄 Обновить'}
          </button>
        </div>

        <TransactionList
          transactions={transactions}
          onTransactionDeleted={handleTransactionDeleted}
          page={currentPageNumber}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={handlePageChange}
          loading={isRefreshing}
        />
      </div>
    </div>
  );
}

export default BudgetDetail;