import React, { useState } from 'react';
import dayjs from 'dayjs';

const WeatherHero = ({ weatherAdvice, isWeatherLoading }) => {
    const [showIntel, setShowIntel] = useState(false);

    const getWeatherIcon = (desc) => {
        if (!desc) return 'cloud';
        if (desc.includes('눈')) return 'ac_unit';
        if (desc.includes('비')) return 'umbrella';
        if (desc.includes('맑음')) return 'wb_sunny';
        if (desc.includes('흐림') || desc.includes('구름')) return 'filter_drama';
        return 'cloud';
    };

    // Clean up intel summary for display (remove raw tags if needed, or format them)
    const intelLines = weatherAdvice?.intel_summary ? weatherAdvice.intel_summary.split('\n').filter(l => l.trim()) : [];

    return (
        <div className="col-span-full h-[180px] min-[2000px]:h-[220px] bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-black rounded-[32px] p-8 min-[2000px]:p-10 shadow-2xl relative overflow-hidden flex items-center group transition-all duration-700 hover:shadow-indigo-500/20">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-[-50%] left-[-10%] w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 min-[2000px]:gap-12 w-full h-full">
                {/* Weather Icon Box */}
                <div className="w-20 h-20 min-[2000px]:w-28 min-[2000px]:h-28 rounded-[28px] bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shrink-0 shadow-2xl group-hover:rotate-3 transition-transform duration-500">
                    <span className="material-symbols-rounded text-amber-400 text-5xl min-[2000px]:text-7xl drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                        {getWeatherIcon(weatherAdvice?.weather_desc)}
                    </span>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 space-y-4">
                    <div className="flex flex-nowrap md:flex-wrap items-center gap-4 h-10">
                        <h3 className="text-white text-[1.4rem] font-black tracking-tight drop-shadow-sm whitespace-nowrap">데이터 지능 분석</h3>
                        {!isWeatherLoading && (
                            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white/90 text-[0.8rem] font-bold border border-white/10 flex items-center gap-2 whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                {weatherAdvice?.location_name || '국내'} {weatherAdvice?.temperature?.toFixed(1)}°C · {weatherAdvice?.weather_desc}
                            </div>
                        )}
                        {intelLines.length > 0 && (
                            <button
                                onClick={() => setShowIntel(!showIntel)}
                                className={`px-4 py-1.5 rounded-full text-[0.8rem] font-black border transition-all whitespace-nowrap ${showIntel ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-indigo-400 hover:bg-white/10'
                                    }`}
                            >
                                {showIntel ? '분석 닫기' : '상세 지표 보기'}
                            </button>
                        )}
                    </div>

                    <div className="relative min-h-[60px]">
                        {/* Always show marketing advice but blur it when intel is shown for a cool overlay effect */}
                        <p className={`text-slate-300 text-[1.05rem] font-bold leading-relaxed max-w-[950px] transition-all duration-500 ${showIntel ? 'opacity-10 blur-md scale-95 pointer-events-none' : 'opacity-100 blur-0 scale-100'}`}>
                            {isWeatherLoading ? "인공지능이 오늘의 날씨와 실시간 데이터를 통합 분석 중입니다..." : (weatherAdvice?.marketing_advice || "오늘의 최적화된 마케팅 전략을 확인하세요.")}
                        </p>

                        {/* Intelligence Insights */}
                        {showIntel && (
                            <div className="absolute top-0 left-0 right-0 mt-0.5 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
                                    {intelLines.map((line, idx) => (
                                        <div key={idx} className="bg-indigo-500/15 border border-indigo-500/30 p-2 rounded-2xl shadow-lg backdrop-blur-md">
                                            <p className="text-indigo-100 text-[0.75rem] font-black tracking-wide leading-tight">
                                                {line}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Disclaimer - Stable height to prevent header shift */}
                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight transition-all duration-500 ${(!isWeatherLoading && !showIntel) ? 'text-slate-500 opacity-100 translate-y-0' : 'text-transparent opacity-0 translate-y-1 pointer-events-none'}`}>
                        <span className="material-symbols-rounded text-xs">auto_awesome</span>
                        이 분석은 실시간 날씨, 현재 재고, 지난 2주간의 판매 동향 및 작년 동기 매출 기록을 바탕으로 생성되었습니다.
                    </div>
                </div>

                <div className="hidden 2xl:block pr-8 shrink-0">
                    <div className="text-right">
                        <div className="text-slate-600 text-[0.7rem] font-black uppercase tracking-[0.3em] mb-1">인텔리전스 엔진</div>
                        <div className="text-white font-mono text-lg font-bold">ACTIVE</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherHero;
