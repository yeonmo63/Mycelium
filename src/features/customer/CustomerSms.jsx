import React, { useState, useEffect } from 'react';
import { showAlert, showConfirm } from '../../utils/common';

const SMS_TEMPLATES = {
    greeting: `[{COMPANY}] 안녕하세요 고객님! 🍄\n싱싱한 버섯 향기가 가득한 계절입니다.\n항상 저희를 아껴주시는 마음에 깊이 감사드리며, 환절기 건강 유의하시길 바랍니다.`,
    promo: `[{COMPANY}/광고] 🎉 감사 대잔치!\n오늘 단 하루, 전 품목 20% 할인 혜택을 드립니다.\n산지의 신선함을 지금 바로 주문하세요!\n무료수신거부: 080-1234-5678`,
    repurchase: `[{COMPANY}] 버섯 드실 때가 되었네요! 😉\n고객님이 좋아하시는 생표고버섯이 오늘 아침 아주 좋게 들어왔습니다. 산지 직송의 맛 그대로 보내드릴게요.`,
    seasonal: `[{COMPANY}] ❄️ 찬바람 불 때 생각나는 뜨끈한 버섯 전골!\n가족과 함께하는 주말 한 끼, 저희 버섯으로 풍성하게 채워보세요.`,
    anniversary: `[{COMPANY}] 🎂 고객님의 소중한 날을 축하합니다!\n감사의 마음을 담아 5,000원 할인 쿠폰을 넣어드렸습니다.\n즐거운 하루 보내세요!`,
    recovery: `[{COMPANY}] 죄송하고 감사한 마음을 담았습니다. 🙏\n지난번 이용에 불편을 드려 다시 한번 사과드립니다. 너그러이 이해해 주셔서 감사하며, 다음 주문 시 사용 가능한 [감사 할인권]을 발송해 드립니다. 더 좋은 품질로 보답하겠습니다.`
};

const CustomerSms = () => {
    // --- State ---
    const [targets, setTargets] = useState({
        all: false,
        normal: false,
        vip: false,
        vvip: false,
        group: false,
        recovery: false
    });
    const [msgMode, setMsgMode] = useState('sms'); // 'sms' | 'kakao'
    const [content, setContent] = useState('');
    const [byteKey, setByteKey] = useState(0); // Trigger recalc
    const [companyName, setCompanyName] = useState('스마트 농장');

    // Claim Target Modal
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [claimDays, setClaimDays] = useState(90);
    const [claimTargets, setClaimTargets] = useState([]);
    const [selectedClaims, setSelectedClaims] = useState(new Set());
    const [confirmedClaims, setConfirmedClaims] = useState(0);

    // --- Init ---
    useEffect(() => {
        fetchCompanyInfo();
    }, []);

    const fetchCompanyInfo = async () => {
        if (!window.__TAURI__) return;
        try {
            const info = await window.__TAURI__.core.invoke('get_company_info');
            if (info?.company_name) setCompanyName(info.company_name);
        } catch (e) { console.error(e); }
    };

    // --- Handlers ---
    const handleTargetChange = (key, checked) => {
        if (key === 'all') {
            setTargets({
                all: checked,
                normal: checked,
                vip: checked,
                vvip: checked,
                group: checked,
                recovery: checked
            });
        } else {
            const next = { ...targets, [key]: checked };
            const allChecked = ['normal', 'vip', 'vvip', 'group', 'recovery'].every(k => next[k]);
            next.all = allChecked;
            setTargets(next);
        }
    };

    const loadTemplate = (key) => {
        if (!SMS_TEMPLATES[key]) return;
        setContent(SMS_TEMPLATES[key].replace(/\{COMPANY\}/g, companyName));
    };

    const getByteCount = (str) => {
        let len = 0;
        for (let i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) > 128) len += 2;
            else len += 1;
        }
        return len;
    };

    const handleSend = async () => {
        const selectedTypes = Object.entries(targets).filter(([k, v]) => k !== 'all' && v).map(([k]) => k);
        if (selectedTypes.length === 0) return showAlert("알림", "발송 대상을 선택해주세요.");
        if (!content.trim()) return showAlert("알림", "메시지 내용을 입력해주세요.");

        const modeText = msgMode === 'kakao' ? '알림톡' : '문자 메시지';
        if (!await showConfirm("전송 확인", `선택한 대상에게 ${modeText}를 발송하시겠습니까?`)) return;

        try {
            if (window.__TAURI__) {
                const recipients = selectedTypes; // In real app, resolved to IDs
                if (targets.recovery && confirmedClaims > 0) recipients.push(`claim_targets_${confirmedClaims}`);

                const res = await window.__TAURI__.core.invoke('send_sms_simulation', {
                    mode: msgMode,
                    recipients,
                    content,
                    templateCode: msgMode === 'kakao' ? 'TEMPLATE_001' : null
                });

                if (res.success) {
                    await showAlert("성공", `메시지 아이디: ${res.message_id || 'unknown'}\n성공적으로 접수되었습니다.`);
                    setContent('');
                } else {
                    await showAlert("실패", res.error || "알 수 없는 오류");
                }
            }
        } catch (e) {
            showAlert("오류", "발송 중 오류: " + e);
        }
    };

    // --- Claim Selector ---
    const openClaimSelector = async () => {
        setIsClaimModalOpen(true);
        loadClaimTargets(claimDays);
    };

    const loadClaimTargets = async (days) => {
        if (!window.__TAURI__) return;
        try {
            const list = await window.__TAURI__.core.invoke('get_claim_targets', { days });
            setClaimTargets(list || []);
        } catch (e) {
            console.error(e);
            setClaimTargets([]);
        }
    };

    const handleClaimCheck = (num) => {
        const next = new Set(selectedClaims);
        if (next.has(num)) next.delete(num);
        else next.add(num);
        setSelectedClaims(next);
    };

    const confirmClaimSelection = () => {
        setConfirmedClaims(selectedClaims.size);
        if (selectedClaims.size > 0) {
            setTargets(prev => ({ ...prev, recovery: true }));
        }
        setIsClaimModalOpen(false);
    };

    // --- Derived ---
    const byteCount = getByteCount(content);
    const msgType = byteCount > 90 ? 'LMS (장문)' : 'SMS (단문)';

    return (
        <div className="sales-v3-container fade-in flex h-full bg-slate-50 gap-4 p-4">

            {/* Left Panel: Target Selection */}
            <div className="w-[300px] flex flex-col gap-4">
                <div className="modern-card p-4 bg-white rounded-lg shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="material-symbols-rounded text-blue-600">group_add</span> 발송 대상
                    </h3>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-100">
                            <input type="checkbox" checked={targets.all} onChange={e => handleTargetChange('all', e.target.checked)} className="rounded text-blue-600" />
                            <span className="font-bold">전체 고객</span>
                        </label>
                        <hr className="border-slate-100 my-2" />
                        <label className="flex items-center gap-2 px-2 py-1 cursor-pointer text-sm">
                            <input type="checkbox" checked={targets.normal} onChange={e => handleTargetChange('normal', e.target.checked)} />
                            <span>일반 회원</span>
                        </label>
                        <label className="flex items-center gap-2 px-2 py-1 cursor-pointer text-sm">
                            <input type="checkbox" checked={targets.vip} onChange={e => handleTargetChange('vip', e.target.checked)} />
                            <span>VIP 회원</span>
                        </label>
                        <label className="flex items-center gap-2 px-2 py-1 cursor-pointer text-sm">
                            <input type="checkbox" checked={targets.vvip} onChange={e => handleTargetChange('vvip', e.target.checked)} />
                            <span>VVIP 회원</span>
                        </label>
                        <label className="flex items-center gap-2 px-2 py-1 cursor-pointer text-sm">
                            <input type="checkbox" checked={targets.group} onChange={e => handleTargetChange('group', e.target.checked)} />
                            <span>법인/단체</span>
                        </label>
                        <hr className="border-slate-100 my-2" />
                        <div className="flex items-center justify-between px-2 py-1">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={targets.recovery} onChange={e => handleTargetChange('recovery', e.target.checked)} />
                                <span className="text-red-500 font-bold">클레임/이탈 고객</span>
                            </label>
                            {targets.recovery && (
                                <button onClick={openClaimSelector} className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100">
                                    {confirmedClaims > 0 ? `${confirmedClaims}명 선택` : '명단 선택'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modern-card p-4 bg-white rounded-lg shadow-sm border border-slate-200 flex-1">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="material-symbols-rounded text-green-600">article</span> 템플릿
                    </h3>
                    <div className="flex flex-col gap-2 overflow-auto max-h-[400px]">
                        <button onClick={() => loadTemplate('greeting')} className="text-left text-xs p-3 rounded bg-slate-50 hover:bg-blue-50 border border-slate-100 transition-colors">
                            <span className="font-bold block mb-1">👋 계절 인사</span>
                            <span className="text-slate-500 truncate block">안녕하세요 고객님! 싱싱한...</span>
                        </button>
                        <button onClick={() => loadTemplate('promo')} className="text-left text-xs p-3 rounded bg-slate-50 hover:bg-blue-50 border border-slate-100 transition-colors">
                            <span className="font-bold block mb-1">🎉 할인 행사</span>
                            <span className="text-slate-500 truncate block">감사 대잔치! 전 품목 20%...</span>
                        </button>
                        <button onClick={() => loadTemplate('repurchase')} className="text-left text-xs p-3 rounded bg-slate-50 hover:bg-blue-50 border border-slate-100 transition-colors">
                            <span className="font-bold block mb-1">🍄 재구매 유도</span>
                            <span className="text-slate-500 truncate block">버섯 드실 때가 되었네요...</span>
                        </button>
                        <button onClick={() => loadTemplate('recovery')} className="text-left text-xs p-3 rounded bg-red-50 hover:bg-red-100 border border-red-100 transition-colors">
                            <span className="font-bold block mb-1 text-red-600">🙏 사과/보상</span>
                            <span className="text-slate-500 truncate block">죄송하고 감사한 마음을 담아...</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Message Editor */}
            <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg">메시지 작성</h2>
                    <div className="flex gap-2 bg-slate-100 p-1 rounded">
                        <button onClick={() => setMsgMode('sms')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${msgMode === 'sms' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>문자 (SMS/LMS)</button>
                        <button onClick={() => setMsgMode('kakao')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${msgMode === 'kakao' ? 'bg-[#FEE500] shadow text-slate-900' : 'text-slate-500'}`}>알림톡 (Kakao)</button>
                    </div>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50">
                    <div className="w-[360px] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                        {/* Phone Header */}
                        <div className="bg-slate-800 text-white p-4 py-3 flex items-center justify-between">
                            <span className="material-symbols-rounded text-sm">arrow_back_ios</span>
                            <span className="font-bold text-sm">{msgMode === 'kakao' ? '알림톡' : '문자메시지'}</span>
                            <span className="material-symbols-rounded text-sm">more_vert</span>
                        </div>

                        {/* Preview Screen */}
                        <div className="h-[400px] bg-[#f2f4f6] p-4 overflow-auto">
                            {content && (
                                <div className={`p-3 rounded-lg text-sm mb-2 max-w-[90%] ${msgMode === 'kakao' ? 'bg-white border border-slate-200' : 'bg-[#e9e9e9] self-start'}`}>
                                    {msgMode === 'kakao' && <div className="text-yellow-500 text-xs font-bold mb-1">[알림톡]</div>}
                                    <pre className="whitespace-pre-wrap font-sans text-slate-700">{content}</pre>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-slate-200">
                            <textarea value={content} onChange={e => setContent(e.target.value)}
                                className="w-full h-24 text-sm resize-none outline-none" placeholder="내용을 입력하세요..." />
                            <div className="flex justify-between items-center mt-2">
                                <div className="text-xs text-slate-400 font-mono">
                                    <span className={byteCount > 90 ? 'text-purple-600 font-bold' : ''}>{byteCount}</span> bytes
                                    <span className="ml-2 border px-1 rounded bg-slate-50">{msgType}</span>
                                </div>
                                <button onClick={handleSend}
                                    className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-1 ${msgMode === 'kakao' ? 'bg-[#FEE500] text-slate-900 hover:bg-[#fdd835]' : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}>
                                    <span className="material-symbols-rounded text-sm">send</span> 전송
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Claim Modal */}
            {isClaimModalOpen && (
                <div className="modal flex">
                    <div className="modal-content w-[600px]">
                        <h3>클레임/이탈 고객 선택</h3>
                        <div className="flex justify-between items-center mb-4 mt-2">
                            <select value={claimDays} onChange={e => { setClaimDays(e.target.value); loadClaimTargets(e.target.value); }} className="input-field w-32">
                                <option value="30">최근 1개월</option>
                                <option value="90">최근 3개월</option>
                                <option value="180">최근 6개월</option>
                                <option value="365">최근 1년</option>
                            </select>
                            <div className="text-sm text-slate-500">
                                선택됨: <span className="font-bold text-blue-600">{selectedClaims.size}</span>명
                            </div>
                        </div>

                        <div className="h-[300px] overflow-auto border rounded bg-slate-50 mb-4">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-xs font-bold text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="p-2 w-10 text-center">선택</th>
                                        <th className="p-2">이름</th>
                                        <th className="p-2">연락처</th>
                                        <th className="p-2 text-center w-16">회원</th>
                                        <th className="p-2 text-center w-16">유형</th>
                                        <th className="p-2 text-center w-24">발생일</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claimTargets.map((t, idx) => (
                                        <tr key={idx} className="bg-white border-b hover:bg-slate-50" onClick={() => handleClaimCheck(t.mobile)}>
                                            <td className="p-2 text-center">
                                                <input type="checkbox" checked={selectedClaims.has(t.mobile)} readOnly />
                                            </td>
                                            <td className="p-2 font-bold">{t.name}</td>
                                            <td className="p-2 text-slate-500 text-xs">{t.mobile}</td>
                                            <td className="p-2 text-center text-xs">{t.is_member ? 'O' : 'X'}</td>
                                            <td className={`p-2 text-center text-xs font-bold ${t.claim_type === '취소' ? 'text-red-500' : 'text-orange-500'}`}>{t.claim_type}</td>
                                            <td className="p-2 text-center text-xs text-slate-400">{t.date}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsClaimModalOpen(false)} className="btn-secondary">취소</button>
                            <button onClick={confirmClaimSelection} className="btn-primary">선택 완료</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerSms;
