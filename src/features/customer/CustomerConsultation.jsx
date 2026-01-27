import React, { useState, useEffect } from 'react';
import { showAlert, showConfirm } from '../../utils/common';

const CustomerConsultation = () => {
    const [consultations, setConsultations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({
        customerId: '',
        customerName: '', // For display/search
        contact: '',
        channel: '전화',
        counselor: '관리자',
        category: '일반',
        priority: '보통',
        title: '',
        content: ''
    });

    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

    // --- Init ---
    useEffect(() => {
        loadConsultations();
    }, []);

    const loadConsultations = async () => {
        if (!window.__TAURI__) return;
        setIsLoading(true);
        try {
            // Assuming get_consultations exists and accepts search query or returns recent
            // If backend only has get_consultations_by_customer, we might need a different approach.
            // But let's assume a general get_consultations or search exists.
            let res;
            if (searchQuery) {
                res = await window.__TAURI__.core.invoke('search_consultations', { query: searchQuery });
            } else {
                res = await window.__TAURI__.core.invoke('get_recent_consultations', { limit: 50 });
            }
            setConsultations(res || []);
        } catch (e) {
            console.error(e);
            // Fallback: maybe get_all? or handled error
            setConsultations([]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Actions ---
    const handleSearch = () => {
        loadConsultations();
    };

    const handleOpenModal = () => {
        setForm({
            customerId: '',
            customerName: '',
            contact: '',
            channel: '전화',
            counselor: '관리자', // Default or fetch current user
            category: '일반',
            priority: '보통',
            title: '',
            content: ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.customerName) return showAlert("알림", "고객명(상담대상)은 필수입니다.");
        if (!form.title) return showAlert("알림", "제목은 필수입니다.");

        // If customerId is not set (guest), handled by backend optional?
        // claims.js suggests guestName is used if customerId is missing.

        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('create_consultation', {
                    customerId: form.customerId ? Number(form.customerId) : null,
                    guestName: form.customerName,
                    contact: form.contact || null,
                    channel: form.channel,
                    counselorName: form.counselor,
                    category: form.category,
                    priority: form.priority,
                    title: form.title,
                    content: form.content
                });
                await showAlert("성공", "상담 내용이 등록되었습니다.");
                setIsModalOpen(false);
                loadConsultations();
            }
        } catch (e) {
            showAlert("오류", "저장 실패: " + e);
        }
    };

    // Customer Search for Modal
    const searchCustomer = async (keyword) => {
        if (!keyword) return;
        try {
            if (window.__TAURI__) {
                const res = await window.__TAURI__.core.invoke('search_customers_by_name', { name: keyword });
                setCustomerSearchResults(res || []);
                setIsCustomerSearchOpen(true);
            }
        } catch (e) { console.error(e); }
    };

    const selectCustomer = (c) => {
        setForm({
            ...form,
            customerId: c.customer_id,
            customerName: c.customer_name,
            contact: c.mobile_number || c.phone_number || ''
        });
        setIsCustomerSearchOpen(false);
    };


    return (
        <div className="sales-v3-container fade-in flex flex-col h-full bg-slate-50">
            <div className="content-header p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-rounded text-indigo-600">support_agent</span> 상담 관리 (CRM)
                </h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <span className="material-symbols-rounded absolute left-2 top-2 text-slate-400 text-sm">search</span>
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="input-field pl-8 w-64 h-9 text-sm" placeholder="상담 내역 검색..." />
                    </div>
                    <button onClick={handleSearch} className="btn-secondary h-9">검색</button>
                    <button onClick={handleOpenModal} className="btn-primary h-9 flex items-center gap-1">
                        <span className="material-symbols-rounded text-sm">add</span> 상담 등록
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {/* Card List Layout for Consultations */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center p-10"><span className="material-symbols-rounded spin text-3xl text-slate-400">sync</span></div>
                    ) : consultations.length === 0 ? (
                        <div className="col-span-full text-center p-10 text-slate-500">
                            상담 내역이 없습니다.
                            <div className="text-xs text-slate-400 mt-2">고객과의 상담 내역을 등록하여 관리해보세요.</div>
                        </div>
                    ) : (
                        consultations.map(item => (
                            <div key={item.consultation_id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.priority === '긴급' ? 'bg-red-50 text-red-500 border-red-100' :
                                                item.priority === '높음' ? 'bg-orange-50 text-orange-500 border-orange-100' :
                                                    'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>{item.priority}</span>
                                        <span className="text-xs text-slate-500 border px-1 rounded bg-slate-50">{item.category}</span>
                                    </div>
                                    <div className="text-xs text-slate-400">{item.created_at?.substring(0, 16).replace('T', ' ')}</div>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1 truncate">{item.title}</h4>
                                <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px] mb-3">{item.content}</p>

                                <div className="flex justify-between items-end border-t pt-3 border-slate-100">
                                    <div>
                                        <div className="font-bold text-sm text-slate-700 flex items-center gap-1">
                                            <span className="material-symbols-rounded text-base text-slate-400">person</span>
                                            {item.guest_name || item.customer_name || '미등록고객'}
                                        </div>
                                        <div className="text-xs text-slate-400 ml-5">{item.contact || '-'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400">상담원</div>
                                        <div className="text-xs font-bold text-slate-600">{item.counselor_name}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal flex">
                    <div className="modal-content w-[500px]">
                        <h3 className="mb-4">상담 내역 등록</h3>

                        {/* Customer Search in Modal */}
                        <div className="mb-3 relative">
                            <label className="text-xs font-bold block mb-1">고객 선택</label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input value={form.customerName} onChange={e => {
                                        setForm({ ...form, customerName: e.target.value });
                                        if (e.target.value.length > 1) searchCustomer(e.target.value);
                                    }} className="input-field w-full" placeholder="이름 입력 후 선택 또는 직접 입력" />

                                    {isCustomerSearchOpen && customerSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-lg rounded max-h-40 overflow-auto z-50">
                                            {customerSearchResults.map(c => (
                                                <div key={c.customer_id} onClick={() => selectCustomer(c)}
                                                    className="p-2 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0 border-slate-100">
                                                    <span className="font-bold">{c.customer_name}</span> <span className="text-slate-500 text-xs">({c.mobile_number})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="input-field w-32" placeholder="연락처" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs font-bold block mb-1">상담 채널</label>
                                <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} className="input-field w-full">
                                    <option>전화</option>
                                    <option>방문</option>
                                    <option>문자/카톡</option>
                                    <option>게시판</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1">상담원</label>
                                <input value={form.counselor} onChange={e => setForm({ ...form, counselor: e.target.value })} className="input-field w-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs font-bold block mb-1">유형 (카테고리)</label>
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field w-full">
                                    <option>일반</option>
                                    <option>주문문의</option>
                                    <option>배송문의</option>
                                    <option>클레임</option>
                                    <option>기타</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1">중요도</label>
                                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input-field w-full">
                                    <option>낮음</option>
                                    <option>보통</option>
                                    <option>높음</option>
                                    <option>긴급</option>
                                </select>
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="text-xs font-bold block mb-1">제목</label>
                            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field w-full" placeholder="상담 요약" />
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold block mb-1">상담 내용</label>
                            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="input-field w-full h-24 resize-none" placeholder="상세 내용" />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="btn-secondary">취소</button>
                            <button onClick={handleSave} className="btn-primary">저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerConsultation;
