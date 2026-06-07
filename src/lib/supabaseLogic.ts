import { supabase } from './supabase';

// Guard: ensure supabase client is available before any operation
const ensureSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  return supabase;
};

// Helper to handle errors
const handleError = (error: any) => {
  console.error('Supabase Error:', error);
  throw error;
};

// Profiles
export const getBusinessProfile = async (userId: string) => {
  const db = ensureSupabase();
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') handleError(error);
  if (!data) return null;
  
  return {
    ...data,
    dairyName: data.dairy_name,
    ownerName: data.owner_name
  };
};

export const saveBusinessProfile = async (userId: string, profile: any) => {
  const db = ensureSupabase();
  const { error } = await db
    .from('profiles')
    .upsert({ 
      user_id: userId,
      dairy_name: profile.dairyName,
      owner_name: profile.ownerName,
      phone: profile.phone,
      address: profile.address
    }, { onConflict: 'user_id' });
  
  if (error) handleError(error);
};

// Customers
export const getCustomers = async (userId: string) => {
  const db = ensureSupabase();
  const { data, error } = await db
    .from('customers')
    .select('*')
    .eq('user_id', userId);
  
  if (error) handleError(error);
  
  // Map back to camelCase for frontend
  return (data || []).map(c => ({
    ...c,
    dailyQuantity: c.daily_quantity,
    milkType: c.milk_type,
    deliverySchedule: c.delivery_schedule,
    isActive: c.is_active,
    totalOutstanding: c.total_outstanding,
    startDate: c.start_date
  }));
};

export const subscribeToCustomers = (userId: string, callback: (data: any[]) => void) => {
  const db = ensureSupabase();
  const fetchAndMap = async () => {
    const { data } = await db
      .from('customers')
      .select('*')
      .eq('user_id', userId);
    
    if (data) {
      callback(data.map(c => ({
        ...c,
        dailyQuantity: c.daily_quantity,
        milkType: c.milk_type,
        deliverySchedule: c.delivery_schedule,
        isActive: c.is_active,
        totalOutstanding: c.total_outstanding,
        startDate: c.start_date
      })));
    }
  };

  // Initial fetch
  fetchAndMap();

  // Subscription
  const channel = db
    .channel('customers_db_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customers', filter: `user_id=eq.${userId}` },
      () => fetchAndMap()
    )
    .subscribe();

  return () => {
    db.removeChannel(channel);
  };
};

export const addCustomer = async (userId: string, customer: any) => {
  const db = ensureSupabase();
  const { data, error } = await db
    .from('customers')
    .insert([{ 
      user_id: userId,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      daily_quantity: customer.dailyQuantity,
      milk_type: customer.milkType,
      delivery_schedule: customer.deliverySchedule,
      is_active: true,
      total_outstanding: 0,
      start_date: new Date().toISOString().split('T')[0]
    }])
    .select()
    .single();
  
  if (error) handleError(error);
  return data.id;
};

export const updateCustomer = async (userId: string, customerId: string, updates: any) => {
  const db = ensureSupabase();
  const { error } = await db
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .eq('user_id', userId);
  
  if (error) handleError(error);
};

export const deleteCustomer = async (userId: string, customerId: string) => {
  const db = ensureSupabase();
  const { error } = await db
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('user_id', userId);
  
  if (error) handleError(error);
};

export const recordPayment = async (userId: string, customerId: string, amount: number) => {
  const db = ensureSupabase();
  // 1. Get current customer
  const { data: customer, error: fetchError } = await db
    .from('customers')
    .select('total_outstanding')
    .eq('id', customerId)
    .eq('user_id', userId)
    .single();

  if (fetchError) handleError(fetchError);

  // 2. Update outstanding balance
  const nextOutstanding = (customer.total_outstanding || 0) - amount;
  
  const { error: updateError } = await db
    .from('customers')
    .update({ 
      total_outstanding: nextOutstanding,
    })
    .eq('id', customerId)
    .eq('user_id', userId);

  if (updateError) handleError(updateError);

  // 3. Record in payments table
  const { error: paymentError } = await db
    .from('payments')
    .insert([{
      user_id: userId,
      customer_id: customerId,
      amount,
      date: new Date().toISOString(),
      mode: 'Cash'
    }]);

  if (paymentError) handleError(paymentError);
};

export const getMilkPrices = async (userId: string) => {
  const db = ensureSupabase();
  const { data, error } = await db
    .from('milk_prices')
    .select('*')
    .eq('user_id', userId);
  
  if (error) handleError(error);
  return (data || []).map(p => ({
    id: p.id,
    type: p.type,
    pricePerLiter: p.price_per_liter,
    effectiveDate: p.effective_date
  }));
};

export const saveMilkPrice = async (userId: string, price: any) => {
  const db = ensureSupabase();
  const { error } = await db
    .from('milk_prices')
    .upsert({
      id: price.id || undefined,
      user_id: userId,
      type: price.type,
      price_per_liter: price.pricePerLiter,
      effective_date: new Date().toISOString().split('T')[0]
    });
  
  if (error) handleError(error);
};

export const deleteMilkPrice = async (priceId: string) => {
  const db = ensureSupabase();
  const { error } = await db
    .from('milk_prices')
    .delete()
    .eq('id', priceId);
  
  if (error) handleError(error);
};

export const recordDelivery = async (userId: string, delivery: any) => {
  const db = ensureSupabase();
  // Check if already delivered
  const { data: existing, error: checkError } = await db
    .from('deliveries')
    .select('id')
    .eq('user_id', userId)
    .eq('customer_id', delivery.customerId)
    .eq('date', delivery.date)
    .maybeSingle();

  if (checkError) handleError(checkError);
  if (existing) throw new Error("Already delivered today");

  const { error } = await db
    .from('deliveries')
    .insert([{
      user_id: userId,
      customer_id: delivery.customerId,
      date: delivery.date,
      quantity: delivery.quantity,
      price_at_time: delivery.priceAtTime,
      delivered: true
    }]);
  
  if (error) handleError(error);
};

export const getTodaysDeliveries = async (userId: string, date: string) => {
  const db = ensureSupabase();
  const { data, error } = await db
    .from('deliveries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);
  
  if (error) handleError(error);
  return (data || []).map(d => ({
    id: d.id,
    customerId: d.customer_id,
    date: d.date,
    quantity: d.quantity,
    priceAtTime: d.price_at_time,
    time: d.time,
    type: d.type,
    delivered: d.delivered
  }));
};

export const getCustomerDeliveries = async (userId: string, customerId: string) => {
  const db = ensureSupabase();
  const { data, error } = await db
    .from('deliveries')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId);
  
  if (error) handleError(error);
  return (data || []).map(d => ({
    id: d.id,
    userId: d.user_id,
    customerId: d.customer_id,
    date: d.date,
    quantity: d.quantity,
    priceAtTime: d.price_at_time,
    time: d.time,
    type: d.type,
    delivered: d.delivered
  }));
};

export const getCustomerPayments = async (userId: string, customerId: string) => {
  const db = ensureSupabase();
  const { data, error } = await db
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId);
  
  if (error) handleError(error);
  return (data || []).map(p => ({
    id: p.id,
    userId: p.user_id,
    customerId: p.customer_id,
    amount: p.amount,
    date: p.date,
    mode: p.mode
  }));
};

export const getAllPayments = async (userId: string) => {
  const db = ensureSupabase();
  const { data, error } = await db
    .from('payments')
    .select('*')
    .eq('user_id', userId);
  
  if (error) handleError(error);
  return (data || []).map(p => ({
    id: p.id,
    userId: p.user_id,
    customerId: p.customer_id,
    amount: p.amount,
    date: p.date,
    mode: p.mode
  }));
};

export const resetAllUserData = async (userId: string) => {
  const db = ensureSupabase();
  const { error: paymentsError } = await db
    .from('payments')
    .delete()
    .eq('user_id', userId);
  if (paymentsError) handleError(paymentsError);

  const { error: deliveriesError } = await db
    .from('deliveries')
    .delete()
    .eq('user_id', userId);
  if (deliveriesError) handleError(deliveriesError);

  const { error: customersError } = await db
    .from('customers')
    .delete()
    .eq('user_id', userId);
  if (customersError) handleError(customersError);
};

export const cleanupOldData = async (userId: string) => {
  const db = ensureSupabase();
  const fiveMonthsAgo = new Date();
  fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
  const cutoffDate = fiveMonthsAgo.toISOString();
  const dateOnly = cutoffDate.split('T')[0];

  const { error: deliveryError } = await db
    .from('deliveries')
    .delete()
    .eq('user_id', userId)
    .lt('date', dateOnly);
  if (deliveryError) handleError(deliveryError);

  const { error: paymentError } = await db
    .from('payments')
    .delete()
    .eq('user_id', userId)
    .lt('date', cutoffDate);
  if (paymentError) handleError(paymentError);
};
