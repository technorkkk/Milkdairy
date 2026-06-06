// This file handles the data layer, prioritizing Supabase as requested by the user.
// It still uses Firebase Auth for authentication.

import * as firebaseLogic from './firebaseLogic';
import * as supabaseLogic from './supabaseLogic';
import { supabase } from './supabase';

// Switch database based on environment configuration
const isSupabaseConfigured = !!supabase;
const dataLayer = isSupabaseConfigured ? supabaseLogic : firebaseLogic;

console.log(`[DataLayer] Active database provider: ${isSupabaseConfigured ? 'Supabase' : 'Firebase'}`);

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

export { loginWithGoogle, logout } from './firebaseLogic';

