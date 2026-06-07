import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  
  // If we're truly offline, this error message helps diagnose it
  if (errInfo.error.includes("offline")) {
     console.error("Firestore client is offline. Check if getFirestore(app, databaseId) is correctly called.");
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// AUTH
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Auth error", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// BUSINESS PROFILE
export const getBusinessProfile = async (userId: string) => {
  const path = `profiles/${userId}`;
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const saveBusinessProfile = async (userId: string, profile: any) => {
  const path = `profiles/${userId}`;
  try {
    await setDoc(doc(db, path), { ...profile, userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// CUSTOMERS
export const getCustomers = async (userId: string) => {
  const path = 'customers';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const addCustomer = async (userId: string, customer: any) => {
  const path = 'customers';
  try {
    const docRef = doc(collection(db, path));
    const data = {
      ...customer,
      userId,
      id: docRef.id,
      totalOutstanding: Number(customer.totalOutstanding || customer.total_outstanding || 0),
      walletBalance: Number(customer.walletBalance || 0),
      billingModel: customer.billingModel || 'postpaid',
      totalPaid: Number(customer.totalPaid || 0),
      dailyQuantity: Number(customer.dailyQuantity || 1),
      isActive: customer.isActive !== undefined ? customer.isActive : true,
      lastUpdated: new Date().toISOString()
    };
    // Remove old field if present in source object to avoid confusion
    if ((data as any).total_outstanding) delete (data as any).total_outstanding;
    
    await setDoc(docRef, data);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

// LIVESTREAM CUSTOMERS
export const subscribeToCustomers = (userId: string, callback: (data: any[]) => void) => {
  const path = 'customers';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    // Log error instead of throwing to avoid unhandled exception in listener
    console.error('Firestore subscription error:', error);
  });
};

export const updateCustomer = async (userId: string, customerId: string, updates: any) => {
  const path = `customers/${customerId}`;
  try {
    const docRef = doc(db, 'customers', customerId);
    
    // Ensure numeric types
    const cleanUpdates = { ...updates };
    if (updates.totalOutstanding !== undefined) cleanUpdates.totalOutstanding = Number(updates.totalOutstanding);
    if (updates.dailyQuantity !== undefined) cleanUpdates.dailyQuantity = Number(updates.dailyQuantity);
    
    await updateDoc(docRef, {
      ...cleanUpdates,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteCustomer = async (userId: string, customerId: string) => {
  const path = `customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const recordPayment = async (userId: string, customerId: string, amount: number) => {
  const path = `customers/${customerId}`;
  try {
    const docRef = doc(db, 'customers', customerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const current = Number(data.totalOutstanding || data.total_outstanding || 0);
      const currentWallet = Number(data.walletBalance || 0);
      const totalPaid = Number(data.totalPaid || 0);
      const amountNum = Number(amount);
      
      const updates: any = {
        totalPaid: totalPaid + amountNum,
        lastPayment: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      if (data.billingModel === 'prepaid') {
        updates.walletBalance = currentWallet + amountNum;
      } else {
        updates.totalOutstanding = current - amountNum;
      }
      
      await updateDoc(docRef, updates);
      
      // Also record in payments collection
      await addDoc(collection(db, 'payments'), {
        userId,
        customerId,
        amount: amountNum,
        date: new Date().toISOString(),
        mode: 'cash'
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const getMilkPrices = async (userId: string) => {
  const q = query(collection(db, 'milk_prices'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveMilkPrice = async (userId: string, price: any) => {
  const val = Number(price.pricePerLiter);
  if (price.id) {
    await updateDoc(doc(db, 'milk_prices', price.id), {
      pricePerLiter: val,
      effectiveDate: new Date().toISOString().split('T')[0]
    });
  } else {
    await addDoc(collection(db, 'milk_prices'), {
      userId,
      type: price.type,
      pricePerLiter: val,
      effectiveDate: new Date().toISOString().split('T')[0]
    });
  }
};

export const deleteMilkPrice = async (priceId: string) => {
  await deleteDoc(doc(db, 'milk_prices', priceId));
};

export const recordDelivery = async (userId: string, delivery: any) => {
  // Simplified logic to avoid index issues
  await addDoc(collection(db, 'deliveries'), {
    ...delivery,
    userId,
    delivered: true,
    quantity: Number(delivery.quantity),
    priceAtTime: Number(delivery.priceAtTime)
  });
};

export const getTodaysDeliveries = async (userId: string, date: string) => {
  const q = query(
    collection(db, 'deliveries'),
    where('userId', '==', userId),
    where('date', '==', date)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'deliveries');
    return [];
  }
};

export const getCustomerDeliveries = async (userId: string, customerId: string) => {
  const q = query(
    collection(db, 'deliveries'),
    where('userId', '==', userId),
    where('customerId', '==', customerId)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'deliveries');
  }
};

export const getCustomerPayments = async (userId: string, customerId: string) => {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    where('customerId', '==', customerId)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'payments');
  }
};

export const getAllPayments = async (userId: string) => {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'payments');
  }
};

export const resetAllUserData = async (userId: string) => {
  try {
    const custQ = query(collection(db, 'customers'), where('userId', '==', userId));
    const delivQ = query(collection(db, 'deliveries'), where('userId', '==', userId));
    const payQ = query(collection(db, 'payments'), where('userId', '==', userId));

    const [custSnap, delivSnap, paySnap] = await Promise.all([
      getDocs(custQ),
      getDocs(delivQ),
      getDocs(payQ)
    ]);

    const deletePromises: Promise<void>[] = [];
    custSnap.forEach(docSnap => deletePromises.push(deleteDoc(docSnap.ref)));
    delivSnap.forEach(docSnap => deletePromises.push(deleteDoc(docSnap.ref)));
    paySnap.forEach(docSnap => deletePromises.push(deleteDoc(docSnap.ref)));

    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'customers_deliveries_payments_reset');
  }
};

export const cleanupOldData = async (userId: string) => {
  const fiveMonthsAgo = new Date();
  fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
  const cutoffDate = fiveMonthsAgo.toISOString();

  // Cleanup deliveries
  const delivQ = query(
    collection(db, 'deliveries'),
    where('userId', '==', userId),
    where('date', '<', cutoffDate.split('T')[0])
  );
  
  // Cleanup payments
  const payQ = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    where('date', '<', cutoffDate)
  );

  try {
    const [delivSnap, paySnap] = await Promise.all([getDocs(delivQ), getDocs(payQ)]);
    
    const deletePromises: Promise<void>[] = [];
    delivSnap.forEach(snapDoc => deletePromises.push(deleteDoc(snapDoc.ref)));
    paySnap.forEach(snapDoc => deletePromises.push(deleteDoc(snapDoc.ref)));
    
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} old records`);
  } catch (error) {
    console.error("Cleanup failed", error);
  }
};
