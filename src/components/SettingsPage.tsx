import React from 'react';
import { 
  Building2, 
  Database, 
  Palette, 
  BellRing, 
  ShieldCheck, 
  LogOut, 
  ChevronRight,
  User,
  Moon,
  Sun,
  Trash2,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useStore } from '../types';
import { Separator } from './ui/separator';
import { useFirebase } from './FirebaseProvider';
import { logout as firebaseLogout, saveBusinessProfile, resetAllUserData } from '../lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';

import { toast } from 'sonner';

export function SettingsPage() {
  const { theme, setTheme } = useStore();
  const { user, profile, refreshProfile } = useFirebase();

  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({
    dairyName: '',
    ownerName: '',
    phone: '',
    address: '',
    theme: 'dark'
  });
  const [saving, setSaving] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');

  const handleResetDatabase = async () => {
    if (confirmText !== 'RESET') {
      toast.error("Please type 'RESET' exactly to confirm (कृपया 'RESET' टाइप करें)");
      return;
    }
    if (!user) return;
    setResetting(true);
    try {
      await resetAllUserData(user.uid);
      toast.success("Database wiped successfully! Clean slate loaded.");
      setIsResetConfirmOpen(false);
      setConfirmText('');
      await refreshProfile();
    } catch (e) {
      console.error(e);
      toast.error("Wipe operation failed.");
    } finally {
      setResetting(false);
    }
  };

  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        dairyName: profile.dairyName || '',
        ownerName: profile.ownerName || '',
        phone: profile.phone || '',
        address: profile.address || '',
        theme: profile.theme || theme
      });
    }
  }, [profile, theme]);

  const handleLogout = async () => {
    try {
      await firebaseLogout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleBackup = () => {
    const data = { profile, date: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milk-dairy-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success("Backup downloaded!");
  };

  const handleAction = (label: string) => {
    if (label === 'Backup & Restore') {
      handleBackup();
    } else if (label === 'Business Profile') {
      setIsProfileOpen(true);
    } else if (label === 'Security') {
      toast.info("Security features (PIN lock) coming soon");
    } else if (label === 'Notifications') {
      toast.info("SMS/WhatsApp notifications functional in delivery flow");
    } else {
      toast.info(`${label} configuration available in dashboard`);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveBusinessProfile(user.uid, profileForm);
      await refreshProfile();
      toast.success("Profile updated!");
      setIsProfileOpen(false);
    } catch (e) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      title: 'General',
      items: [
        { icon: Building2, label: 'Business Profile', desc: 'Dairy info & address' },
        { icon: User, label: 'Account Settings', desc: 'Personal information' },
      ]
    },
    {
      title: 'Data & Privacy',
      items: [
        { icon: Database, label: 'Backup & Restore', desc: 'Export/Import your data' },
        { icon: ShieldCheck, label: 'Security', desc: 'PIN & Authentication' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: BellRing, label: 'Notifications', desc: 'Alerts & Reminders' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>

      {/* Profile Card */}
      <Card 
        onClick={() => handleAction('Business Profile')}
        className="border-none shadow-sm bg-white dark:bg-card p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold uppercase">
            {profile?.dairyName?.charAt(0) || 'M'}
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{profile?.dairyName || 'Milk Dairy Farm'}</h3>
            <p className="text-sm text-muted-foreground">{profile?.address || 'Set your address'}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 ml-auto" />
        </div>
      </Card>

      {/* Dark Mode Toggle */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-900/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-500/10 text-violet-500">
               {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
             </div>
             <div>
               <p className="font-bold text-sm text-foreground">Dark Mode</p>
               <p className="text-[10px] text-slate-500">AMOLED dark experience</p>
             </div>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={theme === 'dark' ? "w-10 h-6 bg-emerald-500 rounded-full relative" : "w-10 h-6 bg-slate-200 rounded-full relative"}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${theme === 'dark' ? 'left-5' : 'left-1'}`} />
          </button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
             <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 px-1">{section.title}</h4>
             <Card className="border-none shadow-sm bg-white dark:bg-slate-900/50 overflow-hidden">
               {section.items.map((item, idx) => {
                 const Icon = item.icon;
                 return (
                   <React.Fragment key={item.label}>
                     <div 
                        onClick={() => handleAction(item.label)}
                        className="p-4 flex items-center gap-4 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer group"
                     >
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 group-hover:text-emerald-500 transition-colors">
                           <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                           <p className="font-bold text-sm text-foreground">{item.label}</p>
                           <p className="text-[10px] text-slate-500">{item.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                     </div>
                     {idx < section.items.length - 1 && <Separator className="bg-slate-100 dark:bg-slate-800" />}
                   </React.Fragment>
                 );
               })}
             </Card>
          </div>
        ))}
      </div>

      {/* Reset Database / Danger Zone Card */}
      <Card className="border border-red-500/20 shadow-sm bg-red-500/5 hover:bg-red-500/10 dark:bg-red-950/20 dark:hover:bg-red-950/30 transition-all rounded-[1.5rem] overflow-hidden my-4">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-left">
             <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
               <Trash2 className="w-5 h-5" />
             </div>
             <div>
               <p className="font-extrabold text-sm text-red-600 dark:text-red-400 uppercase tracking-tight">Danger Zone • Reset App</p>
               <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide opacity-80 mt-0.5">Wipe customers, deliveries & logs</p>
             </div>
          </div>
          <Button 
            onClick={() => setIsResetConfirmOpen(true)}
            size="sm"
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase px-4 cursor-pointer"
          >
            Reset All
          </Button>
        </CardContent>
      </Card>

      <Button 
        variant="ghost" 
        onClick={handleLogout}
        className="w-full h-14 rounded-2xl text-red-500 gap-2 font-bold hover:bg-red-50 dark:hover:bg-red-500/10"
      >
        <LogOut className="w-5 h-5" /> Logout
      </Button>

      <div className="text-center py-4">
         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Milk Dairy v1.0.0</p>
      </div>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0B1220] border-none rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight italic">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Dairy Name</label>
              <Input 
                 placeholder="Ex. Gokul Dairy"
                 value={profileForm.dairyName}
                 onChange={(e) => setProfileForm(f => ({ ...f, dairyName: e.target.value }))}
                 className="h-12 bg-slate-50 dark:bg-slate-900 border-border rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Owner Name</label>
              <Input 
                 placeholder="Full Name"
                 value={profileForm.ownerName}
                 onChange={(e) => setProfileForm(f => ({ ...f, ownerName: e.target.value }))}
                 className="h-12 bg-slate-50 dark:bg-slate-900 border-border rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Contact Phone</label>
              <Input 
                 placeholder="10 digit phone"
                 value={profileForm.phone}
                 onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                 className="h-12 bg-slate-50 dark:bg-slate-900 border-border rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Business Address</label>
              <Input 
                 placeholder="Address"
                 value={profileForm.address}
                 onChange={(e) => setProfileForm(f => ({ ...f, address: e.target.value }))}
                 className="h-12 bg-slate-50 dark:bg-slate-900 border-border rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSaveProfile} 
              disabled={saving}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              {saving ? "Saving..." : "Update Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Database Reset Safekeeping Confirmation Modal */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#070c16] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 text-foreground">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-extrabold uppercase italic tracking-tight text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Danger Zone: App Factory Reset
            </DialogTitle>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-1">
              Warning: This action is permanent! (यह प्रक्रिया हमेशा के लिए आपका डेटा मिटा देगी)
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2 text-left">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              This will completely wipe out your entire **Customers list**, **Daily Deliveries data**, **History Bills/Ledgers**, and **Payment Transaction Logs** from safe persistence on Firebase.
            </p>
            <p className="text-xs font-bold text-red-500 uppercase bg-red-500/10 p-3 rounded-xl">
              Type <span className="font-mono bg-white px-2 py-0.5 rounded border text-red-600">RESET</span> below to confirm this action.
            </p>
            <Input 
              type="text"
              placeholder="Type RESET here"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-bold uppercase tracking-wider text-center"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
            <Button 
              onClick={() => {
                setIsResetConfirmOpen(false);
                setConfirmText('');
              }}
              variant="outline"
              className="border-border rounded-xl font-bold uppercase text-[10px]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResetDatabase}
              disabled={resetting || confirmText !== 'RESET'}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-[10px] uppercase px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/20 cursor-pointer"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {resetting ? "WIPING DATABASE..." : "WIPE ALL DATA PERMANENTLY"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
