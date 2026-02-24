import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { callBridge } from '../../utils/apiBridge';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import {
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    Info,
    RefreshCw,
    ArrowRight,
    Lock,
    Key,
    Database,
    History
} from 'lucide-react';

const SettingsSecurity = () => {
    const navigate = useNavigate();
    const { isAuthorized, checkAdmin, isVerifying } = useAdminGuard();
    const [status, setStatus] = useState(null);
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

    const loadSecurityStatus = useCallback(async () => {
        if (!isAuthorized) return;
        setIsLoading(true);
        try {
            const data = await callBridge('get_security_status');
            setStatus(data);
        } catch (err) {
            console.error("Failed to load security status:", err);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthorized]);

    useEffect(() => {
        if (isAuthorized) {
            loadSecurityStatus();
        }
    }, [isAuthorized, loadSecurityStatus]);

    const getIcon = (code) => {
        if (code.includes('JWT')) return <Key size={20} />;
        if (code.includes('DB')) return <Database size={20} />;
        if (code.includes('AUDIT')) return <History size={20} />;
        return <Lock size={20} />;
    };

    const getLevelColor = (level) => {
        switch (level) {
            case 'High': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'Medium': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'Low': return 'bg-blue-50 text-blue-600 border-blue-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
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
                            <span className="text-[9px] font-black tracking-[0.2em] text-indigo-600 uppercase">Security Analysis</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-600 tracking-tighter" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                            시스템 보안 상태 점검 <span className="text-slate-300 font-light ml-1 text-xl">Security Audit</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1 font-medium">실시간으로 시스템의 주요 보안 취약점을 분석하고 최적의 설정을 권장합니다.</p>
                    </div>

                    <button
                        onClick={loadSecurityStatus}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-black shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        다시 검사하기
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-6 lg:px-8 pb-8 overflow-y-auto custom-scrollbar">
                {status && (
                    <div className="mt-6 space-y-6">
                        {/* Summary Card */}
                        <div className={`rounded-[2.5rem] p-8 border ${status.is_secure ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} transition-all`}>
                            <div className="flex items-center gap-6">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${status.is_secure ? 'bg-white text-emerald-500 shadow-emerald-200' : 'bg-white text-rose-500 shadow-rose-200'}`}>
                                    {status.is_secure ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-black tracking-tight ${status.is_secure ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {status.is_secure ? '시스템이 안전하게 보호되고 있습니다' : '조치가 필요한 보안 취약점이 발견되었습니다'}
                                    </h2>
                                    <p className={`text-sm font-medium mt-1 ${status.is_secure ? 'text-emerald-600/80' : 'text-rose-600/80'}`}>
                                        {status.warnings.length}개의 보안 항목이 발견되었습니다. {status.is_secure ? '권장 사항을 확인하여 더 안전한 환경을 구축하세요.' : '아래 지침에 따라 즉시 보안 설정을 업데이트하세요.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Warnings Grid */}
                        <div className="grid grid-cols-1 gap-4">
                            {status.warnings.length === 0 ? (
                                <div className="py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                                    <ShieldCheck size={48} className="text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold">감지된 보안 위협이 없습니다.</p>
                                </div>
                            ) : (
                                status.warnings.sort((a, b) => {
                                    const map = { High: 0, Medium: 1, Low: 2 };
                                    return map[a.level] - map[b.level];
                                }).map((warning, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 p-6 flex items-start gap-6 transition-all hover:border-indigo-200"
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getLevelColor(warning.level)} border`}>
                                            {getIcon(warning.code)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${getLevelColor(warning.level)}`}>
                                                    {warning.level} Risk
                                                </span>
                                                <h3 className="font-black text-slate-700 text-lg">{warning.message}</h3>
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                                {warning.recommendation}
                                            </p>
                                        </div>
                                        <div className="shrink-0 pt-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Informational Section */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center text-white shrink-0">
                                    <Lock size={32} />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h4 className="text-lg font-black tracking-tight mb-2">보안 모범 사례</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                            강력하고 고유한 관리자 비밀번호 사용
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                            중요 환경 변수(.env)의 외부 노출 방지
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                            정기적인 데이터베이스 백업 수행
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                            의심스러운 로그인 기기 상시 모니터링
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Decorative blur */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                        <p className="text-slate-400 font-bold">시스템 보안 분석 중...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsSecurity;
