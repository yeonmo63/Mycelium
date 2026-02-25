import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SalesOnlineSync from './SalesOnlineSync';
import { ModalProvider } from '../../contexts/ModalContext';
import * as apiBridge from '../../utils/apiBridge';

// Mock apiBridge
vi.mock('../../utils/apiBridge', () => ({
    callBridge: vi.fn(),
    invoke: vi.fn()
}));

describe('SalesOnlineSync Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();

        // Default base data
        apiBridge.invoke.mockImplementation((command, args) => {
            if (command === 'get_product_list') return Promise.resolve([
                { product_id: 1, product_name: '느타리버섯', specification: '1kg', unit_price: 10000, item_type: 'product' },
                { product_id: 2, product_name: '표고버섯', specification: '2kg', unit_price: 20000, item_type: 'product' }
            ]);
            if (command === 'search_customers') return Promise.resolve([]);
            return Promise.resolve([]);
        });
    });

    it('renders upload step initially', async () => {
        render(
            <ModalProvider>
                <SalesOnlineSync />
            </ModalProvider>
        );

        expect(screen.getByText(/주문 데이터 수집/i)).toBeInTheDocument();
        expect(screen.getByText(/쇼핑몰 선택/i)).toBeInTheDocument();
    });

    it('handles API real-time sync', async () => {
        const mockOrders = [
            {
                orderId: 'ORD-123',
                customerName: '홍길동',
                mobile: '010-1111-2222',
                mallProductName: '느타리버섯',
                qty: 2,
                unitPrice: 10000,
                receiverName: '홍길동',
                address: '서울시 강남구'
            }
        ];

        apiBridge.invoke.mockImplementation((command, args) => {
            if (command === 'get_product_list') return Promise.resolve([{ product_id: 1, product_name: '느타리버섯', unit_price: 10000, item_type: 'product' }]);
            if (command === 'fetch_external_orders') return Promise.resolve(mockOrders);
            if (command === 'search_customers') return Promise.resolve([]);
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesOnlineSync />
            </ModalProvider>
        );

        // Click API Sync button
        const apiBtn = screen.getByText(/API 실시간 연동/i);
        await user.click(apiBtn);

        // Verify transition to review step
        expect(await screen.findByText(/분석된 주문 리스트/i)).toBeInTheDocument();
        expect(screen.getByText('홍길동')).toBeInTheDocument();
        // Product should be matched automatically
        const matchedBadge = screen.getByText('MATCHED');
        expect(matchedBadge).toBeInTheDocument();
    });

    it('handles manual product matching and sync execution', async () => {
        const mockOrders = [
            {
                orderId: 'ORD-999',
                customerName: '김철수',
                mobile: '010-9999-8888',
                mallProductName: '신규 버섯', // Not in list
                qty: 1,
                unitPrice: 5000,
                receiverName: '김철수',
                address: '부산시 해운대구'
            }
        ];

        apiBridge.invoke.mockImplementation((command, args) => {
            if (command === 'get_product_list') return Promise.resolve([
                { product_id: 1, product_name: '느타리버섯', specification: '1kg', unit_price: 10000, item_type: 'product' }
            ]);
            if (command === 'fetch_external_orders') return Promise.resolve(mockOrders);
            if (command === 'search_customers') return Promise.resolve([]);
            if (command === 'create_customer') return Promise.resolve({ customerId: 'C123' });
            if (command === 'create_sale') return Promise.resolve({ success: true });
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesOnlineSync />
            </ModalProvider>
        );

        await user.click(screen.getByText(/API 실시간 연동/i));

        // 1. Check Unmatched status
        expect(await screen.findByText('CHECK')).toBeInTheDocument();

        // 2. Select product manually
        const select = screen.getByRole('combobox');
        await user.selectOptions(select, '1');

        expect(screen.getByText('MATCHED')).toBeInTheDocument();

        // 3. Execute Sync
        const syncBtn = screen.getByText(/주문 연동 실행하기/i);
        await user.click(syncBtn);

        // Confirm Modal
        const modalConfirmBtn = await screen.findByRole('button', { name: /^확인$/ });
        await user.click(modalConfirmBtn);

        // Success Alert
        expect(await screen.findByText(/완료/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('create_customer', expect.any(Object));
            expect(apiBridge.invoke).toHaveBeenCalledWith('create_sale', expect.objectContaining({
                customerId: 'C123',
                productName: '느타리버섯'
            }));
        });
    });

    it('handles Quick Register for new product', async () => {
        const mockOrders = [
            {
                orderId: 'ORD-777',
                customerName: '박지성',
                mallProductName: '산삼버섯',
                unitPrice: 50000,
                qty: 1
            }
        ];

        apiBridge.invoke.mockImplementation((command, args) => {
            if (command === 'get_product_list') return Promise.resolve([]);
            if (command === 'fetch_external_orders') return Promise.resolve(mockOrders);
            if (command === 'create_product') return Promise.resolve({ productId: 100 });
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesOnlineSync />
            </ModalProvider>
        );

        await user.click(screen.getByText(/API 실시간 연동/i));

        // Select "새 상품으로 등록하기"
        const select = await screen.findByRole('combobox');
        await user.selectOptions(select, 'NEW');

        // Quick Reg Modal appears
        expect(await screen.findByText(/신규 상품 간편 등록/i)).toBeInTheDocument();
        const regBtn = screen.getByRole('button', { name: /등록 및 매칭/i });
        await user.click(regBtn);

        // Verify API call
        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('create_product', expect.objectContaining({
                productName: '산삼버섯'
            }));
        });
    });
});
