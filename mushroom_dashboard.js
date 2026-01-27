import { loadHTML, formatCurrency } from '../../shared/utils.js';

let salesChart = null;

let refreshInterval = null;

let g_cachedDashboardData = null;

export async function initDashboard() {
    // Clear any existing refresh interval to avoid duplicates
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }

    await loadHTML('dashboard-view', 'modules/dashboard/dashboard.html');

    // Bind clickable cards (Navigation)
    document.querySelectorAll('.clickable-card').forEach(card => {
        card.addEventListener('click', () => {
            const target = card.getAttribute('data-target');
            if (target && window.requestNavigation) {
                window.requestNavigation(target);
            }
        });
    });

    // AI Briefing Card Specific Handler
    const aiCard = document.getElementById('card-ai-briefing');
    if (aiCard) {
        aiCard.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                if (window.showLoading) window.showLoading('AI 브리핑 준비 중...', '일일 리포트를 생성하고 있습니다.');
                const { checkAndShowBriefing } = await import('./briefing.js');
                await checkAndShowBriefing(true);
            } catch (err) {
                console.error(err);
                if (window.showAlert) window.showAlert('AI 브리핑을 불러오는데 실패했습니다.');
            } finally {
                if (window.hideLoading) window.hideLoading();
            }
        });
    }

    const consultBriefingBtn = document.getElementById('btn-pending-consult-briefing');
    if (consultBriefingBtn) {
        consultBriefingBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                if (window.showLoading) window.showLoading('AI 상담 브리핑 준비 중...', '미처리 상담 내역을 분석하고 있습니다.');
                const summary = await window.__TAURI__.core.invoke('get_pending_consultations_summary');

                // Reuse the briefing modal style OR show custom alert
                if (window.showCustomModal) {
                    window.showCustomModal({
                        title: '시맨틱 CRM - AI 상담 브리핑',
                        content: summary,
                        icon: 'psychology',
                        color: '#3b82f6'
                    });
                } else {
                    // Fallback to simpler modal if exists or alert
                    if (window.showAlert) window.showAlert(summary, 'AI 상담 브리핑');
                }
            } catch (err) {
                console.error(err);
                const errMsg = err.toString();
                if (errMsg.includes("429") || errMsg.includes("Quota exceeded")) {
                    if (window.showAlert) window.showAlert('현재 AI 서비스 요청이 많아 잠시 분석이 지연되고 있습니다. 약 1분 후 다시 시도해 주세요.', 'AI 분석 안내');
                } else {
                    if (window.showAlert) window.showAlert('상담 브리핑 생성에 실패했습니다: ' + err);
                }
            } finally {
                if (window.hideLoading) window.hideLoading();
            }
        });
    }

    // CACHE HIT: Render immediately if data exists
    if (g_cachedDashboardData) {
        renderDashboardUI(g_cachedDashboardData);
    }

    // Always fetch fresh data in background
    await updateDashboardData();

    // Start auto-refresh every 5 minutes
    refreshInterval = setInterval(async () => {
        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView && !dashboardView.classList.contains('hidden')) {
            console.log("Refreshing dashboard data...");
            await updateDashboardData();
        } else {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }, 300000);
}

async function updateDashboardData() {
    try {
        const [statsResult, annivResult, top3Result, weeklyResult, repurchaseResult, forecastResult] = await Promise.allSettled([
            window.__TAURI__.core.invoke('get_dashboard_stats'),
            window.__TAURI__.core.invoke('get_upcoming_anniversaries'),
            window.__TAURI__.core.invoke('get_top3_products_by_qty'),
            window.__TAURI__.core.invoke('get_weekly_sales_data'),
            window.__TAURI__.core.invoke('get_repurchase_candidates'),
            window.__TAURI__.core.invoke('get_inventory_forecast_alerts'),
            window.__TAURI__.core.invoke('get_top_profit_products') // New
        ]);

        const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
        const anniversaries = annivResult.status === 'fulfilled' ? annivResult.value : [];
        const top3Products = top3Result.status === 'fulfilled' ? top3Result.value : [];
        const weeklyData = weeklyResult.status === 'fulfilled' ? weeklyResult.value : [];
        const repurchaseCandidates = repurchaseResult.status === 'fulfilled' ? repurchaseResult.value : [];
        const forecastAlerts = forecastResult.status === 'fulfilled' ? forecastResult.value : [];
        const topProfitProducts = typeof arguments[0] === 'object' && arguments[0]?.length === 7
            ? (arguments[0][6].status === 'fulfilled' ? arguments[0][6].value : [])
            : (await window.__TAURI__.core.invoke('get_top_profit_products') || []);

        // Save to Cache
        g_cachedDashboardData = { stats, anniversaries, top3Products, weeklyData, repurchaseCandidates, forecastAlerts, topProfitProducts };

        renderDashboardUI(g_cachedDashboardData);

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

function renderDashboardUI({ stats, anniversaries, top3Products, weeklyData, repurchaseCandidates, forecastAlerts, topProfitProducts }) {
    // 1. Update Title and Stats
    const titleEl = document.getElementById('title-total-sales');
    if (titleEl) titleEl.textContent = `금일 매출액`;

    const titleOrdersEl = document.getElementById('title-total-orders');
    if (titleOrdersEl) titleOrdersEl.textContent = `금일 주문 건수`;

    const titleCustomersEl = document.getElementById('title-new-customers');
    if (titleCustomersEl) titleCustomersEl.textContent = `금일 새 고객`;

    if (stats) {
        const elSales = document.getElementById('stat-total-sales');
        const elOrders = document.getElementById('stat-total-orders');
        const elCustomers = document.getElementById('stat-total-customers');
        const elPending = document.getElementById('stat-pending-orders');
        const elTodaySch = document.getElementById('stat-today-schedules');
        const elExpRes = document.getElementById('stat-experience-reservations');
        const elLowStock = document.getElementById('stat-low-stock');
        const elPendingConsult = document.getElementById('stat-pending-consultations');

        // Trend Calculation for Sales (Today vs Yesterday)
        let trendHtml = '';
        if (weeklyData && weeklyData.length > 0 && typeof dayjs !== 'undefined') {
            try {
                const todayStr = dayjs().format('MM-DD');
                const yestStr = dayjs().subtract(1, 'day').format('MM-DD');

                const todayData = weeklyData.find(d => d.date === todayStr);
                const yestData = weeklyData.find(d => d.date === yestStr);

                if (todayData && yestData) {
                    const todayVal = todayData.total || 0;
                    const yestVal = yestData.total || 0;

                    if (yestVal > 0) {
                        const diff = todayVal - yestVal;
                        const pct = (diff / yestVal) * 100;
                        const color = diff >= 0 ? '#10b981' : '#ef4444';
                        const icon = diff >= 0 ? 'trending_up' : 'trending_down';
                        trendHtml = `<span style="font-size: 0.8rem; color: ${color}; margin-left: 8px; display: inline-flex; align-items: center; font-weight: 700;">
                                <span class="material-symbols-rounded" style="font-size: 16px; margin-right: 2px;">${icon}</span>
                                ${Math.abs(pct).toFixed(1)}%
                            </span>`;
                    } else if (todayVal > 0) {
                        trendHtml = `<span style="font-size: 0.8rem; color: #10b981; margin-left: 8px; display: inline-flex; align-items: center; font-weight: 700;">
                                <span class="material-symbols-rounded" style="font-size: 16px; margin-right: 2px;">trending_up</span>
                                New
                            </span>`;
                    }
                }
            } catch (e) {
                console.error("Trend calc error:", e);
            }
        }

        if (elSales) elSales.innerHTML = `${formatCurrency(stats.total_sales_amount || 0)} ${trendHtml}`;
        if (elOrders) elOrders.textContent = formatCurrency(stats.total_orders || 0);
        if (elCustomers) elCustomers.textContent = `${formatCurrency(stats.total_customers || 0)} / ${formatCurrency(stats.total_customers_all_time || 0)}`;
        if (elPending) elPending.textContent = formatCurrency(stats.pending_orders || 0);
        if (elTodaySch) elTodaySch.textContent = formatCurrency(stats.today_schedule_count || 0);
        if (elExpRes) elExpRes.textContent = formatCurrency(stats.experience_reservation_count || 0);
        if (elLowStock) elLowStock.textContent = formatCurrency(stats.low_stock_count || 0);
        if (elPendingConsult) elPendingConsult.textContent = formatCurrency(stats.pending_consultation_count || 0);
    } else {
        // Stats failed but we should at least clear skeletons with zeros
        document.querySelectorAll('.skeleton-value').forEach(s => s.innerHTML = '0');
    }

    // 1.5 Update Anniversaries
    const elAnnivCount = document.getElementById('stat-anniversary-count');
    const cardAnniv = document.getElementById('card-anniversary');

    if (elAnnivCount) elAnnivCount.textContent = `${(anniversaries || []).length} 명`;

    // 1.6 Update Repurchase Prediction
    const elRepurchaseCount = document.getElementById('stat-repurchase-count');
    const cardRepurchase = document.getElementById('card-repurchase-prediction');

    if (elRepurchaseCount) elRepurchaseCount.textContent = `${(repurchaseCandidates || []).length} 명`;

    if (cardRepurchase) {
        cardRepurchase.onclick = () => {
            openRepurchaseModal(repurchaseCandidates || []);
        };
    }

    if (cardAnniv) {
        const newCard = cardAnniv.cloneNode(true);
        cardAnniv.parentNode.replaceChild(newCard, cardAnniv);
        newCard.addEventListener('click', () => {
            openAnniversaryModal(anniversaries || []);
        });
    }

    // 1.7 Update Inventory Forecast
    const elForecastCount = document.getElementById('stat-low-stock');
    const cardForecast = document.getElementById('card-inventory-forecast');

    if (elForecastCount) {
        elForecastCount.textContent = `${(forecastAlerts || []).length} 품목`;
    }

    if (cardForecast) {
        cardForecast.onclick = () => {
            openInventoryForecastModal(forecastAlerts || []);
        };
    }

    // 2. Update Top Products (Toggle Logic)
    const btnQty = document.getElementById('btn-top-qty');
    const btnProfit = document.getElementById('btn-top-profit');
    const thValue = document.getElementById('th-top-value');

    // Default View: Quantity
    let currentMode = 'qty';

    const renderTopProducts = (mode) => {
        const tbody = document.getElementById('top3-sales-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        let data = [];
        if (mode === 'qty') data = top3Products || [];
        else data = topProfitProducts || [];

        if (thValue) thValue.textContent = mode === 'qty' ? '판매금액' : '순이익';

        if (data && data.length > 0) {
            data.forEach((p, index) => {
                let rankBadge = '';
                if (index === 0) rankBadge = '<span class="rank-badge rank-1" style="font-size: 1.2rem;">🥇</span>';
                else if (index === 1) rankBadge = '<span class="rank-badge rank-2" style="font-size: 1.1rem;">🥈</span>';
                else if (index === 2) rankBadge = '<span class="rank-badge rank-3" style="font-size: 1.0rem;">🥉</span>';
                else rankBadge = `<span class="rank-badge" style="color: #94a3b8; font-weight: 600;">${index + 1}</span>`;

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #f1f5f9';

                // Fields differ slightly between Qty stats and Profit stats
                const name = p.product_name;
                const qty = p.total_quantity;
                const value = mode === 'qty' ? p.total_amount : p.net_profit;

                // For profit mode, maybe show margin?
                let valueDisplay = formatCurrency(value);
                if (mode === 'profit' && p.margin_rate) {
                    valueDisplay += ` <span style="font-size:0.75rem; color:#10b981;">(${p.margin_rate.toFixed(1)}%)</span>`;
                }

                tr.innerHTML = `
                        <td style="text-align: center; padding: 12px;">${rankBadge}</td>
                        <td style="font-weight: 600; color: #334155; padding: 12px;">${name}</td>
                        <td style="text-align: center; padding: 12px;">
                            <span style="background: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                                ${formatCurrency(qty)}
                            </span>
                        </td>
                        <td style="text-align: right; color: #64748b; padding: 12px;">${valueDisplay}</td>
                    `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #94a3b8;">데이터가 없습니다</td></tr>';
        }
    };

    // Initial Render
    renderTopProducts('qty');

    // Bind Events (ensure simple toggle via class)
    if (btnQty && btnProfit) {
        // Clone to remove old listeners
        const newBtnQty = btnQty.cloneNode(true);
        const newBtnProfit = btnProfit.cloneNode(true);
        btnQty.parentNode.replaceChild(newBtnQty, btnQty);
        btnProfit.parentNode.replaceChild(newBtnProfit, btnProfit);

        newBtnQty.onclick = () => {
            newBtnQty.classList.add('active');
            newBtnQty.style.background = 'white';
            newBtnQty.style.fontWeight = '700';
            newBtnQty.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';

            newBtnProfit.classList.remove('active');
            newBtnProfit.style.background = 'transparent';
            newBtnProfit.style.fontWeight = '600';
            newBtnProfit.style.boxShadow = 'none';
            renderTopProducts('qty');
        };

        newBtnProfit.onclick = () => {
            newBtnProfit.classList.add('active');
            newBtnProfit.style.background = 'white';
            newBtnProfit.style.fontWeight = '700';
            newBtnProfit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';

            newBtnQty.classList.remove('active');
            newBtnQty.style.background = 'transparent';
            newBtnQty.style.fontWeight = '600';
            newBtnQty.style.boxShadow = 'none';
            renderTopProducts('profit');
        };
    }

    // 3. Render Chart (Safe Check)
    if (typeof Chart !== 'undefined') {
        renderChart(weeklyData);
    } else {
        const canvas = document.getElementById('salesChart');
        if (canvas) {
            canvas.style.display = 'none';
            const p = document.createElement('p');
            p.style.cssText = 'padding: 40px; text-align: center; color: #94a3b8; font-size: 0.9rem;';
            p.textContent = '차트 도구를 불러오지 못했습니다. (네트워크 연결 필요)';
            canvas.parentNode.appendChild(p);
        }
    }

    // 5. Weather Marketing Advice (Async)
    loadWeatherMarketingAdvice();

    // Bind refresh button
    const btnRefreshAi = document.getElementById('btn-refresh-ai-repurchase');
    if (btnRefreshAi) {
        btnRefreshAi.onclick = async () => {
            await loadWeatherMarketingAdvice();
        };
    }
}

async function loadWeatherMarketingAdvice() {
    const adviceEl = document.getElementById('weather-marketing-advice');
    const infoEl = document.getElementById('weather-info');
    const iconEl = document.getElementById('weather-icon');
    if (!adviceEl || !infoEl) return;

    try {
        const result = await window.__TAURI__.core.invoke('get_weather_marketing_advice');

        infoEl.textContent = `${result.weather_desc} (${result.temperature.toFixed(1)}°C)`;
        adviceEl.textContent = result.marketing_advice;

        // Update icon based on description
        if (iconEl) {
            const desc = result.weather_desc;
            if (desc.includes('눈')) iconEl.textContent = 'ac_unit';
            else if (desc.includes('비') || desc.includes('소나기')) iconEl.textContent = 'umbrella';
            else if (desc.includes('구름많음') || desc.includes('흐림')) iconEl.textContent = 'filter_drama';
            else if (desc.includes('구름조금')) iconEl.textContent = 'partly_cloudy_day';
            else if (desc.includes('맑음')) iconEl.textContent = 'wb_sunny';
            else if (desc.includes('안개')) iconEl.textContent = 'foggy';
            else if (desc.includes('천둥') || desc.includes('번개')) iconEl.textContent = 'thunderstorm';
            else iconEl.textContent = 'cloud';
        }
    } catch (error) {
        console.error("Weather Analysis failed:", error);
        infoEl.textContent = "날씨 정보 없음";
    }
}


function renderChart(data) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    salesChart = null;

    const labels = data.map(d => d.date);
    const values = data.map(d => d.total);

    // Create a beautiful gradient for the area fill
    const fillGradient = ctx.createLinearGradient(0, 0, 0, 400);
    fillGradient.addColorStop(0, 'rgba(99, 102, 241, 0.15)'); // Indigo light
    fillGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '일별 매출 (원)',
                data: values,
                borderColor: '#6366f1', // Indigo (matches logo/sidebar accent)
                backgroundColor: fillGradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4, // Smoother curve
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(226, 232, 240, 0.6)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 },
                        callback: function (value) {
                            if (value >= 10000) return (value / 10000) + '만';
                            return value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const firstElement = elements[0];
                    const label = labels[firstElement.index];
                    const dailyItem = document.querySelector('.menu li[data-target="daily-sales"]');
                    if (dailyItem) {
                        window.__DASHBOARD_SELECTED_DATE__ = label;
                        dailyItem.click();
                    }
                }
            }
        }
    });
}

function openAnniversaryModal(list) {
    const modal = document.getElementById('anniversary-modal');
    const tbody = document.getElementById('anniversary-list-body');
    if (!modal || !tbody) return;

    tbody.innerHTML = '';
    if (list && list.length > 0) {
        list.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td style="font-weight: 600;">${c.customer_name}</td>
            <td>${c.anniversary_type || '-'}</td>
            <td>${c.anniversary_date || '-'}</td>
            <td>${c.mobile_number || c.phone_number || '-'}</td>
            <td>
                <button class="btn-secondary btn-action-mini btn-send-congrats">
                    축하 문자
                </button>
            </td>
        `;
            tbody.appendChild(tr);

            const btnSend = tr.querySelector('.btn-send-congrats');
            if (btnSend) {
                btnSend.onclick = () => window.requestNavigation('customer-sms');
            }
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">예정된 기념일 고객이 없습니다.</td></tr>';
    }

    modal.style.display = 'flex';

    // Close handlers
    const closeBtn = modal.querySelector('.close-modal');
    const closeBtnBtn = modal.querySelector('.close-modal-btn');

    const closeScale = () => { modal.style.display = 'none'; };

    if (closeBtn) closeBtn.onclick = closeScale;
    if (closeBtnBtn) closeBtnBtn.onclick = closeScale;

    modal.onclick = (e) => {
        if (e.target === modal) closeScale();
    };
}

function openRepurchaseModal(list) {
    const modal = document.getElementById('repurchase-modal');
    const tbody = document.getElementById('repurchase-list-body');
    if (!modal || !tbody) return;

    tbody.innerHTML = '';
    if (list && list.length > 0) {
        list.forEach(c => {
            const tr = document.createElement('tr');
            const daysRemaining = parseInt(c.predicted_days_remaining);
            const dayStatus = daysRemaining === 0 ? '오늘'
                : (daysRemaining > 0 ? `${daysRemaining}일 남음` : `${Math.abs(daysRemaining)}일 경과`);
            const color = daysRemaining === 0 ? '#ef4444' : (daysRemaining > 0 ? '#10b981' : '#f59e0b');

            tr.innerHTML = `
                <td style="font-weight: 600;">${c.customer_name}</td>
                <td style="font-size: 0.85rem;">${c.mobile_number || '-'}</td>
                <td style="font-size: 0.85rem;">${c.last_order_date || '-'}</td>
                <td style="text-align: center;">${c.avg_interval_days}일</td>
                <td style="color: ${color}; font-weight: 700; text-align: center;">${dayStatus}</td>
                <td style="font-size: 0.8rem; color: #64748b;">${c.last_product || '-'}</td>
                <td>
                    <button class="btn-primary btn-action-mini btn-ai-draft" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px;">
                        AI 문구 생성
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            const btnAi = tr.querySelector('.btn-ai-draft');
            if (btnAi) {
                btnAi.onclick = async () => {
                    await generateAIDraftMessage(c);
                };
            }
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">예상 주기에 도달한 고객이 없습니다.</td></tr>';
    }

    modal.style.display = 'flex';

    // Close handlers
    const closeBtn = modal.querySelector('.close-modal');
    const closeBtnBtn = modal.querySelector('.close-modal-btn');
    const closeScale = () => { modal.style.display = 'none'; };
    if (closeBtn) closeBtn.onclick = closeScale;
    if (closeBtnBtn) closeBtnBtn.onclick = closeScale;
    modal.onclick = (e) => { if (e.target === modal) closeScale(); };
}

function openInventoryForecastModal(alerts) {
    const modal = document.getElementById('inventory-forecast-modal');
    const tbody = document.getElementById('inventory-forecast-body');
    if (!modal || !tbody) return;

    tbody.innerHTML = '';
    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: #94a3b8;">부족하거나 소모 임박한 재고가 없습니다.</td></tr>';
    } else {
        alerts.forEach(item => {
            const tr = document.createElement('tr');
            const isLow = item.stock_quantity <= item.safety_stock;
            const isCritical = item.days_remaining <= 3;

            let statusLabel = '';
            if (isLow) statusLabel = '<span style="color:#ef4444; font-weight:700;">[재고부족]</span>';
            else if (isCritical) statusLabel = '<span style="color:#f59e0b; font-weight:700;">[소모임박]</span>';

            const daysDisplay = (item.days_remaining >= 900) ? '출고 없음' : `${item.days_remaining}일 남음`;

            tr.innerHTML = `
                <td style="padding: 12px; font-size: 0.85rem; color: #64748b;">${item.item_type === 'material' ? '📦 자재' : '🍄 상품'}</td>
                <td style="padding: 12px;">
                    <div style="font-weight:600;">${item.product_name} ${statusLabel}</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">${item.specification || '-'}</div>
                </td>
                <td style="padding: 12px; text-align: center; font-weight: 700; color: ${isLow ? '#ef4444' : '#1e293b'};">
                    ${item.stock_quantity.toLocaleString()}개
                </td>
                <td style="padding: 12px; text-align: center; color: #64748b;">
                    ${item.daily_avg_consumption.toFixed(1)}개/일
                </td>
                <td style="padding: 12px; text-align: center; font-weight: 700; color: ${isCritical ? '#ef4444' : '#f59e0b'};">
                    ${daysDisplay}
                </td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn-text-action action-btn-nav" data-target="${item.item_type === 'material' ? 'finance-purchase' : 'sales-stock'}" style="font-size: 0.8rem;">
                        관리 이동
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.action-btn-nav').forEach(btn => {
            btn.onclick = () => {
                modal.style.display = 'none';
                if (window.requestNavigation) window.requestNavigation(btn.dataset.target);
            };
        });
    }

    modal.style.display = 'flex';

    // Close events
    const closeBtns = modal.querySelectorAll('.close-modal, .close-modal-btn');
    closeBtns.forEach(btn => btn.onclick = () => modal.style.display = 'none');
}

async function generateAIDraftMessage(customer) {
    try {
        if (window.showLoading) window.showLoading('AI 문구 생성 중...', `${customer.customer_name} 고객님을 위한 맞춤형 혜택 문구를 작성하고 있습니다.`);

        const prompt = `당신은 '스마트 농장'의 버섯 전문 마케터입니다.
고객 성함: ${customer.customer_name}
마지막 구매 상품: ${customer.last_product}
구매 주기: 약 ${customer.avg_interval_days}일
분석 결과: 현재 재구매 시점이 도래했습니다.

위 데이터를 활용하여 고객의 재구매를 유도하는 따뜻하고 세련된 홍보 문구를 한 통 작성해 주세요.
[조건]
1. 너무 부담스럽지 않게 시작하세요.
2. '${customer.last_product}'를 언급하며 품질에 대한 만족도를 확인하세요.
3. 재구매 시 적용 가능한 가상의 혜택(예: 무료배송 또는 소정의 증정품)을 자연스럽게 언급하세요.
4. 문구 본문만 출력하세요 (부가 설명 없이).`;

        const response = await window.__TAURI__.core.invoke('call_gemini_ai', { prompt });

        if (window.hideLoading) window.hideLoading();

        const ok = await new Promise(resolve => {
            const draftModal = document.createElement('div');
            draftModal.className = 'modal-overlay';
            draftModal.style.zIndex = '30000';
            draftModal.innerHTML = `
                <div class="modal-content" style="width: 450px; text-align: left; background: white; padding: 24px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                    <h3 style="color: #6366f1; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; font-size: 1.25rem;">
                        <span class="material-symbols-rounded">magic_button</span> AI 추천 문구
                    </h3>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 12px; font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px; border: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto;">${response}</div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button class="btn-secondary" id="btn-draft-close" style="padding: 8px 16px; font-size: 0.9rem;">닫기</button>
                        <button class="btn-primary" id="btn-draft-copy" style="padding: 8px 16px; font-size: 0.9rem; background: #6366f1;">문구 복사 & 발송 화면 이동</button>
                    </div>
                </div>
            `;
            document.body.appendChild(draftModal);
            document.getElementById('btn-draft-close').onclick = () => {
                document.body.removeChild(draftModal);
                resolve(false);
            };
            document.getElementById('btn-draft-copy').onclick = () => {
                document.body.removeChild(draftModal);
                resolve(true);
            };
        });

        if (ok) {
            navigator.clipboard.writeText(response);
            window.__SMS_DRAFT_CONTENT__ = response;
            window.__SMS_DRAFT_RECIPIENT__ = customer.mobile_number;
            window.requestNavigation('customer-sms');
        }
    } catch (e) {
        console.error(e);
        if (window.hideLoading) window.hideLoading();
        const errMsg = e.toString();
        if (errMsg.includes("429") || errMsg.includes("Quota exceeded")) {
            if (window.showAlert) window.showAlert('Gemini AI 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.', 'AI 서비스 안내');
        } else {
            if (window.showAlert) window.showAlert('AI 문구 생성 중 오류가 발생했습니다: ' + e);
        }
    }
}


