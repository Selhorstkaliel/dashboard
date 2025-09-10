import { create } from 'zustand';

interface FiltersState {
  year: number;
  month: number;
  half?: 1 | 2;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  setHalf: (half?: 1 | 2) => void;
  resetFilters: () => void;
}

const currentDate = new Date();

export const useFilters = create<FiltersState>((set) => ({
  year: currentDate.getFullYear(),
  month: currentDate.getMonth() + 1,
  half: undefined,
  setYear: (year) => set({ year }),
  setMonth: (month) => set({ month }),
  setHalf: (half) => set({ half }),
  resetFilters: () => set({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    half: undefined,
  }),
}));