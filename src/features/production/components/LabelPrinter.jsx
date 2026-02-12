import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Configuration
const EVENT_NAME = 'mycelium-trigger-print';

/**
 * Public Accessor for all components
 */
export const printLabel = (type, data) => {
    console.log("[Jenny-Printer] 🚀 Isolated print requested:", type);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type, data } }));
};

// Global legacy support
window.__MYCELIUM_PRINT__ = (type, data) => {
    printLabel(type, data);
};

const LabelPrinter = () => {
    const [job, setJob] = useState(null);
    const qrContainerRef = useRef(null);

    useEffect(() => {
        const handleRequest = (e) => {
            const { type, data } = e.detail;
            setJob({ type, data });
        };

        window.addEventListener(EVENT_NAME, handleRequest);
        console.log("[Jenny-Printer] 🛸 Isolated Sandbox Printer Mounted");
        return () => window.removeEventListener(EVENT_NAME, handleRequest);
    }, []);

    useEffect(() => {
        if (job) {
            // Wait for React to render the QR code in our hidden "factory" div
            const timer = setTimeout(() => {
                try {
                    executeIsolatedPrint(job);
                } catch (err) {
                    console.error("[Jenny-Printer] ❌ Print Failed:", err);
                } finally {
                    setJob(null);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [job]);

    const executeIsolatedPrint = (jobData) => {
        const qrSvg = qrContainerRef.current?.innerHTML || '';

        console.log("[Jenny-Printer] 🛠️ Building Isolated Print Sandbox...");
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '200vw'; // Completely out of view
        iframe.style.bottom = '200vh';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page { 
                        size: 80mm 40mm; 
                        margin: 0; 
                    }
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background: #ffffff !important; 
                        color: #000000 !important; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .label-wrapper {
                        display: flex;
                        flex-direction: row;
                        width: 80mm;
                        height: 40mm;
                        padding: 4mm 6mm;
                        box-sizing: border-box;
                        align-items: center;
                        background: #ffffff !important;
                    }
                    .qr-section {
                        flex-shrink: 0;
                        margin-right: 6mm;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    .qr-box {
                        border: 2px solid black;
                        padding: 1.5mm;
                        background: white !important;
                        display: inline-block;
                        line-height: 0;
                    }
                    .qr-box svg {
                        width: 22mm !important;
                        height: 22mm !important;
                    }
                    .gap-mark {
                        font-size: 8px;
                        font-weight: 900;
                        margin-top: 4px;
                        line-height: 1;
                        border: 1px solid black;
                        padding: 2px 4px;
                        white-space: nowrap;
                    }
                    .info-section {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        height: 100%;
                        padding-left: 1mm;
                    }
                    .data-row {
                        display: flex;
                        align-items: center;
                        padding: 3px 0;
                        font-size: 11px; /* Moved from .data-label to .data-row for general row text */
                        line-height: 1;
                    }
                    .data-label {
                        color: #000000 !important;
                        font-weight: 900;
                        width: 12mm; /* Reduced from 15mm */
                        flex-shrink: 0;
                    }
                    .data-value {
                        font-weight: 900;
                        flex: 1;
                        color: #000 !important;
                    }
                    .label-code {
                        margin-top: 6px;
                        border-top: 2px solid black;
                        padding-top: 4px;
                        font-size: 11px;
                        font-weight: 900;
                        letter-spacing: -0.2px;
                        color: #000 !important;
                    }
                    .footer {
                        text-align: right;
                        font-size: 7px;
                        margin-top: 3px;
                        font-weight: bold;
                        opacity: 0.6;
                        color: #666 !important;
                    }
                </style>
            </head>
            <body>
                <div class="label-wrapper">
                    <div class="qr-section">
                        <div class="qr-box">${qrSvg}</div>
                        ${jobData.type === 'harvest' ? '<div class="gap-mark">GAP 인증 농산물</div>' : ''}
                    </div>
                    <div class="info-section">
                        <div class="data-row" style="border-top: 2px solid black; padding-top: 4px;">
                            <span class="data-label">품&nbsp;&nbsp;&nbsp;명:</span>
                            <span class="data-value">${jobData.data.title || '-'}</span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">생산일:</span>
                            <span class="data-value">${jobData.data.date || '-'}</span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">생산자:</span>
                            <span class="data-value">${jobData.data.producer || '-'}</span>
                        </div>
                        <div class="label-code">${jobData.data.code || '-'}</div>
                        <div class="footer">Smart Mycelium Logic v3</div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.focus();
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        doc.close();

        console.log("[Jenny-Printer] ⚡ Sandbox Iframe Print Triggered");

        // Cleanup iframe after a generous delay
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 3000);
    };

    return (
        <div id="jenny-printer-hidden-factory" style={{
            position: 'absolute',
            top: -9999,
            left: -9999,
            opacity: 0,
            pointerEvents: 'none',
            visibility: 'hidden'
        }}>
            <div ref={qrContainerRef}>
                {job && (
                    <QRCodeSVG
                        value={job.data.qrValue || 'ERROR'}
                        size={120}
                        level="M"
                    />
                )}
            </div>
        </div>
    );
};

export default LabelPrinter;
