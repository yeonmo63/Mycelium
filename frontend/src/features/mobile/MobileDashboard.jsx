import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMobileDashboard } from './hooks/useMobileDashboard';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { formatCurrency } from '../../utils/common';
import {
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Users,
    Package,
    RefreshCw,
    Calendar,
    Wallet,
    ClipboardList,
    PlusCircle,
    LayoutDashboard,
    Store
} from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const MobileDashboard = () => {
    const navigate = useNavigate();
    const {
        stats,
        salesTrend,
        isLoading,
        loadData
    } = useMobileDashboard();

    const scrollContainerRef = useRef(null);
    const [lastUpdated, setLastUpdated] = useState(dayjs().format('HH:mm:ss'));

    const handleRefresh = useCallback(async () => {
        await loadData();
        setLastUpdated(dayjs().format('HH:mm:ss'));
    }, [loadData]);

    const { pullDistance, isRefreshing, bind } = usePullToRefresh(handleRefresh, {
        scrollEltRef: scrollContainerRef
    });

    const loadStats = useCallback(async () => {
        await loadData();
        setLastUpdated(dayjs().format('HH:mm:ss'));
    }, [loadData]);

    useEffect(() => {
        loadStats();

        // Auto-refresh when returning to the app (visibility change)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("App returned to foreground, refreshing data...");
                loadStats();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [loadStats]);

    return (
        <div className="mobile-fullscreen bg-slate-50 flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-600 px-6 pt-8 pb-16 rounded-b-[40px] sticky top-0 z-40 shadow-lg shrink-0">
                {/* Pull to Refresh Indicator */}
                <div
                    className="absolute left-0 right-0 top-0 flex justify-center pointer-events-none transition-transform"
                    style={{
                        transform: `translateY(${pullDistance}px)`,
                        opacity: pullDistance > 20 ? 1 : 0
                    }}
                >
                    <div className="bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg border border-white/20 mt-2">
                        <RefreshCw
                            size={20}
                            className={`text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`}
                            style={{
                                transform: isRefreshing ? 'none' : `rotate(${pullDistance * 3}deg)`,
                                transition: isRefreshing ? 'none' : 'transform 0.1s'
                            }}
                        />
                    </div>
                </div>

                <div className="relative z-10 flex justify-start items-center mb-6">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-indigo-500/10 overflow-hidden">
                            <img src="/mushroom-app-icon.png" alt="Logo" className="w-8 h-8 object-contain" />
                        </div>
                        <h1 className="text-white text-2xl font-black tracking-tight truncate">농장 관리 현황</h1>
                    </div>
                </div>

                {/* Main Revenue Card */}
                <div className={`relative z-10 bg-white p-6 rounded-3xl shadow-xl transition-all duration-700 ease-out ${isLoading ? 'opacity-90 scale-[0.98]' : 'opacity-100 scale-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-tight">오늘의 총 매출액</span>
                        {!isLoading && salesTrend ? (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${salesTrend.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {salesTrend.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {salesTrend.pct}%
                            </div>
                        ) : <div className="w-12 h-4 bg-slate-50 rounded-full animate-pulse"></div>}
                    </div>
                    <div className="text-3xl font-black text-slate-800 tracking-tight h-10 flex items-center">
                        {isLoading ? (
                            <div className="w-48 h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                        ) : (
                            `${formatCurrency(stats?.total_sales_amount || 0)}원`
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-400" />
                            <span className="text-[11px] text-slate-400 font-bold">{dayjs().format('YYYY년 MM월 DD일')}</span>
                        </div>
                        <span className="text-[10px] text-slate-300 font-medium tracking-tight whitespace-nowrap">마지막 갱신: {lastUpdated}</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div
                ref={scrollContainerRef}
                {...bind}
                className="flex-1 overflow-y-auto px-6 -mt-6 relative z-20 space-y-4 pb-32 touch-pan-y"
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100 min-h-[140px] flex flex-col justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <ShoppingCart size={20} />
                        </div>
                        <div>
                            <div className="text-slate-400 font-bold text-xs mb-1">오늘 주문량</div>
                            <div className="text-2xl font-black text-slate-800 h-8 flex items-center">
                                {isLoading ? <div className="w-12 h-6 bg-slate-50 rounded animate-pulse"></div> : `${formatCurrency(stats?.total_orders || 0)}건`}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100 min-h-[140px] flex flex-col justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Package size={20} />
                        </div>
                        <div>
                            <div className="text-slate-400 font-bold text-xs mb-1">배송 대기</div>
                            <div className="text-2xl font-black text-slate-800 h-8 flex items-center">
                                {isLoading ? <div className="w-12 h-6 bg-slate-50 rounded animate-pulse"></div> : `${formatCurrency(stats?.pending_orders || 0)}건`}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                            <h3 className="font-black text-slate-700">고객 현황</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-[11px] text-slate-400 font-bold uppercase mb-1">오늘 새 고객</div>
                                <div className="text-2xl font-black text-slate-800 h-8 flex items-center">
                                    {isLoading ? <div className="w-16 h-6 bg-slate-50 rounded animate-pulse"></div> : `${formatCurrency(stats?.total_customers || 0)}명`}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[11px] text-slate-400 font-bold uppercase mb-1">전체 누적</div>
                                <div className="text-lg font-black text-indigo-600 h-7 flex items-center justify-end">
                                    {isLoading ? <div className="w-20 h-5 bg-slate-50 rounded animate-pulse"></div> : `${formatCurrency(stats?.total_customers_all_time || 0)}명`}
                                </div>
                            </div>
                        </div>

                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: isLoading ? '0%' : '65%' }}></div>
                            <div className="h-full bg-indigo-300 transition-all duration-1000" style={{ width: isLoading ? '0%' : '20%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                <Wallet size={20} />
                            </div>
                            <h3 className="font-black text-slate-700">일정 및 스케줄</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-tighter">체험 확정 건</div>
                            <div className="text-xl font-black text-slate-800 h-7 flex items-center">
                                {isLoading ? <div className="w-10 h-6 bg-slate-50 rounded animate-pulse"></div> : `${formatCurrency(stats?.experience_reservation_count || 0)}건`}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-tighter">금일 스케줄</div>
                            <div className="text-xl font-black text-slate-800 h-7 flex items-center">
                                {isLoading ? <div className="w-10 h-6 bg-slate-50 rounded animate-pulse"></div> : `${formatCurrency(stats?.today_schedule_count || 0)}건`}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 px-4 text-center opacity-30">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
                        © 2026 Mycelium Farm OS<br />엔터프라이즈 모바일 관제
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MobileDashboard;
