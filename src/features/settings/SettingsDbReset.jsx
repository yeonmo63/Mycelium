import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useModal } from '../../contexts/ModalContext';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import {
    Trash2,
    AlertTriangle,
    Lock,
    CheckCircle2,
    XCircle,
    Database,
    ShieldAlert
} from 'lucide-react';

const SettingsDbReset = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useModal();
    const { isAuthorized, checkAdmin, isVerifying } = useAdminGuard();
    const [isLoading, setIsLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const checkRunComp = React.useRef(false);
    useEffect(() => {
        if (checkRunComp.current) return;
        checkRunComp.current = true;

        const init = async () => {
            const ok = await checkAdmin();
            if (!ok) navigate('/');
        };
        init();
    }, [checkAdmin, navigate]);

    const handleReset = async () => {
        if (confirmText !== '초기화') {
            showAlert('확인 필요', "'초기화'를 정확히 입력해주세요.");
            return;
        }

        if (!await showConfirm(
            '데이터 영구 삭제 경고',
            '정말로 모든 운영 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없으며 삭제된 데이터는 절대 복구할 수 없습니다.\n\n(※ 실행 전 백업을 강력히 권장합니다.)'
        )) return;

        setIsLoading(true);
        try {
            const msg = await invoke('reset_database');
            await showAlert('초기화 완료', msg);
            setConfirmText('');
        } catch (err) {
            showAlert('초기화 실패', err);
        } finally {
            setIsLoading(false);
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
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden animate-in fade-in duration-700 relative">
            {/* Background elements for premium feel */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-rose-400/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Local Modal Root */}
            <div id="local-modal-root" className="absolute inset-0 z-[9999] pointer-events-none" />

            {/* Header - Matching SalesReception Style */}
            <div className="px-6 lg:px-8 min-[2000px]:px-12 pt-6 lg:pt-8 min-[2000px]:pt-12 pb-4">
                <div className="flex flex-col items-center text-center">
                    <div>
                        <div className="flex flex-col items-center gap-2 mb-0.5">
                            <span className="w-10 h-1 bg-rose-600 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black tracking-[0.2em] text-rose-600 uppercase">System Administration</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tighter" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                            데이터 초기화 <span className="text-slate-300 font-light ml-2 text-2xl tracking-normal">Factory Reset</span>
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-6 lg:px-8 min-[2000px]:px-12 pb-8 flex items-center justify-center">
                <div className="max-w-xl w-full">
                    {/* The "BOX" */}
                    <div className="bg-white rounded-[3.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] border border-slate-200/60 p-10 lg:p-14 text-center relative overflow-hidden group">
                        {/* Decorative Top Accent (Mushroomfarm style but modern) */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-400" />

                        {/* Main Warning Icon Wrapper */}
                        <div className="relative mb-8">
                            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm ring-8 ring-rose-50/50 group-hover:scale-110 transition-transform duration-500">
                                <AlertTriangle size={48} />
                            </div>
                            <div className="absolute top-0 right-1/2 translate-x-12 -translate-y-2">
                                <span className="flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                                </span>
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 mb-5 tracking-tight">공장 초기화 실행</h2>
                        <p className="text-slate-500 font-medium text-[0.95rem] leading-relaxed mb-10">
                            이 작업은 모든 거래 내역과 상품 정보를 영구적으로 삭제하며,<br />
                            <strong className="text-rose-600 font-black">삭제된 데이터는 절대 복구할 수 없습니다.</strong><br />
                            신중하게 결정하여 진행해 주세요.
                        </p>

                        {/* Mushroomfarm Info Box */}
                        <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 text-left mb-10 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                    <XCircle size={20} />
                                </div>
                                <div className="flex-1">
                                    <span className="block text-sm font-black text-slate-800 mb-1">삭제되는 데이터</span>
                                    <span className="text-[0.82rem] text-slate-500 font-bold leading-tight">
                                        모든 매출 내역, 고객 정보, 행사 정보, 상품 재고, 배송 데이터, 상담 일지, 재고 로그 등
                                    </span>
                                </div>
                            </div>

                            <div className="h-px bg-slate-200/60 mx-2" />

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div className="flex-1">
                                    <span className="block text-sm font-black text-slate-800 mb-1">보존되는 데이터</span>
                                    <span className="text-[0.82rem] text-slate-500 font-bold leading-tight">
                                        관리자/사용자 계정 정보, 회사 기본 설정(사업자 정보, 마크 등)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="space-y-6">
                            <div className="relative group/input">
                                <div className="absolute inset-0 bg-rose-500/5 rounded-2xl blur-lg transition-opacity opacity-0 group-focus-within/input:opacity-100" />
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    placeholder="'초기화'를 직접 입력하세요"
                                    className="relative w-full h-16 px-8 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-center text-xl text-rose-600 placeholder:text-slate-300 focus:bg-white focus:border-rose-100 focus:outline-none transition-all shadow-inner"
                                />
                            </div>

                            <button
                                onClick={handleReset}
                                disabled={confirmText !== '초기화' || isLoading}
                                className="w-full h-18 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-300 text-white rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-4 shadow-xl shadow-rose-200/50 transition-all hover:-translate-y-1 active:scale-[0.98] active:translate-y-0"
                            >
                                {isLoading ? (
                                    <RefreshCw className="animate-spin" size={24} />
                                ) : (
                                    <Trash2 size={26} />
                                )}
                                {isLoading ? '데이터 삭제 중...' : '데이터 초기화 실행'}
                            </button>
                        </div>

                        {/* Security Footer */}
                        <div className="mt-10 flex items-center justify-center gap-3 text-[11px] font-black text-slate-400 opacity-60">
                            <ShieldAlert size={14} />
                            ADMINISTRATOR PRIVILEGE REQUIRED
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Scrollbar Style */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}} />
        </div>
    );
};

export default SettingsDbReset;
