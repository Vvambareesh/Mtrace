import { ShoppingBag, Bus, Utensils, Film, Zap, ShoppingCart, HeartPulse, Plane, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryPickerProps {
  onSelect: (category: string) => void;
  onCancel: () => void;
  merchant: string;
  amount: number;
}

const CATEGORIES = [
  { name: 'Grocery', icon: ShoppingCart, color: 'bg-green-100 text-green-600' },
  { name: 'Transport', icon: Bus, color: 'bg-blue-100 text-blue-600' },
  { name: 'Dining', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { name: 'Shopping', icon: ShoppingBag, color: 'bg-purple-100 text-purple-600' },
  { name: 'Entertainment', icon: Film, color: 'bg-pink-100 text-pink-600' },
  { name: 'Utilities', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
  { name: 'Health', icon: HeartPulse, color: 'bg-red-100 text-red-600' },
  { name: 'Travel', icon: Plane, color: 'bg-cyan-100 text-cyan-600' },
];

export default function CategoryPicker({ onSelect, onCancel, merchant, amount }: CategoryPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Category Required
            </span>
            <h2 className="text-xl font-bold mt-2">Where should we put this?</h2>
            <p className="text-sm text-gray-400 mt-1">
              {merchant} • <span className="font-bold text-gray-900">{amount.toFixed(2)}</span>
            </p>
          </div>
          <button onClick={onCancel} className="p-2 bg-gray-50 rounded-full text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-8">
          {CATEGORIES.map((cat) => (
            <button
               key={cat.name}
               onClick={() => onSelect(cat.name)}
               className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all text-left"
            >
               <div className={`p-2 rounded-xl ${cat.color}`}>
                  <cat.icon size={18} />
               </div>
               <span className="text-sm font-bold text-gray-700">{cat.name}</span>
            </button>
          ))}
          <button
             className="flex items-center space-x-3 p-4 bg-blue-50/50 border border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 active:scale-95 transition-all text-left"
             onClick={() => onSelect('Other')}
          >
             <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                <Plus size={18} />
             </div>
             <span className="text-sm font-bold text-blue-600">Add New</span>
          </button>
        </div>
        
        <p className="text-[10px] text-center text-gray-400 font-medium">
          Select a category to finalize and save this expense.
        </p>
      </motion.div>
    </motion.div>
  );
}
