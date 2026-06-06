import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Edit3,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { useFirebase } from './FirebaseProvider';
import { getMilkPrices, saveMilkPrice, deleteMilkPrice } from '../lib/data';
import { toast } from 'sonner';

interface MilkPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MilkPriceModal({ open, onOpenChange }: MilkPriceModalProps) {
  const { user } = useFirebase();
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ type: '', pricePerLiter: '' });

  useEffect(() => {
    if (open && user) {
      loadPrices();
    }
  }, [open, user]);

  const loadPrices = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMilkPrices(user.uid);
      setPrices(data);
    } catch (e) {
      toast.error("Failed to load prices");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!editForm.type || !editForm.pricePerLiter) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      await saveMilkPrice(user.uid, {
        id: isEditing === 'new' ? undefined : isEditing,
        type: editForm.type,
        pricePerLiter: Number(editForm.pricePerLiter)
      });
      toast.success("Price saved successfully");
      setIsEditing(null);
      setEditForm({ type: '', pricePerLiter: '' });
      loadPrices();
    } catch (e) {
      toast.error("Failed to save price");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteMilkPrice(id);
      toast.success("Price deleted");
      loadPrices();
    } catch (e) {
      toast.error("Failed to delete price");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (price: any) => {
    setIsEditing(price.id);
    setEditForm({ type: price.type, pricePerLiter: price.pricePerLiter.toString() });
  };

  const startNew = () => {
    setIsEditing('new');
    setEditForm({ type: 'Cow', pricePerLiter: '40' });
  };

  const quickAddCowMilk = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await saveMilkPrice(user.uid, {
        type: 'Cow',
        pricePerLiter: 40
      });
      toast.success("Cow Milk price set to ₹40");
      loadPrices();
    } catch (e) {
      toast.error("Failed to add price");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#0B1220] border-none rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold dark:text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                 🥛
              </span>
              Milk Prices
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isEditing && (
            <Card className="p-4 border-emerald-500/50 bg-emerald-500/5 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Milk Variety</label>
                <Input 
                  placeholder="Ex: Cow" 
                  value={editForm.type}
                  onChange={(e) => setEditForm(f => ({ ...f, type: e.target.value }))}
                  className="rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Price per Liter (₹)</label>
                <Input 
                  type="number"
                  placeholder="Ex: 60" 
                  value={editForm.pricePerLiter}
                  onChange={(e) => setEditForm(f => ({ ...f, pricePerLiter: e.target.value }))}
                  className="rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 rounded-xl">
                  {loading ? "Saving..." : "Confirm"}
                </Button>
                <Button onClick={() => setIsEditing(null)} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
              </div>
            </Card>
          )}

          {!loading && prices.length === 0 && !isEditing && (
            <div className="text-center py-8 space-y-4">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">No prices set yet.</p>
                <p className="text-[10px] text-slate-400">Add Cow Milk price to start recording deliveries</p>
              </div>
              <Button 
                onClick={quickAddCowMilk} 
                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl px-6 h-10 font-bold text-xs uppercase tracking-wider"
              >
                🥛 Set Cow Milk ₹40
              </Button>
            </div>
          )}

          {prices.map((price) => (
            <div key={price.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                   🐄
                 </div>
                 <div>
                    <h4 className="font-bold text-sm dark:text-white uppercase">{price.type}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Effective: {price.effectiveDate}</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-xs font-bold text-emerald-500">₹{price.pricePerLiter} / Ltr</p>
                 </div>
                 <div className="flex gap-1">
                    <Button onClick={() => startEdit(price)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-500">
                       <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => handleDelete(price.id)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500">
                       <Trash2 className="w-4 h-4" />
                    </Button>
                 </div>
              </div>
            </div>
          ))}
        </div>

        {!isEditing && (
          <div className="grid grid-cols-1 gap-3 mt-4">
            <Button onClick={startNew} variant="outline" className="rounded-xl h-12 border-slate-200 dark:border-slate-800 gap-2">
              <Plus className="w-4 h-4" /> New Price
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
