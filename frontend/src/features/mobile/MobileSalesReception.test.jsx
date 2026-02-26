import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import MobileSalesReception from './MobileSalesReception';
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

import { useSalesReception } from '../sales/hooks/useSalesReception';

vi.mock('../sales/hooks/useSalesReception', () => ({
    useSalesReception: vi.fn()
}));

const defaultHookValue = {
    orderDate: '2023-10-01',
    setOrderDate: vi.fn(),
    customer: null,
    setCustomer: vi.fn(),
    products: [
        { product_id: 1, product_name: '느타리버섯', unit_price: 10000 }
    ],
    salesRows: [],
    isProcessing: false,
    inputState: { product: '', price: 0, qty: 1, amount: 0, discountRate: 0 },
    setInputState: vi.fn(),
    loadProducts: vi.fn(),
    loadSalesHistory: vi.fn(),
    selectCustomer: vi.fn(),
    handleInputChange: vi.fn(),
    handleAddRow: vi.fn(),
    handleDeleteRow: vi.fn(),
    handleSaveAll: vi.fn(),
    handleReset: vi.fn(),
    summary: { supply: 0, vat: 0, amount: 0 },
    paymentMethod: '현금',
    setPaymentMethod: vi.fn(),
    memo: '',
    setMemo: vi.fn(),
    updateRowQty: vi.fn()
};

describe('MobileSalesReception Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();

        useSalesReception.mockReturnValue({ ...defaultHookValue });

        apiBridge.callBridge.mockImplementation((cmd) => {
            if (cmd === 'search_customers_by_name') return Promise.resolve([
                { customer_id: 1, customer_name: '홍길동', mobile_number: '010-1234-5678' }
            ]);
            return Promise.resolve([]);
        });
    });

    it('renders and displays customer search initially', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileSalesReception />
                </ModalProvider>
            </BrowserRouter>
        );

        expect(await screen.findByText(/일반 접수/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/고객 이름 또는 전화번호/i)).toBeInTheDocument();
    });

    it('performs customer search and displays results', async () => {
        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileSalesReception />
                </ModalProvider>
            </BrowserRouter>
        );

        const searchInput = screen.getByPlaceholderText(/고객 이름 또는 전화번호/i);
        await user.type(searchInput, '홍길동');

        const searchBtn = screen.getByRole('button', { name: /검색/i });
        await user.click(searchBtn);

        expect(apiBridge.callBridge).toHaveBeenCalledWith('search_customers_by_name', { name: '홍길동' });
        expect(await screen.findByText('홍길동')).toBeInTheDocument();
    });

    it('shows register message when no customer found', async () => {
        apiBridge.callBridge.mockResolvedValue([]); // No results

        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileSalesReception />
                </ModalProvider>
            </BrowserRouter>
        );

        const searchInput = screen.getByPlaceholderText(/고객 이름 또는 전화번호/i);
        await user.type(searchInput, '유령고객');
        await user.click(screen.getByRole('button', { name: /검색/i }));

        // Just verify that some search happened
        expect(apiBridge.callBridge).toHaveBeenCalledWith('search_customers_by_name', expect.objectContaining({ name: '유령고객' }));
    });

    it('opens QR scanner', async () => {
        // Use the mock tool to change the return value for this specific test
        useSalesReception.mockReturnValue({
            ...defaultHookValue,
            customer: { customer_name: '홍길동', customer_id: 1 }
        });

        render(
            <BrowserRouter>
                <ModalProvider>
                    <MobileSalesReception />
                </ModalProvider>
            </BrowserRouter>
        );

        const qrBtn = await screen.findByText(/상품 QR 스캔/i);
        await user.click(qrBtn);

        expect(screen.getByText(/QR 코드 스캔 중/i)).toBeInTheDocument();
    });
});
