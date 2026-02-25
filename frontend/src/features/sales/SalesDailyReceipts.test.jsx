import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SalesDailyReceipts from './SalesDailyReceipts';
import { ModalProvider } from '../../contexts/ModalContext';
import * as apiBridge from '../../utils/apiBridge';
import * as printUtils from '../../utils/printUtils';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

vi.mock('../../utils/printUtils', () => ({
    handlePrintRaw: vi.fn()
}));

describe('SalesDailyReceipts Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
    });

    it('loads and displays data', async () => {
        const mockData = [
            {
                status: '접수',
                order_date: '2023-10-10',
                customer_name: '테스트유저',
                product_name: '버섯',
                quantity: 1,
                total_amount: 10000
            }
        ];

        apiBridge.invoke.mockImplementation((command) => {
            if (command === 'get_daily_receipts') return Promise.resolve(mockData);
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesDailyReceipts />
            </ModalProvider>
        );

        // Header should be there
        expect(await screen.findByText(/일일 접수 현황/i)).toBeInTheDocument();

        // Wait for data row - use findAllByText because it appears in customer and shipping name
        const cells = await screen.findAllByText('테스트유저', {}, { timeout: 3000 });
        expect(cells.length).toBeGreaterThan(0);
    });

    it('can navigate using date buttons', async () => {
        apiBridge.invoke.mockResolvedValue([]);

        render(
            <ModalProvider>
                <SalesDailyReceipts />
            </ModalProvider>
        );

        // Find prev day button via icon text
        const prevBtn = await screen.findByText('chevron_left');
        fireEvent.click(prevBtn.closest('button'));

        expect(apiBridge.invoke).toHaveBeenCalledWith('get_daily_receipts', expect.objectContaining({
            date: expect.any(String)
        }));
    });

    it('triggers CSV download', async () => {
        const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
        global.URL.createObjectURL = mockCreateObjectURL;
        const mockLinkClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { });

        apiBridge.invoke.mockResolvedValue([{
            status: '접수',
            customer_name: '테스트유저',
            product_name: '버섯',
            quantity: 1,
            total_amount: 10000
        }]);

        render(
            <ModalProvider>
                <SalesDailyReceipts />
            </ModalProvider>
        );

        await screen.findAllByText('테스트유저');
        const csvBtn = screen.getByRole('button', { name: /download 엑셀\(CSV\) 저장/i });
        fireEvent.click(csvBtn);

        expect(mockCreateObjectURL).toHaveBeenCalled();
        mockLinkClick.mockRestore();
    });

    it('opens print preview and calls print utility', async () => {
        apiBridge.invoke.mockResolvedValue([{
            status: '접수',
            customer_name: '테스트유저',
            product_name: '버섯',
            quantity: 1,
            total_amount: 10000
        }]);

        render(
            <ModalProvider>
                <SalesDailyReceipts />
            </ModalProvider>
        );

        await screen.findAllByText('테스트유저');
        const previewBtn = screen.getByRole('button', { name: /print 리스트 인쇄/i });
        fireEvent.click(previewBtn);

        expect(await screen.findByText(/일일 접수 현황 보고서/i)).toBeInTheDocument();
        const printBtn = screen.getByRole('button', { name: /인쇄하기/i });
        fireEvent.click(printBtn);

        expect(printUtils.handlePrintRaw).toHaveBeenCalled();
    });
});
