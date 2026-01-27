import React, { useState, useEffect } from 'react';
import { formatCurrency, parseNumber, showAlert, showConfirm } from '../../utils/common';

const SalesLedger = () => {
    // --- State ---
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingLedger, setIsLoadingLedger] = useState(false);

    // Modals
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [entryForm, setEntryForm] = useState({
        id: null, // If editing
        type: '입금',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        desc: ''
    });

    // --- Init ---
    useEffect(() => {
        loadDefaultDebtList();
    }, []);

    const loadDefaultDebtList = async () => {
        if (!window.__TAURI__) return;
        try {
            const list = await window.__TAURI__.core.invoke('get_customers_with_debt');
            setCustomers(list || []);
        } catch (e) {
            console.error(e);
        }
    };

    // --- Customer Selection ---
    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setIsLoadingLedger(true);
        if (window.__TAURI__) {
            try {
                const data = await window.__TAURI__.core.invoke('get_customer_ledger', { customerId: customer.customer_id });
                setLedger(data || []);
            } catch (e) {
                console.error(e);
                setLedger([]);
            } finally {
                setIsLoadingLedger(false);
            }
        }
    };

    // --- Customer Search (Modal) ---
    const searchCustomer = async () => {
        if (!customerSearchQuery) return;
        if (window.__TAURI__) {
            try {
                const res = await window.__TAURI__.core.invoke('search_customers_by_name', { name: customerSearchQuery });
                setCustomerSearchResults(res || []);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const addCustomerToList = (c) => {
        const exists = customers.find(x => x.customer_id === c.customer_id);
        if (!exists) {
            setCustomers(prev => [c, ...prev]);
        }
        handleSelectCustomer(c);
        setIsSearchModalOpen(false);
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
    };

    // --- Entry Logic ---
    const openEntryModal = (type, editData = null) => {
        if (!selectedCustomer) return;
        setEntryForm({
            id: editData?.ledger_id || null,
            type: editData?.transaction_type || type,
            date: editData?.transaction_date || new Date().toISOString().split('T')[0],
            amount: editData ? Math.abs(editData.amount) : '',
            desc: editData?.description || (type === '입금' ? '잔금 입금' : (type === '이월' ? '기초 잔액 이월' : '잔액 조정'))
        });
        setIsEntryModalOpen(true);
    };

    const handleSaveEntry = async () => {
        const { id, type, date, amount, desc } = entryForm;
        const amountVal = Number(String(amount).replace(/[^0-9]/g, ''));

        if (amountVal === 0) return showAlert("알림", "금액을 입력해주세요.");
        if (!selectedCustomer) return;

        try {
            if (window.__TAURI__) {
                const invoke = window.__TAURI__.core.invoke;
                if (id) {
                    await invoke('update_ledger_entry', {
                        ledgerId: id,
                        transactionDate: date,
                        transactionType: type,
                        amount: amountVal,
                        description: desc
                    });
                    await showAlert("성공", "수정되었습니다.");
                } else {
                    await invoke('create_ledger_entry', {
                        customerId: selectedCustomer.customer_id,
                        transactionDate: date,
                        transactionType: type,
                        amount: amountVal,
                        description: desc
                    });
                    await showAlert("성공", "등록되었습니다.");
                }

                setIsEntryModalOpen(false);
                handleSelectCustomer(selectedCustomer); // Refresh
                loadDefaultDebtList(); // Refresh list balances
            }
        } catch (e) {
            showAlert("오류", "저장 실패: " + e);
        }
    };

    const handleDeleteEntry = async (id) => {
        if (!await showConfirm("삭제 확인", "정말 이 내역을 삭제하시겠습니까?\n삭제 후 잔액은 자동으로 조정됩니다.")) return;
        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('delete_ledger_entry', { ledgerId: id });
                await showAlert("성공", "삭제되었습니다.");
                handleSelectCustomer(selectedCustomer);
                loadDefaultDebtList();
            }
        } catch (e) {
            showAlert("오류", "삭제 실패: " + e);
        }
    };

    // --- Render Helpers ---
    const filteredCustomers = customers.filter(c =>
        (c.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mobile_number || '').includes(searchQuery)
    );

    const currentBalance = ledger.length > 0 ? ledger[0].running_balance : (selectedCustomer?.current_balance || 0);

    return (
        <div className="sales-v3-container fade-in flex h-full pt-6 lg:pt-8 min-[2000px]:pt-12 px-6 lg:px-8 min-[2000px]:px-12 pb-6 lg:pb-8 min-[2000px]:pb-12">
            {/* Left Panel: Customer List */}
            <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-700 mb-2">미수/원장 관리</h2>
                    <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                            <span className="material-symbols-rounded absolute left-2 top-2 text-slate-400 text-sm">search</span>
                            <input className="input-field w-full pl-8 h-9 text-sm" placeholder="고객 검색" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <button onClick={() => setIsSearchModalOpen(true)} className="btn-secondary px-2 h-9" title="고객 추가"><span className="material-symbols-rounded">person_add</span></button>
                    </div>
                </div>
                <div className="p-2 bg-slate-50 text-xs text-slate-500 font-bold border-b border-slate-100 flex justify-between">
                    <span>고객 목록 ({filteredCustomers.length}명)</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" defaultChecked disabled /> <span>미수금 보유</span>
                    </label>
                </div>
                <div className="flex-1 overflow-auto">
                    {filteredCustomers.map(c => (
                        <div key={c.customer_id}
                            onClick={() => handleSelectCustomer(c)}
                            className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${selectedCustomer?.customer_id === c.customer_id ? 'bg-blue-50 border-blue-100' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-bold ${selectedCustomer?.customer_id === c.customer_id ? 'text-blue-700' : 'text-slate-700'}`}>{c.customer_name}</span>
                                <span className={`font-mono text-sm font-bold ${c.current_balance > 0 ? 'text-red-500' : c.current_balance < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {formatCurrency(c.current_balance)}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400">{c.mobile_number || '-'}</div>
                        </div>
                    ))}
                    {filteredCustomers.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">목록이 없습니다.</div>}
                </div>
            </div>

            {/* Right Panel: Ledger Detail */}
            <div className="flex-1 flex flex-col bg-slate-50">
                {selectedCustomer ? (
                    <>
                        <div className="p-5 bg-white border-b border-slate-200 shadow-sm flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                    <span className={`material-symbols-rounded ${selectedCustomer.is_member ? 'text-blue-500' : 'text-slate-400'}`}>person</span>
                                    {selectedCustomer.customer_name}
                                </h3>
                                <div className="text-sm text-slate-500">{selectedCustomer.mobile_number} | ID: {selectedCustomer.customer_id}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400 font-bold mb-1">현재 잔액 (미수금)</div>
                                <div className={`text-3xl font-bold ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                    {formatCurrency(currentBalance)}원
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-3 flex gap-2 justify-end">
                            <button onClick={() => openEntryModal('이월')} className="btn-secondary flex items-center gap-1 text-sm bg-white"><span className="material-symbols-rounded text-sm text-slate-500">history</span> 기초 이월</button>
                            <button onClick={() => openEntryModal('조정')} className="btn-secondary flex items-center gap-1 text-sm bg-white"><span className="material-symbols-rounded text-sm text-orange-500">tune</span> 잔액 조정</button>
                            <button onClick={() => openEntryModal('입금')} className="btn-primary flex items-center gap-1 text-sm"><span className="material-symbols-rounded text-sm">payments</span> 입금 등록</button>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto px-4 pb-4">
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm min-h-full">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold select-none">
                                        <tr>
                                            <th className="p-3 w-28 text-center">일자</th>
                                            <th className="p-3 w-20 text-center">구분</th>
                                            <th className="p-3 text-left">내용</th>
                                            <th className="p-3 w-32 text-right">변동금액</th>
                                            <th className="p-3 w-32 text-right bg-slate-50">잔액</th>
                                            <th className="p-3 w-20 text-center">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoadingLedger ? (
                                            <tr><td colSpan="6" className="p-10 text-center"><span className="material-symbols-rounded spin text-slate-400">sync</span></td></tr>
                                        ) : ledger.length === 0 ? (
                                            <tr><td colSpan="6" className="p-10 text-center text-slate-400">거래 내역이 없습니다.</td></tr>
                                        ) : (
                                            ledger.map(row => {
                                                const isEditable = ['이월', '입금', '조정', '매출수정', '매출취소'].includes(row.transaction_type);
                                                // Color coding
                                                let typeColor = 'text-slate-600';
                                                if (row.transaction_type === '매출') typeColor = 'text-blue-600';
                                                if (row.transaction_type === '입금') typeColor = 'text-green-600';
                                                if (['반품', '매출취소'].includes(row.transaction_type)) typeColor = 'text-red-500';

                                                return (
                                                    <tr key={row.ledger_id} className="hover:bg-slate-50">
                                                        <td className="p-3 text-center text-slate-500">{row.transaction_date}</td>
                                                        <td className={`p-3 text-center font-bold ${typeColor}`}>{row.transaction_type}</td>
                                                        <td className="p-3 text-slate-700">
                                                            {row.description}
                                                            {row.reference_id && <span className="text-xs text-slate-400 ml-1">({row.reference_id})</span>}
                                                        </td>
                                                        <td className="p-3 text-right font-mono">{formatCurrency(row.amount)}</td>
                                                        <td className="p-3 text-right font-mono font-bold bg-slate-50 text-slate-700">{formatCurrency(row.running_balance)}</td>
                                                        <td className="p-3 text-center">
                                                            {isEditable && (
                                                                <div className="flex justify-center gap-1">
                                                                    <button onClick={() => openEntryModal(null, row)} className="text-slate-400 hover:text-blue-500"><span className="material-symbols-rounded text-base">edit</span></button>
                                                                    <button onClick={() => handleDeleteEntry(row.ledger_id)} className="text-slate-400 hover:text-red-500"><span className="material-symbols-rounded text-base">delete</span></button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <span className="material-symbols-rounded text-6xl mb-4">account_balance_wallet</span>
                        <p>고객을 선택하여 원장을 조회하세요.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* Search Modal */}
            {isSearchModalOpen && (
                <div className="modal flex">
                    <div className="modal-content w-[500px]">
                        <h3 className="mb-4">거래처/고객 추가</h3>
                        <div className="flex gap-2 mb-4">
                            <input value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchCustomer()}
                                className="input-field flex-1" placeholder="이름 검색" autoFocus />
                            <button onClick={searchCustomer} className="btn-primary">검색</button>
                        </div>
                        <div className="h-[300px] overflow-auto border rounded bg-slate-50 mb-4">
                            <table className="w-full text-sm">
                                <tbody>
                                    {customerSearchResults.map(c => (
                                        <tr key={c.customer_id} className="bg-white border-b hover:bg-slate-50">
                                            <td className="p-3 font-bold">{c.customer_name}</td>
                                            <td className="p-3 text-slate-500">{c.mobile_number}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => addCustomerToList(c)} className="btn-primary py-1 px-3 text-xs">선택</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {customerSearchResults.length === 0 && <tr><td colSpan="3" className="p-10 text-center text-slate-400">검색 결과가 없습니다.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setIsSearchModalOpen(false)} className="btn-secondary">닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Entry Modal */}
            {isEntryModalOpen && (
                <div className="modal flex">
                    <div className="modal-content w-[400px]">
                        <h3 className="mb-4">{entryForm.id ? `${entryForm.type} 수정` : `${entryForm.type} 등록`}</h3>
                        <div className="mb-3">
                            <label className="text-xs font-bold block mb-1">일자</label>
                            <input type="date" value={entryForm.date} onChange={e => setEntryForm({ ...entryForm, date: e.target.value })} className="input-field w-full" />
                        </div>
                        <div className="mb-3">
                            <label className="text-xs font-bold block mb-1">금액</label>
                            <input value={formatCurrency(entryForm.amount)} onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })}
                                className="input-field w-full text-right font-bold text-lg text-blue-600" placeholder="0" />
                            <div className="text-xs text-right mt-1 text-slate-400">
                                {entryForm.type === '입금' ? '잔액이 차감됩니다.' : '잔액이 증가합니다.'}
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="text-xs font-bold block mb-1">내용 (메모)</label>
                            <input value={entryForm.desc} onChange={e => setEntryForm({ ...entryForm, desc: e.target.value })} className="input-field w-full" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEntryModalOpen(false)} className="btn-secondary">취소</button>
                            <button onClick={handleSaveEntry} className="btn-primary">저장 완료</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesLedger;
