import React, { useState, useEffect, useRef } from 'react';
import { formatPhoneNumber, formatCurrency, showAlert, showConfirm } from '../../utils/common';

const CustomerList = () => {
    // Mode: 'view' | 'edit'
    const [mode, setMode] = useState('view');
    const [searchTerm, setSearchTerm] = useState('');
    const [customer, setCustomer] = useState(null); // Selected customer
    const [salesHistory, setSalesHistory] = useState([]);
    const [addresses, setAddresses] = useState([]);

    // UI State for Modals
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiInsight, setAiInsight] = useState(null);

    // Form Data (for Edit)
    const [formData, setFormData] = useState({});

    // Refs
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
    }, []);

    // --- Search Logic ---
    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!searchTerm) {
            await showAlert("알림", "이름 또는 전화번호를 입력해주세요.");
            return;
        }

        if (!window.__TAURI__) {
            console.log("Mock Search for:", searchTerm);
            // Mock Data
            const mock = {
                customer_id: 1,
                customer_name: '홍길동',
                mobile_number: '010-1234-5678',
                membership_level: 'VIP',
                join_date: '2023-01-01',
                email: 'test@example.com',
                zip_code: '12345',
                address_primary: '강원도 강릉시',
                address_detail: '101호',
                marketing_consent: true
            };
            loadCustomer(mock);
            return;
        }

        try {
            const invoke = window.__TAURI__.core.invoke;
            let results = [];

            if (/[0-9]/.test(searchTerm)) {
                results = await invoke('search_customers_by_mobile', { mobile: searchTerm });
            }
            if (results.length === 0) {
                results = await invoke('search_customers_by_name', { name: searchTerm });
            }

            if (results.length === 0) {
                await showAlert("결과 없음", "검색 결과가 없습니다.");
            } else if (results.length === 1) {
                loadCustomer(results[0]);
            } else {
                // Should show selection modal, for now just pick first or generic alert
                await showAlert("다중 결과", `검색 결과가 ${results.length}건 있습니다. 첫 번째 결과를 불러옵니다.`);
                loadCustomer(results[0]);
            }

        } catch (err) {
            console.error(err);
            await showAlert("오류", "검색 중 오류가 발생했습니다.");
        }
    };

    const loadCustomer = async (c) => {
        setCustomer(c);
        setMode('view');

        // Map to flat form data
        setFormData({
            id: c.customer_id,
            name: c.customer_name,
            level: c.membership_level,
            joinDate: c.join_date,
            email: c.email || '',
            zip: c.zip_code || '',
            addr1: c.address_primary || '',
            addr2: c.address_detail || '',
            phone: c.phone_number || '',
            mobile: c.mobile_number || '',
            marketingConsent: c.marketing_consent === true || c.marketing_consent === 'true',
            anniversaryDate: c.anniversary_date || '',
            anniversaryType: c.anniversary_type || '',
            acquisition: c.acquisition_channel || '',
            purchaseCycle: c.purchase_cycle || '',
            prefProduct: c.pref_product_type || '',
            prefPackage: c.pref_package_type || '',
            subInterest: c.sub_interest === true || c.sub_interest === 'true',
            familyType: c.family_type || '',
            healthConcern: c.health_concern || '',
            memo: c.memo || ''
        });

        // Load Addresses
        loadAddresses(c.customer_id);
    };

    const loadAddresses = async (id) => {
        if (!window.__TAURI__) {
            setAddresses([
                { address_id: 1, address_alias: '기본', recipient_name: '홍길동', mobile_number: '010-1234-5678', zip_code: '12345', address_primary: '강원도 강릉시', is_default: true }
            ]);
            return;
        }
        try {
            const list = await window.__TAURI__.core.invoke('get_customer_addresses', { customerId: id });
            setAddresses(list || []);
        } catch (e) {
            console.error(e);
        }
    };

    // --- Form Handling ---
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        if (name === 'mobile' || name === 'phone') val = formatPhoneNumber(val);
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!await showConfirm('확인', '회원 정보를 수정하시겠습니까?')) return;

        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('update_customer', {
                    id: String(formData.id), // Ensure string if backend expects ID
                    name: formData.name,
                    mobile: formData.mobile,
                    level: formData.level,
                    // ... map rest
                    phone: formData.phone || null,
                    email: formData.email || null,
                    zip: formData.zip || null,
                    addr1: formData.addr1 || null,
                    addr2: formData.addr2 || null,
                    memo: formData.memo || null,
                    joinDate: formData.joinDate || null,
                    anniversaryDate: formData.anniversaryDate || null,
                    anniversaryType: formData.anniversaryType || null,
                    marketingConsent: formData.marketingConsent,
                    acquisitionChannel: formData.acquisition || null,
                    prefProductType: formData.prefProduct || null,
                    prefPackageType: formData.prefPackage || null,
                    familyType: formData.familyType || null,
                    healthConcern: formData.healthConcern || null,
                    subInterest: formData.subInterest,
                    purchaseCycle: formData.purchaseCycle || null
                });
            }
            await showAlert("성공", "수정되었습니다.");
            setMode('view');
        } catch (e) {
            await showAlert("오류", "수정 실패: " + e);
        }
    };

    const handleDelete = async () => {
        if (!customer) return;
        if (!await showConfirm('경고', '정말로 이 회원을 말소하시겠습니까?')) return;

        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('delete_customer', { id: String(customer.customer_id) });
            }
            await showAlert("성공", "삭제되었습니다.");
            handleClear();
        } catch (e) {
            await showAlert("오류", "삭제 실패: " + e);
        }
    };

    const handleClear = () => {
        setCustomer(null);
        setFormData({});
        setSearchTerm('');
        setMode('view');
        setAddresses([]);
        searchInputRef.current?.focus();
    };

    // --- Actions ---
    const fetchSales = async () => {
        if (!customer) return;
        if (!window.__TAURI__) {
            setSalesHistory([{ order_date: '2023-05-01', product_name: '상품 A', quantity: 2, total_amount: 50000, status: '완료' }]);
            setIsSalesModalOpen(true);
            return;
        }
        try {
            const sales = await window.__TAURI__.core.invoke('get_sales_by_customer_id', { customerId: String(customer.customer_id) });
            setSalesHistory(sales || []);
            setIsSalesModalOpen(true);
        } catch (e) {
            await showAlert("오류", "구매 내역 로드 실패");
        }
    };

    const fetchAiInsight = async () => {
        if (!customer) return;
        // Mock or Invoke
        setAiInsight({
            keywords: ['단골', '선물용'],
            ice_breaking: '안녕하세요! 지난 번 선물은 괜찮으셨나요?',
            sales_tip: '이번 시즌 한정판 추천'
        });
        setIsAiModalOpen(true);
    };

    return (
        <div className="sales-v3-container fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="content-header" style={{ marginBottom: '20px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-rounded" style={{ color: '#7c3aed' }}>manage_accounts</span>
                        고객 조회/수정/말소
                    </h2>
                    <p className="subtitle">고객 정보를 검색하고 최신 정보를 업데이트하거나 관리합니다.</p>
                </div>
                <div style={{ padding: '8px 20px', fontSize: '0.95rem', borderRadius: '24px', backgroundColor: mode === 'edit' ? '#f59e0b' : '#64748b', fontWeight: 700, color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    {mode === 'edit' ? '수정 모드 (입력 가능)' : '조회 모드 (잠금)'}
                </div>
            </div>

            {/* Search Bar */}
            <div className="modern-card" style={{ padding: '16px 24px', marginBottom: '20px', borderRadius: '16px', flexShrink: 0, border: '1px solid #e2e8f0', background: '#fff' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="input-wrapper" style={{ flex: 1, maxWidth: '500px' }}>
                        <span className="material-symbols-rounded" style={{ color: '#6366f1' }}>person_search</span>
                        <input type="text" className="input-field" placeholder="고객 성함 또는 전화번호 뒷자리 입력 (엔터)"
                            style={{ height: '44px', fontSize: '1rem', paddingLeft: '48px' }}
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            ref={searchInputRef}
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: '44px', padding: '0 24px', fontSize: '1rem', borderRadius: '10px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '20px', marginRight: '8px' }}>search</span>고객 조회
                    </button>
                </form>
            </div>

            {/* Main Form */}
            <form onSubmit={handleUpdate} autoComplete="off" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', opacity: customer ? 1 : 0.6, pointerEvents: customer ? 'auto' : 'none' }}>

                    {/* Basic Info */}
                    <div className="modern-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '20px', background: 'white' }}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: '#1e293b' }}>
                            <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>info</span>
                            기본 인적 사항
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>등록일</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">calendar_today</span>
                                    <input type="text" name="joinDate" className="input-field" value={formData.joinDate || ''} readOnly style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>고객명</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">person</span>
                                    <input type="text" name="name" className="input-field" value={formData.name || ''} onChange={handleChange} readOnly={mode === 'view'}
                                        style={mode === 'view' ? { backgroundColor: '#f8fafc' } : { backgroundColor: 'white' }} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>회원 등급</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">star</span>
                                    <select name="level" className="input-field" value={formData.level || '일반'} onChange={handleChange} disabled={mode === 'view'}>
                                        <option value="일반">일반</option>
                                        <option value="VIP">VIP</option>
                                        <option value="VVIP">VVIP</option>
                                        <option value="법인/단체">법인/단체</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>이메일</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">mail</span>
                                    <input type="email" name="email" className="input-field" value={formData.email || ''} onChange={handleChange} readOnly={mode === 'view'}
                                        style={mode === 'view' ? { backgroundColor: '#f8fafc' } : { backgroundColor: 'white' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '180px 2fr 1.5fr', gap: '20px', marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>우편번호</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">markunread_mailbox</span>
                                    <input type="text" name="zip" className="input-field" value={formData.zip || ''} readOnly
                                        style={{ backgroundColor: mode === 'view' ? '#f8fafc' : '#fdfaff', cursor: mode === 'edit' ? 'pointer' : 'default' }}
                                        onClick={mode === 'edit' ? () => window.openAddressSearch && window.openAddressSearch() : undefined}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>기본 주소</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">home</span>
                                    <input type="text" name="addr1" className="input-field" value={formData.addr1 || ''} readOnly
                                        style={{ backgroundColor: mode === 'view' ? '#f8fafc' : '#fdfaff' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>상세 주소</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">apartment</span>
                                    <input type="text" name="addr2" className="input-field" value={formData.addr2 || ''} onChange={handleChange} readOnly={mode === 'view'}
                                        style={mode === 'view' ? { backgroundColor: '#f8fafc' } : { backgroundColor: 'white' }} />
                                </div>
                            </div>
                        </div>

                        {/* Phone & Marketing */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            <div className="form-group">
                                <label>일반전화</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">call</span>
                                    <input type="tel" name="phone" className="input-field" value={formData.phone || ''} onChange={handleChange} readOnly={mode === 'view'}
                                        style={mode === 'view' ? { backgroundColor: '#f8fafc' } : { backgroundColor: 'white' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>휴대전화</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded" style={{ color: '#2563eb' }}>smartphone</span>
                                    <input type="tel" name="mobile" className="input-field" value={formData.mobile || ''} onChange={handleChange} readOnly={mode === 'view'}
                                        style={mode === 'view' ? { backgroundColor: '#f8fafc' } : { backgroundColor: 'white', fontWeight: 600 }} />
                                </div>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', background: '#f8fafc', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}>
                                    <input type="checkbox" name="marketingConsent" checked={formData.marketingConsent || false} onChange={handleChange} disabled={mode === 'view'} style={{ width: '20px', height: '20px' }} />
                                    <span style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>마케팅 정보 수신 동의 (광고성 문자 등)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* CRM Info (Simplified for brevity, similar to register) */}
                    <div className="modern-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '20px', background: 'linear-gradient(145deg, #fff, #f5f3ff)' }}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #ddd6fe', paddingBottom: '12px' }}>
                            <span className="material-symbols-rounded" style={{ color: '#7c3aed' }}>volunteer_activism</span>
                            CRM 및 고객 취향 정보
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            <div className="form-group">
                                <label>구매 주기</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">sync</span>
                                    <select name="purchaseCycle" className="input-field" value={formData.purchaseCycle || ''} onChange={handleChange} disabled={mode === 'view'}>
                                        <option value="">선택 하세요</option>
                                        <option value="매달 정기적">매달 정기적</option>
                                        <option value="가끔 주문">가끔 주문</option>
                                    </select>
                                </div>
                            </div>
                            {/* ... more CRM fields ... */}
                            <div className="form-group">
                                <label>건강 관심사</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">health_and_safety</span>
                                    <input type="text" name="healthConcern" className="input-field" value={formData.healthConcern || ''} onChange={handleChange} readOnly={mode === 'view'}
                                        style={mode === 'view' ? { backgroundColor: '#f8fafc' } : { backgroundColor: 'white' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address List */}
                    <div style={{ marginBottom: '20px' }}>
                        <div className="modern-card" style={{ padding: '24px', borderRadius: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-rounded" style={{ color: '#6366f1' }}>local_shipping</span>
                                추가 배송지 관리
                            </h3>
                            <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '12px', fontSize: '0.85rem' }}>구분</th>
                                            <th style={{ padding: '12px', fontSize: '0.85rem' }}>수령인</th>
                                            <th style={{ padding: '12px', fontSize: '0.85rem' }}>주소</th>
                                            <th style={{ padding: '12px', fontSize: '0.85rem', textAlign: 'center' }}>기본</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {addresses.map(addr => (
                                            <tr key={addr.address_id}>
                                                <td style={{ padding: '10px' }}>{addr.address_alias}</td>
                                                <td style={{ padding: '10px' }}>{addr.recipient_name}</td>
                                                <td style={{ padding: '10px' }}>({addr.zip_code}) {addr.address_primary}</td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    <input type="radio" checked={addr.is_default} readOnly />
                                                </td>
                                            </tr>
                                        ))}
                                        {addresses.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>등록된 배송지가 없습니다.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Memo */}
                    <div className="modern-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '20px' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span className="material-symbols-rounded" style={{ color: '#64748b' }}>edit_note</span> 고객 상세 메모
                            </label>
                            <textarea name="memo" rows="4" className="input-field" value={formData.memo || ''} onChange={handleChange} readOnly={mode === 'view'}
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem', lineHeight: 1.6, backgroundColor: mode === 'view' ? '#f8fafc' : 'white' }}></textarea>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="form-actions" style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #e2e8f0', padding: '16px 20px', zIndex: 20, display: 'flex', justifyContent: 'flex-end', gap: '12px', borderRadius: '0 0 20px 20px' }}>
                    <button type="button" className="btn-secondary" onClick={handleClear} style={{ marginRight: 'auto', height: '48px', padding: '0 20px' }}>
                        <span className="material-symbols-rounded">refresh</span> 화면 초기화
                    </button>

                    {customer ? (
                        mode === 'view' ? (
                            <>
                                <button type="button" className="btn-secondary" onClick={fetchAiInsight} style={{ height: '48px', borderColor: '#8b5cf6', color: '#8b5cf6', backgroundColor: '#f5f3ff' }}>
                                    <span className="material-symbols-rounded">auto_awesome</span> AI 통찰
                                </button>
                                <button type="button" className="btn-secondary" onClick={fetchSales} style={{ height: '48px', borderColor: '#10b981', color: '#10b981', backgroundColor: '#f0fdf4' }}>
                                    <span className="material-symbols-rounded">shopping_cart</span> 주문 내역
                                </button>
                                <button type="button" className="btn-primary" onClick={() => setMode('edit')} style={{ height: '48px', padding: '0 24px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none' }}>
                                    <span className="material-symbols-rounded">edit</span> 정보 수정하기
                                </button>
                                <button type="button" className="btn-secondary" onClick={handleDelete} style={{ height: '48px', padding: '0 20px', color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}>
                                    <span className="material-symbols-rounded">delete</span> 말소
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" className="btn-secondary" onClick={() => { setMode('view'); loadCustomer(customer); }} style={{ height: '48px', padding: '0 24px' }}>
                                    <span className="material-symbols-rounded">close</span> 취소
                                </button>
                                <button type="submit" className="btn-primary" style={{ height: '48px', padding: '0 32px' }}>
                                    <span className="material-symbols-rounded">save</span> 수정 정보 저장
                                </button>
                            </>
                        )
                    ) : null}
                </div>
            </form>

            {/* Sales Modal */}
            {isSalesModalOpen && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content" style={{ width: '800px', maxWidth: '90vw' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>구매 내역</h3>
                            <button onClick={() => setIsSalesModalOpen(false)} className="btn-icon"><span className="material-symbols-rounded">close</span></button>
                        </div>
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ padding: '12px' }}>주문일</th>
                                        <th style={{ padding: '12px' }}>상품명</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>합계</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesHistory.map((s, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '12px' }}>{s.order_date.split('T')[0]}</td>
                                            <td style={{ padding: '12px' }}>{s.product_name}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>{s.total_amount.toLocaleString()}원</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>{s.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Insight Modal (Simple Version) */}
            {isAiModalOpen && aiInsight && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content" style={{ width: '450px' }}>
                        <h3>AI 고객 통찰</h3>
                        <div style={{ background: '#fdf4ff', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                            <strong>키워드:</strong> {aiInsight.keywords.join(', ')}
                        </div>
                        <p><strong>아이스브레이킹:</strong> {aiInsight.ice_breaking}</p>
                        <p><strong>판매 팁:</strong> {aiInsight.sales_tip}</p>
                        <button onClick={() => setIsAiModalOpen(false)} className="btn-primary" style={{ marginTop: '16px', width: '100%' }}>닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerList;
