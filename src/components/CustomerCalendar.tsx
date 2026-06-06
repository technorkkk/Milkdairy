import React, { useState, useEffect, useRef } from 'react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Download, 
  X,
  Milk,
  Wallet,
  CheckCircle2,
  XCircle,
  Printer
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { getCustomerDeliveries, getCustomerPayments } from '../lib/data';
import { useFirebase } from './FirebaseProvider';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { getBaseQuantityForDate } from '../lib/quantityHelper';

interface CustomerCalendarProps {
  customer: any;
  onClose: () => void;
}

export function CustomerCalendar({ customer, onClose }: CustomerCalendarProps) {
  const { user, profile } = useFirebase();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !customer) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [delivs, payms] = await Promise.all([
          getCustomerDeliveries(user.uid, customer.id),
          getCustomerPayments(user.uid, customer.id)
        ]);
        setDeliveries(delivs || []);
        setPayments(payms || []);
      } catch (err) {
        console.error("Error fetching history", err);
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, customer]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const monthDeliveries = deliveries.filter(d => d.date.startsWith(format(currentMonth, 'yyyy-MM')));
  const monthPayments = payments.filter(p => p.date?.startsWith(format(currentMonth, 'yyyy-MM')));

  const totalQuantity = monthDeliveries.reduce((acc, d) => acc + (Number(d.quantity) || 0), 0);
  const cowMilkQty = monthDeliveries.filter(d => (d.type || '').toLowerCase() === 'cow').reduce((acc, d) => acc + (Number(d.quantity) || 0), 0);
  const buffaloMilkQty = monthDeliveries.filter(d => (d.type || '').toLowerCase() === 'buffalo').reduce((acc, d) => acc + (Number(d.quantity) || 0), 0);

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const delivery = deliveries.find(d => d.date === dateStr);
    const payment = payments.find(p => p.date?.split('T')[0] === dateStr);
    return { delivery, payment };
  };

  const handleShare = async () => {
    if (!calendarRef.current) return;
    try {
      const dataUrl = await toPng(calendarRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `milk_bill_${customer.name.replace(/\s+/g, '_')}_${format(currentMonth, 'MMM_yyyy').toLowerCase()}.png`, { type: 'image/png' });

      if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: `Milk Bill Report - ${customer.name}`,
            text: `Delivery & Payment report for ${format(currentMonth, 'MMMM yyyy')}`
          });
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            throw shareErr;
          }
        }
      } else {
        // Fallback to direct download
        const link = document.createElement('a');
        link.download = `milk_bill_${customer.name.replace(/\s+/g, '_')}_${format(currentMonth, 'MMM_yyyy').toLowerCase()}.png`;
        link.href = dataUrl;
        link.click();
        toast.info("Shared report downloaded (Export share API missing in browser)");
      }
    } catch (err) {
      console.error("Error sharing report", err);
      toast.error("Failed to generate report statement");
    }
  };

  const handleDownload = async () => {
    if (!calendarRef.current) return;
    try {
      const dataUrl = await toPng(calendarRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `milk_bill_${customer.name.replace(/\s+/g, '_')}_${format(currentMonth, 'MMM_yyyy').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Billing statement downloaded successfully!");
    } catch (err) {
      console.error("Error downloading", err);
      toast.error("Failed to download statement image");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthCost = monthDeliveries.reduce((acc, d) => {
    const qty = Number(d.quantity) || 0;
    const price = Number(d.priceAtTime) || (d.type === 'cow' ? 40 : 50);
    return acc + (qty * price);
  }, 0);

  const dairyName = profile?.dairyName || 'Milk Dairy Records';
  const ownerName = profile?.ownerName || 'Dairy Admin';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#070C15] rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-slate-200 dark:border-white/10 flex flex-col my-8">
        
        {/* Gemini Pulse Banner */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 via-emerald-500 to-amber-500 animate-gradient-x" />
        
        {/* Cut Button (X) at Top Right */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
          title="Close Calendar (कट करें)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="px-8 pt-8 pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/10">
              <Milk className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Analytics Hub
              </span>
              <h3 className="font-extrabold text-2xl text-foreground uppercase tracking-tight italic mt-1 leading-none">{customer.name}</h3>
            </div>
          </div>
        </div>

        {/* Outer scroll container for modal content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-h-[60vh]">
          
          {/* Section: Live Preview of what will be printed/shared */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400">
              <span>STATEMENT VISUAL REPORT PREVIEW</span>
              <span className="animate-pulse text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Real-time Sync
              </span>
            </div>

            {/* This whole div (with calendarRef) will be captured as an beautiful professional high-end physical statement bill card */}
            <div 
              id="print-billing-area"
              ref={calendarRef} 
              className="p-6 md:p-8 bg-white text-slate-900 rounded-[2rem] border border-slate-200 shadow-md space-y-6 text-left relative"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Inject CSS override for printing */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #print-billing-area, #print-billing-area * {
                    visibility: visible !important;
                  }
                  #print-billing-area {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                }
              `}</style>
              {/* Invoice Layout Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                <div>
                  <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider">{dairyName}</h4>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Monthly Milk Ledger Summary</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Proprietor: <span className="text-slate-800">{ownerName}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-3 py-1 rounded-lg uppercase tracking-wide">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold mt-2">ID: INV-{customer.id?.substring(0,6).toUpperCase() || 'MTRX'}</p>
                </div>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Billed To</p>
                  <p className="font-extrabold text-slate-800 uppercase mt-0.5">{customer.name}</p>
                  <p className="text-slate-500 font-bold mt-0.5">Phone: +91 {customer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Supply Profile</p>
                  <p className="font-extrabold text-slate-800 mt-0.5">
                    {getBaseQuantityForDate(customer, format(currentMonth, 'yyyy-MM-dd'))} Ltr/Day (Base)
                  </p>
                  <p className="text-slate-500 font-bold uppercase tracking-wide mt-0.5">Milk Type: {customer.milkType || 'Cow'}</p>
                </div>
              </div>

              {/* Invoice Billing and Outstanding calculation */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100/50 flex flex-col justify-between">
                  <span className="text-[8px] font-black uppercase tracking-wider text-orange-600">Month Cost</span>
                  <div className="mt-2 text-md font-black text-orange-700">₹{monthCost.toLocaleString()}</div>
                  <span className="text-[8px] text-orange-600/70 font-semibold mt-1">This month milk</span>
                </div>
                
                {customer.billingModel === 'prepaid' ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100/50 flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600">Wallet Bal</span>
                    <div className="mt-2 text-md font-black text-emerald-700">₹{(Number(customer.walletBalance) || 0).toLocaleString()}</div>
                    <span className="text-[8px] text-emerald-600/70 font-semibold mt-1">Prepaid balance</span>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100/50 flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase tracking-wider text-red-600">Total Dues</span>
                    <div className="mt-2 text-md font-black text-red-700">₹{(Number(customer.totalOutstanding) || 0).toLocaleString()}</div>
                    <span className="text-[8px] text-red-600/70 font-semibold mt-1">Overall Pending</span>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100/50 flex flex-col justify-between">
                  <span className="text-[8px] font-black uppercase tracking-wider text-blue-600">Total Liters</span>
                  <div className="mt-2 text-md font-black text-blue-800">{totalQuantity} Liters</div>
                  <span className="text-[8px] text-blue-600/70 font-semibold mt-1">C: {cowMilkQty}L • B: {buffaloMilkQty}L</span>
                </div>
              </div>

              {/* Calendar Grid Container inside invoice */}
              <div className="space-y-3">
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">MONTHLY DELIVERY CALENDAR MATRIX</p>
                
                <div className="grid grid-cols-7 gap-1.5 border-t border-slate-100 pt-3 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={`${d}-${i}`} className="text-[9px] font-black text-slate-400 uppercase">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square bg-slate-50/10" />
                  ))}
                  {days.map(day => {
                    const { delivery, payment } = getDayData(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div 
                        key={day.toString()} 
                        className={`
                          aspect-square rounded-xl flex flex-col items-center justify-center relative border transition-all duration-200
                          ${isToday ? 'border-blue-500 bg-blue-50/30' : 'border-slate-100 bg-slate-50'}
                          ${delivery ? 'bg-emerald-50 border-emerald-200 shadow-sm' : ''}
                        `}
                      >
                        <span className={`text-[10px] font-black ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                          {format(day, 'd')}
                        </span>
                        
                        {/* Liters quantity display */}
                        {delivery && (
                          <span className="text-[8px] font-extrabold text-emerald-600 scale-90 -mt-0.5 leading-none">
                            {delivery.quantity}L{(delivery.type || '').toLowerCase() === 'cow' ? 'C' : 'B'}
                          </span>
                        )}

                        <div className="flex gap-0.5 mt-0.5">
                          {delivery && (
                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          )}
                          {payment && (
                            <div className="w-1 h-1 rounded-full bg-amber-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend & Verification */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Delivery</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Payment</span>
                </div>
                <span>Thank You For Your Business!</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-100/50 dark:bg-white/5 p-2 rounded-2xl border border-slate-200/50 dark:border-white/5 mx-2">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl hover:bg-white dark:hover:bg-white/10 h-10 w-10">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </Button>
            <span className="font-extrabold text-[13px] uppercase tracking-[0.1em] text-foreground">{format(currentMonth, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl hover:bg-white dark:hover:bg-white/10 h-10 w-10">
              <ChevronRight className="w-5 h-5 text-foreground" />
            </Button>
          </div>
        </div>

        {/* Action Controls Footer of Modal */}
        <div className="p-8 bg-slate-50 dark:bg-[#09101d] border-t border-slate-100 dark:border-white/5 flex flex-col gap-3">
          <div className="flex gap-2">
            <Button 
              onClick={handleShare}
              className="flex-1 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-center cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Share Report
            </Button>
            
            <Button 
              onClick={handlePrint}
              className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-center cursor-pointer"
              title="Print PDF / Calendar"
            >
              <Printer className="w-4 h-4" /> Print PDF
            </Button>
            
            <Button 
              onClick={handleDownload}
              variant="outline"
              className="h-14 w-14 border-slate-200 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl font-black text-foreground hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
              title="Download Statement"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full h-11 text-slate-500 hover:text-red-500 hover:bg-red-500/10 dark:text-slate-400 dark:hover:text-red-400 font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all"
          >
            Cancel / Cut Statement
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
