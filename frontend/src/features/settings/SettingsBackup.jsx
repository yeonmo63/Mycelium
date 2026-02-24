import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { callBridge as invoke } from '../../utils/apiBridge';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { useModal } from '../../contexts/ModalContext';
import {
    Database,
    Download,
    Upload,
    Trash2,
    Settings,
    Clock,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Shield,
    HardDrive,
    Save,
    Calendar,
    ChevronRight,
    Lock
} from 'lucide-react';
import dayjs from 'dayjs';

const SettingsBackup = () => {
    const navigate = useNavigate();
    const { isAuthorized, checkAdmin, isVerifying } = useAdminGuard();
    const [backups, setBackups] = useState([]);
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [externalPath, setExternalPath] = useState('');
    const [isSavingPath, setIsSavingPath] = useState(false);
    const [backupProgress, setBackupProgress] = useState({ progress: 0, message: '', startTime: null, currentRecord: '' });
    const [operationType, setOperationType] = useState(null); // 'backup' | 'restore'

    const { showAlert } = useModal();
    const backupIntervalRef = useRef(null);

    // Cleanup simulation interval on unmount
    useEffect(() => {
        return () => {
            if (backupIntervalRef.current) {
                clearInterval(backupIntervalRef.current);
            }
        };
    }, []);

    const calculateETA = (start, p) => {
        if (!start || p <= 0 || p >= 100) return '??분 ??초';
        const elapsed = Date.now() - start;
        const totalEstimate = (elapsed / p) * 100;
        const remaining = totalEstimate - elapsed;
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        return `${mins}분 ${secs}초`;
    };

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

    const loadData = useCallback(async () => {
        if (!isAuthorized) return;
        setIsLoading(true);
        try {
            const [backupList, currentStatus, extPath] = await Promise.all([
                invoke('get_auto_backups'),
                invoke('get_backup_status'),
                invoke('get_backup_path_external')
            ]);
            setBackups(backupList || []);
            setStatus(currentStatus);
            setExternalPath(extPath || '');
        } catch (err) {
            console.error("Failed to load backup settings:", err);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthorized]);

    useEffect(() => {
        if (isAuthorized) {
            loadData();
        }
    }, [loadData, isAuthorized]);

    const handleManualBackup = async (isIncremental = false) => {
        if (isBackingUp || isRestoring) return;
        setIsBackingUp(true);
        setOperationType('backup');
        setBackupProgress({ progress: 0, message: '백업 엔진 초기화 중...', startTime: Date.now(), currentRecord: 'System.Initialization' });

        if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
        backupIntervalRef.current = setInterval(async () => {
            try {
                const live = await invoke('get_backup_progress');
                if (live && live.total > 0) {
                    setBackupProgress(prev => ({
                        ...prev,
                        progress: Number(live.percentage?.toFixed(1) || 0),
                        message: live.message || '처리 중...',
                        currentRecord: operationType === 'restore' || live.message?.includes('파일을 읽는 중')
                            ? `${(live.processed / (1024 * 1024)).toFixed(1)}MB / ${(live.total / (1024 * 1024)).toFixed(1)}MB`
                            : `${live.processed?.toLocaleString() || 0} / ${live.total?.toLocaleString() || 0} 건`
                    }));
                }
            } catch (pErr) {
                // Ignore small errors during polling
            }
        }, 500);

        try {
            await invoke('run_daily_custom_backup', {
                is_incremental: isIncremental,
                use_compression: true
            });

            if (backupIntervalRef.current) {
                clearInterval(backupIntervalRef.current);
                backupIntervalRef.current = null;
            }

            setBackupProgress(prev => ({ ...prev, progress: 100, message: '백업 완료', currentRecord: 'Success' }));

            setTimeout(() => {
                showAlert('백업 완료', `${isIncremental ? '증분' : '전체'} 백업이 성공적으로 완료되었습니다.`);
                setIsBackingUp(false);
                setOperationType(null);
                setBackupProgress({ progress: 0, message: '', startTime: null, currentRecord: '' });
                loadData();
            }, 800);
        } catch (err) {
            if (backupIntervalRef.current) {
                clearInterval(backupIntervalRef.current);
                backupIntervalRef.current = null;
            }
            setIsBackingUp(false);
            setOperationType(null);
            setBackupProgress({ progress: 0, message: '', startTime: null, currentRecord: '' });
            showAlert('백업 실패', `오류가 발생했습니다: ${err.message || err}`);
        }
    };

    const handleRestore = async (path) => {
        if (isBackingUp || isRestoring) return;
        const confirmed = await window.confirm("정말로 이 백업 파일로 복구하시겠습니까? 현재 데이터가 모두 삭제되고 백업 시점의 상태로 덮어씌워집니다.");
        if (!confirmed) return;

        setIsRestoring(true);
        setOperationType('restore');
        setBackupProgress({ progress: 0, message: '복구 엔진 마운트 중...', startTime: Date.now(), currentRecord: 'Restore.Initialize' });

        if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
        backupIntervalRef.current = setInterval(async () => {
            try {
                const live = await invoke('get_backup_progress');
                if (live && live.total > 0) {
                    setBackupProgress(prev => ({
                        ...prev,
                        progress: Number(live.percentage?.toFixed(1) || 0),
                        message: live.message || '복구 중...',
                        currentRecord: `${(live.processed / (1024 * 1024)).toFixed(1)}MB / ${(live.total / (1024 * 1024)).toFixed(1)}MB`
                    }));
                }
            } catch (pErr) { }
        }, 500);

        try {
            await invoke('restore_database', { path });
            if (backupIntervalRef.current) {
                clearInterval(backupIntervalRef.current);
                backupIntervalRef.current = null;
            }
            setBackupProgress(prev => ({ ...prev, progress: 100, message: '복구 완료', currentRecord: 'Success' }));

            setTimeout(() => {
                showAlert('복구 완료', "데이터 복구가 성공적으로 완료되었습니다. 최상의 안정성을 위해 시스템이 재시작됩니다.");
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }, 800);
        } catch (err) {
            if (backupIntervalRef.current) {
                clearInterval(backupIntervalRef.current);
                backupIntervalRef.current = null;
            }
            setIsRestoring(false);
            setOperationType(null);
            setBackupProgress({ progress: 0, message: '', startTime: null, currentRecord: '' });
            showAlert('복구 실패', `복구 중 오류가 발생했습니다: ${err.message || err}`);
        }
    };

    const handleSavePath = async () => {
        setIsSavingPath(true);
        try {
            await invoke('save_external_backup_path', { path: externalPath });
            showAlert('설정 반영', "외부 백업 경로가 저장되었습니다.");
        } catch (err) {
            showAlert('저장 실패', `오류가 발생했습니다: ${err.message}`);
        } finally {
            setIsSavingPath(false);
        }
    };

    const handleMaintenance = async () => {
        if (!window.confirm("데이터베이스 최적화를 수행하시겠습니까?")) return;
        setIsLoading(true);
        try {
            await invoke('run_db_maintenance');
            showAlert('정비 완료', "데이터베이스 최적화가 성공적으로 수행되었습니다.");
        } catch (err) {
            showAlert('수행 실패', `오류가 발생했습니다: ${err.message}`);
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
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden animate-in fade-in duration-700">
            {/* Header */}
            <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-6 h-1 bg-amber-500 rounded-full"></span>
                            <span className="text-[9px] font-black tracking-[0.2em] text-amber-500 uppercase">System Maintenance</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-600 tracking-tighter" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                            데이터 백업 및 복구 <span className="text-slate-300 font-light ml-1 text-xl">Backup & Recovery</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1 font-medium">소중한 비즈니스 데이터를 안전하게 보호하고 언제든 복구하세요.</p>
                    </div>

                    <button
                        onClick={loadData}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-black shadow-sm hover:bg-slate-50 transition-all"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 px-6 lg:px-8 pb-8 mt-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Left: Quick Actions & Config */}
                    <div className="xl:col-span-1 space-y-6">
                        {/* Status Card */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm overflow-hidden relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-700">시스템 보안 점검</h3>
                                    <p className="text-xs text-slate-400 font-medium tracking-tight">자동 백업 활성화됨 (6시간 주기)</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Clock size={16} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">마지막 백업</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-800">
                                        {status ? dayjs(status.last_backup).format('YYYY-MM-DD HH:mm') : '기록 없음'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Calendar size={16} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">다음 예정</span>
                                    </div>
                                    <span className="text-xs font-black text-indigo-600">약 6시간 후</span>
                                </div>
                            </div>

                            {/* Progress Area - Removed from Sidebar, now full-screen overlay */}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => handleManualBackup(false)}
                                    disabled={isBackingUp}
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isBackingUp ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
                                    전체 백업
                                </button>
                                <button
                                    onClick={() => handleManualBackup(true)}
                                    disabled={isBackingUp}
                                    className="flex-1 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isBackingUp ? <RefreshCw size={18} className="animate-spin" /> : <Clock size={18} />}
                                    증분 백업
                                </button>
                            </div>
                        </div>

                        {/* External Path Config */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <HardDrive size={14} />
                                외부 저장소 설정
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">외부 백업 경로 (Network/HDD)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={externalPath}
                                            onChange={(e) => setExternalPath(e.target.value)}
                                            placeholder="예: D:\MyceliumBackups"
                                            className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-600 focus:bg-white focus:border-amber-500 transition-all"
                                        />
                                        <button
                                            onClick={handleSavePath}
                                            disabled={isSavingPath}
                                            className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center hover:bg-amber-100 transition-all disabled:opacity-50"
                                        >
                                            <Save size={18} />
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-2 ml-1 leading-relaxed">
                                        * 네트워크 드라이브나 USB 등 별도 저장 장치 경로를 입력하면 이중 백업이 수행됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Maintenance */}
                        <div className="bg-rose-50/50 rounded-[2rem] border border-rose-100 p-6">
                            <div className="flex items-center gap-3 mb-4 text-rose-600">
                                <AlertTriangle size={18} />
                                <h3 className="text-sm font-black uppercase tracking-tight">위험 요소 및 정비</h3>
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={handleMaintenance}
                                    className="w-full h-11 bg-white border border-rose-100 text-rose-600 text-xs font-black rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Database size={14} />
                                    데이터베이스 최적화 (VACUUM)
                                </button>
                                <button
                                    onClick={() => showAlert("알림", "준비 중인 기능입니다.")}
                                    className="w-full h-11 bg-white border border-rose-100 text-rose-600 text-xs font-black rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    오래된 백업 파일 정리 (Retention)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Backup List */}
                    <div className="xl:col-span-2 space-y-6">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col min-h-[500px]">
                            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                    <Database size={24} className="text-indigo-500" />
                                    백업 히스토리 <span className="text-slate-300 font-light text-sm ml-1">{backups.length} Files</span>
                                </h3>

                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="파일명 검색..."
                                        className="px-4 py-2 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-600 w-48 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                                            <th className="px-6 py-4">파일명 / 식별자</th>
                                            <th className="px-6 py-4 text-center">타입</th>
                                            <th className="px-6 py-4 text-center">크기</th>
                                            <th className="px-6 py-4 text-center">백업 일시</th>
                                            <th className="px-4 py-4 w-32 text-center">작업</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {backups.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="py-20 text-center">
                                                    <p className="text-slate-300 font-bold italic">백업 파일이 존재하지 않습니다.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            backups.map((bk, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                                                <Database size={18} />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-700">{bk.filename}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono">{bk.path}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-tighter">
                                                            {bk.is_auto ? 'Auto' : 'Manual'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-xs font-mono text-slate-500 font-bold">
                                                        {bk.size ? (bk.size / (1024 * 1024)).toFixed(2) + ' MB' : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="text-xs font-black text-slate-500 font-mono">
                                                            {dayjs(bk.timestamp * 1000).format('HH:mm:ss')}
                                                        </div>
                                                        <div className="text-[9px] text-slate-300 font-bold">
                                                            {dayjs(bk.timestamp * 1000).format('YYYY-MM-DD')}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleRestore(bk.path)}
                                                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all whitespace-nowrap"
                                                        >
                                                            복구하기
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Info Note */}
                        <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 flex gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-indigo-500 shrink-0 shadow-sm border border-indigo-100">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-indigo-900 mb-1">안전한 데이터 관리 팁</h4>
                                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                                    백업 파일은 기본적으로 앱 데이터 폴더 내 'daily_backups'에 저장됩니다.
                                    랜섬웨어나 물리적 고장을 대비해 **외부 저장소 설정**을 통해 주기적으로 다른 장치에 복사본을 남기는 것을 강력히 권장합니다.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Premium Full-Screen Operation Overlay */}
            {(isBackingUp || isRestoring) && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

                    <div className="relative w-full max-w-xl bg-white p-12 rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col items-center gap-10 border-2 border-slate-100 animate-in zoom-in-95 duration-500">
                        {/* Status Icon & Animation */}
                        <div className="relative">
                            <div className="w-32 h-32 border-8 border-slate-50 rounded-full" />
                            <div
                                className={`absolute top-0 left-0 w-32 h-32 border-8 ${operationType === 'backup' ? 'border-indigo-600' : 'border-amber-600'} border-t-transparent rounded-full animate-spin`}
                                style={{ animationDuration: '0.8s' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                {operationType === 'backup' ? (
                                    <Database className="text-indigo-600 animate-bounce" size={48} />
                                ) : (
                                    <RefreshCw className="text-amber-600 animate-spin" size={48} style={{ animationDuration: '3s' }} />
                                )}
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="text-center space-y-3">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                                {operationType === 'backup' ? '데이터 백업 수행 중' : '데이터베이스 복구 중'}
                            </h3>
                            <p className="text-sm font-bold text-slate-400 max-w-[320px] mx-auto leading-relaxed">
                                {operationType === 'backup'
                                    ? '실시간으로 안전하게 아카이브를 생성하고 있습니다. 창을 닫지 마십시오.'
                                    : '백업 아카이브로부터 시스템을 복원하고 있습니다. 완료 후 자동 재시작됩니다.'}
                            </p>
                        </div>

                        {/* Detailed Progress Bar */}
                        <div className="w-full space-y-4">
                            <div className="flex justify-between items-end px-1">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{backupProgress.message}</p>
                                    <p className="text-xs font-mono font-bold text-indigo-500">{backupProgress.currentRecord}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-slate-800 tabular-nums">{backupProgress.progress.toFixed(1)}%</span>
                                </div>
                            </div>

                            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                    className={`h-full ${operationType === 'backup' ? 'bg-indigo-600' : 'bg-amber-600'} transition-all duration-300 ease-out relative`}
                                    style={{ width: `${backupProgress.progress}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ backgroundSize: '200% 100%' }} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                <span>Estimated Time: {calculateETA(backupProgress.startTime, backupProgress.progress)}</span>
                                <span className="flex items-center gap-1">
                                    <Shield size={10} className="text-emerald-500" />
                                    Security Verified
                                </span>
                            </div>
                        </div>

                        {/* Loading Hint */}
                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">System is processing records...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsBackup;
