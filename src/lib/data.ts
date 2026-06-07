// This file handles the data layer, prioritizing Supabase.
// Auth is now fully handled by Supabase Auth.

import * as supabaseLogic from './supabaseLogic';
import { supabase } from './supabase';

// Always use Supabase for data when configured, fallback to supabaseLogic anyway
const isSupabaseConfigured = !!supabase;
const dataLayer = isSupabaseConfigured ? supabaseLogic : supabaseLogic; // Always use Supabase now

console.log(`[DataLayer] Active database provider: ${isSupabaseConfigured ? 'Supabase' : 'Supabase (not configured - will error)'}`);

export const getBusinessProfile = dataLayer.getBusinessProfile;
export const saveBusinessProfile = dataLayer.saveBusinessProfile;
export const getCustomers = dataLayer.getCustomers;
export const addCustomer = dataLayer.addCustomer;
export const updateCustomer = dataLayer.updateCustomer;
export const deleteCustomer = dataLayer.deleteCustomer;
export const recordPayment = dataLayer.recordPayment;
export const getMilkPrices = dataLayer.getMilkPrices;
export const saveMilkPrice = dataLayer.saveMilkPrice;
export const deleteMilkPrice = dataLayer.deleteMilkPrice;
export const recordDelivery = dataLayer.recordDelivery;
export const getTodaysDeliveries = dataLayer.getTodaysDeliveries;
export const getCustomerDeliveries = dataLayer.getCustomerDeliveries;
export const getCustomerPayments = dataLayer.getCustomerPayments;
export const getAllPayments = dataLayer.getAllPayments;
export const resetAllUserData = dataLayer.resetAllUserData;
export const cleanupOldData = dataLayer.cleanupOldData;
export const subscribeToCustomers = dataLayer.subscribeToCustomers;

// Auth functions - Supabase based
export const loginWithGoogle = async () => {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
