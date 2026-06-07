import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck,
  CircleDollarSign,
  Menu
} from 'lucide-react';
import { useStore } from '../types';
import { BottomNav } from './BottomNav';
import { MilkPriceModal } from './MilkPriceModal';
import { useFirebase } from './FirebaseProvider';
import { logout as firebaseLogout, cleanupOldData } from '../lib/data';
import { Power } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function Layout() {
  const { theme } = useStore();
  const { user, profile } = useFirebase();
  const navigate = useNavigate();
  const location = useLocation();
  const [priceModalOpen, setPriceModalOpen] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (user) {
      cleanupOldData(user.uid);
    }
  }, [user]);

  // Determine the active key from the current route for animation
  const pathKey = location.pathname;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 pb-28 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-5 bg-card/90 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tighter text-foreground uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-none leading-none">
              {profile?.dairyName}
            </h1>
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Live Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (confirm("Sign out of Milk Dairy?")) {
                await firebaseLogout();
                toast.success("Signed out");
              }
            }}
            className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
          >
            <Power className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPriceModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 rounded-xl transition-all border border-transparent hover:border-amber-500/20"
          >
            <CircleDollarSign className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              navigate('/settings');
            }}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-xl transition-all border border-transparent hover:border-border"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathKey}
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -25 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <MilkPriceModal open={priceModalOpen} onOpenChange={setPriceModalOpen} />
      <BottomNav />
    </div>
  );
}
