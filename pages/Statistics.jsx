// src/pages/Statistics.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,  // Для круговой диаграммы
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';  // Добавлен Pie
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

// Регистрируем ArcElement для Pie chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,  // ← Обязательно для круговой диаграммы
  Title,
  Tooltip,
  Legend,
  Filler
);

const PERIODS = [
  { value: 'THREE_DAYS', label: '3 дня', days: 3 },
  { value: 'WEEK', label: 'Неделя', days: 7 },
  { value: 'MONTH', label: 'Месяц', days: 30 },
  { value: 'QUARTER', label: 'Квартал', days: 90 },
  { value: 'HALF_YEAR', label: 'Полгода', days: 182 },
  { value: 'YEAR', label: 'Год', days: 365 }
];

// Цвета для секторов круговой диаграммы
const PIE_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
  '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
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

  // Загрузка бюджетов для селектора
  useEffect(() => {
    const loadBudgets = async () => {
      setLoadingBudgets(true);
      try {
        const response = await api.get('/budgets');
        // Извлекаем массив из Page объекта
        const budgetsList = response.data.content || [];
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

  // Данные для линейного графика (накопительный баланс)
  const lineChartData = useMemo(() => {
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
          tension: 0.4,
          pointRadius: data.points.length > 60 ? 0 : 3,
          pointHoverRadius: 6
        }
      ]
    };
  }, [data?.points]);

  // Данные для круговой диаграммы (расходы по категориям)
  const pieChartData = useMemo(() => {
    if (!data?.pieChartSectors?.length) return null;

    // Фильтруем только категории с суммой > 0
    const validSectors = data.pieChartSectors.filter(s => s.amount > 0);

    if (validSectors.length === 0) return null;

    return {
      labels: validSectors.map(s => s.category),
      datasets: [
        {
          data: validSectors.map(s => s.amount),
          backgroundColor: validSectors.map((_, index) => PIE_COLORS[index % PIE_COLORS.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 15
        }
      ]
    };
  }, [data?.pieChartSectors]);

  // Опции для линейного графика
  const lineChartOptions = useMemo(() => ({
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

  // Опции для круговой диаграммы
  const pieChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const sector = data.pieChartSectors[context.dataIndex];
            const percentage = sector.percentage.toFixed(1);
            return [
              ` ${sector.category}`,
              ` 💰 ${value.toLocaleString('ru-RU')} ₽ (${percentage}%)`
            ];
          }
        }
      }
    }
  }), [data?.pieChartSectors]);

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
          {/* Карточки метрик */}
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

          {/* Графики: линейный и круговой */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Линейный график */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              minHeight: '400px'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>
                📈 Динамика баланса
              </h2>
              <div style={{ height: '350px' }}>
                {lineChartData ? (
                  <Line data={lineChartData} options={lineChartOptions} />
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

            {/* Круговая диаграмма */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              minHeight: '400px'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>
                🥧 Расходы по категориям
              </h2>
              <div style={{ height: '350px' }}>
                {pieChartData ? (
                  <Pie data={pieChartData} options={pieChartOptions} />
                ) : (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '48px' }}>📭</span>
                    <span>Нет расходов за период</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Таблица категорий (дополнительно) */}
          {data.pieChartSectors?.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#374151' }}>
                📋 Детализация расходов
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Категория</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Сумма</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Доля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pieChartSectors
                      .filter(s => s.amount > 0)
                      .sort((a, b) => b.amount - a.amount)
                      .map((sector, index) => (
                        <tr key={sector.category} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                              display: 'inline-block'
                            }} />
                            {sector.category}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {formatMoney(sector.amount)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                            {sector.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Statistics;