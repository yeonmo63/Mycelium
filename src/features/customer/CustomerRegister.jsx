import React, { useState, useEffect, useRef } from 'react';
import { formatPhoneNumber, showLocalLoading, hideLocalLoading } from '../../utils/common';
import { useModal } from '../../contexts/ModalContext';

const CustomerRegister = () => {
    const { showAlert, showConfirm } = useModal();
    // Form State
    const [formData, setFormData] = useState({
        joinDate: new Date().toISOString().split('T')[0],
        name: '',
        level: '일반',
        email: '',
        zip: '',
        addr1: '',
        addr2: '',
        phone: '',
        mobile: '',
        marketingConsent: false,
        anniversaryDate: '',
        anniversaryType: '',
        acquisition: '',
        purchaseCycle: '',
        prefProduct: '',
        prefPackage: '',
        subInterest: false,
        familyType: '',
        healthConcern: '',
        memo: ''
    });

    const [isProcessing, setIsProcessing] = useState(false);

    // Refs
    const nameInputRef = useRef(null);
    const mobileInputRef = useRef(null);
    const ocrInputRef = useRef(null);

    useEffect(() => {
        // Flatpickr initialization could go here if using a wrapper, 
        // but with React we often use native date input or a library.
        // For simplicity and alignment with original, we'll try native input type="date" first.

        // Auto-focus name on mount
        if (nameInputRef.current) nameInputRef.current.focus();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;

        if (name === 'mobile' || name === 'phone') {
            val = formatPhoneNumber(val);
        }

        setFormData(prev => ({
            ...prev,
            [name]: val
        }));
    };

    const handleAddressSearch = () => {
        // In a real Desktop App, we often open a new window or modal with Daum Postcode
        // Assuming global function or existing bridge.
        // For now, let's assume we have a global window.openAddressSearch or similar mechanism
        // OR we can implement a simple alert that it's not fully ported yet.
        if (window.openAddressSearch) {
            // We need to bridge the callback. The existing function expects DOM IDs.
            // We might need to refactor openAddressSearch to accept a callback.
            // For this migration step, let's use a temporary alert or try to hook into the global if available.

            // If we rely on the global function that sets DOM values by ID:
            window.openAddressSearch('reg-zip', 'reg-addr1', 'reg-addr2');
        } else {
            console.warn("Address search not available in this context yet.");
            // Mock for testing
            setFormData(prev => ({ ...prev, zip: '12345', addr1: '강원도 강릉시' }));
        }
    };

    // Address Search Callback Hack (Sync React state if DOM changes by external script)
    // In a pure React app, we wouldn't do this, but for hybrid migration:
    useEffect(() => {
        const checkAddressParams = () => {
            // This is a workaround if the external script writes to inputs directly.
            // Better: Pass a callback to openAddressSearch.
        };
        // Skip for now, assume manual entry or mock.
    }, []);


    const checkDuplicates = async () => {
        const { name, mobile } = formData;
        if (!name && !mobile) return;

        if (!window.__TAURI__) return; // Skip if not in Tauri

        try {
            let duplicates = [];
            const invoke = window.__TAURI__.core.invoke;

            if (name) {
                const nameDups = await invoke('search_customers_by_name', { name });
                duplicates = duplicates.concat(nameDups);
            }
            if (mobile && mobile.length > 5) {
                const mobileDups = await invoke('search_customers_by_mobile', { mobile });
                const nameIds = new Set(duplicates.map(d => d.customer_id));
                const uniqueMobileDups = mobileDups.filter(d => !nameIds.has(d.customer_id));
                duplicates = duplicates.concat(uniqueMobileDups);
            }

            if (duplicates.length > 0) {
                await showAlert('중복 확인', `중복 가능성이 있는 고객이 ${duplicates.length}명 발견되었습니다.`);
                // In future, show a nice modal with list
            }
        } catch (e) {
            console.error("Duplicate check failed:", e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            await showAlert('알림', '고객명을 입력해주세요.');
            nameInputRef.current?.focus();
            return;
        }

        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                await showAlert('알림', '올바른 이메일 형식을 입력해주세요.');
                return;
            }
        }

        if (await showConfirm('확인', '고객을 등록하시겠습니까?')) {
            await submitRegistration();
        }
    };

    const submitRegistration = async () => {
        setIsProcessing(true);
        try {
            // Map state to backend payload
            const payload = {
                name: formData.name,
                mobile: formData.mobile,
                level: formData.level,
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
            };

            console.log('Sending payload:', payload);

            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('create_customer', payload);
                await showAlert('성공', '고객이 성공적으로 등록되었습니다.');
                handleReset();
            } else {
                // Mock success for web preview
                await new Promise(r => setTimeout(r, 1000));
                console.log("Mock Submit Success");
                await showAlert('성공', '고객 등록 테스트 성공');
                handleReset();
            }

        } catch (error) {
            console.error('Failed to register customer:', error);
            await showAlert('오류', '고객 등록에 실패했습니다: ' + error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFormData({
            joinDate: new Date().toISOString().split('T')[0],
            name: '',
            level: '일반',
            email: '',
            zip: '',
            addr1: '',
            addr2: '',
            phone: '',
            mobile: '',
            marketingConsent: false,
            anniversaryDate: '',
            anniversaryType: '',
            acquisition: '',
            purchaseCycle: '',
            prefProduct: '',
            prefPackage: '',
            subInterest: false,
            familyType: '',
            healthConcern: '',
            memo: ''
        });
        nameInputRef.current?.focus();
    };

    const handleOcrClick = () => {
        ocrInputRef.current?.click();
    };

    const handleOcrFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Implement OCR Logic later or mock
        await showAlert("OCR", "OCR 기능은 현재 마이그레이션 중입니다.");
    };

    return (
        <div className="sales-v3-container fade-in">
            {/* Header */}
            <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-rounded" style={{ color: '#6366f1' }}>person_add</span>
                        신규 고객 등록
                    </h2>
                    <p className="subtitle">새로운 고객 정보를 시스템에 등록합니다. 명함 촬영(OCR) 기능을 활용하면 더욱 편리합니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', background: '#fff', padding: '8px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>명함 인식(OCR)</span>
                    <input type="file" ref={ocrInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleOcrFileChange} />
                    <button type="button" onClick={handleOcrClick} className="btn-secondary" style={{ height: '38px', padding: '0 16px', fontSize: '0.9rem', borderRadius: '10px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '20px', marginRight: '6px' }}>upload_file</span> 파일 선택
                    </button>
                    {/* Camera button skipped for MVP, easily added later */}
                </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>

                    {/* Basic Info Card */}
                    <div className="modern-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '20px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: '#1e293b' }}>
                            <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>info</span>
                            기본 인적 사항
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label>등록 일자</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">calendar_today</span>
                                    <input type="date" name="joinDate" className="input-field" value={formData.joinDate} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>고객명</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">person</span>
                                    <input type="text" name="name" className="input-field" placeholder="성함 입력" maxLength="50" required
                                        ref={nameInputRef} value={formData.name} onChange={handleChange} onBlur={checkDuplicates} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>회원 등급</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">star</span>
                                    <select name="level" className="input-field" value={formData.level} onChange={handleChange}>
                                        <option value="일반">일반</option>
                                        <option value="VIP">VIP</option>
                                        <option value="VVIP">VVIP</option>
                                        <option value="법인/단체">법인/단체</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>이메일 주소</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">mail</span>
                                    <input type="email" name="email" className="input-field" placeholder="example@mail.com" maxLength="100" value={formData.email} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '180px 2fr 1.5fr', gap: '24px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label>우편번호</label>
                                <div className="input-wrapper" style={{ cursor: 'pointer' }} onClick={handleAddressSearch}>
                                    <span className="material-symbols-rounded">markunread_mailbox</span>
                                    <input type="text" name="zip" id="reg-zip" className="input-field" placeholder="번호 검색" readOnly value={formData.zip} style={{ backgroundColor: '#fdfaff', cursor: 'pointer' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>기본 주소</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">home</span>
                                    <input type="text" name="addr1" id="reg-addr1" className="input-field" placeholder="주소 검색" value={formData.addr1} style={{ backgroundColor: '#fdfaff' }} readOnly />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>상세 주소</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">apartment</span>
                                    <input type="text" name="addr2" id="reg-addr2" className="input-field" placeholder="상세 주소" maxLength="255" value={formData.addr2} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                            <div className="form-group">
                                <label>일반전화</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">call</span>
                                    <input type="tel" name="phone" className="input-field" placeholder="02-000-0000" maxLength="20" value={formData.phone} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>휴대전화</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded" style={{ color: '#2563eb' }}>smartphone</span>
                                    <input type="tel" name="mobile" className="input-field" placeholder="010-0000-0000" maxLength="20" style={{ fontWeight: 700 }} value={formData.mobile} onChange={handleChange} onBlur={checkDuplicates} />
                                </div>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}>
                                    <input type="checkbox" name="marketingConsent" checked={formData.marketingConsent} onChange={handleChange} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                    <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>마케팅 정보 수신 동의 (이벤트 및 특판 알림)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* CRM Info Card */}
                    <div className="modern-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '20px', background: 'linear-gradient(145deg, #fff, #f5f3ff)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #ddd6fe', paddingBottom: '12px' }}>
                            <span className="material-symbols-rounded" style={{ color: '#7c3aed' }}>volunteer_activism</span>
                            CRM 및 고객 취향 정보
                        </h3>
                        {/* CRM Inputs Row 1 */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label>주요 기념일</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">cake</span>
                                    <input type="date" name="anniversaryDate" className="input-field" value={formData.anniversaryDate} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>기념일 종류</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">category</span>
                                    <select name="anniversaryType" className="input-field" value={formData.anniversaryType} onChange={handleChange}>
                                        <option value="">선택 안함</option>
                                        <option value="생일">생일</option>
                                        <option value="결혼기념일">결혼기념일</option>
                                        <option value="기타">기타</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>유입 경로</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">campaign</span>
                                    <select name="acquisition" className="input-field" value={formData.acquisition} onChange={handleChange}>
                                        <option value="">선택 하세요</option>
                                        <option value="SNS(인스타/페이스북)">SNS</option>
                                        <option value="인터넷 검색">인터넷 검색</option>
                                        <option value="지인 소개">지인 소개</option>
                                        <option value="유튜브">유튜브</option>
                                        <option value="광고">광고</option>
                                        <option value="기타">기타</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>구매 주기</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">sync</span>
                                    <select name="purchaseCycle" className="input-field" value={formData.purchaseCycle} onChange={handleChange}>
                                        <option value="">선택 하세요</option>
                                        <option value="매달 정기적">매달 정기적</option>
                                        <option value="분기별">분기별</option>
                                        <option value="명절/기념일">명절/기념일</option>
                                        <option value="가끔 주문">가끔 주문</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* CRM Inputs Row 2 */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label>선호 상품군</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">favorite</span>
                                    <select name="prefProduct" className="input-field" value={formData.prefProduct} onChange={handleChange}>
                                        <option value="">선택 하세요</option>
                                        <option value="생버섯">생버섯</option>
                                        <option value="건버섯">건버섯</option>
                                        <option value="가공품(가루/차)">가공품</option>
                                        <option value="체험 프로그램">체험 프로그램</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>선호 포장</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">inventory_2</span>
                                    <select name="prefPackage" className="input-field" value={formData.prefPackage} onChange={handleChange}>
                                        <option value="">선택 하세요</option>
                                        <option value="실속형(가정용)">실속형</option>
                                        <option value="선물용(프리미엄)">선물용</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ddd6fe', width: '100%' }}>
                                    <input type="checkbox" name="subInterest" checked={formData.subInterest} onChange={handleChange} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                    <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>정기 배송(구독형) 서비스에 관심이 있음</span>
                                </label>
                            </div>
                        </div>

                        {/* CRM Inputs Row 3 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="form-group">
                                <label>가족 구성 특징</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">family_restroom</span>
                                    <input type="text" name="familyType" className="input-field" placeholder="예: 자녀 있음" value={formData.familyType} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>건강 관심사</label>
                                <div className="input-wrapper">
                                    <span className="material-symbols-rounded">health_and_safety</span>
                                    <input type="text" name="healthConcern" className="input-field" placeholder="예: 당뇨관리" value={formData.healthConcern} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Memo */}
                    <div className="modern-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '20px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span className="material-symbols-rounded" style={{ color: '#64748b' }}>edit_note</span> 고객 상세 메모
                            </label>
                            <textarea name="memo" rows="4" className="input-field" style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem', lineHeight: 1.6 }} value={formData.memo} onChange={handleChange}></textarea>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="form-actions" style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #e2e8f0', padding: '20px 24px', zIndex: 20, display: 'flex', justifyContent: 'flex-end', gap: '16px', borderRadius: '0 0 20px 20px', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
                    <button type="button" className="btn-secondary" onClick={handleReset} style={{ height: '48px', padding: '0 24px', borderRadius: '12px' }}>
                        <span className="material-symbols-rounded">refresh</span> 화면 초기화
                    </button>
                    <button type="submit" className="btn-primary" disabled={isProcessing} style={{ height: '48px', padding: '0 36px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)' }}>
                        <span className="material-symbols-rounded">person_add</span> {isProcessing ? '처리 중...' : '신규 고객 등록하기'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CustomerRegister;
