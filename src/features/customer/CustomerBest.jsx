import React, { useState, useEffect } from 'react';
import { formatCurrency, showAlert, showConfirm, copyToClipboard } from '../../utils/common';

const CustomerBest = () => {
    // --- State ---
    const [customers, setCustomers] = useState([]);
    const [searchParams, setSearchParams] = useState({
        minQty: 100,
        minAmt: 0,
        logic: 'AND' // 'AND' | 'OR'
    });
    const [isLoading, setIsLoading] = useState(false);

    // Pagination
    const PAGE_SIZE = 20;
    const [page, setPage] = useState(1);

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [batchLevel, setBatchLevel] = useState('');

    // AI Insight
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiData, setAiData] = useState(null);

    // --- Init ---
    useEffect(() => {
        handleSearch();
    }, []);

    // --- Search ---
    const handleSearch = async () => {
        if (!window.__TAURI__) return;
        setIsLoading(true);
        setPage(1);
        setSelectedIds(new Set());
        try {
            const res = await window.__TAURI__.core.invoke('search_best_customers', {
                minQty: Number(searchParams.minQty),
                minAmt: Number(searchParams.minAmt),
                logic: searchParams.logic
            });
            setCustomers(res || []);
        } catch (e) {
            console.error(e);
            showAlert("오류", "조회 중 오류가 발생했습니다: " + e);
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Selection ---
    const handleCheck = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const currentIds = paginatedData.map(c => c.customer_id);
            setSelectedIds(new Set([...selectedIds, ...currentIds]));
        } else {
            const next = new Set(selectedIds);
            paginatedData.forEach(c => next.delete(c.customer_id));
            setSelectedIds(next);
        }
    };

    // --- Actions ---
    const handleApplyLevel = async () => {
        if (!batchLevel) return showAlert("알림", "변경할 등급을 선택해주세요.");
        if (selectedIds.size === 0) return showAlert("알림", "선택된 고객이 없습니다.");

        if (!await showConfirm("등급 변경", `선택한 ${selectedIds.size}명의 고객 등급을 '${batchLevel}'(으)로 변경하시겠습니까?`)) return;

        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('update_customer_membership_batch', {
                    customerIds: Array.from(selectedIds),
                    newLevel: batchLevel
                });
                await showAlert("완료", "등급이 변경되었습니다.");
                handleSearch();
            }
        } catch (e) {
            showAlert("오류", "등급 변경 실패: " + e);
        }
    };

    const handleExportCsv = async () => {
        if (customers.length === 0) return showAlert("알림", "저장할 데이터가 없습니다.");

        let csv = '\uFEFFNo,고객명,연락처,등급,거래건수,총판매량,총판매액,주소\n';
        customers.forEach((c, idx) => {
            const row = [
                idx + 1,
                c.customer_name,
                c.mobile_number,
                c.membership_level === 'Normal' ? '일반' : c.membership_level,
                c.total_orders,
                c.total_qty,
                c.total_amount,
                (c.address_primary || '') + ' ' + (c.address_detail || '')
            ].map(v => `"${v || ''}"`).join(',');
            csv += row + '\n';
        });

        try {
            if (window.__TAURI__) {
                const filePath = await window.__TAURI__.core.invoke('plugin:dialog|save', {
                    options: { defaultPath: `우수고객목록_${new Date().toISOString().split('T')[0]}.csv`, filters: [{ name: 'CSV File', extensions: ['csv'] }] }
                });
                if (filePath) {
                    await window.__TAURI__.core.invoke('plugin:fs|write_text_file', { path: filePath, contents: csv });
                    showAlert("성공", "파일이 저장되었습니다.");
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleAiInsight = async (cid) => {
        if (!window.__TAURI__) return;
        setAiData(null);
        setAiModalOpen(true);
        try {
            const data = await window.__TAURI__.core.invoke('get_customer_ai_insight', { customerId: cid });
            setAiData(data);
        } catch (e) {
            console.error(e);
            showAlert("오류", "AI 분석 실패: " + e);
            setAiModalOpen(false);
        }
    };

    // --- Pagination ---
    const totalPages = Math.ceil(customers.length / PAGE_SIZE) || 1;
    const paginatedData = customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="sales-v3-container fade-in flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="content-header p-4 bg-white border-b border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-rounded text-green-600">military_tech</span> 우수 고객 관리
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={handleExportCsv} className="btn-secondary h-8 text-xs flex items-center gap-1"><span className="material-symbols-rounded text-sm">download</span> 엑셀</button>
                    </div>
                </div>

                {/* Search Controls */}
                <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">최소 주문량 (개)</label>
                            <input type="number" value={searchParams.minQty} onChange={e => setSearchParams({ ...searchParams, minQty: e.target.value })}
                                className="input-field h-9 w-32 font-bold text-right" placeholder="0" />
                        </div>
                        <div className="flex flex-col items-center justify-end h-full pt-5">
                            <div className="flex bg-white rounded-full border border-slate-300 overflow-hidden">
                                <button onClick={() => setSearchParams({ ...searchParams, logic: 'AND' })}
                                    className={`px-3 py-1 text-xs font-bold transition-all ${searchParams.logic === 'AND' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>AND</button>
                                <button onClick={() => setSearchParams({ ...searchParams, logic: 'OR' })}
                                    className={`px-3 py-1 text-xs font-bold transition-all ${searchParams.logic === 'OR' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>OR</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">최소 주문금액 (원)</label>
                            <input type="number" value={searchParams.minAmt} onChange={e => setSearchParams({ ...searchParams, minAmt: e.target.value })}
                                className="input-field h-9 w-40 font-bold text-right" placeholder="0" />
                        </div>
                    </div>
                    <button onClick={handleSearch} className="btn-primary h-9 px-6 bg-blue-600 hover:bg-blue-700">조건 검색</button>
                </div>

                {/* Batch Actions */}
                <div className="flex justify-between items-center text-sm pt-2">
                    <div className="font-bold text-slate-600">검색된 고객: <span className="text-blue-600">{customers.length.toLocaleString()}</span>명</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">선택한 고객을</span>
                        <select value={batchLevel} onChange={e => setBatchLevel(e.target.value)} className="input-field h-8 text-xs w-32">
                            <option value="">--등급 변경--</option>
                            <option value="Normal">일반</option>
                            <option value="VIP">VIP</option>
                            <option value="VVIP">VVIP</option>
                            <option value="Group">법인/단체</option>
                        </select>
                        <button onClick={handleApplyLevel} className="btn-secondary h-8 text-xs">일괄 적용</button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-4 pt-0">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-h-full">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-3 w-10 text-center"><input type="checkbox" onChange={handleSelectAll} /></th>
                                <th className="p-3 text-left">고객명</th>
                                <th className="p-3 text-center">연락처</th>
                                <th className="p-3 text-center w-20">등급</th>
                                <th className="p-3 text-right bg-blue-50">거래건수</th>
                                <th className="p-3 text-right bg-green-50">총판매량</th>
                                <th className="p-3 text-right bg-orange-50">총판매액</th>
                                <th className="p-3 text-left pl-6">주소</th>
                                <th className="p-3 w-16 text-center">AI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="9" className="p-20 text-center"><span className="material-symbols-rounded spin text-3xl text-slate-400">sync</span></td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan="9" className="p-20 text-center text-slate-400">조건에 맞는 고객이 없습니다.</td></tr>
                            ) : (
                                paginatedData.map(c => (
                                    <tr key={c.customer_id} className="hover:bg-slate-50">
                                        <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(c.customer_id)} onChange={() => handleCheck(c.customer_id)} /></td>
                                        <td className="p-3 font-medium text-slate-700">
                                            {c.customer_name}
                                            <button onClick={() => copyToClipboard(c.customer_name)} className="text-slate-300 hover:text-blue-500 ml-1"><span className="material-symbols-rounded text-xs align-middle">content_copy</span></button>
                                        </td>
                                        <td className="p-3 text-center text-slate-500 text-xs">{c.mobile_number}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.membership_level === 'VVIP' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                                    c.membership_level === 'VIP' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>{c.membership_level === 'Normal' ? '일반' : c.membership_level}</span>
                                        </td>
                                        <td className="p-3 text-right font-mono bg-blue-50/30">{c.total_orders}</td>
                                        <td className="p-3 text-right font-mono font-bold bg-green-50/30 text-green-700">{formatCurrency(c.total_qty)}</td>
                                        <td className="p-3 text-right font-mono font-bold bg-orange-50/30 text-orange-700">{formatCurrency(c.total_amount)}</td>
                                        <td className="p-3 text-xs text-slate-500 pl-6 truncate max-w-[200px]" title={`${c.address_primary} ${c.address_detail}`}>{c.address_primary}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleAiInsight(c.customer_id)} className="text-purple-400 hover:text-purple-600"><span className="material-symbols-rounded">auto_awesome</span></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {customers.length > 0 && (
                <div className="p-3 border-t border-slate-200 bg-white flex justify-center items-center gap-4">
                    <button onClick={() => setPage(page - 1)} disabled={page === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><span className="material-symbols-rounded">chevron_left</span></button>
                    <span className="text-sm font-bold text-slate-600">{page} / {totalPages}</span>
                    <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><span className="material-symbols-rounded">chevron_right</span></button>
                </div>
            )}

            {/* AI Modal */}
            {aiModalOpen && (
                <div className="modal flex">
                    <div className="modal-content w-[400px]">
                        <h3 className="mb-4 flex items-center gap-2 text-purple-600">
                            <span className="material-symbols-rounded">auto_awesome</span> AI 통찰
                        </h3>
                        {aiData ? (
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs font-bold text-slate-500 mb-2">키워드</div>
                                    <div className="flex flex-wrap gap-2">
                                        {aiData.keywords && aiData.keywords.map(k => (
                                            <span key={k} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold">{k}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-green-50 p-3 rounded text-sm text-green-800">
                                    <div className="font-bold mb-1">세일즈 팁</div>
                                    {aiData.sales_tip}
                                </div>
                            </div>
                        ) : (
                            <div className="p-10 text-center"><span className="material-symbols-rounded spin text-purple-400 text-3xl">sync</span></div>
                        )}
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => setAiModalOpen(false)} className="btn-primary">닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerBest;
