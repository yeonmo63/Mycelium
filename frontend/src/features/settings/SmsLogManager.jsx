import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '../../utils/apiBridge';
import { useModal } from '../../contexts/ModalContext';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { Mail, RefreshCw, Smartphone, CheckCircle, AlertCircle, Calendar, Lock } from 'lucide-react';

const SmsLogManager = () => {
    const navigate = useNavigate();
    const { showAlert } = useModal();
    const { isAuthorized, checkAdmin, isVerifying } = useAdminGuard();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Admin Guard Check ---
    const checkRunComp = useRef(false);
    useEffect(() => {
        if (checkRunComp.current) return;
        checkRunComp.current = true;

        const init = async () => {
            const ok = await checkAdmin();
            if (!ok) {
                navigate('/');
            }
        };
        init();
    }, [checkAdmin, navigate]);

    const loadLogs = async () => {
        if (!isAuthorized) return;
        setIsLoading(true);
        try {
            const data = await invoke('get_sms_logs');
            setLogs(data || []);
        } catch (e) {
            console.error(e);
            showAlert('오류', 'SMS 발송 내역을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            loadLogs();
        }
    }, [isAuthorized]);

    const filteredLogs = logs.filter(log =>
        log.recipient_name.includes(searchTerm) ||
        log.mobile_number.includes(searchTerm) ||
        log.content.includes(searchTerm)
    );

    if (!isAuthorized) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f8fafc]">
                <div className="text-center animate-pulse">
                    {isVerifying ? (
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                    ) : (
                        <Lock size={48} className="mx-auto text-slate-300 mb-4" />
                    )}
                    <p className="text-slate-400 font-bold">
                        {isVerifying ? '인증 확인 중...' : '인증 대기 중...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden animate-in fade-in duration-700">
            {/* Header */}
            <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4 shrink-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-1 bg-amber-500 rounded-full"></span>
                    <span className="text-[9px] font-black tracking-[0.2em] text-amber-500 uppercase">Communication Log</span>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-slate-700 tracking-tighter" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                            SMS 발송 내역 <span className="text-slate-300 font-light ml-1 text-xl">Transmission Logs</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
                            <Smartphone size={14} /> 시스템에서 발송된 모든 문자 메시지의 처리 상태를 확인합니다.
                        </p>
                    </div>
                    <button
                        onClick={loadLogs}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Filter Area */}
            <div className="px-6 lg:px-8 pb-4 shrink-0">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="수신인 이름, 연락처 또는 메시지 내용으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 px-6 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium text-slate-700 shadow-sm"
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-hidden px-6 lg:px-8 pb-8">
                <div className="h-full bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100">
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">상태</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">수신인</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">연락처</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">메시지 내용</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">발송 시각</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLogs.map((log) => (
                                    <tr key={log.log_id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            {log.status === '성공' ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[11px]">
                                                    <CheckCircle size={12} />
                                                    발송완료
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-bold text-[11px]">
                                                    <AlertCircle size={12} />
                                                    발송실패
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-700">{log.recipient_name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-slate-500 text-sm">{log.mobile_number}</span>
                                        </td>
                                        <td className="px-6 py-4 max-w-md">
                                            <p className="text-slate-600 text-sm truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all" title={log.content}>
                                                {log.content}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-500 text-[13px] font-medium">{log.sent_at.split(' ')[0]}</span>
                                                <span className="text-slate-300 text-[11px] font-bold uppercase tracking-tighter">{log.sent_at.split(' ')[1]}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan="5" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                                                <Mail size={48} />
                                                <p className="font-bold text-slate-500">발송 내역이 없습니다.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmsLogManager;
