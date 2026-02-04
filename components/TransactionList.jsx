import { useCallback, useState } from 'react';
import api from '../api/axios';

function TransactionList({ transactions, onTransactionDeleted }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = useCallback(async (transactionId, transactionInfo) => {
    if (!window.confirm(`Удалить транзакцию?\n\n${transactionInfo}`)) {
      return;
    }

    // Предотвращение двойного клика
    if (deletingId === transactionId) return;

    setDeletingId(transactionId);

    try {
      await api.delete(`/transactions/${transactionId}`);
      onTransactionDeleted();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Неизвестная ошибка';
      alert('Ошибка удаления: ' + errorMessage);
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, onTransactionDeleted]);

  if (!transactions || transactions.length === 0) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        color: '#6c757d',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px dashed #dee2e6'
      }}>
        <p style={{ margin: 0, fontSize: '16px' }}>
          📭 Пока нет транзакций
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
          Добавьте первую транзакцию выше
        </p>
      </div>
    );
  }

  // Сортируем по дате (новые сверху)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const formatAmount = (amount) => {
    if (typeof amount !== 'number') return '—';
    return Math.abs(amount).toLocaleString('ru-RU');
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Дата</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Тип и категория</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Сумма</th>
            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {sortedTransactions.map((transaction) => {
            const isIncome = transaction.type === 'INCOME';
            const isDeleting = deletingId === transaction.id;
            
            const typeStyle = {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: isIncome ? '#d4edda' : '#f8d7da',
              color: isIncome ? '#155724' : '#721c24',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500'
            };

            const transactionInfo = `${isIncome ? 'Доход' : 'Расход'}: ${formatAmount(transaction.amount)} ₽ (${transaction.category})`;

            return (
              <tr 
                key={transaction.id} 
                style={{ 
                  borderBottom: '1px solid #dee2e6',
                  opacity: isDeleting ? 0.5 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
                <td style={{ padding: '12px', color: '#495057' }}>
                  {formatDate(transaction.createdAt)}
                </td>
                
                <td style={{ padding: '12px' }}>
                  <span style={typeStyle}>
                    {isIncome ? '💰' : '💸'}
                    {isIncome ? 'Доход' : 'Расход'} • {transaction.category || '—'}
                  </span>
                </td>
                
                <td style={{
                  padding: '12px',
                  textAlign: 'right',
                  color: isIncome ? '#28a745' : '#dc3545',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  fontFamily: 'monospace'
                }}>
                  {isIncome ? '+' : '-'}{formatAmount(transaction.amount)} ₽
                </td>
                
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleDelete(transaction.id, transactionInfo)}
                    disabled={isDeleting}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: isDeleting ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      transition: 'background-color 0.2s ease',
                      minWidth: '90px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isDeleting) e.target.style.backgroundColor = '#c82333';
                    }}
                    onMouseLeave={(e) => {
                      if (!isDeleting) e.target.style.backgroundColor = '#dc3545';
                    }}
                  >
                    {isDeleting ? 'Удаление...' : 'Удалить'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TransactionList;
