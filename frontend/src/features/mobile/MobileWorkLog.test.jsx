import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import MobileWorkLog from './MobileWorkLog';
import { ModalProvider } from '../../contexts/ModalContext';
import { BrowserRouter } from 'react-router-dom';
import * as apiBridge from '../../utils/apiBridge';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

vi.mock('html5-qrcode', () => ({
    Html5Qrcode: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockResolvedValue({}),
        stop: vi.fn().mockResolvedValue({}),
        clear: vi.fn(),
        scanFileV2: vi.fn()
    }))
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => false)
    }
}));

// Mock PullToRefresh hook
vi.mock('./hooks/usePullToRefresh', () => ({
    usePullToRefresh: vi.fn(() => ({
        pullDistance: 0,
        isRefreshing: false,
        bind: {}
    }))
}));

describe('MobileWorkLog Component', () => {
    let user;

    const mockSpaces = [
        { space_id: 1, space_name: '구역 A' }
    ];

    const mockBatches = [
        { batch_id: 10, batch_code: 'B-010' }
    ];

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
        apiBridge.callBridge.mockImplementation((cmd) => {
            if (cmd === 'get_production_spaces') return Promise.resolve(mockSpaces);
            if (cmd === 'get_production_batches') return Promise.resolve(mockBatches);
            if (cmd === 'save_farming_log') return Promise.resolve({ success: true });
            return Promise.resolve([]);
        });

        // Mock localStorage for worker name
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
            if (key === 'username') return 'Test Worker';
            return null;
        });
    });

    it('renders and displays work log form', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileWorkLog />
                </ModalProvider>
            </BrowserRouter>
        );

        expect(await screen.findByText(/현장 작업 일지/i)).toBeInTheDocument();
        expect(screen.getByText(/작업 구역\/배치 선택/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/어떤 작업을 하셨나요/i)).toBeInTheDocument();
    });

    it('populates spaces and batches and allows selection', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileWorkLog />
                </ModalProvider>
            </BrowserRouter>
        );

        // Wait for the data to be loaded into the selects
        await waitFor(() => {
            const selects = screen.getAllByRole('combobox');
            expect(selects[0].options.length).toBeGreaterThan(1);
            expect(selects[1].options.length).toBeGreaterThan(1);
        }, { timeout: 3000 });

        const selects = screen.getAllByRole('combobox');
        expect(selects).toHaveLength(2);

        await user.selectOptions(selects[0], '1'); // space_id: 1
        expect(selects[0].value).toBe('1');

        await user.selectOptions(selects[1], '10'); // batch_id: 10
        expect(selects[1].value).toBe('10');
    });

    it('handles environmental data and work content input', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileWorkLog />
                </ModalProvider>
            </BrowserRouter>
        );

        const tempInput = screen.getByPlaceholderText('온도');
        const humiInput = screen.getByPlaceholderText('습도');
        const contentArea = screen.getByPlaceholderText(/어떤 작업을 하셨나요/i);

        await user.type(tempInput, '24.5');
        await user.type(humiInput, '65');
        await user.type(contentArea, '영양제 살포 완료');

        expect(tempInput.value).toBe('24.5');
        expect(humiInput.value).toBe('65');
        expect(contentArea.value).toBe('영양제 살포 완료');
    });

    it('saves farming log successfully', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileWorkLog />
                </ModalProvider>
            </BrowserRouter>
        );

        const contentArea = screen.getByPlaceholderText(/어떤 작업을 하셨나요/i);
        await user.type(contentArea, '테스트 작업');

        const saveBtn = screen.getByRole('button', { name: /일지 저장하기/i });
        await user.click(saveBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('save_farming_log', expect.objectContaining({
                work_content: '테스트 작업',
                worker_name: 'Test Worker'
            }));
        });

        expect(await screen.findByText(/현장 작업 일지가 성공적으로 기록되었습니다/i)).toBeInTheDocument();
    });

    it('opens QR scanner overlay', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileWorkLog />
                </ModalProvider>
            </BrowserRouter>
        );

        const qrBtn = screen.getByRole('button', { name: /QR 스캔/i });
        await user.click(qrBtn);

        expect(screen.getByText(/현장 QR 스캔 중/i)).toBeInTheDocument();
    });
});
