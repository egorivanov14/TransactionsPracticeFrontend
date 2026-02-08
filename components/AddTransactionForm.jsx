import { useState, useCallback, useRef } from 'react';
import api from '../api/axios';

function AddTransactionForm({ budgetId, onTransactionAdded }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('EXPENDITURE');
  const [loading, setLoading] = useState(false);
  
  const isSubmitting = useRef(false);

  const categories = {
    EXPENDITURE: ['Продукты', 'Транспорт', 'Развлечения', 'Здоровье', 'Одежда', 'Коммунальные услуги', 'Другое'],
    INCOME: ['Зарплата', 'Фриланс', 'Подарок', 'Инвестиции', 'Другое']
  };

  const validateAmount = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return 'Сумма должна быть больше 0';
    if (num > 999999999) return 'Сумма слишком большая';
    return null;
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (isSubmitting.current || loading) return;

    if (!amount || !category) {
      alert('Заполните сумму и категорию');
      return;
    }

    const amountError = validateAmount(amount);
    if (amountError) {
      alert(amountError);
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    try {
      await api.post('/transactions', {
        amount: Math.round(parseFloat(amount) * 100) / 100,
        type: type,
        budgetId: parseInt(budgetId, 10),
        category: category.trim()
      });

      setAmount('');
      setCategory('');
      setType('EXPENDITURE');

      onTransactionAdded();

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Неизвестная ошибка';
      alert('Ошибка: ' + errorMessage);
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }, [amount, category, type, budgetId, loading, onTransactionAdded]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      marginBottom: '20px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    }}>
      <h3>Новая транзакция</h3>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setCategory('');
          }}
          disabled={loading}
          style={{ padding: '8px' }}
        >
          <option value="EXPENDITURE">Расход</option>
          <option value="INCOME">Доход</option>
        </select>

        <input
          type="text"
          inputMode="decimal"
          placeholder="Сумма"
          value={amount}
          onChange={handleAmountChange}
          required
          disabled={loading}
          style={{ padding: '8px', width: '120px' }}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          disabled={loading}
          style={{ padding: '8px', width: '200px' }}
        >
          <option value="">Выберите категорию</option>
          {categories[type].map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading || !amount || !category}
          style={{
            padding: '8px 20px',
            backgroundColor: loading ? '#ccc' : type === 'INCOME' ? '#28a745' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: !amount || !category ? 0.6 : 1
          }}
        >
          {loading ? 'Добавление...' : type === 'INCOME' ? '➕ Доход' : '➖ Расход'}
        </button>
      </div>
    </form>
  );
}

export default AddTransactionForm;