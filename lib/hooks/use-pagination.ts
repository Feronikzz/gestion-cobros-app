import { useState, useEffect } from 'react';

export function usePagination(key: string, defaultItemsPerPage: number = 20) {
  const [itemsPerPage, setItemsPerPage] = useState<number>(defaultItemsPerPage);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pagination_${key}`);
      if (saved) {
        setItemsPerPage(Number(saved));
      }
    } catch (e) {
      // ignore
    } finally {
      setIsInitialized(true);
    }
  }, [key]);

  const updateItemsPerPage = (value: number) => {
    setItemsPerPage(value);
    try {
      localStorage.setItem(`pagination_${key}`, value.toString());
    } catch (e) {
      // ignore
    }
  };

  return [itemsPerPage, updateItemsPerPage, isInitialized] as const;
}
