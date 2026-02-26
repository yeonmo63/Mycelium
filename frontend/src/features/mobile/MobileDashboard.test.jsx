import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import MobileDashboard from './MobileDashboard';
import { BrowserRouter } from 'react-router-dom';
import * as apiBridge from '../../utils/apiBridge';
import dayjs from 'dayjs';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

// Mock custom hooks
vi.mock('./hooks/useMobileDashboard', () => ({
    useMobileDashboard: vi.fn(() => ({
        stats: {
            total_sales_amount: 500000,
            total_orders: 12,
            pending_orders: 2,
            total_customers: 1,
            total_customers_all_time: 50,
            experience_reservation_count: 3,
            today_schedule_count: 4
        },
        salesTrend: { pct: 5.2, isUp: true },
        isLoading: false,
        loadData: vi.fn()
    }))
}));

vi.mock('./hooks/usePullToRefresh', () => ({
    usePullToRefresh: vi.fn(() => ({
        pullDistance: 0,
        isRefreshing: false,
        bind: {}
    }))
}));

describe('MobileDashboard Component', () => {
    it('renders and displays mobile stats', async () => {
        render(
            <BrowserRouter>
                <MobileDashboard />
            </BrowserRouter>
        );

        expect(await screen.findByText('500,000원')).toBeInTheDocument();
        expect(screen.getByText('12건')).toBeInTheDocument();
        expect(screen.getByText('2건')).toBeInTheDocument();
        expect(screen.getByText('5.2%')).toBeInTheDocument();
    });
});
