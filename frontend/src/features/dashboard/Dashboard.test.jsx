import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import Dashboard from './Dashboard';
import { useDashboard } from './hooks/useDashboard';
import { ModalProvider } from '../../contexts/ModalContext';
import { BrowserRouter } from 'react-router-dom';
import * as apiBridge from '../../utils/apiBridge';
import * as aiErrorHandler from '../../utils/aiErrorHandler';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

vi.mock('../../utils/aiErrorHandler', () => ({
    invokeAI: vi.fn()
}));

vi.mock('./hooks/useDashboard', () => ({
    useDashboard: vi.fn()
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(() => vi.fn())
    };
});

vi.mock('./components/DashboardActionBar', () => ({ default: () => <div data-testid="action-bar">DashboardActionBar</div> }));
vi.mock('./components/WeatherHero', () => ({ default: () => <div data-testid="weather-hero">WeatherHero</div> }));
vi.mock('./components/StatCard', () => ({ default: ({ label, value }) => <div data-testid="stat-card">{label}: {value}</div> }));
vi.mock('./components/AlertExpansionArea', () => ({ default: () => <div data-testid="alert-area">AlertExpansionArea</div> }));
vi.mock('./components/SalesChart', () => ({ default: () => <div data-testid="sales-chart">SalesChart</div> }));
vi.mock('./components/TopProductsTable', () => ({ default: () => <div data-testid="top-products">TopProductsTable</div> }));
vi.mock('./components/VirtualIotHub', () => ({ default: () => <div data-testid="iot-hub">VirtualIotHub</div> }));
vi.mock('./DashboardLite', () => ({ default: () => <div data-testid="dashboard-lite">DashboardLite</div> }));
vi.mock('./components/modals/LogoutModal', () => ({ default: () => <div data-testid="logout-modal">LogoutModal</div> }));
vi.mock('./components/modals/AiBriefingModal', () => ({ default: () => <div data-testid="ai-brief-modal">AiBriefingModal</div> }));
vi.mock('./components/modals/BusinessReportModal', () => ({ default: () => <div data-testid="biz-report-modal">BusinessReportModal</div> }));

// Mock window.scrollTo and element.scrollIntoView
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

describe('Dashboard Component', () => {
    let user;

    const mockStats = {
        total_sales_amount: 1500000,
        total_orders: 45,
        total_customers: 5,
        total_customers_all_time: 120,
        normal_customers_count: 100,
        dormant_customers_count: 20,
        pending_orders: 3,
        today_schedule_count: 2,
        experience_reservation_count: 1,
        total_alert_count: 5,
        pending_consultation_count: 2
    };

    const mockWeeklyData = [
        { date: '02-26', total: 1000000 },
        { date: '02-27', total: 1500000 }
    ];

    const mockProducts = [
        { product_id: 1, product_name: '느타리 버섯', quantity: 100, total_sales: 500000 },
        { product_id: 2, product_name: '표고 버섯', quantity: 80, total_sales: 400000 },
        { product_id: 3, product_name: '동충하초', quantity: 50, total_sales: 300000 }
    ];

    beforeEach(async () => {
        user = userEvent.setup();
        vi.clearAllMocks();

        // Mock localStorage
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
            if (key === 'userRole') return 'admin';
            if (key === 'uiMode') return 'full';
            if (key === 'username') return 'TestUser';
            return null;
        });

        useDashboard.mockReturnValue({
            stats: mockStats,
            weeklyData: mockWeeklyData,
            top3Products: mockProducts,
            topProfitProducts: mockProducts,
            anniversaries: [],
            repurchaseCandidates: [],
            forecastAlerts: [],
            freshnessAlerts: [],
            weatherAdvice: "오늘의 날씨 어드바이스",
            isLoading: false,
            isRankLoading: false,
            isWeatherLoading: false,
            isChartLoading: false,
            isReportLoading: false,
            setIsReportLoading: vi.fn(),
            salesTrend: { pct: 10, isUp: true },
            securityStatus: { is_secure: true, warnings: [] },
            loadDashboardData: vi.fn()
        });

        apiBridge.invoke.mockImplementation((cmd) => {
            if (cmd === 'get_business_report_data') return Promise.resolve({
                period_label: '지난 주',
                total_sales: 5000000,
                total_orders: 150,
                new_customers: 10,
                top_products: [{ product_name: '느타리' }],
                top_profitable: [{ product_name: '표고' }]
            });
            return Promise.resolve(null);
        });

        apiBridge.callBridge.mockImplementation(() => Promise.resolve(null));

        aiErrorHandler.invokeAI.mockImplementation((showAlert, cmd) => {
            if (cmd === 'get_morning_briefing') return Promise.resolve("좋은 아침입니다! 오늘의 분석 리포트입니다.");
            if (cmd === 'call_gemini_ai') return Promise.resolve("AI가 생성한 비즈니스 리포트 내용입니다.");
            return Promise.resolve("");
        });
    });

    it('renders and displays main stats', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <Dashboard />
                </ModalProvider>
            </BrowserRouter>
        );

        console.log("BODY HTML:", document.body.innerHTML);

        // Use regex for more flexible matching
        expect(await screen.findByText(/오늘 주문량: 45건/)).toBeInTheDocument();
        expect(screen.getByText(/오늘의 매출액: 1,500,000원/)).toBeInTheDocument();
    });

    it('handles AI Briefing button click', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <Dashboard />
                </ModalProvider>
            </BrowserRouter>
        );

        const aiBriefBtn = await screen.findByText(/일일 브리핑/);
        await user.click(aiBriefBtn);

        await waitFor(() => {
            expect(aiErrorHandler.invokeAI).toHaveBeenCalled();
        }, { timeout: 3000 });

        expect(await screen.getByTestId('ai-brief-modal')).toBeInTheDocument();
    });

    it('handles Business Report generation', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <Dashboard />
                </ModalProvider>
            </BrowserRouter>
        );

        const weeklyReportBtn = await screen.findByText(/주간 성과/);
        await user.click(weeklyReportBtn);

        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('get_business_report_data', { period: 'weekly' });
        }, { timeout: 3000 });

        expect(await screen.getByTestId('biz-report-modal')).toBeInTheDocument();
    });

    it('toggles expansion area for alerts', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <Dashboard />
                </ModalProvider>
            </BrowserRouter>
        );

        // Find the stat card for "재고 알림"
        const inventoryLabel = await screen.findByText(/재고 알림/);
        const card = inventoryLabel.closest('div');
        await user.click(card);

        expect(await screen.getByTestId('alert-area')).toBeInTheDocument();
    });

    it('renders DashboardLite when uiMode is lite', async () => {
        // Change uiMode to lite
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
            if (key === 'userRole') return 'admin';
            if (key === 'uiMode') return 'lite';
            if (key === 'username') return 'TestUser';
            return null;
        });

        render(
            <BrowserRouter>
                <ModalProvider>
                    <Dashboard />
                </ModalProvider>
            </BrowserRouter>
        );

        expect(await screen.getByTestId('dashboard-lite')).toBeInTheDocument();
    });
});
