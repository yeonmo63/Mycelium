import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';

const MobileLayout = () => {
    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
            <div className="flex-1 overflow-x-hidden overflow-y-auto pb-24 touch-pan-y">
                <main className="animate-in fade-in duration-500">
                    <Outlet />
                </main>
            </div>
            <MobileBottomNav />
        </div>
    );
};

export default MobileLayout;
