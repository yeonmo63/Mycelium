import dayjs from 'dayjs';

export const handlePrint = (title, contentHTML) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();

    let processedContent = contentHTML;
    if (typeof contentHTML === 'string' && contentHTML.includes('===')) {
        processedContent = contentHTML.split('===').map((section, idx) => {
            if (!section.trim()) return '';
            if (idx === 0 && !contentHTML.startsWith('===')) return `<div>${section}</div>`;
            const lines = section.trim().split('\n');
            const header = lines[0];
            const rest = lines.slice(1).join('\n');
            return `<div class="p-section">
                <h2 class="section-title">${header}</h2>
                <div class="section-body">${rest}</div>
            </div>`;
        }).join('');
    }

    doc.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
                @page { size: A4; margin: 25mm 20mm; }
                body { font-family: 'Pretendard', -apple-system, sans-serif; line-height: 1.7; color: #1e293b; word-break: keep-all; }
                .print-header { margin-bottom: 40px; padding-bottom: 15px; border-bottom: 3px solid #4f46e5; display: flex; justify-content: space-between; align-items: flex-end; }
                h1 { font-size: 28px; font-weight: 900; margin: 0; color: #0f172a; }
                .date { font-size: 11px; color: #64748b; font-weight: 700; letter-spacing: 0.05em; }
                .p-section { margin-bottom: 30px; page-break-inside: avoid; }
                .section-title { font-size: 18px; font-weight: 900; color: #4f46e5; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
                .section-body { white-space: pre-wrap; color: #334155; }
                .bg-slate-50 { background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9; }
                .bg-amber-50 { background-color: #fffbeb; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 5px solid #f59e0b; }
                .text-indigo-600 { color: #4f46e5; font-weight: 800; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
                th { background-color: #f1f5f9; color: #475569; font-weight: 800; text-align: left; padding: 12px; border: 1px solid #e2e8f0; }
                td { padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155; }
                .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #94a3b8; }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>${title}</h1>
                <div class="date">REPORTED ON ${dayjs().format('YYYY. MM. DD. HH:mm')}</div>
            </div>
            <div class="content">${processedContent}</div>
            <div class="footer">본 리포트는 Mycelium Intelligence System에 의해 자동 생성된 문서입니다.</div>
        </body>
        </html>
    `);
    doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
    }, 800);
};
