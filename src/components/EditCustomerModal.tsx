import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Calendar, Trash2, Sliders, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { updateCustomer } from '../lib/data';
import { useFirebase } from './FirebaseProvider';
import { toast } from 'sonner';

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
}

export function EditCustomerModal({ open, onOpenChange, customer }: EditCustomerModalProps) {
  const { user } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    dailyQuantity: 1,
    milkType: 'Cow',
    deliverySchedule: 'both',
    isActive: true,
    totalOutstanding: 0,
    billingModel: 'postpaid' as 'prepaid' | 'postpaid',
    walletBalance: 0,
    quantityHistory: [] as { date: string; quantity: number }[]
  });

  const [historyDate, setHistoryDate] = useState('');
  const [historyQty, setHistoryQty] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        dailyQuantity: customer.dailyQuantity || 1,
        milkType: customer.milkType || 'Cow',
        deliverySchedule: customer.deliverySchedule || 'both',
        isActive: customer.isActive !== undefined ? customer.isActive : true,
        totalOutstanding: customer.totalOutstanding || 0,
        billingModel: customer.billingModel || 'postpaid',
        walletBalance: customer.walletBalance || 0,
        quantityHistory: customer.quantityHistory || []
      });
    }
  }, [customer]);

  const handleAddHistoryEntry = () => {
    if (!historyDate || !historyQty) {
      toast.warning("Please select a date and enter quantity");
      return;
    }
    const qtyNum = parseFloat(historyQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.warning("Quantity must be a positive number");
      return;
    }

    const duplicateIndex = formData.quantityHistory.findIndex(h => h.date === historyDate);
    let updatedHistory = [...formData.quantityHistory];
    
    if (duplicateIndex !== -1) {
      updatedHistory[duplicateIndex].quantity = qtyNum;
      toast.info(`Updated scheduled quantity for ${historyDate}`);
    } else {
      updatedHistory.push({ date: historyDate, quantity: qtyNum });
      toast.success(`Added base change for ${historyDate}`);
    }

    updatedHistory.sort((a, b) => a.date.localeCompare(b.date));

    setFormData(prev => ({
      ...prev,
      quantityHistory: updatedHistory
    }));
    setHistoryDate('');
    setHistoryQty('');
  };

  const handleRemoveHistoryEntry = (index: number) => {
    const updatedHistory = formData.quantityHistory.filter((_, idx) => idx !== index);
    setFormData(prev => ({
      ...prev,
      quantityHistory: updatedHistory
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !customer) return;
    setLoading(true);
    try {
      await updateCustomer(user.uid, customer.id, formData);
      toast.success("Customer configuration updated!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update customer configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#0B1220] border-none rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold dark:text-white">Edit Customer Info</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Customer Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                required
                className="pl-11 h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white"
                placeholder="Ex. Rahul Verma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  required
                  className="pl-11 h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white"
                  placeholder="Mobile"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Default Daily Qty (Ltr)</label>
              <Input 
                required
                type="number"
                step="0.5"
                className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white"
                value={formData.dailyQuantity}
                onChange={(e) => setFormData({ ...formData, dailyQuantity: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Milk Type</label>
               <Select 
                 value={formData.milkType} 
                 onValueChange={(v) => setFormData({ ...formData, milkType: v })}
                >
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 rounded-xl border-slate-800">
                    <SelectItem value="Cow">Cow Milk</SelectItem>
                    <SelectItem value="Buffalo">Buffalo Milk</SelectItem>
                    <SelectItem value="Toned">Toned Milk</SelectItem>
                  </SelectContent>
               </Select>
            </div>
            <div className="space-y-2">
               <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Schedule</label>
               <Select 
                 value={formData.deliverySchedule} 
                 onValueChange={(v) => setFormData({ ...formData, deliverySchedule: v })}
                >
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 rounded-xl border-slate-800">
                    <SelectItem value="morning">Morning Only</SelectItem>
                    <SelectItem value="evening">Evening Only</SelectItem>
                    <SelectItem value="both">Both Times</SelectItem>
                  </SelectContent>
               </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Billing (बिलिंग)</label>
               <Select 
                 value={formData.billingModel} 
                 onValueChange={(v: 'prepaid' | 'postpaid') => {
                   setFormData({ ...formData, billingModel: v });
                 }}
                >
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 rounded-xl border-[#0F172A]">
                    <SelectItem value="postpaid">Postpaid (बकाया)</SelectItem>
                    <SelectItem value="prepaid">Prepaid (प्रीपेड)</SelectItem>
                  </SelectContent>
               </Select>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">
                 {formData.billingModel === 'prepaid' ? 'Wallet Balance (जमा ₹)' : 'Outstanding (बकाया ₹)'}
               </label>
               {formData.billingModel === 'prepaid' ? (
                 <Input 
                   type="number"
                   placeholder="0"
                   className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white"
                   value={formData.walletBalance || ''}
                   onChange={(e) => setFormData({ ...formData, walletBalance: Number(e.target.value) })}
                 />
               ) : (
                 <Input 
                   type="number"
                   placeholder="0"
                   className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white"
                   value={formData.totalOutstanding || ''}
                   onChange={(e) => setFormData({ ...formData, totalOutstanding: Number(e.target.value) })}
                 />
               )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                required
                className="pl-11 h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white"
                placeholder="House No., Area, City"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          {/* Dynamic Quantity Timeline / History Change Panel */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3 mt-3">
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className="flex items-center justify-between w-full focus:outline-none text-xs font-bold text-primary"
            >
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-4 h-4" /> Schedule Liters Daily Baseline Changes
              </span>
              <span>{showTimeline ? "Hide (छिपाएं)" : "Show (दिखाएं)"}</span>
            </button>
            <p className="text-[10px] text-muted-foreground">
              Define standard quantity adjustments effective from a specific date. If user changed daily intake from 1L to 2L from a particular date, log it here.
            </p>

            {showTimeline && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase">Effective From (इस तारीख से)</label>
                    <Input 
                      type="date"
                      value={historyDate}
                      onChange={(e) => setHistoryDate(e.target.value)}
                      className="h-9 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase">New Liters Baseline (नई मात्रा)</label>
                    <div className="flex gap-1.5">
                      <Input 
                        type="number"
                        step="0.5"
                        placeholder="Eg. 2"
                        value={historyQty}
                        onChange={(e) => setHistoryQty(e.target.value)}
                        className="h-9 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleAddHistoryEntry}
                        className="h-9 bg-primary text-white rounded-lg px-2.5 hover:bg-primary/95 text-xs font-bold"
                      >
                        Set
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.quantityHistory.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
                    <label className="text-[9px] font-black text-muted-foreground uppercase block pb-1 border-b border-border">Scheduled Baselines:</label>
                    {formData.quantityHistory.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                        <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" /> Effective: {item.date}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-primary text-xs">{item.quantity} Ltr/Day</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveHistoryEntry(idx)}
                            className="text-red-500 hover:text-red-700 font-bold focus:outline-none"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-lg font-bold shadow-lg shadow-emerald-500/20 mt-4"
          >
            {loading ? "Updating..." : "Update Customer Config"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
