import { useState } from 'react';
import { Check, X, Tag, Apple, Salad, Trash2, Save, ShoppingBag, ShoppingCart, Bus, Utensils, Film, Zap, HeartPulse, Plane, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScannedExpense, ReceiptItem } from '../services/geminiService';

interface ReceiptReviewProps {
  receipt: ScannedExpense;
  onSave: (finalReceipt: ScannedExpense) => void;
  onCancel: () => void;
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

export default function ReceiptReview({ receipt, onSave, onCancel }: ReceiptReviewProps) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(receipt.items.map((_, i) => i))
  );
  const [items, setItems] = useState<ReceiptItem[]>(receipt.items);
  const [overallCategory, setOverallCategory] = useState(receipt.category);

  const toggleItem = (index: number) => {
    const next = new Set(selectedItems);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedItems(next);
  };

  const removeItem = (index: number) => {
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
    
    const nextSelected = new Set<number>();
    selectedItems.forEach(i => {
        if (i < index) nextSelected.add(i);
        if (i > index) nextSelected.add(i - 1);
    });
    setSelectedItems(nextSelected);
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    setItems(nextItems);
  };

  const personalTotal = items
    .filter((_, i) => selectedItems.has(i))
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  // Group items by category
  const groupedItems: Record<string, (ReceiptItem & { originalIndex: number })[]> = items.reduce((acc, item, index) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...item, originalIndex: index });
    return acc;
  }, {} as Record<string, (ReceiptItem & { originalIndex: number })[]>);

  const handleSave = () => {
    const finalItems = items
      .filter((_, i) => selectedItems.has(i))
      .map(item => ({ ...item, price: Number(item.price) || 0 }));
      
    onSave({
      ...receipt,
      category: overallCategory,
      items: finalItems,
      amount: personalTotal
    });
  };

  const getCategoryIcon = (category?: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('fruit')) return <Apple size={14} className="text-red-500" />;
    if (cat.includes('veg')) return <Salad size={14} className="text-emerald-500" />;
    if (cat.includes('alcohol') || cat.includes('drink')) return <Tag size={14} className="text-purple-500" />;
    if (cat.includes('meat') || cat.includes('dairy')) return <Tag size={14} className="text-orange-500" />;
    return <Tag size={14} className="text-blue-500" />;
  };

  const getCategoryColor = (category?: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('fruit')) return 'bg-red-50 border-red-100';
    if (cat.includes('veg')) return 'bg-emerald-50 border-emerald-100';
    if (cat.includes('drink') || cat.includes('alcohol')) return 'bg-purple-50 border-purple-100';
    return 'bg-gray-50 border-gray-100';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-[#FDFDFD] flex flex-col pt-safe pb-safe"
    >
      <header className="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold">Review Receipt</h2>
          <p className="text-xs text-gray-400 font-medium">{receipt.merchant} • {new Date(receipt.date).toLocaleDateString()}</p>
        </div>
        <button onClick={onCancel} className="p-2 text-gray-400">
          <X size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-10">
        {/* Overall Category Selection if "Other" or unknown */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Main Category</h3>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setOverallCategory(cat.name)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border ${
                  overallCategory === cat.name 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                    : 'bg-white border-gray-100 text-gray-400'
                }`}
              >
                <cat.icon size={20} />
                <span className="text-[8px] font-bold mt-2 uppercase tracking-tighter">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Personal Items</h3>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
              {selectedItems.size} of {items.length} Selected
            </span>
          </div>

          <div className="space-y-8">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center space-x-2 px-1">
                   <div className={`p-1.5 rounded-lg border ${getCategoryColor(category)}`}>
                      {getCategoryIcon(category)}
                   </div>
                   <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                      {category}
                   </h4>
                </div>
                
                {categoryItems.map((item) => (
                  <motion.div 
                    key={item.originalIndex}
                    layout
                    className={`p-4 rounded-2xl border transition-all ${
                      selectedItems.has(item.originalIndex) 
                        ? `bg-white border-blue-100 shadow-sm` 
                        : 'bg-gray-50 border-transparent opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex space-x-3 flex-1">
                        <button 
                          onClick={() => toggleItem(item.originalIndex)}
                          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            selectedItems.has(item.originalIndex) ? 'bg-blue-600 text-white' : 'border-2 border-gray-200'
                          }`}
                        >
                          {selectedItems.has(item.originalIndex) && <Check size={14} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <input 
                            value={item.name}
                            onChange={(e) => updateItem(item.originalIndex, 'name', e.target.value)}
                            className={`w-full font-bold text-sm bg-transparent border-none p-0 focus:ring-0 focus:outline-none transition-colors ${
                               selectedItems.has(item.originalIndex) ? 'text-gray-900' : 'text-gray-400'
                            }`}
                            placeholder="Item name"
                          />
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                             {item.subcategory || 'Individual Item'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                         <div className="flex items-center border-b border-gray-100 focus-within:border-blue-300 transition-colors">
                            <span className="text-sm font-bold text-gray-400 mr-1">£</span>
                            <input 
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItem(item.originalIndex, 'price', e.target.value)}
                              className="w-16 text-right font-bold text-sm bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                            />
                         </div>
                         <button 
                            onClick={() => removeItem(item.originalIndex)}
                            className="mt-2 p-1 text-gray-300 hover:text-red-400 transition-colors"
                         >
                            <Trash2 size={14} />
                         </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
           <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-6">
                 <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                    <ShoppingBag size={24} />
                 </div>
                 <div>
                    <h4 className="font-bold text-lg">Personal Total</h4>
                    <p className="text-xs text-blue-100 font-medium">Tracking only your share</p>
                 </div>
              </div>
              
              <div className="flex justify-between items-baseline pt-6 border-t border-white/20">
                 <span className="text-sm font-bold opacity-80">Final Amount</span>
                 <span className="text-4xl font-black leading-none">
                    £{personalTotal.toFixed(2)}
                 </span>
              </div>
           </div>
        </section>
      </main>

      <footer className="px-6 py-6 border-t border-gray-100 bg-white sticky bottom-0 z-10">
        <button
          onClick={handleSave}
          disabled={selectedItems.size === 0 || !overallCategory || overallCategory === 'Other'}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none transition-all flex items-center justify-center space-x-2"
        >
          <Save size={20} />
          <span>Confirm & Save</span>
        </button>
      </footer>
    </motion.div>
  );
}

