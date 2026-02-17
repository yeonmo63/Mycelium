import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { invoke } from '../../utils/apiBridge';
import { useModal } from '../../contexts/ModalContext';
import {
    Smartphone,
    Laptop,
    QrCode,
    Wifi,
    ShieldCheck,
    ArrowRight,
    Lock,
    Globe,
    Save,
    RefreshCw,
    Info,
    CheckCircle2,
    Settings2
} from 'lucide-react';

const MobileSettings = () => {
    const { showAlert } = useModal();
    const [allIps, setAllIps] = useState([]);
    const [wifiIp, setWifiIp] = useState('');
    const [tailscaleIp, setTailscaleIp] = useState('');
    const [port, setPort] = useState(window.location.port || '3000');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Mobile Config State
    const [config, setConfig] = useState({
        remote_ip: '',
        access_pin: '',
        use_pin: false
    });

    const [viewMode, setViewMode] = useState('local'); // 'local' or 'remote'

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [ips, mobileConfig] = await Promise.all([
                invoke('get_local_ip_command').catch(() => ['127.0.0.1']),
                invoke('get_mobile_config').catch(() => ({ remote_ip: '', access_pin: '', use_pin: false }))
            ]);

            setAllIps(ips);

            // 1. Identify Tailscale IP (typically starts with 100.)
            const tsIp = ips.find(ip => ip.startsWith('100.')) || '';
            setTailscaleIp(tsIp);

            // 2. Identify Local/Wifi IP with smart filtering
            // Exclude loopback (127.0.0.1), Tailscale (100.), and APIPA (169.254.)
            const validIps = ips.filter(ip =>
                ip !== '127.0.0.1' &&
                !ip.startsWith('100.') &&
                !ip.startsWith('169.254.')
            );

            // Prioritize common private ranges like 192.168.x.x
            const preferredIp = validIps.find(ip => ip.startsWith('192.168.'))
                || validIps.find(ip => ip.startsWith('10.'))
                || validIps.find(ip => ip.startsWith('172.'))
                || validIps[0]
                || '127.0.0.1';

            setWifiIp(preferredIp);

            // Apply mobile config
            const initialConfig = mobileConfig || { remote_ip: '', access_pin: '', use_pin: false };

            // If we found a Tailscale IP and config doesn't have one, suggest it
            if (tsIp && !initialConfig.remote_ip) {
                initialConfig.remote_ip = tsIp;
            }

            setConfig(initialConfig);
        } catch (e) {
            console.error("Failed to load mobile settings:", e);
            setWifiIp('127.0.0.1');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await invoke('save_mobile_config', { config });
            showAlert("저장 완료", "모바일 연동 설정이 성공적으로 저장되었습니다.");
        } catch (e) {
            console.error(e);
            showAlert("저장 실패", "설정 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    // Robust URL Building
    const buildUrl = (ip) => {
        if (!ip || ip === '127.0.0.1') return null;

        // Remove existing port if present in IP string
        const cleanIp = ip.split(':')[0];
        const portSuffix = port ? `:${port}` : '';

        return `http://${cleanIp}${portSuffix}/mobile-dashboard`;
    };

    const localUrl = buildUrl(wifiIp);
    const remoteUrl = buildUrl(config.remote_ip);
    const activeUrl = viewMode === 'local' ? localUrl : remoteUrl;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-slate-400 font-bold text-sm">연동 정보 로딩 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-700 overflow-y-auto custom-scrollbar font-sans">
            <div className="max-w-5xl mx-auto w-full px-6 pt-6 lg:pt-8 min-[2000px]:pt-12 pb-24">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-1 bg-indigo-600 rounded-full"></span>
                        <span className="text-[9px] font-black tracking-[0.2em] text-indigo-600 uppercase">Connected Farm Ecosystem</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-600 tracking-tighter" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                        모바일 연동 센터 <span className="text-slate-300 font-light ml-1 text-base">Mobile Center</span>
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                    {/* Left: QR Section (7 cols) */}
                    <div className="lg:col-span-7 bg-white p-1 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 flex flex-col relative overflow-hidden group">
                        <div className="p-10 flex flex-col items-center justify-center text-center relative z-10">
                            {/* View Mode Switch */}
                            <div className="inline-flex p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl mb-10 border border-slate-200/50">
                                <button
                                    onClick={() => setViewMode('local')}
                                    className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${viewMode === 'local' ? 'bg-white shadow-lg text-indigo-600 ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Wifi size={16} /> 내부망 (Wi-Fi)
                                    </div>
                                </button>
                                <button
                                    onClick={() => setViewMode('remote')}
                                    className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${viewMode === 'remote' ? 'bg-white shadow-lg text-indigo-600 ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Globe size={16} /> 외부망 (Tailscale)
                                    </div>
                                </button>
                            </div>

                            <div className="relative mb-8 group/qr">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-2xl rounded-full scale-0 group-hover/qr:scale-100 transition-transform duration-700"></div>
                                {activeUrl ? (
                                    <div
                                        key={activeUrl} // Force re-render when URL changes
                                        className="relative p-8 bg-white rounded-[2.5rem] shadow-xl border border-slate-50 ring-1 ring-slate-100 group-hover/qr:translate-y-[-4px] transition-transform duration-500 cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText(activeUrl);
                                            showAlert("주소 복사됨", "연동 주소가 클립보드에 복사되었습니다.");
                                        }}
                                    >
                                        <QRCodeSVG
                                            value={activeUrl}
                                            size={220}
                                            level="H"
                                            includeMargin={true}
                                            className="relative z-10"
                                        />
                                        <div className="absolute bottom-4 right-4 bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
                                            <QrCode size={18} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-[300px] h-[300px] bg-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-200">
                                        <div className="relative">
                                            <Globe size={48} />
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse"></div>
                                        </div>
                                        <div className="px-12 text-center">
                                            <span className="text-sm font-black text-slate-400">연동 준비 안됨</span><br />
                                            <span className="text-[10px] font-bold text-slate-400 leading-tight block mt-2">
                                                {viewMode === 'local'
                                                    ? "유효한 내부 IP가 감지되지 않았습니다.\n네트워크 설정을 확인해 주세요."
                                                    : "외부 IP(Tailscale)가 설정되지 않았습니다.\n아래 설정에서 입력해 주세요."}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-black text-slate-800 text-lg tracking-tight">
                                    {viewMode === 'local' ? '로컬 접속 QR 코드' : '원격 접속 QR 코드'}
                                </h3>
                                <p className="text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
                                    {viewMode === 'local'
                                        ? '현장의 Wi-Fi에 연결된 기기에서 이 코드를 스캔하여 대시보드에 즉시 접속합니다.'
                                        : 'Tailscale VPN이 활성화된 기기에서 외부 어디서나 농장 상태를 확인합니다.'}
                                </p>
                            </div>

                            <div className="mt-10 bg-slate-50 px-8 py-4 rounded-[1.5rem] border border-slate-100 flex items-center justify-between gap-4 w-full max-w-lg group/url hover:bg-white hover:shadow-md transition-all duration-300">
                                <div className="flex flex-col items-start gap-1 min-w-0">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Connect URL</span>
                                    <code className="text-indigo-600 font-black tracking-wide text-xs truncate w-full">
                                        {activeUrl || '주소 정보가 없습니다'}
                                    </code>
                                </div>
                                <div className="shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-300 group-hover/url:text-indigo-500 transition-colors shadow-sm">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full"></div>
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full"></div>
                    </div>

                    {/* Right: Security & Remote Config (5 cols) */}
                    <div className="lg:col-span-5 space-y-8">
                        {/* Status Card */}
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-black text-slate-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    서버 상태
                                </h3>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-100 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    ACTIVE
                                </span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400 font-bold">내부 IP 선택</span>
                                    <select
                                        value={wifiIp}
                                        onChange={(e) => setWifiIp(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        {allIps.filter(ip => !ip.startsWith('100.') && ip !== '127.0.0.1').length > 0 ? (
                                            allIps.filter(ip => !ip.startsWith('100.') && ip !== '127.0.0.1').map(ip => (
                                                <option key={ip} value={ip}>{ip} {ip.startsWith('169.254.') ? '(비활성)' : ''}</option>
                                            ))
                                        ) : (
                                            <option value="127.0.0.1">127.0.0.1</option>
                                        )}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400 font-bold">운영 포트</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={port}
                                            onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-16 h-8 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <Settings2 size={14} className="text-slate-300" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Config Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-8 relative">
                            <div className="absolute top-0 right-0 p-8 text-slate-50/50 pointer-events-none">
                                <ShieldCheck size={80} strokeWidth={1} />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">보안 및 원격 설정</h3>
                                    <p className="text-[11px] text-slate-400 font-bold">연동 기기의 보안 정책을 관리합니다.</p>
                                </div>
                            </div>

                            {/* Remote IP */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Tailscale IP 주소</label>
                                    {tailscaleIp && (
                                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1 border border-indigo-100">
                                            감지됨
                                        </span>
                                    )}
                                </div>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="100.xx.xx.xx"
                                        className="w-full h-14 bg-slate-50 border border-transparent rounded-[1.25rem] px-6 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500/30 focus:shadow-lg focus:shadow-indigo-500/5 transition-all text-center tracking-wider"
                                        value={config.remote_ip}
                                        onChange={(e) => setConfig({ ...config, remote_ip: e.target.value })}
                                    />
                                </div>
                                {tailscaleIp && tailscaleIp !== config.remote_ip && (
                                    <button
                                        onClick={() => setConfig({ ...config, remote_ip: tailscaleIp })}
                                        className="w-full text-[10px] font-black text-indigo-500 hover:text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 py-2 rounded-xl transition-all border border-dashed border-indigo-200"
                                    >
                                        감지된 {tailscaleIp} 자동 입력
                                    </button>
                                )}
                            </div>

                            {/* PIN Use Toggle */}
                            <div className="p-5 bg-slate-50/80 rounded-[1.5rem] border border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl transition-colors ${config.use_pin ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <Lock size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-slate-800">모바일 PIN 보안 사용</div>
                                        <div className="text-[10px] text-slate-400 font-bold">비인가 사용자의 접속을 차단합니다</div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={config.use_pin}
                                        onChange={(e) => setConfig({ ...config, use_pin: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {/* PIN Code */}
                            {config.use_pin && (
                                <div className="space-y-3 animate-in slide-in-from-top-4 duration-500 ease-out">
                                    <label className="text-xs font-black text-slate-500 px-1">접속 PIN 번호 (4~6자리)</label>
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="······"
                                        className="w-full h-14 bg-white border-2 border-indigo-500/20 rounded-[1.25rem] px-4 text-center text-2xl font-black tracking-[0.5em] text-indigo-600 placeholder:text-indigo-200 placeholder:tracking-normal focus:border-indigo-500 focus:shadow-xl focus:shadow-indigo-500/10 transition-all"
                                        value={config.access_pin}
                                        onChange={(e) => setConfig({ ...config, access_pin: e.target.value.replace(/[^0-9]/g, '') })}
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-[1.25rem] text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                                설정사항 안전하게 저장
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
                    <div className="p-6 bg-slate-100/50 rounded-[2rem] border border-slate-200/60 flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
                            <Wifi size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-700 mb-1">내부 네트워크 연동 가이드</h4>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                PC와 모바일 기기가 동일한 Wi-Fi(공유기)에 연결되어 있어야 합니다. <br />
                                방화벽 설정에 따라 접속이 원활하지 않을 수 있으니 확인이 필요합니다.
                            </p>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-100/50 rounded-[2rem] border border-slate-200/60 flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-400 shrink-0 shadow-sm">
                            <Globe size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-700 mb-1">Tailscale 원격 연동 가이드</h4>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                각 기기에 Tailscale을 설치하고 로그인하면 외부에서도 안전하게 접속됩니다. <br />
                                보안을 위해 6자리 PIN 번호 사용 설정을 강력히 권장합니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Banner */}
                <div className="mt-12 p-6 rounded-[2rem] bg-indigo-600 flex items-center justify-between text-white shadow-2xl shadow-indigo-200 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-[20deg] transition-transform duration-700">
                        <Smartphone size={120} />
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <Info size={28} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black tracking-tight">도움이 필요하신가요?</h4>
                            <p className="text-indigo-100 text-xs font-bold leading-relaxed opacity-80">
                                모바일 연동에 문제가 있다면 사용자 메뉴얼을 확인하거나<br />
                                기술지원 센터(cs@mycelium.farm)로 문의해 주세요.
                            </p>
                        </div>
                    </div>
                    <button className="relative z-10 px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-50 transition-colors shadow-lg">
                        사용자 메뉴얼 보기
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}} />
        </div>
    );
};

export default MobileSettings;
