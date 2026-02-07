// src/pages/Statistics.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);


// Периоды соответствуют бэкенду
const PERIODS = [
  { value: 'THREE_DAYS', label: '3 дня', days: 3 },
  { value: 'WEEK', label: 'Неделя', days: 7 },
  { value: 'MONTH', label: 'Месяц', days: 30 },
  { value: 'QUARTER', label: 'Квартал', days: 90 },
  { value: 'HALF_YEAR', label: 'Полгода', days: 182 },
  { value: 'YEAR', label: 'Год', days: 365 }
];

function Statistics() {
  const navigate = useNavigate();

  const [budgets, setBudgets] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [period, setPeriod] = useState('MONTH');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingBudgets, setLoadingBudgets] = useState(true);

};
  // Загрузка бюджетов
  useEffect(() => {
    const loadBudgets = async () => {
      setLoadingBudgets(true);
      try {
        const response = await api.get('/budgets');
        const budgetsList = response.data || [];
        setBudgets(budgetsList);

        if (budgetsList.length > 0) {
          setSelectedBudgetId(budgetsList[0].id);
        }
      } catch (err) {
        console.error('Ошибка загрузки бюджетов:', err);
      } finally {
        setLoadingBudgets(false);
      }
    };
    loadBudgets();
  }, []);

  // Загрузка статистики
  useEffect(() => {
    if (!selectedBudgetId) return;

    let cancelled = false;

    const loadStatistics = async () => {
      setLoading(true);
      setError(null);

      try {
        // POST с body, как у вас в контроллере
        const response = await api.post(`/statistics/${selectedBudgetId}`, {
          period: period
        });

        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Не удалось загрузить статистику');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStatistics();

    return () => { cancelled = true; };
  }, [selectedBudgetId, period]);

  // Данные для графика — теперь проще, нет type/amount/category
  const chartData = useMemo(() => {
    if (!data?.points?.length) return null;

    return {
      labels: data.points.map(p => {
        const date = new Date(p.date);
        return date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short'
        });
      }),
      datasets: [
        {
          label: 'Баланс',
          data: data.points.map(p => p.balance),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4, // Сглаживание для красоты
          pointRadius: data.points.length > 60 ? 0 : 3,
          pointHoverRadius: 6
        }
      ]
    };
  }, [data?.points]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items) => {
            const index = items[0].dataIndex;
            const point = data.points[index];
            const date = new Date(point.date);
            return date.toLocaleDateString('ru-RU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          },
          label: (item) => {
            const balance = item.parsed.y;
            return `💰 Баланс: ${balance.toLocaleString('ru-RU')} ₽`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxTicksLimit: 12,
          maxRotation: 0
        }
      },
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          callback: (value) => {
            if (Math.abs(value) >= 1000) {
              return (value / 1000).toFixed(0) + 'k ₽';
            }
            return value + ' ₽';
          }
        }
      }
    }
  }), [data?.points]);

  const formatMoney = (amount) => {
    if (amount === null || amount === undefined) return '—';
    return `${amount.toLocaleString('ru-RU')} ₽`;
  };

  const selectedBudget = budgets.find(b => b.id === parseInt(selectedBudgetId));
  const currentPeriod = PERIODS.find(p => p.value === period);

  // ========== ЗАГРУЗКА БЮДЖЕТОВ ==========
  if (loadingBudgets) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ marginBottom: '24px' }}>📈 Статистика</h1>
        <div style={{ textAlign: 'center', padding: '60px', color: '#6c757d' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f4f6',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Загрузка...
        </div>
      </div>
    );
  }

  // ========== НЕТ БЮДЖЕТОВ ==========
  if (!loadingBudgets && budgets.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ marginBottom: '24px' }}>📈 Статистика</h1>

        <div style={{
          textAlign: 'center',
          padding: '80px 40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
          <h2 style={{ margin: '0 0 12px 0', color: '#495057' }}>
            У вас пока нет бюджетов
          </h2>
          <p style={{ margin: '0 0 24px 0', color: '#6c757d', fontSize: '16px' }}>
            Создайте первый бюджет, чтобы увидеть статистику
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            ➕ Создать бюджет
          </button>
        </div>
      </div>
    );
  }

  // ========== ОСНОВНОЙ РЕНДЕР ==========
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Шапка */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h1 style={{ margin: 0 }}>📈 Статистика</h1>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={selectedBudgetId}
            onChange={(e) => setSelectedBudgetId(e.target.value)}
            disabled={loading}
            style={{
              padding: '10px 16px',
              border: '1px solid #ced4da',
              borderRadius: '8px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.account}
              </option>
            ))}
          </select>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={loading}
            style={{
              padding: '10px 16px',
              border: '1px solid #ced4da',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Инфо о бюджете */}
      {selectedBudget && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#e7f1ff',
          borderRadius: '8px',
          color: '#004085'
        }}>
          📁 <strong>{selectedBudget.account}</strong> |
          Начальная сумма: {formatMoney(selectedBudget.initialAmount)} |
          Период: {currentPeriod?.label} ({currentPeriod?.days} дней)
        </div>
      )}

      {/* Загрузка */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6c757d' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f4f6',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Загрузка статистики...
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div style={{
          padding: '30px',
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          color: '#721c24',
          textAlign: 'center'
        }}>
          <p>{error}</p>
          <button
            onClick={() => setPeriod(period)}
            style={{
              marginTop: '12px',
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Повторить
          </button>
        </div>
      )}

      {/* Контент */}
      {!loading && !error && data && (
        <>
          {/* Карточки */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#e9ecef',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                💼 На начало периода
              </div>
              <div style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#495057',
                fontFamily: 'monospace'
              }}>
                {formatMoney(data.balanceStartAmount)}
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#d4edda',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#155724',
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                💰 Доходы
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#155724',
                fontFamily: 'monospace'
              }}>
                {formatMoney(data.totalIncome)}
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#f8d7da',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#721c24',
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                💸 Расходы
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#721c24',
                fontFamily: 'monospace'
              }}>
                {formatMoney(data.totalExpenditure)}
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: data.netBalance >= 0 ? '#d4edda' : '#f8d7da',
              borderRadius: '12px',
              textAlign: 'center',
              border: data.netBalance >= 0 ? '2px solid #28a745' : '2px solid #dc3545'
            }}>
              <div style={{
                fontSize: '12px',
                color: data.netBalance >= 0 ? '#155724' : '#721c24',
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                📊 Изменение
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: data.netBalance >= 0 ? '#28a745' : '#dc3545',
                fontFamily: 'monospace'
              }}>
                {data.netBalance > 0 ? '+' : ''}
                {formatMoney(data.netBalance)}
              </div>
            </div>
          </div>

          {/* Итоговый баланс */}
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px solid #dee2e6'
          }}>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
              💵 Баланс на конец периода
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: (data.balanceStartAmount + data.netBalance) >= 0 ? '#28a745' : '#dc3545',
              fontFamily: 'monospace'
            }}>
              {formatMoney((data.balanceStartAmount || 0) + data.netBalance)}
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
              {data.transactionsQuantity || 0} транзакций |
              ~{formatMoney(data.averageDailyIncome)}/день доход |
              ~{formatMoney(data.averageDailyExpenditure)}/день расход
            </div>
          </div>

          {/* График */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>
              📈 Динамика баланса
            </h2>
            <div style={{ height: '400px' }}>
              {chartData ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af'
                }}>
                  Нет данных для отображения
                </div>
              )}
            </div>
          </div>

          {/* Подсказка */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#e7f1ff',
            borderRadius: '8px',
            color: '#004085',
            fontSize: '14px'
          }}>
            💡 <strong>Как читать график:</strong> Первая точка - баланс на начало периода. Каждая последующая точка — баланс на конец дня.
            Линия показывает, как менялся ваш бюджет за выбранный период.
          </div>
        </>
      )}
    </div>
  );
}

export default Statistics;