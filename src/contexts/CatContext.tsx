import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Cat } from '../types';
import { getCats, syncPendingCatOps } from '../storage/catStorage';
import { useAuth } from './AuthContext';

type CatContextType = {
  cats: Cat[];
  selectedCatId: string | null;
  setSelectedCatId: (id: string | null) => void;
  refreshCats: () => Promise<void>;
  isLoading: boolean;
};

const CatContext = createContext<CatContextType>({
  cats: [],
  selectedCatId: null,
  setSelectedCatId: () => {},
  refreshCats: async () => {},
  isLoading: true,
});

export function CatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCats = useCallback(async () => {
    if (!user?.id) {
      setCats([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      await syncPendingCatOps(user.id);
      const data = await getCats(user.id);
      setCats(data);
    } catch (err) {
      console.error('Failed to refresh cats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshCats();
  }, [refreshCats]);

  return (
    <CatContext.Provider
      value={{ cats, selectedCatId, setSelectedCatId, refreshCats, isLoading }}
    >
      {children}
    </CatContext.Provider>
  );
}

export function useCats() {
  return useContext(CatContext);
}
