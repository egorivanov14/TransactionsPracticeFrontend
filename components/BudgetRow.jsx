import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

function BudgetRow({ budget, onDelete }) {
  const navigate = useNavigate();

  const handleRowClick = useCallback(() => {
    navigate(`/budgets/${budget.id}`);
  }, [navigate, budget.id]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Двойная проверка перед удалением
    if (window.confirm(`Удалить бюджет "${budget.account}"?\n\nВсе транзакции внутри также будут удалены!`)) {
      onDelete(budget.id);
    }
  }, [budget.account, budget.id, onDelete]);

  const getStatus = useCallback(() => {
    const remains = budget.remains ?? 0;
    const initialAmount = budget.initialAmount ?? 0;

    if (remains < 0) return { text: '🔴 Перерасход', color: '#dc3545', bgColor: '#f8d7da' };
    if (initialAmount > 0 && remains < initialAmount * 0.2) {
      return { text: '🟠 Заканчивается', color: '#fd7e14', bgColor: '#fff3cd' };
    }
    return { text: '🟢 OK', color: '#28a745', bgColor: '#d4edda' };
  }, [budget.remains, budget.initialAmount]);

  const status = getStatus();
  const formattedDate = budget.startDate 
    ? new Date(budget.startDate).toLocaleDateString('ru-RU')
    : '—';

  return (
    <tr
      onClick={handleRowClick}
      style={{
        borderBottom: '1px solid #dee2e6',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8f9fa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
      }}
    >
      <td style={{ padding: '12px' }}>
        <strong style={{ fontSize: '16px' }}>{budget.account}</strong>
        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
          {formattedDate}
        </div>
      </td>
      
      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
        {(budget.initialAmount ?? 0).toLocaleString('ru-RU')} ₽
      </td>
      
      <td 
        style={{ 
          padding: '12px', 
          textAlign: 'right', 
          fontWeight: 'bold',
          fontFamily: 'monospace',
          color: (budget.remains ?? 0) < 0 ? '#dc3545' : '#212529'
        }}
      >
        {(budget.remains ?? 0).toLocaleString('ru-RU')} ₽
      </td>
      
      <td style={{ padding: '12px', textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500',
            color: status.color,
            backgroundColor: status.bgColor
          }}
        >
          {status.text}
        </span>
      </td>
      
      <td style={{ padding: '12px', textAlign: 'center' }}>
        <button
          onClick={handleDeleteClick}
          style={{
            padding: '6px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#c82333';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#dc3545';
          }}
          title="Удалить бюджет"
        >
          Удалить
        </button>
      </td>
    </tr>
  );
}

export default BudgetRow;
