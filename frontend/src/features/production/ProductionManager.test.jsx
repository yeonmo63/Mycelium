import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ProductionManager from './ProductionManager';
import { ModalProvider } from '../../contexts/ModalContext';
import * as apiBridge from '../../utils/apiBridge';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

// Mock sub-components to focus on ProductionManager's own logic
vi.mock('./components/ProductionSpaces', () => ({ default: () => <div data-testid="production-spaces">ProductionSpaces</div> }));
vi.mock('./components/ProductionBatches', () => ({ default: () => <div data-testid="production-batches">ProductionBatches</div> }));
vi.mock('./components/ProductionLogs', () => ({ default: () => <div data-testid="production-logs">ProductionLogs</div> }));
vi.mock('./components/HarvestRecords', () => ({ default: () => <div data-testid="harvest-records">HarvestRecords</div> }));
vi.mock('./components/FarmingReportView', () => ({ default: () => <div data-testid="farming-report-view">FarmingReportView</div> }));

describe('ProductionManager Component', () => {
    let user;

    const mockBatches = [
        { batch_id: 1, status: 'active' },
        { batch_id: 2, status: 'growing', expected_harvest_date: '2023-10-01' }
    ];

    const mockLogs = [
        { log_id: 1, log_date: '2023-10-01', work_type: 'plant', work_content: 'Test content', worker_name: 'Worker' }
    ];

    const mockHarvests = [
        { harvest_id: 1, harvest_date: '2023-10-01', quantity: '50' }
    ];

    const mockSpaces = [
        { space_id: 1, space_name: 'Space 1' }
    ];

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
        apiBridge.invoke.mockImplementation((cmd) => {
            if (cmd === 'get_production_batches') return Promise.resolve(mockBatches);
            if (cmd === 'get_production_logs') return Promise.resolve(mockLogs);
            if (cmd === 'get_production_harvests') return Promise.resolve(mockHarvests);
            if (cmd === 'get_production_spaces') return Promise.resolve(mockSpaces);
            return Promise.resolve([]);
        });
    });

    it('renders and displays dashboard by default', async () => {
        render(
            <ModalProvider>
                <ProductionManager />
            </ModalProvider>
        );

        expect(await screen.findByText(/GAP\/HACCP 인증센터/i)).toBeInTheDocument();
        expect(await screen.findByText(/최근 영농일지 내역/i)).toBeInTheDocument();
        expect(screen.getByText(/활성 배치/i)).toBeInTheDocument();
    });

    it('switches tabs correctly', async () => {
        render(
            <ModalProvider>
                <ProductionManager />
            </ModalProvider>
        );

        const spacesTab = screen.getByRole('button', { name: /시설\/필지 관리/i });
        await user.click(spacesTab);
        expect(screen.getByTestId('production-spaces')).toBeInTheDocument();

        const batchesTab = screen.getByRole('button', { name: /배치\/작업실 관리/i });
        await user.click(batchesTab);
        expect(screen.getByTestId('production-batches')).toBeInTheDocument();
    });

    it('opens report preview modal', async () => {
        render(
            <ModalProvider>
                <ProductionManager />
            </ModalProvider>
        );

        const previewBtn = screen.getByRole('button', { name: /리포트 미리보기/i });
        await user.click(previewBtn);

        expect(screen.getByTestId('farming-report-view')).toBeInTheDocument();
    });
});
