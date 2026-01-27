import React, { useState, useEffect } from 'react';
import { showAlert, showConfirm } from '../../utils/common';

const CustomerBatch = () => {
    // --- State ---
    const [customers, setCustomers] = useState([]);
    const [searchParams, setSearchParams] = useState({
        start: '',
        end: '',
        keyword: '',
        level: '',
    });
    const [dormantYears, setDormantYears] = useState(3);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination
    const PAGE_SIZE = 20;
    const [page, setPage] = useState(1);

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleteSales, setDeleteSales] = useState(false);

    // AI Insight
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiData, setAiData] = useState(null);

    // --- Init ---
    useEffect(() => {
        handleSearch(true); // Initial load all
    }, []);

    // --- Search ---
    const handleSearch = async (isAll = false) => {
        if (!window.__TAURI__) return;
        setIsLoading(true);
        setPage(1);
        setSelectedIds(new Set());
        try {
            let res;
            if (isAll) {
                // Reset params
                setSearchParams({ start: '', end: '', keyword: '', level: '' });
                res = await window.__TAURI__.core.invoke('search_customers_by_date', {
                    start: "1900-01-01",
                    end: "2999-12-31",
                    keyword: null,
                    membershipLevel: null
                });
            } else {
                res = await window.__TAURI__.core.invoke('search_customers_by_date', {
                    start: searchParams.start || "1900-01-01",
                    end: searchParams.end || "2999-12-31",
                    keyword: searchParams.keyword || null,
                    membershipLevel: searchParams.level || null
                });
            }
            setCustomers(res || []);
        } catch (e) {
            console.error(e);
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDormantSearch = async () => {
        if (!window.__TAURI__) return;
        const days = Math.round(dormantYears * 365);
        setIsLoading(true);
        setPage(1);
        setSelectedIds(new Set());
        try {
            const res = await window.__TAURI__.core.invoke('search_dormant_customers', { daysThreshold: days });
            setCustomers(res || []);
            setSearchParams({ ...searchParams, keyword: `휴면 고객(${dormantYears}년 이상)` });
        } catch (e) {
            console.error(e);
            showAlert("오류", "휴면 고객 조회 실패: " + e);
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
    const handleDeleteSelection = async () => {
        if (selectedIds.size === 0) return showAlert("알림", "삭제할 고객을 선택해주세요.");

        let msg = `선택한 ${selectedIds.size}명의 고객 정보를 영구 삭제하시겠습니까?`;
        if (deleteSales) msg += `\n\n⚠️ 주의: 해당 고객들의 모든 판매 내역(매출 데이터)도 함께 삭제됩니다!`;

        if (!await showConfirm("삭제 확인", msg)) return;

        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('delete_customers_batch', {
                    ids: Array.from(selectedIds),
                    alsoDeleteSales: deleteSales
                });
                await showAlert("완료", `${selectedIds.size}명의 고객 정보가 삭제되었습니다.`);
                // Refresh
                if (searchParams.keyword.includes("휴면")) handleDormantSearch();
                else handleSearch(false);
            }
        } catch (e) {
            showAlert("오류", "삭제 실패: " + e);
        }
    };

    const handleExportCsv = async () => {
        if (customers.length === 0) return showAlert("알림", "저장할 데이터가 없습니다.");

        let csv = '\uFEFFNo,고객명,연락처,등급,등록일,주소,메모\n';
        customers.forEach((c, idx) => {
            const row = [
                idx + 1,
                c.customer_name,
                c.mobile_number,
                c.membership_level,
                c.join_date,
                `(${c.zip_code || ''}) ${c.address_primary || ''} ${c.address_detail || ''}`,
                (c.memo || '').replace(/,/g, ' ')
            ].map(v => `"${v || ''}"`).join(',');
            csv += row + '\n';
        });

        try {
            if (window.__TAURI__) {
                const filePath = await window.__TAURI__.core.invoke('plugin:dialog|save', {
                    options: { defaultPath: `고객일괄조회_${new Date().toISOString().split('T')[0]}.csv`, filters: [{ name: 'CSV File', extensions: ['csv'] }] }
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
            {/* Header Controls */}
            <div className="content-header p-4 bg-white border-b border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-rounded text-green-600">groups</span> 고객 일괄 조회
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => handleSearch(true)} className="btn-secondary h-8 text-xs">전체 조회</button>
                        <button onClick={handleExportCsv} className="btn-secondary h-8 text-xs flex items-center gap-1"><span className="material-symbols-rounded text-sm">download</span> 엑셀</button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">검색어</label>
                        <input value={searchParams.keyword} onChange={e => setSearchParams({ ...searchParams, keyword: e.target.value })}
                            className="input-field h-8 text-sm w-40" placeholder="이름, 연락처" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">등급</label>
                        <select value={searchParams.level} onChange={e => setSearchParams({ ...searchParams, level: e.target.value })} className="input-field h-8 text-sm w-32">
                            <option value="">전체</option>
                            <option value="Normal">일반</option>
                            <option value="VIP">VIP</option>
                            <option value="VVIP">VVIP</option>
                            <option value="Group">법인/단체</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">가입일</label>
                        <div className="flex items-center gap-1">
                            <input type="date" value={searchParams.start} onChange={e => setSearchParams({ ...searchParams, start: e.target.value })} className="input-field h-8 text-sm w-32" />
                            <span className="text-slate-400">~</span>
                            <input type="date" value={searchParams.end} onChange={e => setSearchParams({ ...searchParams, end: e.target.value })} className="input-field h-8 text-sm w-32" />
                        </div>
                    </div>
                    <button onClick={() => handleSearch(false)} className="btn-primary h-8 px-4 text-sm bg-blue-600">조회</button>

                    <div className="w-[1px] h-8 bg-slate-300 mx-2"></div>

                    <div className="flex items-end gap-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">휴면 기준(년)</label>
                            <input type="number" min="1" value={dormantYears} onChange={e => setDormantYears(e.target.value)} className="input-field h-8 text-sm w-16 text-center" />
                        </div>
                        <button onClick={handleDormantSearch} className="btn-secondary h-8 text-xs text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100">휴면 조회</button>
                    </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                    <div className="text-slate-600 font-bold">
                        총 <span className="text-blue-600">{customers.length.toLocaleString()}</span>명
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer select-none text-slate-600">
                            <input type="checkbox" checked={deleteSales} onChange={e => setDeleteSales(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
                            <span className="text-xs font-bold text-red-500">매출 내역도 함께 삭제</span>
                        </label>
                        <button onClick={handleDeleteSelection} className="btn-secondary h-7 px-3 text-xs bg-white text-red-500 border-red-200 hover:bg-red-50">선택 삭제</button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-4 pt-0">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-h-full">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-3 w-10 text-center">
                                    <input type="checkbox" onChange={handleSelectAll} />
                                </th>
                                <th className="p-3 w-12 text-center">No</th>
                                <th className="p-3 text-left">고객명</th>
                                <th className="p-3 text-center w-32">연락처</th>
                                <th className="p-3 text-center w-24">등급</th>
                                <th className="p-3 text-center w-28">가입일</th>
                                <th className="p-3 text-left">주소</th>
                                <th className="p-3 w-12 text-center">AI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="8" className="p-20 text-center"><span className="material-symbols-rounded spin text-3xl text-slate-400">sync</span></td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan="8" className="p-20 text-center text-slate-400">조회된 데이터가 없습니다.</td></tr>
                            ) : (
                                paginatedData.map((c, idx) => (
                                    <tr key={c.customer_id} className="hover:bg-slate-50">
                                        <td className="p-3 text-center">
                                            <input type="checkbox" checked={selectedIds.has(c.customer_id)} onChange={() => handleCheck(c.customer_id)} />
                                        </td>
                                        <td className="p-3 text-center text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                                        <td className="p-3 font-bold text-slate-700">{c.customer_name}</td>
                                        <td className="p-3 text-center text-slate-600">{c.mobile_number}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${c.membership_level === 'VIP' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                    c.membership_level === 'VVIP' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>{c.membership_level === 'Normal' ? '일반' : c.membership_level}</span>
                                        </td>
                                        <td className="p-3 text-center text-slate-500">{c.join_date}</td>
                                        <td className="p-3 text-slate-600 truncate max-w-[200px]" title={c.address_primary}>{c.address_primary} {c.address_detail}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleAiInsight(c.customer_id)} className="text-slate-300 hover:text-purple-500 transition-colors">
                                                <span className="material-symbols-rounded">auto_awesome</span>
                                            </button>
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

            {/* AI Insight Modal */}
            {aiModalOpen && (
                <div className="modal flex">
                    <div className="modal-content w-[400px]">
                        <h3 className="mb-4 flex items-center gap-2 text-purple-600">
                            <span className="material-symbols-rounded">auto_awesome</span> AI 고객 분석
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
                                <div className="bg-slate-50 p-3 rounded text-sm text-slate-700">
                                    <div className="font-bold mb-1 text-slate-800">아이스 브레이킹</div>
                                    {aiData.ice_breaking}
                                </div>
                                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
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

export default CustomerBatch;
