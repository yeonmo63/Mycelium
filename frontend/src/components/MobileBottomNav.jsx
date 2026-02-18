import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, ClipboardList, PlusCircle, ShoppingBag } from 'lucide-react';

const MobileBottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { path: '/mobile-dashboard', label: '현황판', icon: LayoutDashboard },
        { path: '/mobile-reception', label: '일반접수', icon: ShoppingBag },
        { path: '/mobile-event-sales', label: '특판접수', icon: Store },
        { path: '/mobile-worklog', label: '작업일지', icon: ClipboardList },
        { path: '/mobile-harvest', label: '수확입력', icon: PlusCircle },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-between h-[calc(4.5rem+env(safe-area-inset-bottom))] px-2 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_20px_0_rgba(0,0,0,0.03)]">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;
                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${isActive ? 'text-indigo-600' : 'text-slate-400'
                            }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className={`text-[9.5px] font-black tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default MobileBottomNav;
