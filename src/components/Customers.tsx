import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  Phone, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Users,
  Loader2
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { useStore } from '../types';
import { useFirebase } from './FirebaseProvider';
import { subscribeToCustomers, recordPayment, deleteCustomer } from '../lib/data';
import { AddCustomerModal } from './AddCustomerModal';
import { getBaseQuantityForDate } from '../lib/quantityHelper';
import { EditCustomerModal } from './EditCustomerModal';
import { CustomerCalendar } from './CustomerCalendar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog';

export function Customers() {
  const { user, profile } = useFirebase();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [calendarCustomer, setCalendarCustomer] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [msgLang, setMsgLang] = useState<'en' | 'hi' | 'both'>('hi');

  const [paymentModal, setPaymentModal] = useState<{open: boolean, customerId: string, name: string}>({
    open: false,
    customerId: '',
    name: ''
  });
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToCustomers(user.uid, (data) => {
      setCustomers(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleWhatsApp = (phone: string, name: string, due: number) => {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    let message = '';
    const dairyName = profile?.dairyName || 'Milk Dairy';
    
    if (msgLang === 'en') {
      message = `*🥛 ${dairyName.toUpperCase()} • Daily Delivery Update*\n\nHello *${name}*,\nYour milk supply for today (*${today}*) was successfully delivered. \n\n*Outstanding Dues:* ₹${due}\n\nKindly make your balance payment at your earliest convenience to maintain active service supply.\n\nThank you for choosing us!\n*Regards, ${profile?.ownerName || 'Dairy Admin'}*`;
    } else if (msgLang === 'hi') {
      message = `*🥛 ${dairyName} • दूध वितरण पुष्टिकरण*\n\nनमस्ते *${name}*,\nआज (*${today}*) की दूध की डिलीवरी सफलतापूर्वक की जा चुकी है। \n\n*कुल बकाया शुल्क:* ₹${due}\n\nसुचारू रूप से सेवा सुचारू रखने के लिए कृपया बकाया का भुगतान जल्द करें।\n\nहमारे साथ जुड़े रहने के लिए धन्यवाद!\n*सादर, ${profile?.ownerName || 'डेयरी रिकॉर्ड्स'}*`;
    } else {
      message = `*🥛 ${dairyName} • Delivery Alert / अपडेट*\n\nHello *${name}*,\nYour supply for *${today}* has been delivered.\n\n*Total Dues / कुल बकाया:* ₹${due}\n\nPlease pay soon. / कृपया सुचारू सेवाओं हेतु जल्द भुगतान करें।\n\nThank you! / धन्यवाद!\n*Regards, ${profile?.ownerName || dairyName}*`;
    }
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/91${phone}?text=${encoded}`, '_blank');
  };

  const handleAddPayment = async () => {
    const amount = Number(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!user) return;
    setIsProcessing(true);
    try {
      await recordPayment(user.uid, paymentModal.customerId, amount);
      toast.success(`Payment of ₹${amount} recorded for ${paymentModal.name}`);
      setPaymentModal({ open: false, customerId: '', name: '' });
      setPaymentAmount('');
    } catch (e) {
      toast.error("Failed to record payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // Skipping window.confirm as it is often blocked in iframes
    if (!user) return;
    try {
      await deleteCustomer(user.uid, id);
      toast.success(`${name} removed`);
    } catch (e) {
      toast.error("Failed to delete customer");
    }
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.phone || '').includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Customers</h2>
        <Badge variant="outline" className="px-3 py-1 rounded-full border-emerald-500/20 text-emerald-500 bg-emerald-500/5">
          {filteredCustomers.length} Total
        </Badge>
      </div>

      <div className="relative p-[1.5px] rounded-2xl overflow-hidden gemini-glow-border shadow-md">
        <div className="relative bg-white dark:bg-[#060B13] rounded-[15px] flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <Input 
            placeholder="Search customers..." 
            className="pl-12 h-12 bg-transparent border-none rounded-xl text-foreground w-full focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredCustomers.length === 0 && (
          <div className="py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-10 h-10 text-slate-300" />
             </div>
             <p className="text-slate-500">No customers found. Click + to add one.</p>
          </div>
        )}
        
        {filteredCustomers.map((customer) => {
          const isExpanded = expandedId === customer.id;
          
          return (
            <Card key={customer.id} className="border border-border shadow-sm overflow-hidden bg-card dark:bg-card">
              <CardContent className="p-0">
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground truncate max-w-[150px]">{customer.name}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {customer.billingModel === 'prepaid' ? (
                      <>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Wallet</span>
                        <span className={cn(
                          "text-sm font-black",
                          (customer.walletBalance || 0) <= 0 ? "text-red-500" : (customer.walletBalance || 0) <= 150 ? "text-amber-500" : "text-emerald-500"
                        )}>
                          ₹{customer.walletBalance || 0}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Due</span>
                        <span className="text-sm font-black text-red-500">₹{customer.totalOutstanding || 0}</span>
                      </>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-border space-y-6 bg-slate-50/30 dark:bg-slate-900/40">
                    <div className="grid grid-cols-2 gap-6 pt-5">
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Address</p>
                        <div className="flex items-start gap-2 text-xs font-medium dark:text-slate-300 leading-relaxed">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                          <span>{customer.address}</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Subscription</p>
                        <p className="text-xs font-bold text-foreground uppercase">{customer.milkType} Milk</p>
                        <p className="text-[10px] text-primary uppercase font-bold tracking-tighter">
                          {getBaseQuantityForDate(customer, new Date().toISOString().split('T')[0])} Ltr • {customer.deliverySchedule}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="flex flex-col gap-1 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-border cursor-pointer hover:border-primary transition-colors"
                            onClick={() => setCalendarCustomer(customer)}>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tight">Delivery</span>
                            <Calendar className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-xs font-black text-primary">View Calendar</span>
                       </div>
                       <div className="flex flex-col gap-1 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-border">
                          {customer.billingModel === 'prepaid' ? (
                            <>
                              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tight">Wallet Balance</span>
                              <span className={cn(
                                "text-xs font-black",
                                (customer.walletBalance || 0) <= 0 ? "text-red-500" : (customer.walletBalance || 0) <= 150 ? "text-amber-500" : "text-emerald-500"
                              )}>
                                ₹{customer.walletBalance || 0}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tight">Debt</span>
                              <span className="text-xs font-black text-red-500">₹{customer.totalOutstanding || 0}</span>
                            </>
                          )}
                       </div>
                    </div>

                    <div className="flex items-center justify-around p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-border">
                       {(['hi', 'en', 'both'] as const).map((l) => (
                         <button 
                           key={l}
                           onClick={() => setMsgLang(l)}
                           className={cn(
                             "px-4 py-1 text-[10px] font-black uppercase rounded-lg transition-all",
                             msgLang === l ? "bg-white dark:bg-slate-800 shadow-sm text-primary" : "text-muted-foreground opacity-50"
                           )}
                         >
                           {l === 'hi' ? 'Hindi' : l === 'en' ? 'English' : 'Bilingual'}
                         </button>
                       ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={() => handleEdit(customer)}
                        variant="outline"
                        className="bg-white dark:bg-slate-900 border-border rounded-2xl h-11 gap-2 font-bold text-xs uppercase tracking-wider"
                      >
                         <Edit2 className="w-4 h-4 text-primary" /> Edit info
                      </Button>
                      <Button 
                        onClick={() => handleWhatsApp(customer.phone, customer.name, customer.totalOutstanding || 0)}
                        variant="outline" className="border-border rounded-2xl h-11 gap-2 font-bold text-xs uppercase tracking-wider bg-emerald-500/5 hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-500 group-hover:text-white" /> WhatsApp
                      </Button>
                    </div>

                    <Button 
                      disabled={isProcessing}
                      onClick={() => setPaymentModal({ open: true, customerId: customer.id, name: customer.name })}
                      className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl gap-2 font-bold text-xs uppercase tracking-wider mt-3"
                    >
                      <CreditCard className="w-4 h-4" /> Add Payment
                    </Button>


                    <Button 
                      onClick={() => handleDelete(customer.id, customer.name)}
                      variant="ghost" 
                      className="w-full h-10 mt-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Customer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center p-0"
      >
        <Plus className="w-8 h-8" />
      </Button>

      <Dialog open={paymentModal.open} onOpenChange={(open) => setPaymentModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0B1220] border-none rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight italic">Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Customer</p>
              <h4 className="text-lg font-black text-foreground uppercase">{paymentModal.name}</h4>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Amount Received (₹)</label>
              <Input 
                 type="number"
                 placeholder="0.00"
                 value={paymentAmount}
                 onChange={(e) => setPaymentAmount(e.target.value)}
                 className="h-14 rounded-2xl border-border bg-slate-50 dark:bg-slate-900/50 text-xl font-black text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAddPayment} 
              disabled={isProcessing}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-emerald-500/20"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCustomerModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <EditCustomerModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} customer={selectedCustomer} />
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
