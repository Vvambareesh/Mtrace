import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ReceiptItem {
  name: string;
  price: number;
  category?: string;
  subcategory?: string;
}

export interface ScannedExpense {
  isReceipt: boolean;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  items: ReceiptItem[];
  confidenceScore: number;
}

export interface BankTransaction {
  date: string;
  merchant: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  isLinkedToReceipt?: boolean;
}

export interface StatementAnalysis {
  transactions: BankTransaction[];
  startDate: string;
  endDate: string;
  totalDebit: number;
  totalCredit: number;
}

export async function processReceiptImage(base64Image: string): Promise<ScannedExpense> {
  const parts = [
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image.split(',')[1],
      },
    },
    {
      text: `Strictly analyze this image. 
      First, determine if it is a valid purchase receipt. If not, set isReceipt to false.
      If it is a receipt:
      1. Extract the merchant name, total amount, and date.
      2. Categorize the whole transaction into: Grocery, Transport, Dining, Entertainment, Utilities, Shopping, Health, Travel, Other.
      3. CRITICAL: Identify EVERY single line item in the receipt.
      4. For each item: 
         - Name and Price.
         - Category: Specifically for items, use descriptive ones like 'Vegetables', 'Fruits', 'Alcohol', 'Meat', 'Electronics', 'Clothing', 'Travel Fare', etc.
         - Subcategory: Be more specific (e.g., Category: 'Vegetables', Subcategory: 'Root Vegetables').
      5. Provide a confidenceScore from 0 to 1.
      
      Return ONLY a valid JSON object.`,
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
       contents: { parts },
       config: {
         responseMimeType: "application/json",
         responseSchema: {
           type: Type.OBJECT,
           properties: {
             isReceipt: { type: Type.BOOLEAN },
             amount: { type: Type.NUMBER },
             merchant: { type: Type.STRING },
             category: { type: Type.STRING },
             date: { type: Type.STRING },
             confidenceScore: { type: Type.NUMBER },
             items: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: {
                   name: { type: Type.STRING },
                   price: { type: Type.NUMBER },
                   category: { type: Type.STRING },
                   subcategory: { type: Type.STRING }
                 },
                 required: ["name", "price"]
               }
             }
           },
           required: ["isReceipt", "amount", "merchant", "category", "date", "items"]
         }
       }
    });

    const result = JSON.parse(response.text);
    return result as ScannedExpense;
  } catch (error) {
    console.error("AI Receipt processing failed:", error);
    throw new Error("Failed to process receipt with AI");
  }
}

export async function processBankStatement(text: string): Promise<StatementAnalysis> {
  const parts = [
    {
      text: `Analyze this bank statement text.
      1. Extract all transactions.
      2. For each transaction identify: date, merchant/description, amount, type (debit/credit).
      3. Categorize each transaction.
      4. Calculate totals and date range.
      
      Return ONLY a valid JSON object matching the provided schema.`,
    },
    { text },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            startDate: { type: Type.STRING },
            endDate: { type: Type.STRING },
            totalDebit: { type: Type.NUMBER },
            totalCredit: { type: Type.NUMBER },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  merchant: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ['debit', 'credit'] },
                  category: { type: Type.STRING }
                },
                required: ["date", "merchant", "amount", "type"]
              }
            }
          },
          required: ["transactions", "totalDebit", "totalCredit"]
        }
      }
    });

    return JSON.parse(response.text) as StatementAnalysis;
  } catch (error) {
    console.error("AI Statement processing failed:", error);
    throw new Error("Failed to process bank statement with AI");
  }
}
