/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  CreditCard, 
  LogOut, 
  CircleUser,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Receipt,
  FileText
} from 'lucide-react';

import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import BottomNav from './components/BottomNav';
import CameraScanner from './components/CameraScanner';
import ReceiptReview from './components/ReceiptReview';
import HouseholdManager from './components/HouseholdManager';
import StatementUploader from './components/StatementUploader';
import ReconciliationView from './components/ReconciliationView';
import { processReceiptImage, ScannedExpense, processBankStatement, StatementAnalysis } from './services/geminiService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'receipt' | 'statement'>('receipt');
  const [pendingExpense, setPendingExpense] = useState<ScannedExpense | null>(null);
  const [pendingStatement, setPendingStatement] = useState<StatementAnalysis | null>(null);
  const [isUploadingStatement, setIsUploadingStatement] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(1000);
  const [currency, setCurrency] = useState('GBP');

  // Load Bank Transactions
  useEffect(() => {
    if (!user || !userData) return;
    
    const q = query(
      collection(db, 'bank_transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBankTransactions(txs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bank_transactions'));
    return unsubscribe;
  }, [user, userData]);

  // Load Auth State and link Households
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch user preferences/budget
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        let currentHouseholdId = null;

        if (userSnap.exists()) {
          const data = userSnap.data();
          setMonthlyBudget(data.monthlyBudget || 1000);
          setCurrency(data.currency || 'GBP');
          currentHouseholdId = data.householdId;
        } else {
          // Initialize user doc
          const newUser = {
            email: u.email,
            displayName: u.displayName,
            monthlyBudget: 1000,
            currency: 'GBP',
            householdId: null
          };
          await setDoc(userRef, newUser);
        }

        // Auto-join household if invited by email
        if (!currentHouseholdId) {
          const hQuery = query(
            collection(db, 'households'),
            where('memberEmails', 'array-contains', u.email?.toLowerCase())
          );
          
          // One-time check for invites
          const unsubInvite = onSnapshot(hQuery, async (snap) => {
            if (!snap.empty) {
              const hDoc = snap.docs[0];
              const hId = hDoc.id;
              if (!hDoc.data().members.includes(u.uid)) {
                await updateDoc(doc(db, 'households', hId), {
                  members: arrayUnion(u.uid)
                });
                await updateDoc(doc(db, 'users', u.uid), { householdId: hId });
              }
            }
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'households'));
          return () => unsubInvite();
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Update userData listener
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
       setUserData(snap.data());
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));
  }, [user]);

  // Load Expenses (Shared or Private)
  useEffect(() => {
    if (!user || !userData) return;
    
    let q;
    const path = 'expenses';
    if (userData.householdId) {
      q = query(
        collection(db, path),
        where('householdId', '==', userData.householdId),
        orderBy('date', 'desc')
      );
    } else {
      q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(exps);
    }, (err) => handleFirestoreError(err, OperationType.LIST, path));
    return unsubscribe;
  }, [user, userData]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleCapture = async (imageData: string) => {
    setIsScanning(false);
    setProcessingType('receipt');
    setIsProcessing(true);
    try {
      const result = await processReceiptImage(imageData);
      
      if (!result.isReceipt) {
        alert("This doesn't look like a valid receipt. Please make sure the items and total are clear.");
        setIsProcessing(false);
        setIsScanning(true); // Re-open scanner
        return;
      }

      setPendingExpense(result);
    } catch (error) {
      console.error("Scanning failed", error);
      alert("Failed to process receipt. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveExpense = async (data: ScannedExpense) => {
    try {
      await addDoc(collection(db, 'expenses'), {
        userId: user?.uid,
        userName: user?.displayName || 'Partner',
        userPhoto: user?.photoURL,
        householdId: userData?.householdId || null,
        amount: data.amount,
        merchant: data.merchant,
        category: data.category,
        date: data.date || new Date().toISOString(),
        items: data.items || [],
        createdAt: Timestamp.now()
      });
      // Clear any pending state
      setPendingExpense(null);
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to save expense.");
    }
  };

  const saveStatement = async (analysis: StatementAnalysis) => {
    setProcessingType('statement');
    setIsProcessing(true);
    setIsUploadingStatement(false);
    try {
      const statementRef = await addDoc(collection(db, 'statements'), {
        userId: user?.uid,
        householdId: userData?.householdId || null,
        startDate: analysis.startDate || '',
        endDate: analysis.endDate || '',
        totalDebit: analysis.totalDebit || 0,
        totalCredit: analysis.totalCredit || 0,
        createdAt: Timestamp.now().toDate().toISOString()
      });

      // Save transactions and attempt auto-link
      for (const tx of analysis.transactions) {
        // Try to find a matching receipt in expenses
        const match = expenses.find(e => 
          Math.abs(parseFloat(e.amount) - tx.amount) < 0.05 && 
          tx.merchant.toLowerCase().includes(e.merchant.split(' ')[0].toLowerCase())
        );

        await addDoc(collection(db, 'bank_transactions'), {
          ...tx,
          userId: user?.uid,
          householdId: userData?.householdId || null,
          statementId: statementRef.id,
          isLinkedToReceipt: !!match,
          linkedReceiptId: match ? match.id : null
        });
      }
      setPendingStatement(null);
      setActiveTab('reconcile');
    } catch (err) {
      console.error(err);
      alert("Failed to save statement.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalSpentThisMonth = expenses
    .filter(e => {
        const date = new Date(e.date);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-blue-200">
           <Wallet className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SmartSpend AI</h1>
        <p className="text-gray-500 mb-12 max-w-xs">
          The intelligent way to track your expenses and master your budget.
        </p>
        <button
          onClick={handleGoogleLogin}
          className="w-full max-w-xs bg-white border border-gray-200 py-3 px-6 rounded-2xl flex items-center justify-center space-x-3 text-gray-700 font-medium shadow-sm active:bg-gray-50 transition-colors"
          id="google-login"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          <span>Sign in with Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden">
            {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <CircleUser className="text-blue-600" size={24} />
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Welcome back</p>
            <h2 className="text-sm font-semibold text-gray-900">{user.displayName}</h2>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500">
              <LogOut size={20} />
           </button>
        </div>
      </header>

      <main className="px-6 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Budget Card */}
              <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-blue-100 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                   <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-blue-100/80 text-xs font-medium mb-1">Total Spending (This Month)</p>
                        <h3 className="text-4xl font-bold tracking-tight">
                           {currency === 'GBP' ? '£' : '$'}
                           {totalSpentThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                      </div>
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                         <CreditCard size={24} />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                         <span className="text-blue-100">Budget Progress</span>
                         <span>{Math.round((totalSpentThisMonth / monthlyBudget) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                         <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((totalSpentThisMonth / monthlyBudget) * 100, 100)}%` }}
                            className={`h-full ${totalSpentThisMonth > monthlyBudget ? 'bg-red-400' : 'bg-white'}`}
                         />
                      </div>
                      <p className="text-[10px] text-blue-100/60 font-medium pt-1">
                        Monthly plan: {currency === 'GBP' ? '£' : '$'}{monthlyBudget}
                      </p>
                   </div>
                </div>
              </div>

              {/* Quick stats / Recent sections */}
              <section className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Recent Activity</h3>
                    <button onClick={() => setActiveTab('expenses')} className="text-blue-600 text-sm font-semibold">See all</button>
                 </div>
                 
                 <div className="space-y-3">
                    {expenses.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                           <p className="text-gray-400 text-sm">No expenses yet. Start scanning!</p>
                        </div>
                    ) : (
                        expenses.slice(0, 5).map((exp) => (
                           <motion.div 
                              key={exp.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center p-4 bg-white border border-gray-50 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative"
                           >
                              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 mr-4">
                                 <TrendingUp size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-sm truncate">{exp.merchant}</h4>
                                 <div className="flex items-center space-x-2">
                                    <p className="text-xs text-gray-400 font-medium">{exp.category}</p>
                                    {userData?.householdId && exp.userId !== user.uid && (
                                       <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-bold">
                                          {exp.userName?.split(' ')[0]}
                                       </span>
                                    )}
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="font-bold text-sm">
                                    -{currency === 'GBP' ? '£' : '$'}{parseFloat(exp.amount).toFixed(2)}
                                 </p>
                                 <p className="text-[10px] text-gray-400 font-medium">
                                    {new Date(exp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                 </p>
                              </div>
                           </motion.div>
                        ))
                    )}
                 </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'expenses' && (
             <motion.div
                key="expenses"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
             >
                <div className="flex items-center justify-between">
                   <h1 className="text-2xl font-bold">History</h1>
                   <div className="bg-gray-100 p-1 rounded-xl flex">
                      <button className="px-4 py-1 text-xs font-bold rounded-lg bg-white shadow-sm">All</button>
                      <button className="px-4 py-1 text-xs font-bold text-gray-400">Weekly</button>
                   </div>
                </div>

                <div className="space-y-3">
                   {expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl">
                         <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4">
                            <Receipt size={20} />
                         </div>
                         <div className="flex-1">
                            <h4 className="font-bold text-sm">{exp.merchant}</h4>
                            <p className="text-xs text-gray-400">{new Date(exp.date).toLocaleDateString()}</p>
                         </div>
                         <div className="text-right">
                            <p className="font-bold">-{currency === 'GBP' ? '£' : '$'}{parseFloat(exp.amount).toFixed(2)}</p>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                               {exp.category}
                            </span>
                         </div>
                      </div>
                   ))}
                </div>
             </motion.div>
          )}
          
          {activeTab === 'reconcile' && (
             <motion.div
                key="reconcile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
             >
                <div className="mb-6">
                   <button 
                      onClick={() => setIsUploadingStatement(true)}
                      className="w-full py-4 bg-white border border-gray-100 rounded-3xl flex items-center justify-center space-x-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                   >
                      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                         <FileText size={18} />
                      </div>
                      <span className="font-bold text-sm text-gray-700">Upload Bank Statement</span>
                   </button>
                </div>
                
                <ReconciliationView 
                   transactions={bankTransactions}
                   expenses={expenses}
                   currency={currency}
                />
             </motion.div>
          )}

          {activeTab === 'settings' && (
             <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
             >
                <div className="flex items-center justify-between">
                   <h1 className="text-2xl font-bold">Settings</h1>
                </div>

                <section className="space-y-4">
                   <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Collaboration</h3>
                   <HouseholdManager user={user} />
                </section>

                <section className="bg-white border border-gray-100 rounded-[2rem] p-6">
                   <h3 className="font-bold mb-4">Profile</h3>
                   <div className="flex items-center justify-between py-3 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Currency</span>
                      <span className="text-sm font-bold text-blue-600">{currency}</span>
                   </div>
                   <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-500">Account</span>
                      <span className="text-sm font-bold truncate max-w-[150px]">{user.email}</span>
                   </div>
                </section>

                <button 
                  onClick={handleLogout}
                  className="w-full py-4 text-red-500 font-bold bg-red-50 rounded-2xl active:scale-95 transition-transform"
                >
                   Sign Out
                </button>
             </motion.div>
          )}

          {activeTab === 'stats' && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <AlertCircle size={48} className="mb-4" />
                  <p className="text-lg font-bold uppercase tracking-widest">{activeTab} coming soon</p>
              </div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onScanClick={() => setIsScanning(true)} 
      />

      <AnimatePresence>
        {pendingExpense && (
          <ReceiptReview
            receipt={pendingExpense}
            onSave={saveExpense}
            onCancel={() => setPendingExpense(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScanning && (
          <CameraScanner 
            onCapture={handleCapture} 
            onClose={() => setIsScanning(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUploadingStatement && (
          <StatementUploader 
            onAnalysisComplete={saveStatement}
            onClose={() => setIsUploadingStatement(false)}
          />
        )}
      </AnimatePresence>

      {/* AI Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
             <div className="relative mb-8">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                 className="w-24 h-24 border-4 border-blue-600/10 border-t-blue-600 rounded-full"
               />
               <div className="absolute inset-0 flex items-center justify-center">
                  <Wallet className="text-blue-600" size={32} />
               </div>
             </div>
             <h2 className="text-2xl font-black text-gray-900 mb-2">
                {processingType === 'receipt' ? "Processing Receipt" : "Analyzing Statement"}
             </h2>
             <p className="text-gray-500 max-w-xs font-medium">
                {processingType === 'receipt' 
                  ? "Identifying every item, price, and category automatically..."
                  : "Cross-referencing transactions with your budget history..."}
             </p>
             
             {/* Staggered progress dots */}
             <div className="flex space-x-2 mt-8">
                {[0, 1, 2].map(i => (
                   <motion.div 
                     key={i}
                     animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                     transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                     className="w-2 h-2 bg-blue-600 rounded-full"
                   />
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
