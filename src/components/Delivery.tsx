import React, { useState, useEffect } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Circle, Undo2, Save, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useFirebase } from './FirebaseProvider';
import { subscribeToCustomers, updateCustomer, recordDelivery, getTodaysDeliveries, getMilkPrices } from '../lib/data';
import { toast } from 'sonner';
import { getBaseQuantityForDate } from '../lib/quantityHelper';

export function Delivery() {
  const { user } = useFirebase();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shift, setShift] = useState<'morning' | 'evening'>('morning');
  const [customers, setCustomers] = useState<any[]>([]);
  const [deliveredIds, setDeliveredIds] = useState<Set<string>>(new Set());
  const [alreadyDeliveredIds, setAlreadyDeliveredIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [milkPrices, setMilkPrices] = useState<any[]>([]);
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  const prevDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const nextDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const getLocalDateString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToCustomers(user.uid, (data) => {
      setCustomers(data);
    });
    setDeliveredIds(new Set()); // Reset local selection draft when switching date/shift
    loadTodaysDeliveries();
    loadMilkPrices();
    return () => unsubscribe();
  }, [user, selectedDate, shift]);

  const loadTodaysDeliveries = async () => {
    if (!user) return;
    try {
      const dateStr = getLocalDateString(selectedDate);
      const deliveries = await getTodaysDeliveries(user.uid, dateStr);
      // Filter deliveries records matching the active shift (morning/evening)
      const shiftDeliveries = (deliveries || []).filter((d: any) => d.time === shift);
      const deliveredIdsForShift = shiftDeliveries.map((d: any) => d.customerId);
      setAlreadyDeliveredIds(new Set(deliveredIdsForShift));
    } catch (e) {
      console.error(e);
    }
  };

  const loadMilkPrices = async () => {
    if (!user) return;
    try {
      const prices = await getMilkPrices(user.uid);
      setMilkPrices(prices);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (deliveredIds.size === 0) {
      toast.warning("No deliveries marked");
      return;
    }

    if (!user) return;
    setIsSaving(true);
    const dateStr = getLocalDateString(selectedDate);
    let successCount = 0;
    
    try {
      for (const id of Array.from(deliveredIds)) {
        const customer = customers.find(c => c.id === id);
        if (!customer) continue;

        if (alreadyDeliveredIds.has(id)) continue;

        const priceObj = milkPrices.find(p => p.type.toLowerCase() === customer.milkType.toLowerCase()) || 
                         milkPrices.find(p => p.type.toLowerCase().includes('cow') && customer.milkType.toLowerCase().includes('cow')) ||
                         { pricePerLiter: customer.milkType.toLowerCase().includes('cow') ? 40 : 50 };
        const price = priceObj.pricePerLiter;
        const qty = customQuantities[id] !== undefined ? customQuantities[id] : getBaseQuantityForDate(customer, dateStr);
        const addAmount = qty * price;
        
        const updates: any = {};
        if (customer.billingModel === 'prepaid') {
          updates.walletBalance = (customer.walletBalance || 0) - addAmount;
        } else {
          updates.totalOutstanding = (customer.totalOutstanding || 0) + addAmount;
        }

        try {
          await recordDelivery(user.uid, {
            customerId: id as string,
            date: dateStr,
            quantity: qty,
            priceAtTime: price,
            time: shift,
            type: customer.milkType || 'cow'
          });

          await updateCustomer(user.uid, id as string, updates);
          successCount++;
        } catch (err: any) {
          if (err.message === "Already delivered today") {
            // Skip
          } else {
            throw err;
          }
        }
      }

      toast.success(`Successfully saved ${successCount} deliveries`);
      setDeliveredIds(new Set());
      loadTodaysDeliveries();
    } catch (e) {
      toast.error("Failed to save deliveries");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter customers based on the selected shift
  const filteredCustomers = customers.filter(c => 
    !c.deliverySchedule || c.deliverySchedule === 'both' || c.deliverySchedule === shift
  );

  const currentDateStr = getLocalDateString(selectedDate);

  const totalLiters = filteredCustomers.reduce((acc, c) => acc + (getBaseQuantityForDate(c, currentDateStr) || 0), 0);
  const deliveredLiters = filteredCustomers
    .filter(c => alreadyDeliveredIds.has(c.id) || deliveredIds.has(c.id))
    .reduce((acc, c) => {
      const q = customQuantities[c.id] !== undefined ? customQuantities[c.id] : (getBaseQuantityForDate(c, currentDateStr) || 0);
      return acc + q;
    }, 0);
  const skippedLiters = Math.max(0, totalLiters - deliveredLiters);

  const totalClients = filteredCustomers.length;
  const deliveredClients = filteredCustomers.filter(c => alreadyDeliveredIds.has(c.id) || deliveredIds.has(c.id)).length;
  const skippedClients = Math.max(0, totalClients - deliveredClients);

  const toggleDelivery = (id: string) => {
    setDeliveredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const markAllDelivered = () => {
    setDeliveredIds(new Set(filteredCustomers.map(c => c.id as string)));
  };

  const resetAll = () => {
    setDeliveredIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Date & Shift Selector */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between animate-fade-in">
          <Button 
            onClick={prevDay}
            variant="ghost" 
            size="icon" 
            className="rounded-2xl border border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Prevous Day (पिछला दिन)"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Button>
          <div className="flex items-center gap-2 font-black text-lg text-foreground uppercase tracking-tighter">
            <CalendarIcon className="w-5 h-5 text-primary animate-pulse" />
            {selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <Button 
            onClick={nextDay}
            variant="ghost" 
            size="icon" 
            className="rounded-2xl border border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Next Day (अगला दिन)"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </Button>
        </div>

        <Tabs defaultValue="morning" className="w-full" onValueChange={(v) => setShift(v as any)}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-white/5 p-1 h-14 rounded-[1.8rem] border border-border">
            <TabsTrigger value="morning" className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all">
              Morning Shift
            </TabsTrigger>
            <TabsTrigger value="evening" className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all">
              Evening Shift
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Summary with Glow */}
      <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-r from-blue-500/20 via-emerald-500/20 to-amber-500/20">
        <div className="grid grid-cols-3 gap-0.5 rounded-[1.95rem] overflow-hidden bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/10 shadow-inner">
          <div className="p-5 text-center space-y-1">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-70">Total Supply</p>
            <p className="text-2xl font-black text-foreground leading-none">{totalLiters}L</p>
            <p className="text-[9px] font-bold text-slate-400 capitalize">{totalClients} clients</p>
          </div>
          <div className="p-5 text-center space-y-1 border-x border-slate-200 dark:border-white/5 animate-fade-in-down">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Delivered</p>
            <p className="text-2xl font-black text-emerald-500 leading-none">
              {deliveredLiters}L
            </p>
            <p className="text-[9px] font-bold text-emerald-500/70 capitalize">{deliveredClients} active</p>
          </div>
          <div className="p-5 text-center space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Skipped / Rest</p>
            <p className="text-2xl font-black text-slate-400 leading-none">
              {skippedLiters}L
            </p>
            <p className="text-[9px] font-bold text-slate-400/70 capitalize">{skippedClients} pending</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={markAllDelivered}
          className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-2xl h-12 text-xs font-black uppercase tracking-wider"
        >
          Bulk Deliver
        </Button>
        <Button 
          onClick={resetAll}
          variant="outline"
          className="border-border bg-card rounded-2xl h-12 text-xs font-black uppercase tracking-wider gap-2"
        >
          <Undo2 className="w-4 h-4" /> Reset
        </Button>
      </div>

      {/* Delivery List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm font-bold uppercase tracking-widest">No customers for this shift</p>
          </div>
        ) : (
          filteredCustomers.map((item) => {
            const isDelivered = deliveredIds.has(item.id);
            const alreadyDelivered = alreadyDeliveredIds.has(item.id);
            
            return (
              <Card 
                key={item.id} 
                className={cn(
                  "border border-border shadow-sm transition-all duration-300",
                  alreadyDelivered ? "bg-slate-50 dark:bg-slate-900/40 opacity-70 pointer-events-none" :
                  (isDelivered ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card")
                )}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black",
                      alreadyDelivered ? "bg-slate-200 dark:bg-slate-800 text-slate-400" : "bg-primary/10 text-primary"
                    )}>
                      {alreadyDelivered ? <CheckCircle2 className="w-6 h-6" /> : item.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground uppercase leading-none mb-1.5">{item.name}</h4>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2.5">
                        Base: {getBaseQuantityForDate(item, currentDateStr)} Ltr {item.milkType} {item.billingModel === 'prepaid' ? '• (Prepaid)' : '• (Postpaid)'}
                        {alreadyDelivered && <span className="ml-1 text-emerald-500 italic lowercase tracking-tight">(recorded)</span>}
                      </p>
                      
                      {!alreadyDelivered && isDelivered && (
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl w-fit">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentVal = customQuantities[item.id] !== undefined ? customQuantities[item.id] : getBaseQuantityForDate(item, currentDateStr);
                              const newVal = Math.max(0, currentVal - 0.5);
                              setCustomQuantities(prev => ({ ...prev, [item.id]: newVal }));
                            }}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground font-black flex items-center justify-center transition-colors cursor-pointer border border-border"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-primary px-1 min-w-[3.5rem] text-center">
                            {customQuantities[item.id] !== undefined ? customQuantities[item.id] : getBaseQuantityForDate(item, currentDateStr)} Ltr
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentVal = customQuantities[item.id] !== undefined ? customQuantities[item.id] : getBaseQuantityForDate(item, currentDateStr);
                              const newVal = currentVal + 0.5;
                              setCustomQuantities(prev => ({ ...prev, [item.id]: newVal }));
                            }}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground font-black flex items-center justify-center transition-colors cursor-pointer border border-border"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {!alreadyDelivered && (
                      <button 
                        onClick={() => toggleDelivery(item.id)}
                        className={cn(
                          "w-12 h-7 rounded-2xl relative transition-all duration-300",
                          isDelivered ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-200 dark:bg-slate-800"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-5 h-5 bg-white rounded-xl transition-all duration-300 shadow-sm",
                          isDelivered ? "left-6" : "left-1"
                        )} />
                      </button>
                    )}
                    {alreadyDelivered && (
                      <div className="w-12 h-7 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                         <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Button 
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-3xl flex items-center justify-center gap-2 text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20"
      >
        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        {isSaving ? "Saving..." : "Confirm Delivery Day"}
      </Button>
    </div>
  );
}
