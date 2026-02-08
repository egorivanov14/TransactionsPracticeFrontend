import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import BudgetRow from '../components/BudgetRow';

function Dashboard() {
  const { user } = useAuth();

  const [budgetsPage, setBudgetsPage] = useState(null); // Page объект
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState('');
  const [newInitialAmount, setNewInitialAmount] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Пагинация
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);

  // Загрузка бюджетов с пагинацией
  const loadBudgets = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/budgets', {
        params: {
          page: page,
          size: pageSize,
          sort: 'id,desc'
        }
      });

      const pageData = response.data;
      const budgetsData = pageData.content || [];

      // Загружаем статус для каждого бюджета (N+1 проблема, но пока так)
      // TODO: оптимизировать через bulk endpoint
      const budgetsWithStatus = await Promise.all(
        budgetsData.map(async (budget) => {
          try {
            const statusRes = await api.get(`/budgets/status/${budget.id}`);
            return {
              ...budget,
              remains: statusRes.data?.remains ?? 0,
              totalSpent: statusRes.data?.totalSpent ?? 0
            };
          } catch (e) {
            console.warn(`Не удалось загрузить статус для бюджета ${budget.id}:`, e);
            return {
              ...budget,
              remains: 0,
              totalSpent: 0
            };
          }
        })
      );

      // Обновляем pageData с enriched данными
      setBudgetsPage({
        ...pageData,
        content: budgetsWithStatus
      });
    } catch (err) {
      console.error('Ошибка загрузки бюджетов:', err);

      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || 'Не удалось загрузить бюджеты');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets, currentPage]);

  // Валидация формы создания
  const validateForm = useCallback(() => {
    const errors = {};

    if (!newAccount.trim()) {
      errors.account = 'Введите название бюджета';
    } else if (newAccount.trim().length < 2) {
      errors.account = 'Название должно быть не менее 2 символов';
    } else if (newAccount.trim().length > 50) {
      errors.account = 'Название не должно превышать 50 символов';
    }

    const amount = parseFloat(newInitialAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.amount = 'Введите положительную сумму';
    } else if (amount > 999999999) {
      errors.amount = 'Сумма слишком большая';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newAccount, newInitialAmount]);

  // Удаление бюджета
  const handleDelete = useCallback(async (id) => {
    const budget = budgetsPage?.content?.find(b => b.id === id);
    const budgetName = budget?.account || 'этот бюджет';

    if (!window.confirm(`Удалить "${budgetName}"?\n\nВсе транзакции внутри также будут удалены!`)) {
      return;
    }

    try {
      await api.delete(`/budgets/id/${id}`);
      // Перезагружаем текущую страницу
      loadBudgets();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Не удалось удалить бюджет';
      alert('Ошибка при удалении: ' + errorMessage);
    }
  }, [budgetsPage, loadBudgets]);

  // Создание бюджета
  const handleCreate = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsCreating(true);

    try {
      await api.post('/budgets', {
        account: newAccount.trim(),
        initialAmount: Math.round(parseFloat(newInitialAmount) * 100) / 100
      });

      setNewAccount('');
      setNewInitialAmount('');
      setFormErrors({});
      setShowForm(false);
      setCurrentPage(0); // Сбрасываем на первую страницу
      loadBudgets(0);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Не удалось создать бюджет';
      alert('Ошибка создания: ' + errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, [newAccount, newInitialAmount, validateForm, loadBudgets]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setNewInitialAmount(value);
      if (formErrors.amount) {
        setFormErrors(prev => ({ ...prev, amount: null }));
      }
    }
  };

  // Пагинация: номера страниц
  const getPageNumbers = () => {
    if (!budgetsPage) return [];
    const totalPages = budgetsPage.totalPages || 1;
    const current = budgetsPage.number || 0;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(0, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(0, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Статистика по всем бюджетам (только текущая страница)
  const stats = useMemo(() => {
    const budgets = budgetsPage?.content || [];
    const totalBudgets = budgetsPage?.totalElements || 0;
    const totalAmount = budgets.reduce((sum, b) => sum + (b.initialAmount || 0), 0);
    const totalRemains = budgets.reduce((sum, b) => sum + (b.remains || 0), 0);
    const overBudgetCount = budgets.filter(b => (b.remains || 0) < 0).length;

    return { totalBudgets, totalAmount, totalRemains, overBudgetCount };
  }, [budgetsPage]);

  const budgets = budgetsPage?.content || [];
  const totalPages = budgetsPage?.totalPages || 1;
  const currentPageNumber = budgetsPage?.number || 0;
  const isFirst = budgetsPage?.first ?? true;
  const isLast = budgetsPage?.last ?? true;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 20px',
        color: '#6c757d'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
          Загрузка бюджетов...
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
          <h2>😕 Ошибка загрузки</h2>
          <p>{error}</p>
          <button
            onClick={() => loadBudgets()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            🔄 Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Шапка */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '4px' }}>Мои бюджеты</h1>
          {user?.email && (
            <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
              {user.email}
            </p>
          )}
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '12px 24px',
            backgroundColor: showForm ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {showForm ? '✕ Отменить' : '+ Новый бюджет'}
        </button>
      </div>

      {/* Статистика */}
      {stats.totalBudgets > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#e9ecef',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Всего бюджетов</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.totalBudgets}</div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: '#e9ecef',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Общая сумма</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {stats.totalAmount.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: stats.totalRemains >= 0 ? '#d4edda' : '#f8d7da',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: stats.totalRemains >= 0 ? '#155724' : '#721c24', marginBottom: '4px' }}>Общий остаток</div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: stats.totalRemains >= 0 ? '#28a745' : '#dc3545'
            }}>
              {stats.totalRemains.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          {stats.overBudgetCount > 0 && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f8d7da',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#721c24', marginBottom: '4px' }}>Перерасход</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                {stats.overBudgetCount}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Форма создания */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            marginBottom: '24px',
            padding: '24px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #dee2e6'
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Создать новый бюджет</h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 250px' }}>
              <input
                type="text"
                placeholder="Название (например, 'Продукты')"
                value={newAccount}
                onChange={(e) => {
                  setNewAccount(e.target.value);
                  if (formErrors.account) {
                    setFormErrors(prev => ({ ...prev, account: null }));
                  }
                }}
                disabled={isCreating}
                style={{
                  padding: '10px',
                  width: '100%',
                  border: formErrors.account ? '2px solid #dc3545' : '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              {formErrors.account && (
                <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                  {formErrors.account}
                </div>
              )}
            </div>

            <div style={{ flex: '0 0 200px' }}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Начальная сумма (руб.)"
                value={newInitialAmount}
                onChange={handleAmountChange}
                disabled={isCreating}
                style={{
                  padding: '10px',
                  width: '100%',
                  border: formErrors.amount ? '2px solid #dc3545' : '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              {formErrors.amount && (
                <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                  {formErrors.amount}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreating}
              style={{
                padding: '10px 24px',
                backgroundColor: isCreating ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isCreating ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      )}

      {/* Список бюджетов */}
      {budgets.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: '#6c757d',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p style={{ margin: 0, fontSize: '18px', marginBottom: '8px' }}>
            У вас пока нет бюджетов
          </p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Нажмите "+ Новый бюджет" чтобы создать первый
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Название</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>Начальная сумма</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>Остаток</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Статус</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <BudgetRow
                    key={budget.id}
                    budget={budget}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация бюджетов */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              padding: '20px',
              borderTop: '1px solid #dee2e6',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setCurrentPage(0)}
                disabled={isFirst}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isFirst ? '#e9ecef' : '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: isFirst ? 'not-allowed' : 'pointer'
                }}
              >
                ⏮️
              </button>

              <button
                onClick={() => setCurrentPage(currentPageNumber - 1)}
                disabled={isFirst}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isFirst ? '#e9ecef' : '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: isFirst ? 'not-allowed' : 'pointer'
                }}
              >
                ←
              </button>

              {getPageNumbers().map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: num === currentPageNumber ? '#007bff' : '#fff',
                    color: num === currentPageNumber ? '#fff' : '#212529',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: num === currentPageNumber ? '600' : '400',
                    minWidth: '40px'
                  }}
                >
                  {num + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(currentPageNumber + 1)}
                disabled={isLast}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isLast ? '#e9ecef' : '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: isLast ? 'not-allowed' : 'pointer'
                }}
              >
                →
              </button>

              <button
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={isLast}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isLast ? '#e9ecef' : '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: isLast ? 'not-allowed' : 'pointer'
                }}
              >
                ⏭️
              </button>

              <span style={{ marginLeft: '12px', color: '#6c757d', fontSize: '14px' }}>
                Страница {currentPageNumber + 1} из {totalPages}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;