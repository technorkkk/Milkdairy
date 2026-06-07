/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  CircleDollarSign, 
  Menu 
} from 'lucide-react';
import { useStore } from './types';
import { ThemeProvider } from './components/ThemeProvider';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Delivery } from './components/Delivery';
import { Billing } from './components/Billing';
import { SettingsPage } from './components/SettingsPage';
import { Toaster } from './components/ui/sonner';
import { MilkPriceModal } from './components/MilkPriceModal';
import { useFirebase } from './components/FirebaseProvider';
import { Login } from './components/Login';
import { BusinessSetup } from './components/BusinessSetup';
import { toast } from 'sonner';
import { logout as firebaseLogout, cleanupOldData } from './lib/data';
import { Power } from 'lucide-react';

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30">
          <Truck className="w-12 h-12 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">Milk Dairy</h1>
          <p className="text-primary mt-2 font-bold uppercase text-xs tracking-widest bg-primary/10 px-3 py-1 rounded-full">Pro Edition</p>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 120 }}
        transition={{ duration: 1.5, delay: 0.5 }}
        className="h-1 bg-primary rounded-full mt-12 opacity-20"
      />
    </div>
  );
}

export default function App() {
  const { activeTab, theme } = useStore();
  const { user, profile, loading: fbLoading } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [priceModalOpen, setPriceModalOpen] = useState(false);

  useEffect(() => {
    // Sync theme with DOM
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (!fbLoading) {
      const timer = setTimeout(() => setLoading(false), 1000);
      
      // Cleanup old data
      if (user) {
        cleanupOldData(user.uid);
      }
      
      return () => clearTimeout(timer);
    }
  }, [theme, fbLoading, user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'delivery':
        return <Delivery />;
      case 'billing':
        return <Billing />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  const showLoader = loading || fbLoading;

  return (
    <ThemeProvider>
      <AnimatePresence>
        {showLoader && <SplashScreen key="splash" />}
      </AnimatePresence>

      {!showLoader && !user && <Login />}
      {!showLoader && user && !profile && <BusinessSetup />}

      {!showLoader && user && profile && (
        <div className="min-h-screen bg-background transition-colors duration-300 pb-28 font-sans">
          {/* Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-5 bg-card/90 backdrop-blur-xl border-b border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tighter text-foreground uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-none leading-none">
                  {profile.dairyName}
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
                  useStore.getState().setActiveTab('settings');
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
                key={activeTab}
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -25 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>

          <MilkPriceModal open={priceModalOpen} onOpenChange={setPriceModalOpen} />
          <BottomNav />
        </div>
      )}
      <Toaster position="top-center" richColors duration={1000} />
    </ThemeProvider>
  );
}
