import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CustomerBest from './CustomerBest';
import * as apiBridge from '../../utils/apiBridge';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

vi.mock('dayjs', () => {
    const actual = () => ({ format: (f) => '20260226' });
    actual.default = actual;
    return { default: actual };
});

const mockShowAlert = vi.fn().mockResolvedValue(true);
const mockShowConfirm = vi.fn().mockResolvedValue(true);
vi.mock('../../contexts/ModalContext', () => ({
    useModal: () => ({
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm
    }),
    ModalProvider: ({ children }) => <div>{children}</div>
}));

const mockCustomers = [
    {
        customer_id: 1,
        customer_name: '김VIP',
        mobile_number: '010-1111-2222',
        membership_level: 'VIP',
        total_orders: 50,
        total_qty: 200,
        total_amount: 5000000,
        address_primary: '경기도 양평군',
        address_detail: '버섯마을 1'
    },
    {
        customer_id: 2,
        customer_name: '이VVIP',
        mobile_number: '010-3333-4444',
        membership_level: 'VVIP',
        total_orders: 100,
        total_qty: 500,
        total_amount: 15000000,
        address_primary: '서울시 강남구',
        address_detail: '테헤란로 2'
    }
];

describe('CustomerBest Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
        apiBridge.invoke.mockImplementation((cmd) => {
            if (cmd === 'get_best_customers') return Promise.resolve(mockCustomers);
            if (cmd === 'update_customer_membership_batch') return Promise.resolve({ success: true });
            if (cmd === 'get_customer_ai_insight') return Promise.resolve({
                keywords: ['충성고객', '대량구매'],
                sales_tip: '정기 배송 제안 추천',
                ice_breaking: '지난 주문건 만족도 물어보기'
            });
            return Promise.resolve(null);
        });
    });

    it('renders header and loads customer data', async () => {
        render(<CustomerBest />);

        expect(screen.getByText(/우수 고객 관리/)).toBeInTheDocument();

        expect(await screen.findByText('김VIP')).toBeInTheDocument();
        expect(screen.getByText('이VVIP')).toBeInTheDocument();
    });

    it('displays customer info in table', async () => {
        render(<CustomerBest />);

        const row = await screen.findByText('김VIP');
        const tr = row.closest('tr');
        const { getByText } = within(tr);

        expect(getByText('010-1111-2222')).toBeInTheDocument();
        expect(getByText('VIP')).toBeInTheDocument();
    });

    it('calls search API with params', async () => {
        render(<CustomerBest />);

        await screen.findByText('김VIP');

        // Initial search is called on mount
        expect(apiBridge.invoke).toHaveBeenCalledWith('get_best_customers', expect.objectContaining({
            minQty: 100,
            logic: 'AND'
        }));
    });

    it('selects customers and applies batch level change', async () => {
        render(<CustomerBest />);

        await screen.findByText('김VIP');

        // Select first customer checkbox
        const checkboxes = screen.getAllByRole('checkbox');
        // First checkbox is "select all", second is first customer
        await user.click(checkboxes[1]);

        // Select batch level
        const levelSelect = screen.getByRole('combobox');
        await user.selectOptions(levelSelect, 'VVIP');

        // Click apply
        const applyBtn = screen.getByRole('button', { name: /적용/i });
        await user.click(applyBtn);

        await waitFor(() => {
            expect(mockShowConfirm).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('update_customer_membership_batch', expect.objectContaining({
                customerIds: [1],
                newLevel: 'VVIP'
            }));
        });
    });

    it('shows total count in footer', async () => {
        render(<CustomerBest />);

        await screen.findByText('김VIP');

        expect(screen.getByText('2')).toBeInTheDocument(); // total 2명
    });
});
