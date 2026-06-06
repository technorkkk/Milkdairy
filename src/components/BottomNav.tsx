import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  ReceiptIndianRupee, 
  Settings 
} from 'lucide-react';
import { useStore } from '../types';
import { cn } from '../lib/utils';

export function BottomNav() {
  const { activeTab, setActiveTab } = useStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'billing', label: 'Billing', icon: ReceiptIndianRupee },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-t border-border px-2 py-4 mb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex justify-between items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition-all duration-300",
                isActive 
                  ? "text-primary scale-110" 
                  : "text-muted-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-colors",
                isActive && "bg-primary/10"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tighter transition-all",
                isActive ? "text-primary translate-y-0" : "text-muted-foreground translate-y-1 opacity-60"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
