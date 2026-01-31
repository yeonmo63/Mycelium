import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    LayoutDashboard,
    ShoppingCart,
    Users,
    Calculator,
    BrainCircuit,
    Calendar,
    Settings,
    HelpCircle,
    ChevronRight,
    Star,
    AlertCircle,
    CheckCircle2,
    Info,
    ArrowUpRight,
    Search,
    Clock,
    Zap,
    MessageSquare,
    ShieldCheck,
    Truck,
    CreditCard,
    BarChart3,
    Map as MapIcon,
    RefreshCw,
    Database,
    Trash2,
    Cloud,
    AlertTriangle,
    MinusCircle
} from 'lucide-react';

const UserManual = () => {
    const [activeSection, setActiveSection] = useState('flowchart');
    const [searchTerm, setSearchTerm] = useState('');

    const sections = [
        { id: 'flowchart', label: '시스템 흐름도', icon: <BookOpen size={18} /> },
        { id: 'dashboard', label: '1. 대시보드', icon: <LayoutDashboard size={18} /> },
        { id: 'sales', label: '2. 판매 관리', icon: <ShoppingCart size={18} /> },
        { id: 'customer', label: '3. 고객 관리', icon: <Users size={18} /> },
        { id: 'finance', label: '4. 회계/지출 관리', icon: <Calculator size={18} /> },
        { id: 'intel', label: '5. 판매 인텔리전스', icon: <BrainCircuit size={18} /> },
        { id: 'exp', label: '6. 체험 프로그램', icon: <Zap size={18} /> },
        { id: 'schedule', label: '7. 통합 일정 관리', icon: <Calendar size={18} /> },
        { id: 'settings', label: '8. 설정 및 관리', icon: <Settings size={18} /> },
        { id: 'rescue', label: '9. 제니의 긴급 구조', icon: <HelpCircle size={18} /> },
    ];

    const handleScroll = (id) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Components for reused elements
    const JennyTip = ({ title, children }) => (
        <div className="my-10 relative group">
            <div className="absolute inset-0 bg-amber-400/5 rounded-3xl blur-xl group-hover:bg-amber-400/10 transition-colors" />
            <div className="relative bg-[#fdfaf1] border-l-4 border-amber-400 rounded-2xl p-8 shadow-sm border border-amber-100">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Star className="text-amber-600 fill-amber-600" size={24} />
                    </div>
                    <div>
                        <h4 className="text-amber-900 font-black text-base mb-2">{title || "제니의 안내"}</h4>
                        <div className="text-amber-800 text-[0.95rem] leading-relaxed font-medium space-y-2">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const FeatureBox = ({ title, bg = "bg-white", children }) => (
        <div className={`${bg} rounded-3xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 h-full`}>
            <h5 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-indigo-500" />
                {title}
            </h5>
            <div className="text-slate-500 text-sm leading-relaxed font-medium">
                {children}
            </div>
        </div>
    );

    const LogicBox = ({ title, children, color = "indigo" }) => {
        const colors = {
            indigo: "bg-indigo-50/50 border-indigo-100 text-indigo-900 ring-indigo-500/10",
            rose: "bg-rose-50/50 border-rose-100 text-rose-900 ring-rose-500/10",
            emerald: "bg-emerald-50/50 border-emerald-100 text-emerald-900 ring-emerald-500/10",
            amber: "bg-amber-50/50 border-amber-100 text-amber-900 ring-amber-500/10",
            violet: "bg-violet-50/50 border-violet-100 text-violet-900 ring-violet-500/10"
        };

        return (
            <div className={`${colors[color]} border rounded-2xl p-6 my-6 ring-1`}>
                {title && <div className="font-black text-sm mb-3 flex items-center gap-2">
                    <Info size={16} />
                    {title}
                </div>}
                <div className="text-[0.92rem] leading-[1.8] opacity-90 font-medium whitespace-pre-line">
                    {children}
                </div>
            </div>
        );
    };

    const SectionTitle = ({ number, title, id, icon }) => (
        <div id={id} className="scroll-mt-16 mb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white">
                    {icon}
                </div>
                <div>
                    <span className="text-indigo-600 font-black text-xs uppercase tracking-widest block mb-1">Chapter {number}</span>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{title}</h2>
                </div>
            </div>
        </div>
    );

    const SubSection = ({ number, title, children }) => (
        <div className="mb-16 last:mb-0">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-xs font-black">{number}</span>
                {title}
            </h3>
            <div className="pl-11 space-y-6">
                {children}
            </div>
        </div>
    );

    return (
        <div className="flex h-full bg-[#f8fafc] overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tighter">Mycelium Guide</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Platform v2.0</p>
                        </div>
                    </div>

                    <div className="relative mb-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="명령어나 기능을 검색하세요..."
                            className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-1 custom-scrollbar pb-12">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => handleScroll(section.id)}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[0.92rem] font-black transition-all group ${activeSection === section.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                                }`}
                        >
                            <span className={`${activeSection === section.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                                {section.icon}
                            </span>
                            {section.label}
                            {activeSection === section.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                        </button>
                    ))}

                    <div className="mt-10 pt-10 border-t border-slate-100 px-4">
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">Expert Support</div>
                        <div className="space-y-4">
                            <button className="flex items-center gap-3 text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors w-full text-left">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                    <MessageSquare size={16} />
                                </div>
                                제니의 1:1 상담 창구
                            </button>
                            <button className="flex items-center gap-3 text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors w-full text-left">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                    <ShieldCheck size={16} />
                                </div>
                                라이선스 및 보안 안내
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 relative">
                {/* Visual accents */}
                <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-indigo-400/5 rounded-full blur-[150px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-sky-400/5 rounded-full blur-[150px] pointer-events-none" />

                <div className="max-w-5xl mx-auto py-24 px-16 relative z-10">
                    {/* Hero Header */}
                    <div className="mb-24 text-center">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-black uppercase tracking-[0.2em] mb-10 border border-indigo-100/50 shadow-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                            </span>
                            Mycelium Enterprise Platform Guidance
                        </div>
                        <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-8 leading-[1.05]" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                            Mycelium 운영의 모든 것,<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">완벽 가이드북</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto">
                            Mycelium는 단순한 기록을 넘어 데이터 인텔리전스와 AI의 힘으로 여러분의 농장을 스마트한 기업으로 변화시킵니다. 시스템의 모든 기능을 정복해 보세요.
                        </p>
                    </div>

                    {/* Section: Flowchart */}
                    <section id="flowchart" className="scroll-mt-24 mb-32">
                        <div className="bg-white rounded-[3.5rem] border border-slate-200/80 p-16 shadow-[0_30px_100px_rgba(0,0,0,0.04)] text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500" />

                            <div className="topic-title mb-16 flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 mb-6 group-hover:rotate-12 transition-transform duration-500">
                                    <BookOpen size={32} />
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Mycelium 운영 프로세스 흐름도</h2>
                                <p className="text-slate-400 font-bold mt-2">Smart Farm Integrated Workflow</p>
                            </div>

                            <div className="relative flex flex-col items-center gap-12 max-w-4xl mx-auto">
                                {/* Flow Row 1 */}
                                <div className="flex items-center justify-center gap-8 w-full">
                                    <div className="w-64 p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200 text-emerald-900 shadow-sm hover:translate-y-[-5px] transition-transform">
                                        <div className="text-2xl mb-2">⚙️</div>
                                        <div className="font-black text-sm">8. 설정 및 관리</div>
                                        <div className="text-[11px] font-bold opacity-60 mt-1">상품 마스터 / 보안 / 업체 정보</div>
                                    </div>
                                </div>

                                <div className="text-slate-300"><ArrowUpRight className="rotate-45" size={40} /></div>

                                {/* Flow Row 2 */}
                                <div className="flex items-center justify-center gap-12 w-full">
                                    <div className="w-60 p-6 bg-sky-50 rounded-2xl border-2 border-sky-200 text-sky-900 shadow-sm hover:translate-y-[-5px] transition-transform">
                                        <div className="text-2xl mb-2">👥</div>
                                        <div className="font-black text-sm">3. 고객 관리 (CRM)</div>
                                        <div className="text-[11px] font-bold opacity-60 mt-1">AI 고객 통찰 / 실시간 상담</div>
                                    </div>
                                    <div className="flex items-center text-slate-200"><ChevronRight size={32} /></div>
                                    <div className="w-80 p-8 bg-indigo-600 rounded-[2rem] border-4 border-indigo-100 text-white shadow-2xl shadow-indigo-200 hover:scale-[1.05] transition-all">
                                        <div className="text-3xl mb-3">🛒</div>
                                        <div className="font-black text-xl">판매 관리 CENTER</div>
                                        <div className="text-[12px] font-bold opacity-80 mt-2">판매 접수 / 배송·입금 통합 관리</div>
                                    </div>
                                    <div className="flex items-center text-slate-200"><ChevronRight size={32} /></div>
                                    <div className="w-60 p-6 bg-sky-50 rounded-2xl border-2 border-sky-200 text-sky-900 shadow-sm hover:translate-y-[-5px] transition-transform">
                                        <div className="text-2xl mb-2">📅</div>
                                        <div className="font-black text-sm">7. 통합 일정 관리</div>
                                        <div className="text-[11px] font-bold opacity-60 mt-1">배송 / 체험예약 캘린더 연동</div>
                                    </div>
                                </div>

                                <div className="text-slate-300"><ArrowUpRight className="rotate-45" size={40} /></div>

                                {/* Flow Row 3 */}
                                <div className="flex items-center justify-center gap-12 w-full">
                                    <div className="w-64 p-6 bg-rose-50 rounded-2xl border-2 border-rose-200 text-rose-900 shadow-sm hover:translate-y-[-5px] transition-transform">
                                        <div className="text-2xl mb-2">🧠</div>
                                        <div className="font-black text-sm">5. 판매 인텔리전스</div>
                                        <div className="text-[11px] font-bold opacity-60 mt-1">수요예측 / RFM / 지역 히트맵</div>
                                    </div>
                                    <div className="flex items-center text-slate-200 text-2xl">🔄</div>
                                    <div className="w-64 p-6 bg-rose-50 rounded-2xl border-2 border-rose-200 text-rose-900 shadow-sm hover:translate-y-[-5px] transition-transform">
                                        <div className="text-2xl mb-2">📊</div>
                                        <div className="font-black text-sm">1. 대시보드</div>
                                        <div className="text-[11px] font-bold opacity-60 mt-1">핵심 지표 / AI 경영 브리핑</div>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-16 text-slate-400 font-bold text-sm">
                                * 모든 데이터는 <span className="text-indigo-600 font-black">판매 관리</span>를 중심으로 유기적으로 연결되어 실시간 반영됩니다.
                            </p>
                        </div>
                    </section>

                    {/* Section 1: Dashboard */}
                    <SectionTitle number="01" title="대시보드 (Dashboard)" id="dashboard" icon={<LayoutDashboard size={28} />} />
                    <div className="bg-white rounded-[3rem] border border-slate-200/80 p-12 shadow-sm space-y-12 mb-32">
                        <p className="text-slate-500 font-medium leading-[1.8] text-lg">
                            대시보드는 농장의 현재 상태를 한눈에 파악하고, AI의 도움을 받아 스마트한 경영 결정을 내릴 수 있도록 설계된 '관제 센터'입니다. 스크롤 없이 모든 현황을 즉시 파악할 수 있도록 11개의 주요 지표가 배치되어 있습니다.
                        </p>

                        <SubSection number="1.1" title="🌤️ AI 날씨 & 시즌 마케팅">
                            <LogicBox>
                                <b>날씨 실시간 연동:</b> 현재 강릉의 날씨와 기온을 실시간으로 가져옵니다.
                                <b>AI 맞춤 제안:</b> 단순히 날씨를 보여주는 것에 그치지 않고, "날씨가 흐리니 이런 상품의 홍보를 강화하면 좋다"는 등의 시즌 마케팅 조언을 AI가 매일 새롭게 제안합니다.
                            </LogicBox>
                        </SubSection>

                        <SubSection number="1.2" title="📊 핵심 경영 지표 (Stats Grid)">
                            <div className="grid grid-cols-2 gap-6">
                                <FeatureBox title="💰 오늘의 매출/주문량">오늘 발생한 실제 매출액(취소 제외)과 총 주문 건수를 즉시 확인합니다.</FeatureBox>
                                <FeatureBox title="👥 신규 고객 현황">오늘 가입한 신규 고객 수와 전체 누적 고객 수를 한눈에 비교합니다.</FeatureBox>
                                <FeatureBox title="🚚 물류 및 예약 상태">배송 대기 주문, 오늘 예정된 체험 농장 예약 건수를 체크합니다.</FeatureBox>
                                <FeatureBox title="⚠️ 재고 및 상담 알림" bg="bg-rose-50/30">재고가 부족한 상품이나 답변 대기 중인 고객 상담 건수를 붉은색으로 강조합니다.</FeatureBox>
                            </div>
                        </SubSection>

                        <SubSection number="1.3" title="🤖 AI 일일 경영 & 상담 브리핑">
                            <div className="space-y-4">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic font-medium text-slate-600 leading-relaxed">
                                    "어제의 총 매출은 지난주 대비 15% 상승했습니다. 오늘 오후 비가 예보되어 있으니 택배 포장 시 습기에 주의해 주세요."
                                </div>
                                <LogicBox title="지능형 요약 엔진">
                                    카드 클릭 시 제니가 수천 건의 데이터를 읽고, 사장님이 바로 행동에 옮길 수 있는 핵심 전략을 서신 형태로 브리핑해 드립니다.
                                </LogicBox>
                            </div>
                        </SubSection>

                        <SubSection number="1.4" title="🎂 기념일 고객 케어 & 매출 추이">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="font-black text-rose-600 flex items-center gap-2 px-1">기념일 알림 (분홍색 카드)</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">3일 이내에 생일이나 기념일이 있는 고객을 자동 추출하여 선제적인 축하 문자 발송을 유도합니다.</p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-black text-indigo-600 flex items-center gap-2 px-1">실시간 판매 랭킹</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">이번 달 판매량 1~3위 상품을 시각화하여 어떤 상품의 마진이 좋은지 직관적으로 보여줍니다.</p>
                                </div>
                            </div>
                        </SubSection>

                        <JennyTip title="제니의 대시보드 활용법">
                            농장에 출근하신 후 가장 먼저 확인해야 할 화면입니다. 제가 준비한 실시간 데이터와 마케팅 조언으로 활기찬 하루를 시작해 보세요! 5분마다 데이터가 자동으로 새로고침되어 항상 최신 상태를 유지합니다. ✨
                        </JennyTip>
                    </div>

                    {/* Section 2: Sales */}
                    <SectionTitle number="02" title="판매 관리 (Sales Control)" id="sales" icon={<ShoppingCart size={28} />} />
                    <div className="bg-white rounded-[3rem] border border-slate-200/80 p-12 shadow-sm space-y-12 mb-32">
                        <SubSection number="2.1" title="일반 접수 가이드 (Manual Entry)">
                            <div className="space-y-4">
                                <p className="text-slate-500 font-medium leading-relaxed">전화 주문이나 방문 고객 응대 시 사용하는 핵심 메뉴입니다. 접수부터 저장까지 6단계를 거칩니다.</p>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-300 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black shrink-0">1</div>
                                        <div className="text-sm">
                                            <div className="font-black text-slate-800">고객 정보 찾기</div>
                                            <div className="text-slate-500 font-medium mt-1">성함/연락처로 기존 고객을 불러옵니다. 신규 고객은 바로 입력을 시작하세요.</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-300 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black shrink-0">2</div>
                                        <div className="text-sm">
                                            <div className="font-black text-slate-800">상품 및 단가 설정</div>
                                            <div className="text-slate-500 font-medium mt-1">상품 선택 시 기본 단가가 로드되나, 사장님 재량으로 단가를 낮춰 할인을 적용할 수 있습니다.</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-300 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black shrink-0">3</div>
                                        <div className="text-sm">
                                            <div className="font-black text-slate-800">입금 상태 및 배송지 확인</div>
                                            <div className="text-slate-500 font-medium mt-1">주소 검색 아이콘을 눌러 정확한 주소를 입력하세요. <span className="bg-violet-100 text-violet-700 px-1 rounded">보라색 배경 필드</span>는 직접 수기 입력이 가능합니다.</div>
                                        </div>
                                    </div>
                                </div>
                                <LogicBox title="일괄 저장의 중요성">
                                    화면의 [+ 추가] 버튼은 임시 장바구니에 담는 행위입니다. 반드시 우측 하단의 <b>[일괄 저장]</b> 버튼을 눌러야 데이터베이스에 영구 기록됩니다.
                                </LogicBox>
                            </div>
                        </SubSection>

                        <SubSection number="2.2" title="특판/행사장 접수 (Special Events)">
                            <LogicBox color="amber">
                                <b>QR 스캔 지원:</b> 축제나 팝업 현장에서 스마트폰 카메라를 이용해 상품 QR을 찍으면 즉시 리스트에 추가됩니다.
                                <b>행사별 집계:</b> 어떤 백화점 팝업에서 수익이 가장 많이 났는지 별도의 정산 리포트를 제공합니다.
                            </LogicBox>
                        </SubSection>

                        <SubSection number="2.3" title="쇼핑몰 주문 연동 (Smart Uploader)">
                            <div className="space-y-6">
                                <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2rem] bg-indigo-50/20 text-center">
                                    <Truck size={48} className="mx-auto text-indigo-300 mb-4" />
                                    <div className="font-black text-slate-800 text-xl mb-2">Drag & Drop 인터페이스</div>
                                    <p className="text-sm text-slate-500 font-bold leading-relaxed whitespace-pre-line">네이버/쿠팡의 CSV 주문 파일을 끌어다 놓으세요.{"\n"}제니의 매칭 엔진이 상품명과 수량을 자동 분석합니다.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <FeatureBox title="지능형 상품 매칭">"꿀버섯 1kg"와 "특상품 버섯 1000g"를 동일 제품으로 인식해 연결 규칙을 저장합니다.</FeatureBox>
                                    <FeatureBox title="간편 신규 등록">파일에 있는 새로운 수취인 정보를 0.1초 만에 고객 데이터베이스에 자동 가입시킵니다.</FeatureBox>
                                </div>
                            </div>
                        </SubSection>

                        <SubSection number="2.8" title="스마트 재고 관리 (Inventory Control)">
                            <p className="text-slate-500 font-medium mb-6">판매 시 완제품 재고는 자동으로 차감됩니다. 생산 공정(박싱 등)에 따른 자재 연동 관리가 핵심입니다.</p>

                            <div id="stock-tutorial" className="p-8 bg-violet-50 rounded-[2.5rem] border-2 border-violet-100 relative group">
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-violet-600 group-hover:rotate-12 transition-transform">
                                    <Star size={24} fill="currentColor" />
                                </div>
                                <h4 className="text-xl font-black text-violet-800 mb-6 flex items-center gap-2">
                                    <ShieldCheck /> 2.8.5 [튜토리얼] 하이브리드 재고 관리 로직
                                </h4>
                                <div className="space-y-8">
                                    <div className="relative pl-8 border-l-2 border-violet-200">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 bg-violet-500 rounded-full border-4 border-white" />
                                        <b className="block text-violet-900 mb-1">1단계: 자재 연결 (최초 설정)</b>
                                        <span className="text-sm text-violet-700 font-medium">상품 관리에서 "1kg 선물세트"가 "대형 박스 1개"를 사용한다고 비율(1.0)을 설정합니다.</span>
                                    </div>
                                    <div className="relative pl-8 border-l-2 border-violet-200">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 bg-violet-500 rounded-full border-4 border-white" />
                                        <b className="block text-violet-900 mb-1">2단계: 매입 및 자동 입고</b>
                                        <span className="text-sm text-violet-700 font-medium">회계 메뉴에서 박스 500개를 살 때 '재고 연동' 스위치를 켜면 자재 창고 재고가 500개 즉시 늘어납니다.</span>
                                    </div>
                                    <div className="relative pl-8 border-l-2 border-violet-200">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 bg-violet-500 rounded-full border-4 border-white" />
                                        <b className="block text-violet-900 mb-1">3단계: 생산 전환 기록</b>
                                        <span className="text-sm text-violet-700 font-medium">재고 관리 상단의 [완제품 생산] 버튼을 누르면 자재는 줄어들고 판매용 버섯 세트는 늘어나는 자동 전환이 일어납니다.</span>
                                    </div>
                                </div>
                            </div>
                        </SubSection>

                        <JennyTip title="제니의 재고 팁">
                            퇴근 전, 대시보드의 <b>재고 주의 알림</b>을 확인하세요. 소모 속도를 분석해 앞으로 며칠 뒤면 박스가 동날지 제니가 미리 알려드립니다. 발주 타이밍을 놓치지 마세요! 🍄
                        </JennyTip>
                    </div>

                    {/* Section 3: Customer */}
                    <SectionTitle number="03" title="고객 관리 (CRM)" id="customer" icon={<Users size={28} />} />
                    <div className="bg-white rounded-[3rem] border border-slate-200/80 p-12 shadow-sm space-y-12 mb-32">
                        <SubSection number="3.1" title="조회 및 수정 모드 분리 (Safety Guard)">
                            <LogicBox color="emerald" title="데이터 보호 로직">
                                중요한 정보의 고의/실수 삭제를 방지하기 위해 고객 정보 창은 기본적으로 <b>'조회(View)'</b> 모드로 열립니다.
                                수정이 필요할 때만 명시적으로 <b>[수정하기]</b> 버튼을 누르세요.
                                수정 취소 시 입력하던 내용이 무시되고 기존 정보로 자동 롤백됩니다.
                            </LogicBox>
                        </SubSection>

                        <SubSection number="3.3" title="스마트 외상(미수금) 통합 장부">
                            <div className="grid grid-cols-2 gap-8 items-start">
                                <div className="space-y-4">
                                    <p className="text-[0.95rem] text-slate-500 font-medium leading-relaxed">
                                        고객별로 외상이 얼마인지, 언제 갚았는지 복식부기 형태로 정밀 기록합니다.
                                        판매 접수 시 '입금 대기'로 설정된 금액은 자동으로 이 장부의 <b>'청구액'</b>에 합산됩니다.
                                    </p>
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 font-black text-xs space-y-3">
                                        <div className="flex justify-between text-rose-500"><span>청구액 (Debit)</span> <span>매출 발생 (+)</span></div>
                                        <div className="flex justify-between text-emerald-500"><span>입금액 (Credit)</span> <span>송금 확인 (-)</span></div>
                                        <div className="h-px bg-slate-200" />
                                        <div className="flex justify-between text-indigo-600 text-sm"><span>최종 미수금</span> <span>잔액 (Balance)</span></div>
                                    </div>
                                </div>
                                <FeatureBox title="이월금 조정 기능">장부 도입 전의 과거 외상값은 [이월금] 항목으로 등록하여 시작점을 맞출 수 있습니다.</FeatureBox>
                            </div>
                        </SubSection>

                        <SubSection number="3.5" title="상담 관리 & AI 감성 분석">
                            <div className="grid grid-cols-2 gap-6">
                                <FeatureBox title="AI 감성 엔진">상담 텍스트에서 불만, 실망 키워드를 감지하면 리스트 옆에 🚨 배지를 붙여 최우선 케어 대상으로 분류합니다.</FeatureBox>
                                <FeatureBox title="AI 상담 요약">수백 건의 상담 내역을 일일이 읽을 필요 없이, 제니가 핵심 불만 사항을 한 문장으로 브리핑해 드립니다.</FeatureBox>
                            </div>
                        </SubSection>

                        <SubSection number="3.8" title="AI 안부 문자 (Heart-to-Heart)">
                            <JennyTip title="고민 없는 마케팅">
                                "눈이 온다는데 고객님께 뭐라고 문자 보내지?" 고민하지 마세요. 제니가 <b>현재 날씨와 시즌 이슈</b>를 조합해 따뜻한 안부 문구 3가지를 매일 새롭게 작성해 드립니다.
                            </JennyTip>
                        </SubSection>
                    </div>

                    {/* Section 4: Finance */}
                    <SectionTitle number="04" title="회계/지출 관리 (Finance)" id="finance" icon={<Calculator size={28} />} />
                    <div className="bg-white rounded-[3rem] border border-slate-200/80 p-12 shadow-sm space-y-12 mb-32">
                        <SubSection number="4.1" title="매입 등록 및 자재 입고">
                            <LogicBox color="indigo">
                                <b>📦 창고 재고 자동 입고:</b> 매입 등록 시 '연계 재고' 품목을 지정하면 장부 기록과 동시에 실제 창고의 박스 수량이 늘어납니다.
                                <b>🔢 스마트 숫자 입력:</b> 큰 금액도 헷갈리지 않게 천 단위 콤마(,)가 실시간으로 포맷팅됩니다.
                            </LogicBox>
                        </SubSection>

                        <SubSection number="4.4" title="경영 성적표 (손익 분석 센터)">
                            <div className="flex gap-10 items-center">
                                <div className="flex-1 space-y-6">
                                    <h4 className="text-xl font-black text-slate-800">지능형 자금 흐름 리포트</h4>
                                    <p className="text-slate-500 font-medium leading-relaxed">
                                        단순 매출이 아닌, 매입과 지출 항목을 모두 고려한 <b>실질 순이익(P&L)</b>을 매월 자동으로 산출합니다.
                                        비용 구조 도넛 차트를 통해 불필요하게 새는 비용(식비, 소모품 등)을 찾아보세요.
                                    </p>
                                </div>
                                <div className="w-80 h-80 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-[3rem] flex flex-col items-center justify-center text-center p-8 border border-indigo-100">
                                    <BarChart3 size={64} className="text-indigo-600 mb-6" />
                                    <div className="font-black text-slate-800 text-lg mb-2">실질 수익성 기반<br />경영 리포트 제공</div>
                                    <div className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Financial Intelligence</div>
                                </div>
                            </div>
                        </SubSection>
                    </div>

                    {/* Section 5: Intel */}
                    <SectionTitle number="05" title="판매 인텔리전스 (Intelligence)" id="intel" icon={<BrainCircuit size={28} />} />
                    <div className="bg-white rounded-[3rem] border border-slate-200/80 p-12 shadow-sm space-y-12 mb-32">
                        <SubSection number="5.1" title="AI 수요 예측 & 마진 분석">
                            <FeatureBox title="AI 미래 예측 모델">과거 3년의 주문 패턴을 머신러닝으로 분석해 향후 30~180일간의 예상 수요 곡선을 보여줍니다.</FeatureBox>
                            <LogicBox color="rose" title="진짜 효자 상품 찾기">
                                단순 판매량이 아닌 <b>'남긴 돈(순수익)'</b> 기준으로 1~3위 순위를 매깁니다.
                                원가가 입력된 제품은 실시간 마진율을 시각화하여 수익 구조를 정밀 진단합니다.
                            </LogicBox>
                        </SubSection>

                        <SubSection number="5.5" title="🗺️ AI 지능형 판매 히트맵">
                            <div className="flex gap-8">
                                <div className="w-2/3 space-y-4">
                                    <p className="text-slate-500 font-medium leading-[1.8]">
                                        엑셀 숫자로만 보던 매출을 지도로 시각화합니다. <b>보라색이 진할수록</b> 여러분 농장의 핵심 시장이며, 흰색에 가까운 지역은 앞으로 개척해야 할 블루오션입니다.
                                    </p>
                                    <LogicBox title="제니의 지역 마케팅 컨설팅">
                                        "수도권 주문량이 급증하고 있습니다. 명절 선물세트 광고를 해당 지역에 집중해 보세요." 같은 지리적 통찰을 제공합니다.
                                    </LogicBox>
                                </div>
                                <div className="w-1/3 bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center text-white relative overflow-hidden">
                                    <MapIcon size={80} className="text-indigo-400 mb-4 opacity-50" />
                                    <div className="font-black text-sm">전국 매출 밀도 시각화</div>
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                                    </div>
                                </div>
                            </div>
                        </SubSection>

                        <SubSection number="5.7" title="타겟팅 판촉 발송 엔진">
                            <LogicBox color="indigo">
                                <b>💬 카카오 알림톡:</b> 저렴한 비용으로 브랜드 로고가 담긴 고급 메시지를 발송합니다.
                                <b>📱 하이브리드 발송:</b> 고객의 연령대나 상황에 맞춰 SMS와 알림톡을 지능적으로 혼합 사용해 광고 효율을 높입니다.
                            </LogicBox>
                        </SubSection>
                    </div>

                    {/* Section 8: Settings */}
                    <SectionTitle number="08" title="설정 및 관리 (System Admin)" id="settings" icon={<Settings size={28} />} />
                    <div className="bg-white rounded-[3rem] border border-slate-200/80 p-12 shadow-sm space-y-12 mb-32">
                        <SubSection number="8.1" title="단종 상품 통폐합 (Database Purge)">
                            <LogicBox color="rose" title="데이터 정규화 도구">
                                1,000만 건의 데이터 속에서도 과거의 구형 상품 기록을 현재 정식 상품명으로 0.5초 만에 일괄 통합합니다. 중복 데이터를 제거해 통계의 정확도를 획기적으로 높이세요.
                            </LogicBox>
                        </SubSection>

                        <SubSection number="8.5" title="데이터 보안 및 백업/복구 (Security)">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                    <Cloud className="text-sky-500 mb-4" size={32} />
                                    <h4 className="font-black text-slate-800 mb-2">실시간 클라우드 연동</h4>
                                    <p className="text-xs text-slate-500 font-bold leading-relaxed">OneDrive/Google Drive와 연동하세요. PC가 고장 나거나 바이러스에 걸려도 인터넷 공간에 매일 2중으로 데이터를 보호합니다.</p>
                                </div>
                                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                    <RefreshCw className="text-indigo-500 mb-4" size={32} />
                                    <h4 className="font-black text-slate-800 mb-2">화면 전환 자동 저장</h4>
                                    <p className="text-xs text-slate-500 font-bold leading-relaxed">창을 닫거나 메뉴를 이동할 때마다 제니가 몰래 백업을 진행합니다. 작업 중이던 내용이 어이없게 유실될 걱정은 이제 끝!</p>
                                </div>
                            </div>
                        </SubSection>

                        <SubSection number="8.8" title="⚠️ 데이터 초기화 (공장 초기화)">
                            <LogicBox color="rose" title="비가역적 작업 주의">
                                [데이터 초기화]는 공장 출하 상태로 되돌리는 기능입니다. 버튼을 누르는 순간 모든 고객, 판매, 상담 기록이 <b>영구 삭제</b>되며 절대 복구할 수 없습니다. 실행 전 반드시 <b>수동 백업</b>을 진행하세요.
                            </LogicBox>
                        </SubSection>
                    </div>

                    {/* Section 9: Rescue */}
                    <SectionTitle number="09" title="제니의 긴급 구조 센터 (Rescue)" id="rescue" icon={<HelpCircle size={28} />} />
                    <div className="bg-white rounded-[3rem] border border-slate-200/80 p-12 shadow-sm space-y-12 mb-32">
                        <div className="grid grid-cols-1 gap-8">
                            <SubSection number="9.1" title="OCR 및 입력 오류 대처">
                                <LogicBox color="amber">
                                    명함 인식 시 '0'과 'O'를 혼동할 수 있습니다. 이미 입력된 텍스트는 언제든 마우스로 클릭해 수정이 가능하니, 저장 전 한 번 더 검토해 주세요.
                                </LogicBox>
                            </SubSection>
                            <SubSection number="9.2" title="화면이 멈추거나 백색 화면이 뜰 때">
                                <div className="flex gap-4 items-start p-6 bg-slate-100 rounded-2xl">
                                    <AlertTriangle className="text-orange-500 shrink-0" size={24} />
                                    <div className="text-sm font-bold text-slate-700 leading-relaxed">
                                        대부분의 일시적 오류는 프로그램을 종료 후 재실행하거나 <b>Ctrl + R (새로고침)</b>을 누르면 마법처럼 해결됩니다.
                                    </div>
                                </div>
                            </SubSection>
                            <SubSection number="9.3" title="장부 금액과 실재고가 안 맞아요">
                                <LogicBox title="영점 조절 가이드">
                                    과거의 누락된 데이터를 찾으려 애쓰기보다, [재고 조정] 메뉴에서 현재 시점의 실물 데이터로 '현행화' 하세요. 오늘을 기준으로 영점을 맞추고 기록을 새로 시작하는 것이 더 현명한 관리법입니다.
                                </LogicBox>
                            </SubSection>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-24 border-t border-slate-200">
                        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-10 shadow-xl shadow-indigo-100 rotate-3">
                            <Star size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-4">당신의 성공 파트너, 제니가 항상 곁에 있습니다</h3>
                        <p className="text-slate-400 font-bold text-sm mb-20">© 2026 Mycelium Enterprise Platform - User Instruction System v2.0</p>

                        <div className="flex justify-center gap-4">
                            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-6 py-3 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-700 transition-colors shadow-lg">맨 위로 이동</button>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}} />
        </div>
    );
};

export default UserManual;
