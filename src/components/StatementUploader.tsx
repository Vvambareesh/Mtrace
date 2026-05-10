import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, CheckCircle2, Loader2, X, AlertCircle } from 'lucide-react';
import { processBankStatement, StatementAnalysis } from '../services/geminiService';

interface StatementUploaderProps {
  onAnalysisComplete: (analysis: StatementAnalysis) => void;
  onClose: () => void;
}

const StatementUploader: React.FC<StatementUploaderProps> = ({ onAnalysisComplete, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError("Please upload a .csv or .txt file.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const analysis = await processBankStatement(text);
        onAnalysisComplete(analysis);
      } catch (err) {
        console.error(err);
        setError("AI failed to parse this statement. Ensure it contains clear transaction history.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-8">
           <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="text-blue-600" size={32} />
           </div>
           <h2 className="text-2xl font-black text-gray-900 leading-tight">
              Bank Statement<br />Analysis
           </h2>
           <p className="text-gray-500 mt-2 font-medium">
              Upload your monthly statement (.csv or .txt) and we'll automatically identify and categorize your spending.
           </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-2xl flex items-start space-x-3 text-red-600 text-sm font-medium">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          {isUploading ? (
            <div className="py-12 flex flex-col items-center justify-center">
               <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
               <p className="text-sm font-bold text-gray-900">Scanning Statement...</p>
               <p className="text-xs text-gray-400 mt-1">AI is parsing transactions</p>
            </div>
          ) : (
            <label className="group block py-12 border-2 border-dashed border-gray-200 rounded-3xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer text-center">
              <input 
                type="file" 
                className="hidden" 
                accept=".csv,.txt"
                onChange={handleFileChange}
              />
              <div className="mb-3 mx-auto w-12 h-12 bg-gray-50 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors">
                <Upload className="text-gray-400 group-hover:text-blue-600" size={24} />
              </div>
              <p className="text-sm font-bold text-gray-900">Click to upload statement</p>
              <p className="text-xs text-gray-400 mt-1">or drag and drop here</p>
            </label>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 italic text-[10px] text-gray-400 text-center uppercase tracking-widest font-black">
           Privacy First: Files are processed locally and securely
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StatementUploader;
