import { useState, useEffect } from 'react';
import { MistakeRecord, AddMistakePayload } from './types';
import { api } from './services/api';

export function useMistakeManager() {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(5); // Fixed limit per page
  const [totalCount, setTotalCount] = useState(0);

  // Load Data whenever page changes
  useEffect(() => {
    fetchMistakes(page);
  }, [page]);

  const fetchMistakes = async (currentPage = page) => {
    setIsLoading(true);
    try {
      const { items, total } = await api.getMistakes(currentPage, limit);
      
      // Since backend might return sorting, we assume items are sorted. 
      // If mock, they are sorted in API.
      setMistakes(items);
      setTotalCount(total);
      setError(null);
    } catch (e) {
      console.error("Failed to load mistakes:", e);
      setError("加载数据失败，请检查网络连接");
    } finally {
      setIsLoading(false);
    }
  };

  const addMistake = async (record: AddMistakePayload) => {
    setIsLoading(true); 
    try {
      await api.addMistake(record);
      // Reset to page 1 to show the new item
      setPage(1);
      await fetchMistakes(1);
    } catch (e: any) {
      console.error("Add Error:", e);
      if (e.name === 'QuotaExceededError' || e.message?.includes('storage')) {
         setError("存储空间已满！请删除旧错题。");
      } else {
         setError("添加错题失败");
      }
      setIsLoading(false);
    }
  };

  const deleteMistake = async (id: string) => {
    // Optimistic Update is harder with pagination, let's just do standard request then refresh
    // But for better UX, we can try to filter locally first
    const previous = [...mistakes];
    setMistakes(prev => prev.filter(m => m.id !== id));

    try {
      await api.deleteMistake(id);
      // Refresh current page to pull correct data (fill the gap)
      // If we deleted the last item on a page, go back
      if (mistakes.length === 1 && page > 1) {
          setPage(prev => prev - 1);
      } else {
          fetchMistakes();
      }
    } catch (e) {
      console.error("Delete Error:", e);
      setError("删除失败");
      setMistakes(previous); // Rollback
    }
  };

  const reviewMistake = async (id: string, success: boolean) => {
    try {
      const updated = await api.reviewMistake(id, success);
      setMistakes(prev => prev.map(m => m.id === id ? updated : m));
    } catch (e) {
      console.error("Review Error:", e);
      setError("提交复习结果失败");
    }
  };

  return {
    mistakes,
    isLoading,
    error,
    addMistake,
    deleteMistake,
    reviewMistake,
    refresh: () => fetchMistakes(page),
    // Pagination exports
    page,
    setPage,
    limit,
    totalCount
  };
}