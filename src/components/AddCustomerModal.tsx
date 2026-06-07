import React, { useState, useEffect } from 'react';
import { Plus, User, Phone, MapPin, Calendar, Sparkles, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { addCustomer, getMilkPrices, recordDelivery } from '../lib/data';
import { useFirebase } from './FirebaseProvider';
import { toast } from 'sonner';

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCustomerModal({ open, onOpenChange }: AddCustomerModalProps) {
  const { user } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [creationMode, setCreationMode] = useState<'normal' | 'historical'>('normal');

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
    startDate: new Date().toISOString()
  });

  const [backfill, setBackfill] = useState(false);
  const [absentDates, setAbsentDates] = useState<string[]>([]);
  const [newAbsentDate, setNewAbsentDate] = useState('');

  // Auto-set appropriate parameters when mode changes
  useEffect(() => {
    if (creationMode === 'normal') {
      setFormData(prev => ({
        ...prev,
        startDate: new Date().toISOString()
      }));
      setBackfill(false);
      setAbsentDates([]);
    } else {
      // For old historical records, default start date to 7 days ago
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      setFormData(prev => ({
        ...prev,
        startDate: pastDate.toISOString()
      }));
      setBackfill(true);
      setAbsentDates([]);
    }
  }, [creationMode]);

  // Generate list of dates between start date and yesterday
  const getHistoricalDaysList = () => {
    const startStr = formData.startDate.substring(0, 10);
    const todayStr = new Date().toISOString().split('T')[0];
    if (startStr >= todayStr) return [];

    const days: string[] = [];
    const start = new Date(startStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Limit to safety margin of 90 days to avoid UI clutter & performance lag
    let current = new Date(start);
    let safety = 0;
    while (current <= yesterday && safety < 90) {
      safety++;
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const isPastDate = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const check = new Date(dateStr);
    check.setHours(0, 0, 0, 0);
    return check < today;
  };

  const toggleAbsentDay = (dateStr: string) => {
    if (absentDates.includes(dateStr)) {
      setAbsentDates(prev => prev.filter(d => d !== dateStr));
    } else {
      setAbsentDates(prev => [...prev, dateStr].sort());
    }
  };

  const handleToggleAllDays = () => {
    const allDays = getHistoricalDaysList();
    if (absentDates.length === allDays.length) {
      // Clear all absents, so all are present
      setAbsentDates([]);
    } else {
      // Mark all as absent
      setAbsentDates(allDays);
    }
  };

  const handleMarkSundaysAbsent = () => {
    const allDays = getHistoricalDaysList();
    const sundays = allDays.filter(d => {
      const dayOfWeek = new Date(d).getDay();
      return dayOfWeek === 0; // Sunday is 0
    });
    setAbsentDates(sundays);
    toast.info("Marked Sundays as absent!");
  };

  const handleAddAbsentDateCustom = () => {
    if (!newAbsentDate) return;
    if (absentDates.includes(newAbsentDate)) {
      toast.warning("Date already marked as absent");
      return;
    }
    
    const startStr = formData.startDate.substring(0, 10);
    if (newAbsentDate < startStr) {
      toast.warning(`Date cannot be before start date (${startStr})`);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (newAbsentDate >= todayStr) {
      toast.warning("Date must be a past date (prior to today)");
      return;
    }

    setAbsentDates(prev => [...prev, newAbsentDate].sort());
    setNewAbsentDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let calculatedOutstanding = Number(formData.totalOutstanding || 0);
      let calculatedWallet = Number(formData.walletBalance || 0);
      const deliveriesToRecord: any[] = [];

      const startStr = formData.startDate.substring(0, 10);
      const todayStr = new Date().toISOString().split('T')[0];

      // If we are in historical mode and backfill option is active
      if (creationMode === 'historical' && backfill && startStr < todayStr) {
        const absentSet = new Set(absentDates);
        const prices = await getMilkPrices(user.uid);
        const priceObj = prices.find((p: any) => p.type.toLowerCase() === formData.milkType.toLowerCase()) || 
                         prices.find((p: any) => p.type.toLowerCase().includes('cow') && formData.milkType.toLowerCase().includes('cow')) ||
                         { pricePerLiter: formData.milkType.toLowerCase().includes('cow') ? 40 : 50 };
        const price = (priceObj as any).pricePerLiter;

        const start = new Date(startStr);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let loopDate = new Date(start);
        let safetyCounter = 0;
        while (loopDate <= yesterday && safetyCounter < 120) {
          safetyCounter++;
          const currentDateString = loopDate.toISOString().split('T')[0];
          
          if (!absentSet.has(currentDateString)) {
            const schedule = formData.deliverySchedule;
            const times: ('morning' | 'evening')[] = [];
            if (schedule === 'morning' || schedule === 'both') times.push('morning');
            if (schedule === 'evening' || schedule === 'both') times.push('evening');

            for (const time of times) {
              const qty = Number(formData.dailyQuantity);
              const cost = qty * price;
              
              if (formData.billingModel === 'prepaid') {
                calculatedWallet -= cost;
              } else {
                calculatedOutstanding += cost;
              }

              deliveriesToRecord.push({
                date: currentDateString,
                quantity: qty,
                priceAtTime: price,
                time: time,
                type: formData.milkType
              });
            }
          }
          loopDate.setDate(loopDate.getDate() + 1);
        }
      }

      const cleanCustomerData = {
        ...formData,
        totalOutstanding: calculatedOutstanding,
        walletBalance: calculatedWallet,
        quantityHistory: [] // Starts clean
      };

      const customerId = await addCustomer(user.uid, cleanCustomerData);

      if (customerId && deliveriesToRecord.length > 0) {
        for (const item of deliveriesToRecord) {
          await recordDelivery(user.uid, {
            ...item,
            customerId: customerId
          });
        }
        toast.info(`Successfully backfilled ${deliveriesToRecord.length} historical deliveries!`);
      }

      toast.success("Customer added successfully!");
      onOpenChange(false);
      
      // Reset State
      setFormData({
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
        startDate: new Date().toISOString()
      });
      setCreationMode('normal');
      setBackfill(false);
      setAbsentDates([]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add customer.");
    } finally {
      setLoading(false);
    }
  };

  const listDays = getHistoricalDaysList();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-[#0B1220] border-none rounded-3xl p-6 max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold dark:text-white flex items-center gap-2">
            Add Customer Configuration
          </DialogTitle>
        </DialogHeader>

        {/* Tab Selector at the Top */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-4 text-xs font-bold font-sans">
          <button
            type="button"
            onClick={() => setCreationMode('normal')}
            className={`py-3 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              creationMode === 'normal'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <div>
              <p className="font-bold">New Registrations</p>
              <p className="text-[9px] opacity-70 font-normal">Starts Daily From Today (नया ग्राहक)</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('historical')}
            className={`py-3 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              creationMode === 'historical'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <div>
              <p className="font-bold">Old Records Backfill</p>
              <p className="text-[9px] opacity-70 font-normal">Supply Started in Past (छूटा हुआ डेटा)</p>
            </div>
          </button>
        </div>

        {/* Helpful Info Alerts based on Mode */}
        {creationMode === 'normal' ? (
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mb-4 flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300">
            <Sparkles className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-500" />
            <p className="text-[11px] leading-relaxed">
              <b>Normal Mode:</b> Registering a customer who is starting daily milk deliveries from today onwards or a future date. Standard billing begins relative to their first shipment.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl mb-4 flex items-start gap-2.5 text-amber-700 dark:text-amber-300">
            <History className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-500" />
            <p className="text-[11px] leading-relaxed">
              <b>Historical Backfill Mode:</b> Use this for customers who started receiving milk in previous weeks or months, but you missed writing it down. Select their initial start date and choose any absent days to automatically compile their exact bills!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Main info parameters */}
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
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Daily Baseline (Liters)</label>
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
               <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Milk Type (दूध का प्रकार)</label>
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
               <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Billing Model (बिलिंग)</label>
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
                 {formData.billingModel === 'prepaid' ? 'Initial Wallet (जमा ₹)' : 'Old Outstanding (बकाया ₹)'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">
                {creationMode === 'normal' ? 'Start Date (शुरुआती तारीख)' : 'Old Registration Date (दूध शुरू होने की तारीख)'}
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  required
                  type="date"
                  className="pl-11 h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl dark:text-white text-xs"
                  value={formData.startDate.substring(0, 10)}
                  onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value).toISOString() })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Delivery Address</label>
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
          </div>

          {/* Interactive Multi-Absent Calendars (Only for Historical Mode which requires backfill) */}
          {creationMode === 'historical' && isPastDate(formData.startDate) && (
            <div className="p-4 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-4 mt-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block">
                    Historical Delivery Generator (ऑटो डिलीवरी रिकॉर्डर)
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Generating milk shipments from <b>{formData.startDate.substring(0, 10)}</b> up to yesterday.
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  checked={backfill} 
                  onChange={(e) => {
                    setBackfill(e.target.checked);
                    if (!e.target.checked) setAbsentDates([]);
                  }}
                  className="w-4.5 h-4.5 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {backfill && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase">
                      Select Absent Dates - Tap to Toggle (गैर-हाजिरी / छुट्टी के दिन चुनें)
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Click days the customer did NOT take milk. Highly interactive grid where red strikes represent absences.
                    </p>
                  </div>

                  {listDays.length > 0 ? (
                    <div className="space-y-3">
                      {/* Control buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleToggleAllDays}
                          className="h-8 text-[10px] uppercase font-bold border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 rounded-lg px-2.5"
                        >
                          {absentDates.length === listDays.length ? "Mark All Present" : "Mark All Absent"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleMarkSundaysAbsent}
                          className="h-8 text-[10px] uppercase font-bold border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 rounded-lg px-2.5"
                        >
                          Only Sundays Absent
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAbsentDates([])}
                          className="h-8 text-[10px] uppercase font-bold text-red-500 border-red-500/20 hover:bg-red-500/5 rounded-lg px-2.5"
                        >
                          Reset
                        </Button>
                      </div>

                      {/* Interactive Days grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        {listDays.map(dayStr => {
                          const isAbsent = absentDates.includes(dayStr);
                          const formattedDate = new Date(dayStr).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            weekday: 'short' 
                          });

                          return (
                            <button
                              type="button"
                              key={dayStr}
                              onClick={() => toggleAbsentDay(dayStr)}
                              className={`p-2.5 rounded-xl text-left border transition-all duration-150 flex flex-col justify-between h-14 ${
                                isAbsent 
                                  ? 'bg-red-50 border-red-100 hover:bg-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400' 
                                  : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-700 dark:bg-[#111A2E] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-[#15233D]'
                              }`}
                            >
                              <span className="text-[10px] font-medium opacity-80">{formattedDate}</span>
                              <span className="text-[9px] font-bold tracking-tight mt-1 flex items-center gap-1">
                                {isAbsent ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    Absent / छुट्टी
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    Delivered / हाँ
                                  </>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Summary indicator */}
                      <p className="text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] tracking-tight bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-805/40">
                        📊 <b>Backfill Summary:</b> Supply range is <b>{listDays.length} days</b>. Markings consist of <span className="text-emerald-500">{listDays.length - absentDates.length} Delivery days</span> and <span className="text-red-500">{absentDates.length} Leaves (Absent days)</span>.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] italic text-slate-400">Choose a past date above to load the interactive checklist grid of days.</p>
                  )}

                  {/* Backup single date adder in case they need to add dates outside the range */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-805/40">
                    <label className="text-[9px] font-extrabold text-muted-foreground uppercase">Add Custom Date (or date out of range):</label>
                    <div className="flex gap-2">
                      <Input 
                        type="date" 
                        className="flex-1 h-9 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs"
                        value={newAbsentDate}
                        onChange={(e) => setNewAbsentDate(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddAbsentDateCustom}
                        className="h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:hover:bg-slate-700 dark:text-white rounded-lg text-xs font-bold px-3"
                      >
                        Exclude Date
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-lg font-bold shadow-lg shadow-emerald-500/20 mt-4"
          >
            {loading ? "Adding..." : "Add Customer & Configure"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
