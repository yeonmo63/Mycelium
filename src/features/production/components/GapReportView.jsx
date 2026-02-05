import React, { forwardRef } from 'react';
import dayjs from 'dayjs';

const GapReportView = forwardRef(({ logs = [], companyInfo = {}, isPrinting = false, includeAttachments = true }, ref) => {
    // Collect all attachments from all logs
    const allAttachments = logs.reduce((acc, log) => {
        if (Array.isArray(log.photos)) {
            log.photos.forEach(p => {
                acc.push({
                    ...p,
                    logDate: log.log_date,
                    workType: log.work_type
                });
            });
        }
        return acc;
    }, []);

    return (
        <div
            ref={ref}
            id="printable-report"
            className={`hidden ${isPrinting ? 'print:block' : 'print:hidden'} p-8 bg-white text-black font-serif`}
        >
            {/* Styles to remove browser headers/footers */}
            {isPrinting && (
                <style>
                    {`
                    @media print {
                        @page { 
                            size: A4;
                            margin: 15mm; 
                        }
                        html, body { 
                            margin: 0; 
                            padding: 0;
                            background: white !important;
                            visibility: hidden;
                        }
                        #printable-report {
                            visibility: visible !important;
                            display: block !important;
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                        }
                        #printable-report * { 
                            visibility: visible !important; 
                        }
                        thead {
                            display: table-header-group;
                        }
                        tr {
                            page-break-inside: avoid;
                        }
                        .page-break-before {
                            page-break-before: always;
                            margin-top: 20mm;
                        }
                        /* Hide labels during report printing */
                        .qr-label-wrapper { display: none !important; }
                    }
                    `}
                </style>
            )}

            {/* Main Report Page */}
            <div className="min-h-[297mm]">
                {/* Report Header */}
                <div className="text-center mb-10 border-b-4 border-double border-black pb-6">
                    <h1 className="text-3xl font-bold tracking-tight">영농기록장 (농산물 우수관리 GAP)</h1>
                </div>

                {/* Farm Information Section */}
                <div className="mb-8 overflow-hidden rounded-sm border border-black">
                    <div className="grid grid-cols-4 divide-x divide-black border-b border-black">
                        <div className="bg-slate-100 p-3 text-center font-bold text-sm flex items-center justify-center">포장명/시설명</div>
                        <div className="p-3 text-center text-sm flex items-center justify-center col-span-3">본사 재배동 및 부속 필지</div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-black border-b border-black">
                        <div className="bg-slate-100 p-3 text-center font-bold text-sm flex items-center justify-center">재배 작물</div>
                        <div className="p-3 text-center text-sm flex items-center justify-center col-span-3">표고버섯, 송고버섯</div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-black">
                        <div className="bg-slate-100 p-3 text-center font-bold text-sm flex items-center justify-center">농업인 성명</div>
                        <div className="p-3 text-center text-sm flex items-center justify-center">{companyInfo?.representative_name || '관리자'}</div>
                        <div className="bg-slate-100 p-3 text-center font-bold text-sm flex items-center justify-center">농장 소재지</div>
                        <div className="p-3 text-center text-sm flex items-center justify-center">{companyInfo?.address || '농장 주소'}</div>
                    </div>
                </div>

                {/* Logs Table */}
                <table className="w-full border-collapse border border-black text-xs leading-relaxed">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-black p-2 w-24">월/일</th>
                            <th className="border border-black p-2 w-32">작업단계/종류</th>
                            <th className="border border-black p-2">작업 내용 및 특이사항</th>
                            <th className="border border-black p-2 w-32">투입 자재/환경 데이터</th>
                            <th className="border border-black p-2 w-20">작업자</th>
                            <th className="border border-black p-2 w-16">확인</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? logs.map((log, idx) => {
                            const env = log.env_data || {};
                            const materials = Array.isArray(log.input_materials) ? log.input_materials : [];

                            return (
                                <tr key={log.log_id || idx} className="h-20">
                                    <td className="border border-black p-2 text-center font-bold">
                                        {dayjs(log.log_date).format('MM / DD')}
                                    </td>
                                    <td className="border border-black p-2 text-center align-middle font-semibold">
                                        {log.work_type}
                                    </td>
                                    <td className="border border-black p-2 align-top text-left whitespace-pre-wrap">
                                        <div className="relative">
                                            {log.work_content}
                                            {includeAttachments && Array.isArray(log.photos) && log.photos.length > 0 && (
                                                <div className="mt-2 text-[8px] font-bold text-slate-400">
                                                    [증빙: {log.photos.map(p => p.label).join(', ')}]
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="border border-black p-2 align-top text-[10px]">
                                        {materials.length > 0 && (
                                            <div className="mb-2">
                                                <div className="font-bold border-b border-black/10 inline-block mb-1">[투입자재]</div>
                                                {materials.map((m, i) => (
                                                    <div key={i}>• {m.name}: {m.quantity}{m.unit}</div>
                                                ))}
                                            </div>
                                        )}
                                        {(env.temp || env.humidity) && (
                                            <div>
                                                <div className="font-bold border-b border-black/10 inline-block mb-1">[환경데이터]</div>
                                                {env.temp && <div>• 온도: {env.temp}°C</div>}
                                                {env.humidity && <div>• 습도: {env.humidity}%</div>}
                                                {env.co2 && <div>• CO2: {env.co2}ppm</div>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black p-2 text-center align-middle">
                                        {log.worker_name}
                                    </td>
                                    <td className="border border-black p-2 text-center align-middle">
                                        <div className="w-8 h-8 rounded-full border border-black/10 mx-auto"></div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            Array.from({ length: 15 }).map((_, i) => (
                                <tr key={i} className="h-16">
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-10">
                    <div className="flex justify-end gap-10 items-center mb-8">
                        <p className="text-base font-bold">확인자: ____________________________________ (인)</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black tracking-[0.5em]">{companyInfo?.company_name || '마이셀륨 농업회사법인'}</p>
                    </div>
                </div>
            </div>

            {/* Attachments Section (Optional) */}
            {includeAttachments && allAttachments.length > 0 && (
                <div className="page-break-before mt-20">
                    <div className="text-center mb-10 border-b-2 border-black pb-4">
                        <h2 className="text-2xl font-bold">[별첨] 현장 증빙 자료 (GAP/HACCP 인증용)</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-x-10 gap-y-12">
                        {allAttachments.map((p, idx) => (
                            <div key={idx} className="flex flex-col border border-black p-0 overflow-hidden">
                                <div className="bg-slate-50 p-2 border-b border-black font-bold text-sm flex justify-between">
                                    <span>{p.label} - {p.type === 'receipt' ? '영수증' : '현장사진'}</span>
                                    <span>{dayjs(p.logDate).format('YYYY. MM. DD')}</span>
                                </div>
                                <div className="p-4 flex items-center justify-center min-h-[300px]">
                                    {p.resolvedPath ? (
                                        <img src={p.resolvedPath} className="max-w-full max-h-[400px] object-contain" alt={p.label} />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 italic">
                                            이미지를 불러올 수 없습니다 ({p.path})
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});
export default GapReportView;
