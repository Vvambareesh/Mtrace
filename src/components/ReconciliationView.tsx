import React from 'react';
import { motion } from 'motion/react';
import { 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Receipt, 
  Calendar,
  Search,
  ExternalLink
} from 'lucide-react';

interface ReconciliationViewProps {
  transactions: any[];
  expenses: any[];
  currency: string;
}

const ReconciliationView: React.FC<ReconciliationViewProps> = ({ transactions, expenses, currency }) => {
  const linkedTransactions = transactions.filter(t => t.isLinkedToReceipt);
  const unlinkedTransactions = transactions.filter(t => !t.isLinkedToReceipt && t.type === 'debit');

  const getReceipt = (id: string) => expenses.find(e => e.id === id);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
         <h1 className="text-2xl font-black text-gray-900">Audit & Sync</h1>
         <div className="flex space-x-2">
            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center">
               <CheckCircle2 size={12} className="mr-1" />
               {linkedTransactions.length} Verified
            </div>
            <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center">
               <AlertCircle size={12} className="mr-1" />
               {unlinkedTransactions.length} Missing
            </div>
         </div>
      </header>

      {/* Missing Receipts Section */}
      <section className="space-y-4">
         <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Missing Receipts</h3>
            <span className="text-[10px] font-bold text-gray-300">NEEDS ATTENTION</span>
         </div>

         {unlinkedTransactions.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
               <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={32} />
               <p className="text-gray-500 font-medium italic">Everything is reconciled!</p>
            </div>
         ) : (
            <div className="space-y-3">
               {unlinkedTransactions.map((tx) => (
                  <motion.div 
                     key={tx.id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="p-5 bg-white border border-amber-100 rounded-3xl shadow-sm relative overflow-hidden"
                  >
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />
                     <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-4">
                           <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                              <Calendar size={20} />
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-900">{tx.merchant}</h4>
                              <p className="text-xs text-gray-400 font-medium">{new Date(tx.date).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-amber-600 text-lg">
                              -{currency === 'GBP' ? '£' : '$'}{tx.amount.toFixed(2)}
                           </p>
                           <button className="mt-2 flex items-center text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">
                              Locate Receipt <ArrowRight size={10} className="ml-1" />
                           </button>
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
         )}
      </section>

      {/* Verified Section */}
      <section className="space-y-4 pt-4">
         <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Linked to Bills</h3>
            <span className="text-[10px] font-bold text-gray-300">AUTO-MATCHED</span>
         </div>

         <div className="space-y-3">
            {linkedTransactions.map((tx) => {
               const receipt = getReceipt(tx.linkedReceiptId);
               return (
                  <div 
                     key={tx.id}
                     className="p-5 bg-gray-50/50 border border-gray-100 rounded-3xl"
                  >
                     <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <CheckCircle2 size={16} />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Statement Record</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm">
                           -{currency === 'GBP' ? '£' : '$'}{tx.amount.toFixed(2)}
                        </p>
                     </div>

                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                           <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                              <Receipt size={18} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Matched Bill</p>
                              <h4 className="font-bold text-sm text-gray-900">{receipt?.merchant || tx.merchant}</h4>
                           </div>
                        </div>
                        <button className="p-2 text-gray-300 hover:text-blue-600 transition-colors">
                           <ExternalLink size={16} />
                        </button>
                     </div>
                  </div>
               );
            })}
         </div>
      </section>
    </div>
  );
};

export default ReconciliationView;
