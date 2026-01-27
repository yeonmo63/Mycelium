import React, { useState, useEffect } from 'react';
import { showAlert } from '../../utils/common';

const CustomerSpecialCare = () => {
    const [customers, setCustomers] = useState([]);
    const [stats, setStats] = useState({ total: 0, avgRatio: 0, mainReason: '-' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!window.__TAURI__) return;
        setIsLoading(true);
        try {
            const data = await window.__TAURI__.core.invoke('get_special_care_customers');
            setCustomers(data || []);
            calculateStats(data || []);
        } catch (e) {
            console.error(e);
            showAlert("오류", "데이터 조회 실패: " + e);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateStats = (data) => {
        if (!data || data.length === 0) {
            setStats({ total: 0, avgRatio: 0, mainReason: '-' });
            return;
        }

        let totalRatios = 0;
        const reasons = {};

        data.forEach(item => {
            totalRatios += item.claim_ratio;
            if (item.major_reason) {
                reasons[item.major_reason] = (reasons[item.major_reason] || 0) + 1;
            }
        });

        let mainReason = '-';
        let maxCount = 0;
        for (const r in reasons) {
            if (reasons[r] > maxCount) {
                maxCount = reasons[r];
                mainReason = r;
            }
        }

        setStats({
            total: data.length,
            avgRatio: data.length > 0 ? (totalRatios / data.length).toFixed(1) : 0,
            mainReason
        });
    };

    const handleMemo = (item) => {
        if (!item.is_member) {
            showAlert("알림", "비회원 고객은 통합 메모 기능을 지원하지 않습니다.\n상담 관리(CRM)에서 해당 연락처로 상세 상담을 등록해주세요.");
        } else {
            showAlert("알림", "회원 상세 정보 페이지에서 고객 대응 메모를 작성하실 수 있습니다.\n[고객 수정/말소] 메뉴에서 해당 고객을 검색하세요.");
        }
    };

    return (
        <div className="sales-v3-container fade-in flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="content-header p-4 bg-white border-b border-slate-200 shadow-sm flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-rounded text-red-500">warning</span> 집중 관리 고객 분석
                </h2>
                <button onClick={loadData} className="btn-secondary h-8 w-8 p-0 flex items-center justify-center rounded-full"><span className="material-symbols-rounded text-slate-500">refresh</span></button>
            </div>

            {/* Dashboard Stats */}
            <div className="p-4 grid grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-rounded text-red-500 text-2xl">priority_high</span>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400">관리 대상 고객</div>
                        <div className="text-2xl font-black text-slate-800">{stats.total.toLocaleString()}명</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-rounded text-orange-500 text-2xl">percent</span>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400">평균 클레임 비율</div>
                        <div className="text-2xl font-black text-slate-800">{stats.avgRatio}%</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-rounded text-blue-500 text-2xl">error_outline</span>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400">주요 귀책 사유</div>
                        <div className="text-2xl font-black text-slate-800">{stats.mainReason}</div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto px-4 pb-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-h-full">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-3 text-left w-40">고객명</th>
                                <th className="p-3 text-left w-32">연락처</th>
                                <th className="p-3 text-center w-20">구분</th>
                                <th className="p-3 text-right">총 주문</th>
                                <th className="p-3 text-right text-red-600">클레임</th>
                                <th className="p-3 text-right w-32">비율</th>
                                <th className="p-3 text-left">주요 사유</th>
                                <th className="p-3 text-center w-32">최근 발생일</th>
                                <th className="p-3 text-center w-20">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="9" className="p-20 text-center"><span className="material-symbols-rounded spin text-3xl text-slate-400">sync</span></td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan="9" className="p-20 text-center text-slate-400">
                                    <div className="flex flex-col items-center">
                                        <span className="material-symbols-rounded text-4xl text-green-300 mb-2">check_circle</span>
                                        <span>집중 관리 대상 고객이 없습니다.</span>
                                    </div>
                                </td></tr>
                            ) : (
                                customers.map((c, idx) => {
                                    // Ratio Color
                                    let ratioColor = 'text-slate-600';
                                    let progressColor = 'bg-slate-300';
                                    if (c.claim_ratio >= 30) { ratioColor = 'text-red-600'; progressColor = 'bg-red-500'; }
                                    else if (c.claim_ratio >= 15) { ratioColor = 'text-orange-500'; progressColor = 'bg-orange-400'; }

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold text-slate-700">{c.name}</td>
                                            <td className="p-3 text-slate-500 font-mono text-xs">{c.mobile}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.is_member ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                    {c.is_member ? '회원' : '비회원'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-600">{c.total_orders.toLocaleString()}</td>
                                            <td className="p-3 text-right font-mono font-bold text-red-600">{c.claim_count.toLocaleString()}</td>
                                            <td className="p-3">
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-bold text-xs ${ratioColor}`}>{c.claim_ratio.toFixed(1)}%</span>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                                        <div className={`h-full ${progressColor}`} style={{ width: `${Math.min(c.claim_ratio, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-slate-600 text-xs">{c.major_reason || '-'}</td>
                                            <td className="p-3 text-center text-slate-500 text-xs">{c.last_claim_date || '-'}</td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => handleMemo(c)} className="btn-secondary p-1 h-7 text-xs flex items-center justify-center gap-1 w-full">
                                                    <span className="material-symbols-rounded text-sm">edit_note</span>
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CustomerSpecialCare;
