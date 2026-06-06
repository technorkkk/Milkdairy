import React, { useState } from 'react';
import { Building2, User, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { saveBusinessProfile } from '../lib/data';
import { useFirebase } from './FirebaseProvider';
import { toast } from 'sonner';

export function BusinessSetup() {
  const { user, refreshProfile } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dairyName: '',
    ownerName: user?.displayName || '',
    phone: '',
    address: '',
    theme: 'dark'
  });

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await saveBusinessProfile(user.uid, formData);
      await refreshProfile();
      toast.success("Profile created!");
    } catch (e: any) {
      console.error("Setup Error:", e);
      toast.error("Failed to save profile. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-background flex flex-col items-center justify-center transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">Business Setup</h2>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest">Complete your profile to get started</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Dairy Name</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-primary shadow-sm" 
                placeholder="Ex. Gokul Dairy"
                value={formData.dairyName}
                onChange={(e) => setFormData({ ...formData, dairyName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Owner Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-primary shadow-sm" 
                placeholder="Full Name"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-primary shadow-sm" 
                placeholder="10 digit mobile"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-primary shadow-sm" 
                placeholder="Full business address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={loading || !formData.dairyName || !formData.phone}
          className="w-full h-15 bg-primary hover:bg-primary/90 text-white rounded-3xl text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? "Initializing..." : "Launch Terminal"}
        </Button>
      </motion.div>
    </div>
  );
}
