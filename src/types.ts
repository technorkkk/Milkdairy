import { create } from 'zustand';

export interface BusinessProfile {
  id: string;
  userId: string;
  dairyName: string;
  ownerName: string;
  phone: string;
  address: string;
  logoUrl?: string;
  theme: 'dark' | 'light';
  createdAt: string;
}

export type MilkType = 'Cow' | 'Buffalo' | 'Toned';

export interface MilkPrice {
  id: string;
  userId: string;
  type: MilkType;
  pricePerLiter: number;
  effectiveDate: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  dailyQuantity: number;
  milkType: MilkType;
  deliverySchedule: 'morning' | 'evening' | 'both';
  customPrice?: number;
  startDate: string;
  isActive: boolean;
  totalOutstanding: number;
  billingModel?: 'prepaid' | 'postpaid';
  walletBalance?: number;
  quantityHistory?: { date: string; quantity: number }[];
}

export interface Delivery {
  id: string;
  userId: string;
  customerId: string;
  date: string; // ISO string
  time: 'morning' | 'evening';
  quantity: number;
  delivered: boolean;
  skipReason?: string;
  priceAtTime: number;
}

export interface Payment {
  id: string;
  userId: string;
  customerId: string;
  amount: number;
  date: string;
  mode: 'cash' | 'upi' | 'bank';
  notes?: string;
}

export interface AppState {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  // Navigation state
  activeTab: 'dashboard' | 'customers' | 'delivery' | 'billing' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'customers' | 'delivery' | 'billing' | 'settings') => void;
}

export const useStore = create<AppState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
