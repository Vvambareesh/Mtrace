import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ReceiptItem {
  name: string;
  price: number;
  category?: string;
  subcategory?: string;
}

export interface ScannedExpense {
  amount: number;
  merchant: string;
  category: string;
  date: string;
  items: ReceiptItem[];
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
      text: `Analyze this receipt and extract detailed information.
      1. Overall: amount, merchant name, date.
      2. Categorize the whole receipt into one of: Grocery, Transport, Dining, Entertainment, Utilities, Shopping, Health, Travel, Other.
      3. For each individual item in the receipt:
         - Extract name and price.
         - Categorize the item (especially for Grocery receipts) into categories like 'Vegetables', 'Fruits', 'Dairy', 'Meat', 'Bakery', 'Drinks', 'Pantry', 'Household', etc.
         - Provide a subcategory if possible (e.g., for 'Apple' -> category: 'Fruits', subcategory: 'Pomes').
      Return ONLY a JSON object matching the provided schema.`,
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
             amount: { type: Type.NUMBER },
             merchant: { type: Type.STRING },
             category: { type: Type.STRING },
             date: { type: Type.STRING },
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
           required: ["amount", "merchant", "category", "date", "items"]
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
