import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Cat } from '../types';
import { getCats } from '../storage/catStorage';

type CatContextType = {
  cats: Cat[];
  selectedCatId: string | null;
  setSelectedCatId: (id: string | null) => void;
  refreshCats: () => Promise<void>;
};

const CatContext = createContext<CatContextType>({
  cats: [],
  selectedCatId: null,
  setSelectedCatId: () => {},
  refreshCats: async () => {},
});

export function CatProvider({ children }: { children: ReactNode }) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const refreshCats = useCallback(async () => {
    const data = await getCats();
    setCats(data);
  }, []);

  useEffect(() => {
    refreshCats();
  }, [refreshCats]);

  return (
    <CatContext.Provider
      value={{ cats, selectedCatId, setSelectedCatId, refreshCats }}
    >
      {children}
    </CatContext.Provider>
  );
}

export function useCats() {
  return useContext(CatContext);
}
