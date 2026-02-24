import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { callBridge } from '../../utils/apiBridge';
import { useModal } from '../../contexts/ModalContext';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import {
    Monitor,
    Smartphone,
    Globe,
    Clock,
    XCircle,
    ShieldCheck,
    History,
    LogOut,
    RefreshCw,
    Lock
} from 'lucide-react';

const SettingsSessions = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useModal();
    const { isAuthorized, checkAdmin, isVerifying } = useAdminGuard();
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

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

    const loadSessions = useCallback(async () => {
        if (!isAuthorized) return;
        setIsLoading(true);
        try {
            const list = await callBridge('get_auth_sessions');
            setSessions(list || []);
        } catch (err) {
            console.error("Failed to load sessions:", err);
            showAlert('오류', '세션 정보를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [showAlert, isAuthorized]);

    useEffect(() => {
        if (isAuthorized) {
            loadSessions();
        }
    }, [loadSessions, isAuthorized]);

    const handleRevoke = async (sessionId) => {
        if (!await showConfirm('원격 로그아웃', '해당 기기에서 로그아웃 시키겠습니까?')) return;

        try {
            await callBridge('revoke_auth_session', { session_id: sessionId });
            showAlert('완료', '원격 로그아웃 처리되었습니다.');
            loadSessions();
        } catch (err) {
            showAlert('오류', '요청 처리 중 오류가 발생했습니다: ' + err);
        }
    };

    // Simple UA Parser
    const parseUA = (ua) => {
        if (!ua) return { type: 'unknown', name: 'Unknown Device' };
        const lowerUA = ua.toLowerCase();

        let type = 'desktop';
        if (lowerUA.includes('mobi') || lowerUA.includes('android')) type = 'mobile';

        let name = 'Web Browser';
        if (lowerUA.includes('chrome')) name = 'Chrome';
        else if (lowerUA.includes('firefox')) name = 'Firefox';
        else if (lowerUA.includes('safari')) name = 'Safari';
        else if (lowerUA.includes('edge')) name = 'Edge';

        let os = '';
        if (lowerUA.includes('windows')) os = 'Windows';
        else if (lowerUA.includes('macintosh')) os = 'macOS';
        else if (lowerUA.includes('android')) os = 'Android';
        else if (lowerUA.includes('iphone')) os = 'iPhone';

        return { type, name: `${name} (${os || 'Unknown OS'})` };
    };

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
            <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-6 h-1 bg-indigo-600 rounded-full"></span>
                            <span className="text-[9px] font-black tracking-[0.2em] text-indigo-600 uppercase">Security & Privacy</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-600 tracking-tighter" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                            로그인 기기 관리 <span className="text-slate-300 font-light ml-1 text-xl">Active Sessions</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1 font-medium">현재 계정으로 로그인되어 있는 모든 기기와 브라우저를 확인하고 관리할 수 있습니다.</p>
                    </div>

                    <button
                        onClick={loadSessions}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-black shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 px-6 lg:px-8 pb-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {sessions.length === 0 && !isLoading ? (
                        <div className="col-span-full py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                            <History size={48} className="text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold">활성 세션이 없습니다.</p>
                        </div>
                    ) : (
                        sessions.map((session) => {
                            const deviceInfo = parseUA(session.user_agent);
                            const lastActivityDate = session.last_activity ? new Date(session.last_activity) : null;
                            const createdDate = session.created_at ? new Date(session.created_at) : null;

                            return (
                                <div
                                    key={session.session_id}
                                    className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 p-6 relative group transition-all hover:scale-[1.02] hover:shadow-indigo-100/50"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${deviceInfo.type === 'mobile' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                            {deviceInfo.type === 'mobile' ? <Smartphone size={28} /> : <Monitor size={28} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-black text-slate-700 truncate">{deviceInfo.name}</h3>
                                                {/* In a real app, compare with current session ID here */}
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                                    <Globe size={12} />
                                                    {session.client_ip || '알 수 없는 IP'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                                    <Clock size={12} />
                                                    활동: {lastActivityDate?.toLocaleString('ko-KR') || '-'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                                    <History size={12} />
                                                    최초 로그인: {createdDate?.toLocaleString('ko-KR') || '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg">
                                            <ShieldCheck size={12} /> Active
                                        </div>

                                        <button
                                            onClick={() => handleRevoke(session.session_id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black text-rose-500 bg-white border border-rose-100 shadow-sm hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <LogOut size={12} /> 기기 로그아웃
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="mt-12 bg-indigo-50/50 rounded-[2.5rem] p-10 border border-indigo-100">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <ShieldCheck size={32} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h4 className="text-lg font-black text-slate-700 tracking-tight mb-2">계정 보안 가이드</h4>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                본인이 사용하지 않는 기기나 장소에서 로그인된 기록이 있다면, 해당 기기를 원격 로그아웃 처리하고 즉시 비밀번호를 변경하시기 바랍니다.
                                주기적인 세션 관리는 여러분의 소중한 정보를 안전하게 지키는 가장 쉬운 방법입니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsSessions;
