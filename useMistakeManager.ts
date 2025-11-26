import { useState, useEffect } from 'react';
import { MistakeRecord } from './types';
import { api } from './services/api';

export function useMistakeManager() {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load Data
  useEffect(() => {
    fetchMistakes();
  }, []);

  const fetchMistakes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMistakes();
      // Client-side sorting can stay here, or move to API
      const sorted = data.sort((a, b) => a.nextReviewAt - b.nextReviewAt);
      setMistakes(sorted);
      setError(null);
    } catch (e) {
      console.error("Failed to load mistakes:", e);
      setError("加载数据失败，请检查网络连接");
    } finally {
      setIsLoading(false);
    }
  };

  const addMistake = async (record: Omit<MistakeRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    setIsLoading(true); // Optional: global loading or optimistic update
    try {
      const newRecord = await api.addMistake(record);
      setMistakes(prev => [newRecord, ...prev]);
    } catch (e: any) {
      console.error("Add Error:", e);
      // Handle quota error specifically if using Mock LocalStorage
      if (e.name === 'QuotaExceededError' || e.message?.includes('storage')) {
         setError("存储空间已满！请删除旧错题。");
      } else {
         setError("添加错题失败");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMistake = async (id: string) => {
    // Optimistic Update
    const previous = [...mistakes];
    setMistakes(prev => prev.filter(m => m.id !== id));

    try {
      await api.deleteMistake(id);
    } catch (e) {
      console.error("Delete Error:", e);
      setError("删除失败");
      setMistakes(previous); // Rollback
    }
  };

  const reviewMistake = async (id: string, success: boolean) => {
    // Optimistic update for immediate feedback could be complex with SRS math.
    // For now, let's wait for API result to ensure correct scheduling.
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
    refresh: fetchMistakes
  };
}
