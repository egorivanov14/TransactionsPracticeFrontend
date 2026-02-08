import { useCallback, useState } from 'react';
import api from '../api/axios';

function TransactionList({
  transactions,
  onTransactionDeleted,
  page = 0,
  totalPages = 1,
  totalElements = 0,
  onPageChange,
  loading = false
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = useCallback(async (transactionId, transactionInfo) => {
    if (!window.confirm(`Удалить транзакцию?\n\n${transactionInfo}`)) {
      return;
    }

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

  // Пагинация: показываем номера страниц
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(0, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

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
    <div>
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
            {transactions.map((transaction) => {
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

      {/* Пагинация */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px',
          padding: '16px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => onPageChange(0)}
            disabled={page === 0 || loading}
            style={{
              padding: '6px 12px',
              backgroundColor: page === 0 ? '#e9ecef' : '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              opacity: page === 0 ? 0.6 : 1
            }}
          >
            ⏮️
          </button>

          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0 || loading}
            style={{
              padding: '6px 12px',
              backgroundColor: page === 0 ? '#e9ecef' : '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              opacity: page === 0 ? 0.6 : 1
            }}
          >
            ←
          </button>

          {getPageNumbers().map(num => (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              disabled={loading}
              style={{
                padding: '6px 12px',
                backgroundColor: num === page ? '#007bff' : '#fff',
                color: num === page ? '#fff' : '#212529',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: num === page ? '600' : '400',
                minWidth: '40px'
              }}
            >
              {num + 1}
            </button>
          ))}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            style={{
              padding: '6px 12px',
              backgroundColor: page >= totalPages - 1 ? '#e9ecef' : '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.6 : 1
            }}
          >
            →
          </button>

          <button
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1 || loading}
            style={{
              padding: '6px 12px',
              backgroundColor: page >= totalPages - 1 ? '#e9ecef' : '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.6 : 1
            }}
          >
            ⏭️
          </button>

          <span style={{ marginLeft: '12px', color: '#6c757d', fontSize: '14px' }}>
            Всего: {totalElements}
          </span>
        </div>
      )}
    </div>
  );
}

export default TransactionList;