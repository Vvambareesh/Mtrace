import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  CheckCircle2, 
  Loader2, 
  LogOut,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HouseholdManagerProps {
  user: any;
}

export default function HouseholdManager({ user }: HouseholdManagerProps) {
  const [household, setHousehold] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    
    // Listen to user data for household changes
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      const data = snap.data();
      setUserData(data);
      
      if (data?.householdId) {
        const hSnap = await getDoc(doc(db, 'households', data.householdId));
        setHousehold({ id: hSnap.id, ...hSnap.data() });
      } else {
        setHousehold(null);
      }
      setLoading(false);
    });

    return unsubUser;
  }, [user]);

  const createHousehold = async () => {
    setIsSending(true);
    try {
      const hRef = doc(collection(db, 'households'));
      const hData = {
        name: `${user.displayName}'s Home`,
        members: [user.uid],
        memberEmails: [user.email],
        createdBy: user.uid
      };
      await setDoc(hRef, hData);
      await updateDoc(doc(db, 'users', user.uid), { householdId: hRef.id });
    } catch (error) {
      console.error("Create household failed", error);
    } finally {
      setIsSending(false);
    }
  };

  const invitePartner = async () => {
    if (!inviteEmail || !household) return;
    setIsSending(true);
    try {
      await updateDoc(doc(db, 'households', household.id), {
        memberEmails: arrayUnion(inviteEmail.toLowerCase().trim())
      });
      setInviteEmail('');
      alert(`Invitation sent to ${inviteEmail}! They will be automatically linked when they log in.`);
    } catch (error) {
       console.error("Invite failed", error);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin text-blue-600 mx-auto" />;

  return (
    <div className="space-y-6">
      {!household ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm text-center"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="text-blue-600" size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">Joint Expense Tracking</h3>
          <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">
            Create a shared room to track expenses with your partner in real-time.
          </p>
          <button
            onClick={createHousehold}
            disabled={isSending}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-transform flex items-center justify-center space-x-2"
          >
            {isSending ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
            <span>Start Shared Room</span>
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
           {/* Household Card */}
           <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden"
           >
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50" />
              <div className="relative z-10">
                 <div className="flex items-center space-x-4 mb-8">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                       <Smartphone size={24} />
                    </div>
                    <div>
                       <h4 className="font-bold text-lg">Shared Room</h4>
                       <p className="text-xs text-blue-100 font-medium">{household.name}</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-blue-100 font-black mb-1">Members</p>
                    <div className="flex -space-x-3">
                       {household.members.map((mId: string, i: number) => (
                          <div key={mId} className={`w-10 h-10 rounded-full border-2 border-blue-600 bg-blue-400 flex items-center justify-center text-[10px] font-bold z-${30-i}`}>
                             {i === 0 ? "You" : "P"}
                          </div>
                       ))}
                       {household.memberEmails.length > household.members.length && (
                          <div className="w-10 h-10 rounded-full border-2 border-blue-600 bg-blue-800 flex items-center justify-center text-[10px] font-bold">
                             +1
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </motion.div>

           {/* Invite Section */}
           <div className="bg-white border border-gray-100 rounded-[2rem] p-8 space-y-6">
              <div>
                 <h4 className="font-bold flex items-center space-x-2">
                    <UserPlus size={18} className="text-blue-600" />
                    <span>Invite Partner</span>
                 </h4>
                 <p className="text-xs text-gray-400 mt-1">They'll see all expenses once they join.</p>
              </div>

              <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                    type="email"
                    placeholder="partner@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                 />
              </div>

              <button
                onClick={invitePartner}
                disabled={isSending || !inviteEmail}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform flex items-center justify-center space-x-2 disabled:bg-gray-200"
              >
                <span>Send Invite</span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
