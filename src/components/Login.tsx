import React from 'react';
import { 
  Truck, 
  LogIn, 
  ShieldCheck, 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  BarChart3, 
  Users,
  Zap,
  Globe
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Button } from './ui/button';
import { loginWithGoogle } from '../lib/data';
import { toast } from 'sonner';

const FeatureCard = ({ icon: Icon, title, description, index }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    viewport={{ once: true }}
    className="p-6 rounded-[2rem] bg-white/5 border border-white/10 space-y-3 hover:bg-white/10 transition-colors"
  >
    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="font-bold text-white text-lg">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
  </motion.div>
);

export function Login() {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success("Welcome back!");
    } catch (e) {
      toast.error("Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-8 relative z-10"
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/30"
            >
              <Truck className="w-12 h-12 text-white" />
            </motion.div>
            <div className="text-center space-y-3">
              <h1 className="text-5xl font-black tracking-tighter italic">MILK DAIRY</h1>
              <p className="text-slate-400 font-medium text-lg leading-tight">Digital OS for your <br/> dairy business</p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="p-[1.5px] rounded-[1.6rem] overflow-hidden gemini-glow-border shadow-xl">
               <div className="bg-[#0B1220]/95 rounded-[1.5rem] p-1">
                 <Button 
                   onClick={handleLogin}
                   className="w-full h-16 bg-white hover:bg-slate-100 text-slate-900 rounded-[1.3rem] flex items-center justify-center gap-3 text-lg font-black transition-all active:scale-95 cursor-pointer shadow-xl shadow-white/5"
                 >
                   <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                   Continue with Google
                 </Button>
               </div>
             </div>
             
             <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto font-bold opacity-60">
               Secure login via Google Auth • Privacy Protected
             </p>
          </div>
          
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center gap-2 pt-12 text-slate-500"
          >
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Scroll for features</span>
             <div className="w-px h-12 bg-gradient-to-b from-white/20 to-transparent" />
          </motion.div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="max-w-4xl mx-auto px-6 py-24 space-y-24">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Everything under control</h2>
          <p className="text-slate-400">Streamline your daily operations with precision tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard 
            index={0}
            icon={Calendar}
            title="Interactive Calendar"
            description="Visual delivery and payment history for every customer. View daily quantities and track gaps instantly."
          />
          <FeatureCard 
            index={1}
            icon={CreditCard}
            title="Auto-Billing"
            description="Smart calculations for outstanding balances. No more manual ledgers or calculation errors."
          />
          <FeatureCard 
            index={2}
            icon={Globe}
            title="Bilingual WhatsApp"
            description="Send professional delivery alerts and payment reminders in Hindi, English, or both with one tap."
          />
          <FeatureCard 
            index={3}
            icon={BarChart3}
            title="Smart Insights"
            description="Monitor your growth, total sales, and outstanding debts through an intuitive real-time dashboard."
          />
          <FeatureCard 
            index={4}
            icon={Users}
            title="Customer Portal"
            description="Manage unlimited customers with custom prices for Cow/Buffalo milk and flexible schedules."
          />
          <FeatureCard 
            index={5}
            icon={Zap}
            title="Instant Sync"
            description="Your data is encrypted and synced across all your devices in real-time. Work from anywhere."
          />
        </div>

        <div className="pt-20 text-center">
            <div className="inline-flex items-center gap-3 p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
               <ShieldCheck className="w-6 h-6 text-emerald-500" />
               <p className="text-sm font-bold text-emerald-400">Bank-Grade Cloud Encryption Active</p>
            </div>
            <div className="mt-12">
               <Button 
                 onClick={handleLogin}
                 variant="ghost" 
                 className="text-slate-400 hover:text-white"
               >
                 Ready to start? <span className="text-emerald-500 ml-2 font-bold underline">Login now</span>
               </Button>
            </div>
        </div>
      </div>

      <footer className="p-12 text-center text-slate-600">
        <p className="text-[10px] font-bold uppercase tracking-widest">© 2026 MILK DAIRY DIGITAL OS • ALL RIGHTS RESERVED</p>
      </footer>
    </div>
  );
}
