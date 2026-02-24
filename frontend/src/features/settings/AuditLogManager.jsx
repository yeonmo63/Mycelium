import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { callBridge } from '../../utils/apiBridge';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import {
    History,
    Search,
    Filter,
    User,
    Monitor,
    Clock,
    Database,
    Eye,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Lock
} from 'lucide-react';
import dayjs from 'dayjs';

const AuditLogManager = () => {
    const navigate = useNavigate();
    const { isAuthorized, checkAdmin, isVerifying } = useAdminGuard();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState({ action_type: '', limit: 100 });
    const [selectedLog, setSelectedLog] = useState(null);

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

    const loadLogs = useCallback(async () => {
        if (!isAuthorized) return;
        setIsLoading(true);
        try {
            const data = await callBridge('get_audit_logs', filter);
            setLogs(data);
        } catch (err) {
            console.error("Failed to load audit logs:", err);
        } finally {
            setIsLoading(false);
        }
    }, [filter, isAuthorized]);

    useEffect(() => {
        if (isAuthorized) {
            loadLogs();
        }
    }, [loadLogs, isAuthorized]);

    const getActionColor = (action) => {
        if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (action.includes('UPDATE')) return 'bg-blue-50 text-blue-600 border-blue-100';
        if (action.includes('DELETE')) return 'bg-rose-50 text-rose-600 border-rose-100';
        if (action.includes('LOGIN')) return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        if (action.includes('LOGOUT')) return 'bg-slate-50 text-slate-600 border-slate-100';
        if (action.includes('REVOKE')) return 'bg-amber-50 text-amber-600 border-amber-100';
        return 'bg-slate-50 text-slate-600 border-slate-100';
    };

    const actionTypes = [
        { label: '전체', value: '' },
        { label: '로그인', value: 'LOGIN' },
        { label: '로그아웃', value: 'LOGOUT' },
        { label: '실패한 로그인', value: 'LOGIN_FAILED' },
        { label: '세션 차단', value: 'REVOKE_SESSION' },
        { label: '상품 등록', value: 'CREATE_PRODUCT' },
        { label: '상품 수정', value: 'UPDATE_PRODUCT' },
        { label: '상품 삭제', value: 'DELETE_PRODUCT' },
        { label: '사용자 생성', value: 'CREATE_USER' },
    ];

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
                            <span className="text-[9px] font-black tracking-[0.2em] text-indigo-600 uppercase">System Audit Trails</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-600 tracking-tighter" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                            보안 감사 로그 데이터 <span className="text-slate-300 font-light ml-1 text-xl">Audit Management</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1 font-medium">관리자 및 시스템에 의해 발생한 모든 중요 변경 사항을 정밀 기록합니다.</p>
                    </div>

                    <button
                        onClick={loadLogs}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-black shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        새로고침
                    </button>
                </div>

                {/* Filters */}
                <div className="mt-8 flex items-center gap-3">
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                        {actionTypes.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => setFilter({ ...filter, action_type: type.value })}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${filter.action_type === type.value ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <History size={12} />
                        Showing Last {logs.length} entries
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 px-6 lg:px-8 pb-8 mt-4 overflow-hidden">
                <div className="h-full bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 border-b border-slate-200">
                                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <th className="px-6 py-4 w-12 text-center">No.</th>
                                    <th className="px-6 py-4">사용자</th>
                                    <th className="px-6 py-4 text-center">액션 유형</th>
                                    <th className="px-6 py-4">설명 및 대상</th>
                                    <th className="px-6 py-4">IP / 기기</th>
                                    <th className="px-6 py-4 text-center">발생 시간</th>
                                    <th className="px-6 py-4 w-20 text-center">상세</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.length === 0 && !isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="py-40 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <History size={48} className="text-slate-100" />
                                                <p className="text-slate-300 font-black text-lg">데이터가 존재하지 않습니다.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log, idx) => (
                                        <tr key={log.log_id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-center text-[11px] font-mono text-slate-300 font-bold">{logs.length - idx}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-700">{log.user_name || 'System'}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold">UID: {log.user_id || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black border tracking-wider uppercase ${getActionColor(log.action_type)}`}>
                                                    {log.action_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-bold text-slate-600">{log.description || 'No description'}</div>
                                                    {log.target_table && (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] bg-slate-100 text-slate-400 font-black px-1.5 py-0.5 rounded uppercase">{log.target_table}</span>
                                                            <span className="text-[10px] text-slate-300 font-mono">ID: {log.target_id || '-'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 font-bold">
                                                        <Monitor size={10} className="text-slate-300" />
                                                        {log.ip_address || 'Local'}
                                                    </div>
                                                    <div className="text-[9px] text-slate-300 truncate max-w-[150px] font-medium" title={log.user_agent}>
                                                        {log.user_agent || 'N/A'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="text-xs font-black text-slate-500 font-mono">
                                                        {dayjs(log.created_at).format('HH:mm:ss')}
                                                    </div>
                                                    <div className="text-[9px] text-slate-300 font-bold">
                                                        {dayjs(log.created_at).format('YYYY-MM-DD')}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="w-8 h-8 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95"
                                                >
                                                    <Eye size={14} />
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

            {/* Modal for Details */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/50 animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-50 p-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getActionColor(selectedLog.action_type)}`}>
                                        {selectedLog.action_type}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Detail View</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">상세 감사 데이터 조회</h3>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center"
                            >
                                <AlertCircle size={20} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Actor (사용자)</div>
                                    <div className="text-lg font-black text-slate-700">{selectedLog.user_name || 'System'}</div>
                                    <div className="text-xs text-slate-400 font-bold mt-1">ID: {selectedLog.user_id || 'Internal Process'}</div>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Timestamp (발생시각)</div>
                                    <div className="text-lg font-black text-slate-700">{dayjs(selectedLog.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                                    <div className="text-xs text-slate-400 font-bold mt-1">UTC Reference Available</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tight">
                                    <Database size={16} className="text-indigo-500" />
                                    Data Changes (데이터 변경 이력)
                                </h4>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Old State (이전 값)
                                        </div>
                                        <pre className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] font-mono text-slate-500 overflow-x-auto">
                                            {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : 'No previous data'}
                                        </pre>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-emerald-500 uppercase ml-2 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> New State (변경 후 값)
                                        </div>
                                        <pre className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 text-[11px] font-mono text-slate-700 overflow-x-auto">
                                            {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : 'No modification data'}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 bg-slate-900 rounded-3xl text-white relative overflow-hidden shadow-xl shadow-slate-200">
                                <div className="relative z-10">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Technical Meta</div>
                                    <div className="flex gap-8 text-[11px] font-bold">
                                        <div className="flex items-center gap-2">
                                            <Monitor size={12} className="text-indigo-400" />
                                            IP: <span className="text-white">{selectedLog.ip_address || 'N/A'}</span>
                                        </div>
                                        <div className="flex-1 truncate">
                                            UA: <span className="text-white">{selectedLog.user_agent || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-lg shadow-slate-200 transition-all active:scale-95"
                            >
                                창 닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogManager;
