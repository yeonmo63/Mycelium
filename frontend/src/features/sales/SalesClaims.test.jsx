import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SalesClaims from './SalesClaims';
import { ModalProvider } from '../../contexts/ModalContext';
import * as apiBridge from '../../utils/apiBridge';

// Mock callBridge
vi.mock('../../utils/apiBridge', () => ({
    callBridge: vi.fn(),
    invoke: vi.fn()
}));

describe('SalesClaims Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();

        // Default mock implementation
        apiBridge.callBridge.mockImplementation((command) => {
            if (command === 'get_sales_claims') return Promise.resolve([
                {
                    claim_id: 'CLM1',
                    sales_id: 'S100',
                    claim_type: '반품',
                    claim_status: '접수',
                    customer_name: '홍길동',
                    customer_id: 'C100',
                    reason_category: '단순변심',
                    quantity: 1,
                    refund_amount: 10000,
                    created_at: new Date().toISOString()
                }
            ]);
            return Promise.resolve([]);
        });
    });

    it('renders and loads claims on mount', async () => {
        render(
            <ModalProvider>
                <SalesClaims />
            </ModalProvider>
        );

        expect(await screen.findByText(/취소\/반품\/교환 처리/i)).toBeInTheDocument();
        expect(await screen.findByText('S100')).toBeInTheDocument();
        expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    it('handles manual claim registration through search', async () => {
        apiBridge.callBridge.mockImplementation((command) => {
            if (command === 'get_sales_claims') return Promise.resolve([]);
            if (command === 'search_sales_by_any') return Promise.resolve([
                { sales_id: 'S200', customer_name: '김철수', product_name: '느타리버섯', status: '배송완료', quantity: 2, order_date: '2023-01-01' }
            ]);
            if (command === 'create_sales_claim') return Promise.resolve({ success: true });
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesClaims />
            </ModalProvider>
        );

        const createBtn = screen.getByText(/클레임 수기 접수/i);
        await user.click(createBtn);

        const searchInput = screen.getByPlaceholderText(/주문자명, 전화번호, 주문번호 등 입력/i);
        await user.type(searchInput, '김철수');
        const searchSubmit = screen.getByRole('button', { name: /검색/i });
        await user.click(searchSubmit);

        const selectBtn = await screen.findByRole('button', { name: /선택/i });
        await user.click(selectBtn);

        expect(await screen.findByText(/신규 클레임 접수/i)).toBeInTheDocument();
        const memoInput = screen.getByPlaceholderText(/클레임 상세 사유를 입력하세요/i);
        await user.type(memoInput, '테스트 메모');

        const submitBtn = screen.getByRole('button', { name: /접수 등록/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('create_sales_claim', expect.objectContaining({
                salesId: 'S200',
                memo: '테스트 메모'
            }));
        });
    });

    it('processes an existing claim', async () => {
        const mockClaim = {
            claim_id: 'CLM1',
            sales_id: 'S100',
            claim_type: '반품',
            claim_status: '접수',
            customer_name: '홍길동',
            reason_category: '단순변심',
            quantity: 1,
            refund_amount: 10000,
            created_at: new Date().toISOString()
        };

        apiBridge.callBridge.mockImplementation((command) => {
            if (command === 'get_sales_claims') return Promise.resolve([mockClaim]);
            if (command === 'process_sales_claim') return Promise.resolve({ success: true });
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesClaims />
            </ModalProvider>
        );

        const processBtn = await screen.findByText('처리');
        await user.click(processBtn);

        expect(await screen.findByText(/클레임 처리/i)).toBeInTheDocument();
        const refundInput = screen.getByDisplayValue('0');
        await user.clear(refundInput);
        await user.type(refundInput, '10000');

        const confirmBtn = screen.getByRole('button', { name: /처리 확정/i });
        await user.click(confirmBtn);

        const modalConfirmBtn = await screen.findByRole('button', { name: /^확인$/ });
        await user.click(modalConfirmBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('process_sales_claim', expect.objectContaining({
                claimId: 'CLM1',
                claimStatus: '완료',
                refundAmount: 10000
            }));
        });
    });

    it('edits an existing claim', async () => {
        const mockClaim = {
            claim_id: 'CLM_EDIT',
            sales_id: 'S555',
            claim_status: '접수',
            reason_category: '단순변심',
            quantity: 1,
            created_at: new Date().toISOString()
        };

        apiBridge.callBridge.mockImplementation((command) => {
            if (command === 'get_sales_claims') return Promise.resolve([mockClaim]);
            if (command === 'update_sales_claim') return Promise.resolve({ success: true });
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesClaims />
            </ModalProvider>
        );

        const editSpan = await screen.findByText('edit');
        await user.click(editSpan.closest('button'));

        expect(await screen.findByText(/클레임 정보 수정/i)).toBeInTheDocument();
        const qtyInput = screen.getByDisplayValue('1');
        await user.clear(qtyInput);
        await user.type(qtyInput, '2');

        const saveBtn = screen.getByRole('button', { name: /수정사항 저장/i });
        await user.click(saveBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('update_sales_claim', expect.objectContaining({
                claimId: 'CLM_EDIT',
                quantity: 2
            }));
        });
    });

    it('deletes a claim', async () => {
        apiBridge.callBridge.mockImplementation((command) => {
            if (command === 'get_sales_claims') return Promise.resolve([{
                claim_id: 'CLM_DEL',
                sales_id: 'S999',
                claim_status: '접수',
                created_at: new Date().toISOString()
            }]);
            if (command === 'delete_sales_claim') return Promise.resolve({ success: true });
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesClaims />
            </ModalProvider>
        );

        const deleteSpan = await screen.findByText('delete');
        const deleteBtn = deleteSpan.closest('button');
        await user.click(deleteBtn);

        const modalConfirmBtn = await screen.findByRole('button', { name: /^확인$/ });
        await user.click(modalConfirmBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('delete_sales_claim', { claimId: 'CLM_DEL' });
        });
    });
});
