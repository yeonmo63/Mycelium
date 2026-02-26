import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import MobileHarvestEntry from './MobileHarvestEntry';
import { ModalProvider } from '../../contexts/ModalContext';
import { BrowserRouter } from 'react-router-dom';
import * as apiBridge from '../../utils/apiBridge';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

vi.mock('../../contexts/ModalContext', () => ({
    useModal: () => ({
        showAlert: vi.fn(),
        showConfirm: vi.fn(() => Promise.resolve(true))
    }),
    ModalProvider: ({ children }) => <div>{children}</div>
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

describe('MobileHarvestEntry Component', () => {
    let user;

    const mockBatches = [
        { batch_id: 1, batch_code: 'B-001', product_id: 101, status: 'active' }
    ];

    const mockProducts = [
        { product_id: 101, product_name: '느타리 버섯' }
    ];

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
        apiBridge.callBridge.mockImplementation((cmd) => {
            if (cmd === 'get_production_batches') return Promise.resolve(mockBatches);
            if (cmd === 'get_product_list') return Promise.resolve(mockProducts);
            if (cmd === 'save_harvest_record') return Promise.resolve({ success: true });
            return Promise.resolve([]);
        });
    });

    it('renders and displays harvest form', async () => {
        render(
            <BrowserRouter>
                <MobileHarvestEntry />
            </BrowserRouter>
        );

        expect(await screen.findByText(/수확 입력/i)).toBeInTheDocument();
        expect(screen.getByText(/생산 배치 선택/i)).toBeInTheDocument();
        expect(screen.getByText(/정품 수확량/i)).toBeInTheDocument();
    });

    it('populates batch list and allows selection', async () => {
        render(
            <BrowserRouter>
                <MobileHarvestEntry />
            </BrowserRouter>
        );

        const select = await screen.findByRole('combobox');
        await user.selectOptions(select, '1');

        expect(select.value).toBe('1');
    });

    it('handles quantity input and save', async () => {
        render(
            <BrowserRouter>
                <MobileHarvestEntry />
            </BrowserRouter>
        );

        const select = await screen.findByRole('combobox');
        await user.selectOptions(select, '1');

        const qtyInput = screen.getByPlaceholderText('0.00');
        await user.type(qtyInput, '10.5');

        const saveBtn = screen.getByRole('button', { name: /수확 기록 저장하기/i });
        await user.click(saveBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('save_harvest_record', expect.objectContaining({
                record: expect.objectContaining({
                    batch_id: 1,
                    quantity: 10.5
                })
            }));
        });
    });

    it('opens QR scanner overlay', async () => {
        render(
            <BrowserRouter>
                <MobileHarvestEntry />
            </BrowserRouter>
        );

        const qrBtn = screen.getByRole('button', { name: /QR 스캔/i });
        await user.click(qrBtn);

        expect(screen.getByText(/현장 QR 스캔 중/i)).toBeInTheDocument();
    });
});
