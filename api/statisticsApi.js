// src/api/statisticsApi.js
import api from './axios';

/**
 * Получение статистики для конкретного бюджета
 * @param {number} budgetId - ID бюджета
 * @param {string} startDate - дата в формате YYYY-MM-DD
 */
export const fetchStatistics = async (budgetId, startDate) => {
  const response = await api.get(`/statistics/${budgetId}`, {
    params: { startDate }
  });
  return response.data;
};