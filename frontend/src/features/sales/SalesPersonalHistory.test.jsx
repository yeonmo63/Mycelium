import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SalesPersonalHistory from './SalesPersonalHistory';
import { ModalProvider } from '../../contexts/ModalContext';
import * as apiBridge from '../../utils/apiBridge';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

vi.mock('echarts', () => ({
    init: vi.fn(() => ({
        setOption: vi.fn(),
        resize: vi.fn(),
        dispose: vi.fn(),
        on: vi.fn()
    }))
}));

describe('SalesPersonalHistory Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
    });

    it('performs search and displays results', async () => {
        const mockData = [
            {
                status: '배송완료',
                order_date: '2023-01-10',
                customer_name: '테스트고객',
                customer_mobile: '010-1234-5678',
                product_name: '버섯',
                quantity: 1,
                total_amount: 10000,
                customer_id: 'C1'
            }
        ];

        apiBridge.invoke.mockImplementation((command) => {
            if (command === 'search_sales_all') return Promise.resolve(mockData);
            return Promise.resolve([]);
        });

        render(
            <ModalProvider>
                <SalesPersonalHistory />
            </ModalProvider>
        );

        const input = screen.getByPlaceholderText(/성함 또는 연락처 입력/i);
        fireEvent.change(input, { target: { value: '홍길동' } });

        // Find Search Button specifically
        const searchBtn = screen.getByRole('button', { name: /search 조회/i });
        fireEvent.click(searchBtn);

        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('search_sales_all', expect.any(Object));
        }, { timeout: 3000 });

        expect(await screen.findByText('테스트고객')).toBeInTheDocument();
    });
});
