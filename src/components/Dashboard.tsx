import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Truck, 
  Clock, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'motion/react';
import { useFirebase } from './FirebaseProvider';
import { subscribeToCustomers } from '../lib/data';
import { useStore } from '../types';
import { AddCustomerModal } from './AddCustomerModal';

const chartData = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 3000 },
  { name: 'Mar', revenue: 2000 },
  { name: 'Apr', revenue: 2780 },
  { name: 'May', revenue: 1890 },
  { name: 'Jun', revenue: 2390 },
  { name: 'Jul', revenue: 3490 },
];

export function Dashboard() {
  const { user, profile } = useFirebase();
  const { setActiveTab } = useStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToCustomers(user.uid, (data) => {
      setCustomers(data);
    });
    return () => unsubscribe();
  }, [user]);

  const totalOutstanding = customers.reduce((acc, c) => acc + (c.totalOutstanding || 0), 0);

  const getInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: customers })
      });
      const result = await response.json();
      setInsights(result.insights);
    } catch (e) {
      console.error("Failed to get insights", e);
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Hello, {profile?.ownerName?.split(' ')[0] || 'Dairy Owner'}! 👋
        </h2>
        <p className="text-muted-foreground text-sm">
          Everything looks good at <span className="font-bold text-accent">{profile?.dairyName || 'your dairy'}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Stats with Gemini Glow */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="relative group p-[2px] rounded-[2.5rem] bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 bg-[length:200%_200%] animate-gradient-x"
        >
          <Card className="border-none bg-white dark:bg-[#0B1220] rounded-[2.4rem] overflow-hidden">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-50">Active Network</p>
                <div className="text-5xl font-black text-foreground mt-1">{customers.length}</div>
                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Verified Business Clients</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="relative group p-[2px] rounded-[2.5rem] hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] transition-shadow duration-500"
        >
          <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-r from-red-500/40 to-blue-500/40 opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
          <Card className="border border-border/50 bg-white dark:bg-[#0B1220] rounded-[2.4rem] overflow-hidden relative">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-50">Total Receivables</p>
                <div className="text-3xl font-black text-red-500 mt-1 whitespace-nowrap">₹{totalOutstanding.toLocaleString()}</div>
                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Pending Outstanding</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.3 }}
        >
          <Card className="border border-border bg-white dark:bg-[#0B1220] rounded-[1.8rem] hover:border-primary/50 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Status</p>
                  <div className="text-lg font-black text-foreground">{customers.filter(c => c.isActive).length} Deliveries</div>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.4 }}
        >
          <Card className="border border-border bg-white dark:bg-[#0B1220] rounded-[1.8rem] hover:border-red-500/50 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Insight</p>
                  <div className="text-lg font-black text-red-500">
                    ₹{customers.length ? Math.round(totalOutstanding / customers.length) : 0} Avg/Debt
                  </div>
                </div>
              </div>
              <ArrowDownRight className="w-5 h-5 text-red-500" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gemini AI Smart Analytics Card with Google AI Studio Style Border */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative p-[1.5px] rounded-[2.5rem] overflow-hidden gemini-glow-border shadow-2xl"
      >
        <Card className="border-none bg-white dark:bg-[#080E1A] rounded-[2.4rem] overflow-hidden">
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-foreground tracking-tight uppercase italic flex items-center gap-2">
                    Gemini Intelligence
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">AI Business Consultant</p>
                </div>
              </div>
              <Button
                disabled={loadingInsights || customers.length === 0}
                onClick={getInsights}
                className="h-10 px-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all duration-300 active:scale-95 shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                {loadingInsights ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Get AI Advisor
                  </>
                )}
              </Button>
            </div>

            {insights ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live Advice Active</span>
                </div>
                <div className="text-sm text-foreground space-y-2 dark:text-slate-300 leading-relaxed font-semibold whitespace-pre-line text-left">
                  {insights}
                </div>
              </motion.div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/5 space-y-1">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Unlock dynamic advice tailored to your active clients.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">Click &quot;Get AI Advisor&quot; to prompt Gemini to optimize your daily milk distribution network and active collections.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AddCustomerModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
}
