import React from 'react';
import { ReceiptIndianRupee, Download, Share2, TrendingUp, History, Info, LogOut, Search, Calendar, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { AnimatePresence } from 'motion/react';
import { CustomerCalendar } from './CustomerCalendar';

// Mock data removed in favor of real ledger logic

import { subscribeToCustomers, logout as firebaseLogout, getAllPayments } from '../lib/data';
import { useFirebase } from './FirebaseProvider';
import { toast } from 'sonner';

export function Billing() {
  const { user } = useFirebase();
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [isLogOpen, setIsLogOpen] = React.useState(false);
  const [paymentSearch, setPaymentSearch] = React.useState('');
  const [calendarCustomer, setCalendarCustomer] = React.useState<any>(null);

  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToCustomers(user.uid, (data) => {
      setCustomers(data);
    });
    return () => unsubscribe();
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    try {
      const data = await getAllPayments(user.uid);
      const sorted = (data || []).sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setPayments(sorted);
    } catch (err) {
      console.error("Error fetching payments", err);
      toast.error("Failed to load global payment logs");
    }
  };

  const getCustomerName = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.name : 'Registered Client';
  };

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr || '';
    }
  };

  const filteredPayments = payments.filter(p => {
    const custName = getCustomerName(p.customerId).toLowerCase();
    const searchLow = paymentSearch.toLowerCase();
    return custName.includes(searchLow) || 
           (p.amount || '').toString().includes(searchLow) ||
           (p.mode || '').toLowerCase().includes(searchLow);
  });

  const totalOutstanding = customers.reduce((acc, c) => acc + (Number(c.totalOutstanding) || 0), 0);

  const handleShare = (bill: any) => {
    const text = `🥛 Milk Bill Summary\nClient Name: ${bill.name}\nOutstanding Dues: ₹${bill.due}\nStatus: PENDING PAYMENT\n\nPlease pay at your earliest convenience. Thank you!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Outstanding Due Statement',
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Bill ledger details copied to clipboard!");
    }
  };

  const handleDownloadInvoice = (bill: any) => {
    try {
      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const textContent = `
=========================================
          MILK DAIRY BILL STATEMENT
=========================================
Date Generated : ${today}
Invoice No     : INV-2024-${bill.id}
Client Name    : ${bill.name.toUpperCase()}
Status         : ${bill.status.toUpperCase()}

-----------------------------------------
LEDGER & BILL DETAILS:
-----------------------------------------
Total Amount   : ₹${bill.total.toLocaleString()}
Amount Paid    : ₹${bill.paid.toLocaleString()}
Net Outstanding: ₹${bill.due.toLocaleString()}

-----------------------------------------
Please clear your outstanding balance to
ensure uninterrupted daily milk supply.

Thank you for your business!
- Dairy Proprietor Records
=========================================
`;
      const blob = new Blob([textContent.trim()], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Milk_Bill_${bill.name.replace(/\s+/g, '_')}_INV_${bill.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate report statement");
    }
  };

  const ledger = customers
    .filter(c => (c.totalOutstanding || 0) > 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      total: c.totalOutstanding,
      paid: 0,
      due: c.totalOutstanding,
      status: 'pending'
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase italic tracking-tighter">Ledger & Dues</h2>
        
        <div className="flex items-center gap-2">
          {/* Working Transaction Log Button */}
          <Button 
            onClick={() => {
              setIsLogOpen(true);
              fetchPayments();
            }}
            variant="outline" 
            size="sm" 
            className="rounded-xl gap-2 border-slate-200 dark:border-white/10 dark:bg-[#0c1424] font-bold text-[10px] uppercase text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer"
          >
             <History className="w-4 h-4" /> Log
          </Button>

          <Button 
            onClick={async () => {
              if (confirm("Sign out of Milk Dairy?")) {
                await firebaseLogout();
                toast.success("Logged out successfully");
              }
            }}
            variant="outline" size="sm" className="rounded-xl gap-2 border-slate-200 dark:border-white/10 font-bold text-[10px] uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
          >
             <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary hover:bg-primary/90 transition-colors border-none shadow-primary/20 shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full -mr-12 -mt-12" />
           <CardContent className="p-5 space-y-1 relative">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/80">Pending Ledger</p>
              <h3 className="text-2xl font-black text-primary-foreground">₹{totalOutstanding.toLocaleString()}</h3>
           </CardContent>
        </Card>
        <Card className="bg-emerald-600 hover:bg-emerald-700 transition-colors border-none shadow-emerald-500/20 shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full -mr-12 -mt-12" />
           <CardContent className="p-5 space-y-1 relative">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Active Clients</p>
              <h3 className="text-2xl font-black text-white">{customers.length}</h3>
           </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between px-2 pt-4">
         <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Active Dues</h4>
         <Badge variant="secondary" className="rounded-xl font-bold px-3 py-1 bg-primary/10 text-primary border-none">{new Date().toLocaleDateString('en-IN', { month: 'long' })}</Badge>
      </div>

      <div className="space-y-4">
        {ledger.length === 0 && (
          <div className="py-12 text-center space-y-3 opacity-50">
            <Info className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-bold uppercase tracking-widest">No outstanding dues</p>
          </div>
        )}
        {ledger.map((bill) => (
          <Card key={bill.id} className="border border-border shadow-sm bg-card dark:bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20">
                       {bill.name.charAt(0)}
                    </div>
                    <div>
                       <h5 
                          onClick={() => {
                            const cust = customers.find(c => c.id === bill.id);
                            if (cust) setCalendarCustomer(cust);
                          }}
                          className="font-black text-sm text-foreground uppercase tracking-tight hover:text-primary flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="View Calendar Statement (कैलेंडर देखें)"
                        >
                          {bill.name} <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        </h5>
                       <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">INV-2024-{bill.id}0056</p>
                    </div>
                 </div>
                 <Badge 
                    className={cn(
                      "border-none px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest",
                      bill.status === 'paid' 
                        ? "bg-emerald-500/10 text-emerald-500" 
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                   {bill.status}
                 </Badge>
              </div>

              <div className="grid grid-cols-3 gap-6 border-y border-border py-4 mb-6">
                 <div className="space-y-1 text-center">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
                    <p className="text-base font-black text-foreground">₹{bill.total}</p>
                 </div>
                 <div className="space-y-1 text-center border-x border-border">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Paid</p>
                    <p className="text-base font-black text-emerald-500">₹{bill.paid}</p>
                 </div>
                 <div className="space-y-1 text-center">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Due</p>
                    <p className="text-base font-black text-red-500">₹{bill.due}</p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <Button 
                   onClick={() => handleDownloadInvoice(bill)}
                   className="flex-1 rounded-2xl h-11 gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border-none font-bold text-[10px] uppercase tracking-widest"
                 >
                    <Download className="w-4 h-4" /> Download
                 </Button>
                 <Button 
                   onClick={() => handleShare(bill)}
                   className="flex-1 rounded-2xl h-11 gap-2 bg-accent hover:bg-accent/90 text-white border-none font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-accent/20"
                 >
                    <Share2 className="w-4 h-4" /> Share Bill
                 </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment History Log Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#070c16] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 text-foreground">
          <DialogHeader className="pb-4 border-b border-slate-100 dark:border-white/5">
            <DialogTitle className="text-xl font-extrabold uppercase italic tracking-tight text-sky-500 flex items-center gap-2">
              <History className="w-5 h-5 text-sky-500" /> Payment Transaction Log
            </DialogTitle>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-1">Full Ledger Audit History</p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <Input
                type="text"
                placeholder="Search by customer name or amount..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="pl-9 pr-4 h-11 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 rounded-xl text-sm"
              />
            </div>

            <ScrollArea className="h-[320px] pr-2">
              {filteredPayments.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-center text-xs text-muted-foreground uppercase opacity-50 space-y-3">
                  <ShieldCheck className="w-10 h-10 text-slate-400" />
                  <p className="font-extrabold">No logged payments matched</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPayments.map((pay) => {
                    const clientName = getCustomerName(pay.customerId);
                    return (
                      <div 
                        key={pay.id} 
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between hover:scale-[1.01] transition-transform"
                      >
                        <div className="space-y-1">
                          <p className="font-extrabold text-sm uppercase tracking-tight text-foreground">{clientName}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatLogDate(pay.date)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-emerald-500 font-mono">
                            +₹{(pay.amount || 0).toLocaleString()}
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {pay.mode || 'Cash'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase">
            <span>Logged: {filteredPayments.length} records</span>
            <span>Est: ₹{filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString()} Collected</span>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {calendarCustomer && (
          <CustomerCalendar 
            customer={calendarCustomer} 
            onClose={() => setCalendarCustomer(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
