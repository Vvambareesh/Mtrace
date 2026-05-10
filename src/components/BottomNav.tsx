import { Home, Receipt, PieChart, Settings, ScanLine } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onScanClick: () => void;
}

export default function BottomNav({ activeTab, onTabChange, onScanClick }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'expenses', icon: Receipt, label: 'History' },
    { id: 'stats', icon: PieChart, label: 'Stats' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe pt-2 px-6 flex items-center justify-between z-40">
      <div className="flex flex-1 justify-around items-center">
        {tabs.slice(0, 2).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
            }`}
            id={`nav-${tab.id}`}
          >
            <tab.icon size={22} variant={activeTab === tab.id ? 'fill' : 'outline'} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="relative -top-6 px-4">
        <button
          onClick={onScanClick}
          className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200 active:scale-95 transition-transform"
          id="nav-scan"
        >
          <ScanLine size={32} />
        </button>
      </div>

      <div className="flex flex-1 justify-around items-center">
        {tabs.slice(2).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
            }`}
             id={`nav-${tab.id}`}
          >
            <tab.icon size={22} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
