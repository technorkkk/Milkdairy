/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Truck } from 'lucide-react';
import { useStore } from './types';
import { ThemeProvider } from './components/ThemeProvider';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Delivery } from './components/Delivery';
import { Billing } from './components/Billing';
import { SettingsPage } from './components/SettingsPage';
import { Toaster } from './components/ui/sonner';
import { useFirebase } from './components/FirebaseProvider';
import { Login } from './components/Login';
import { BusinessSetup } from './components/BusinessSetup';

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
  const { theme } = useStore();
  const { user, profile, loading: fbLoading } = useFirebase();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sync theme with DOM
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (!fbLoading) {
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [theme, fbLoading]);

  const showLoader = loading || fbLoading;

  return (
    <ThemeProvider>
      <AnimatePresence>
        {showLoader && <SplashScreen key="splash" />}
      </AnimatePresence>

      {!showLoader && !user && <Login />}
      {!showLoader && user && !profile && <BusinessSetup />}

      {!showLoader && user && profile && (
        <Routes>
          <Route element={<Layout />}>
            <Route path="/home" element={<Dashboard />} />
            <Route path="/customer" element={<Customers />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      )}
      <Toaster position="top-center" richColors duration={1000} />
    </ThemeProvider>
  );
}
