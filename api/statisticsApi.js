// src/api/statisticsApi.js
import api from './axios';

/**
 * Получение статистики для конкретного бюджета
 * @param {number} budgetId - ID бюджета
 * @param {string} period - период (THREE_DAYS, WEEK, MONTH, etc.)
 */
export const fetchStatistics = async (budgetId, period) => {
  const response = await api.post(`/statistics/${budgetId}`, {
    period: period
  });
  return response.data;
};