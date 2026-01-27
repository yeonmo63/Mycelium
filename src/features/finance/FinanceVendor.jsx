import React, { useState, useEffect } from 'react';
import { showAlert, showConfirm } from '../../utils/common';

const FinanceVendor = () => {
    const [vendors, setVendors] = useState([]);
    const [allVendors, setAllVendors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Form
    const [form, setForm] = useState({
        id: null,
        name: '',
        bizNum: '',
        rep: '',
        mobile: '',
        email: '',
        address: '',
        items: '',
        memo: ''
    });

    // --- Init ---
    useEffect(() => {
        loadVendors();
    }, []);

    useEffect(() => {
        handleSearch();
    }, [searchQuery, allVendors]);

    const loadVendors = async () => {
        if (!window.__TAURI__) return;
        try {
            const list = await window.__TAURI__.core.invoke('get_vendor_list');
            setAllVendors(list || []);
            setVendors(list || []);
        } catch (e) {
            console.error(e);
        }
    };

    // --- Handlers ---
    const handleSave = async () => {
        if (!form.name.trim()) return showAlert("알림", "거래처명을 입력해주세요.");

        const vendor = {
            vendor_id: form.id,
            vendor_name: form.name,
            business_number: form.bizNum,
            representative: form.rep,
            mobile_number: form.mobile,
            email: form.email,
            address: form.address,
            main_items: form.items,
            memo: form.memo,
            is_active: true
        };

        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('save_vendor', { vendor });
                await showAlert("성공", "거래처 정보가 저장되었습니다.");
                handleReset();
                loadVendors();
            }
        } catch (e) {
            showAlert("오류", "저장 실패: " + e);
        }
    };

    const handleDelete = async (id, name) => {
        if (!await showConfirm("삭제 확인", `'${name}' 거래처를 삭제하시겠습니까?`)) return;
        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('delete_vendor', { id });
                loadVendors();
            }
        } catch (e) {
            showAlert("오류", "삭제 실패: " + e);
        }
    };

    const handleReset = () => {
        setForm({
            id: null,
            name: '',
            bizNum: '',
            rep: '',
            mobile: '',
            email: '',
            address: '',
            items: '',
            memo: ''
        });
        setSearchQuery('');
    };

    const loadToForm = (v) => {
        setForm({
            id: v.vendor_id,
            name: v.vendor_name,
            bizNum: v.business_number || '',
            rep: v.representative || '',
            mobile: v.mobile_number || '',
            email: v.email || '',
            address: v.address || '',
            items: v.main_items || '',
            memo: v.memo || ''
        });
        setSearchQuery(v.vendor_name);
    };

    const handleSearch = () => {
        if (!searchQuery) {
            setVendors(allVendors);
            return;
        }
        const filtered = allVendors.filter(v =>
            v.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.main_items && v.main_items.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setVendors(filtered);
    };

    return (
        <div className="sales-v3-container fade-in flex gap-4 p-4 h-full bg-slate-50">
            {/* Left: Form */}
            <div className="w-[380px] flex flex-col">
                <div className="modern-card bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-purple-600">store</span>
                        {form.id ? '거래처 수정' : '거래처 등록'}
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">거래처명 <span className="text-red-500">*</span></label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="input-field w-full font-bold" placeholder="ex. OO농산" autoFocus />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">사업자번호</label>
                            <input value={form.bizNum} onChange={e => setForm({ ...form, bizNum: e.target.value })}
                                className="input-field w-full" placeholder="000-00-00000" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">대표자</label>
                                <input value={form.rep} onChange={e => setForm({ ...form, rep: e.target.value })}
                                    className="input-field w-full" placeholder="홍길동" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">연락처</label>
                                <input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })}
                                    className="input-field w-full" placeholder="010-0000-0000" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">이메일</label>
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                className="input-field w-full" placeholder="email@example.com" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">주소</label>
                            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                className="input-field w-full" placeholder="사업장 주소" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">주요 품목</label>
                            <input value={form.items} onChange={e => setForm({ ...form, items: e.target.value })}
                                className="input-field w-full" placeholder="ex. 생표고버섯, 새송이버섯" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">메모</label>
                            <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })}
                                className="input-field w-full h-16 resize-none" placeholder="거래 특이사항..." />
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
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">거래처 목록</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500">총 <span className="font-bold text-purple-600">{vendors.length}</span>곳</span>
                            <div className="relative">
                                <span className="material-symbols-rounded absolute left-2 top-2 text-slate-400 text-sm">search</span>
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="input-field pl-8 h-8 w-64 text-sm" placeholder="거래처명 또는 품목 검색..." />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white rounded-lg shadow-sm border border-slate-200">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold sticky top-0">
                            <tr>
                                <th className="p-3 text-left">거래처명</th>
                                <th className="p-3 text-left w-32">대표자</th>
                                <th className="p-3 text-left w-40">연락처</th>
                                <th className="p-3 text-left">주요 품목</th>
                                <th className="p-3 text-center w-20">편집</th>
                                <th className="p-3 text-center w-20">삭제</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {vendors.length === 0 ? (
                                <tr><td colSpan="6" className="p-20 text-center text-slate-400">등록된 거래처가 없습니다.</td></tr>
                            ) : (
                                vendors.map(v => (
                                    <tr key={v.vendor_id} onClick={() => loadToForm(v)} className="hover:bg-slate-50 cursor-pointer">
                                        <td className="p-3 font-bold text-slate-800">{v.vendor_name}</td>
                                        <td className="p-3 text-slate-600">{v.representative || '-'}</td>
                                        <td className="p-3 text-slate-500 font-mono text-xs">{v.mobile_number || '-'}</td>
                                        <td className="p-3 text-slate-600">{v.main_items || '-'}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={(e) => { e.stopPropagation(); loadToForm(v); }} className="text-blue-500 hover:text-blue-700">
                                                <span className="material-symbols-rounded text-base">edit</span>
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(v.vendor_id, v.vendor_name); }} className="text-red-400 hover:text-red-600">
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

export default FinanceVendor;
