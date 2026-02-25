import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SalesSpecial from './SalesSpecial';
import { ModalProvider } from '../../contexts/ModalContext';
import * as apiBridge from '../../utils/apiBridge';

vi.mock('../../utils/apiBridge', () => ({
    callBridge: vi.fn(),
    invoke: vi.fn()
}));

describe('SalesSpecial - Final', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
        localStorage.clear();
        apiBridge.callBridge.mockImplementation((cmd) => {
            if (cmd === 'get_product_list') return Promise.resolve([
                { product_id: 1, product_name: '느타리버섯', specification: '2kg', unit_price: 15000, item_type: 'product' }
            ]);
            if (cmd === 'save_special_sales_batch') return Promise.resolve({ success: true, event_id: 'E100' });
            return Promise.resolve([]);
        });
        global.window.prompt = vi.fn();
    });

    it('QR 스캔 후 행 추가가 정상적으로 동작한다', async () => {
        render(<ModalProvider><SalesSpecial /></ModalProvider>);
        await screen.findByText(/특판 행사 접수/i);

        const eventInput = screen.getByPlaceholderText(/행사명을 입력하세요/i);
        await user.type(eventInput, '테스트 행사');

        await waitFor(() => expect(apiBridge.callBridge).toHaveBeenCalledWith('get_product_list'));

        window.prompt.mockReturnValue("PRODUCT|1|880|느타리버섯|2kg");
        const qrBtn = screen.getByRole('button', { name: /QR 스캔/i });
        await user.click(qrBtn);

        await waitFor(() => {
            expect(screen.getAllByDisplayValue('느타리버섯').length).toBeGreaterThan(0);
        });
    });

    it('전체 저장이 정상적으로 동작한다', async () => {
        render(<ModalProvider><SalesSpecial /></ModalProvider>);
        await screen.findByText(/특판 행사 접수/i);

        const eventInput = screen.getByPlaceholderText(/행사명을 입력하세요/i);
        await user.type(eventInput, '테스트 행사');

        const addBtn = screen.getByRole('button', { name: /행 추가/i });
        await user.click(addBtn);

        const prodInputs = await screen.findAllByPlaceholderText(/상품선택/i);
        await user.type(prodInputs[0], '느타리버섯');

        // Robust currency value check
        await waitFor(() => {
            const priceFields = screen.getAllByDisplayValue(val => val.replace(/[,.]/g, '') === '15000');
            expect(priceFields.length).toBeGreaterThan(0);
        });

        // Click '일괄 저장하기'
        const saveBtns = await screen.findAllByRole('button', { name: /일괄 저장하기/i });
        await user.click(saveBtns[0]);

        // HANDLE CONFIRMATION DIALOG
        const modalConfirmBtn = await screen.findByRole('button', { name: /^확인$/ });
        await user.click(modalConfirmBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('save_special_sales_batch', expect.any(Object));
        });

        // Match the success alert
        expect(await screen.findByText(/저장되었습니다/)).toBeInTheDocument();
        const alertOkBtn = await screen.findByRole('button', { name: /^확인$/ });
        await user.click(alertOkBtn);
    });
});
