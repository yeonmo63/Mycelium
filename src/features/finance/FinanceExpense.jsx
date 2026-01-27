import React, { useState, useEffect } from 'react';
import { formatCurrency, parseNumber, showAlert, showConfirm } from '../../utils/common';

const FinanceExpense = () => {
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const [filter, setFilter] = useState({ start: startOfMonth, end: today, category: '' });

    // Form
    const [form, setForm] = useState({
        id: null,
        date: today,
        category: '운영비',
        amount: 0,
        method: '계좌이체',
        memo: ''
    });

    // --- Init ---
    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        if (!window.__TAURI__) return;
        setIsLoading(true);
        try {
            const list = await window.__TAURI__.core.invoke('get_expense_list', {
                startDate: filter.start,
                endDate: filter.end,
                category: filter.category || null
            });
            setExpenses(list || []);
        } catch (e) {
            console.error(e);
            setExpenses([]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers ---
    const handleSave = async () => {
        if (form.amount <= 0) return showAlert("알림", "지출 금액을 입력해주세요.");

        const expense = {
            expense_id: form.id,
            expense_date: form.date,
            category: form.category,
            amount: form.amount,
            payment_method: form.method,
            memo: form.memo
        };

        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('save_expense', { expense });
                await showAlert("성공", "지출 내역이 저장되었습니다.");
                handleReset();
                loadExpenses();
            }
        } catch (e) {
            showAlert("오류", "저장 실패: " + e);
        }
    };

    const handleDelete = async (id) => {
        if (!await showConfirm("삭제 확인", "이 지출 내역을 삭제하시겠습니까?")) return;
        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('delete_expense', { id });
                loadExpenses();
            }
        } catch (e) {
            showAlert("오류", "삭제 실패: " + e);
        }
    };

    const handleReset = () => {
        setForm({
            id: null,
            date: new Date().toISOString().split('T')[0],
            category: '운영비',
            amount: 0,
            method: '계좌이체',
            memo: ''
        });
    };

    const loadToForm = (item) => {
        setForm({
            id: item.expense_id,
            date: item.expense_date,
            category: item.category,
            amount: item.amount,
            method: item.payment_method,
            memo: item.memo || ''
        });
    };

    // Stats
    const totalSum = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="sales-v3-container fade-in flex gap-4 p-4 h-full bg-slate-50">
            {/* Left: Form */}
            <div className="w-[350px] flex flex-col">
                <div className="modern-card bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-red-600">payments</span>
                        {form.id ? '지출 수정' : '지출 등록'}
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">지출일자</label>
                            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field w-full" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">지출 항목</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field w-full">
                                <option>운영비</option>
                                <option>인건비</option>
                                <option>임차료</option>
                                <option>수도광열비</option>
                                <option>통신비</option>
                                <option>광고선전비</option>
                                <option>접대비</option>
                                <option>차량유지비</option>
                                <option>소모품비</option>
                                <option>세금/공과</option>
                                <option>기타</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">금액</label>
                            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                                className="input-field w-full text-right text-lg font-bold" />
                        </div>

                        <div className="bg-red-50 p-3 rounded border border-red-100">
                            <div className="text-xs font-bold text-red-700 mb-1">지출 금액</div>
                            <div className="text-2xl font-black text-red-600">{formatCurrency(form.amount)}원</div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">지급 방법</label>
                            <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className="input-field w-full">
                                <option>계좌이체</option>
                                <option>현금</option>
                                <option>카드</option>
                                <option>기타</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">메모</label>
                            <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })}
                                className="input-field w-full h-20 resize-none" placeholder="상세 내역을 입력하세요..." />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={handleReset} className="btn-secondary flex-1">초기화</button>
                            <button onClick={handleSave} className="btn-primary flex-1">저장</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: List */}
            <div className="flex-1 flex flex-col">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg">지출 내역</h3>
                        <div className="bg-red-50 px-4 py-2 rounded border border-red-100">
                            <span className="text-xs text-red-700 font-bold">총 지출액</span>
                            <div className="text-xl font-black text-red-600">{formatCurrency(totalSum)}원</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input type="date" value={filter.start} onChange={e => setFilter({ ...filter, start: e.target.value })} className="input-field h-8 text-sm" />
                        <span className="flex items-center">~</span>
                        <input type="date" value={filter.end} onChange={e => setFilter({ ...filter, end: e.target.value })} className="input-field h-8 text-sm" />
                        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className="input-field h-8 text-sm w-32">
                            <option value="">전체 항목</option>
                            <option>운영비</option>
                            <option>인건비</option>
                            <option>임차료</option>
                            <option>수도광열비</option>
                            <option>통신비</option>
                            <option>광고선전비</option>
                            <option>접대비</option>
                            <option>차량유지비</option>
                            <option>소모품비</option>
                            <option>세금/공과</option>
                            <option>기타</option>
                        </select>
                        <button onClick={loadExpenses} className="btn-primary h-8 px-4 text-sm">조회</button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white rounded-lg shadow-sm border border-slate-200">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold sticky top-0">
                            <tr>
                                <th className="p-3 w-28 text-center">지출일</th>
                                <th className="p-3 text-center w-32">항목</th>
                                <th className="p-3 text-left">메모</th>
                                <th className="p-3 text-center w-24">지급방법</th>
                                <th className="p-3 text-right w-32">금액</th>
                                <th className="p-3 text-center w-20">편집</th>
                                <th className="p-3 text-center w-20">삭제</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="7" className="p-20 text-center"><span className="material-symbols-rounded spin text-3xl text-slate-400">sync</span></td></tr>
                            ) : expenses.length === 0 ? (
                                <tr><td colSpan="7" className="p-20 text-center text-slate-400">지출 내역이 없습니다.</td></tr>
                            ) : (
                                expenses.map(item => (
                                    <tr key={item.expense_id} onClick={() => loadToForm(item)} className="hover:bg-slate-50 cursor-pointer">
                                        <td className="p-3 text-center text-slate-500">{item.expense_date}</td>
                                        <td className="p-3 text-center">
                                            <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600">{item.category}</span>
                                        </td>
                                        <td className="p-3 text-slate-600">{item.memo || '-'}</td>
                                        <td className="p-3 text-center text-slate-500 text-xs">{item.payment_method}</td>
                                        <td className="p-3 text-right font-mono font-bold text-red-600">{formatCurrency(item.amount)}원</td>
                                        <td className="p-3 text-center">
                                            <button onClick={(e) => { e.stopPropagation(); loadToForm(item); }} className="text-blue-500 hover:text-blue-700">
                                                <span className="material-symbols-rounded text-base">edit</span>
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.expense_id); }} className="text-red-400 hover:text-red-600">
                                                <span className="material-symbols-rounded text-base">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinanceExpense;
