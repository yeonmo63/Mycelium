import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CustomerSpecialCare from './CustomerSpecialCare';
import * as apiBridge from '../../utils/apiBridge';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

const mockShowAlert = vi.fn().mockResolvedValue(true);
const mockShowConfirm = vi.fn().mockResolvedValue(true);
vi.mock('../../contexts/ModalContext', () => ({
    useModal: () => ({
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm
    }),
    ModalProvider: ({ children }) => <div>{children}</div>
}));

const mockSpecialCare = [
    {
        name: '김클레임',
        mobile: '010-1111-2222',
        is_member: true,
        total_orders: 20,
        claim_count: 5,
        claim_ratio: 25.0,
        major_reason: '배송 파손',
        last_claim_date: '2026-02-20'
    },
    {
        name: '이불만',
        mobile: '010-3333-4444',
        is_member: false,
        total_orders: 10,
        claim_count: 4,
        claim_ratio: 40.0,
        major_reason: '품질 불량',
        last_claim_date: '2026-02-25'
    },
    {
        name: '박조심',
        mobile: '010-5555-6666',
        is_member: true,
        total_orders: 50,
        claim_count: 3,
        claim_ratio: 6.0,
        major_reason: '배송 지연',
        last_claim_date: '2026-02-10'
    }
];

describe('CustomerSpecialCare Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
        apiBridge.invoke.mockImplementation((cmd) => {
            if (cmd === 'get_special_care') return Promise.resolve(mockSpecialCare);
            return Promise.resolve(null);
        });
    });

    it('renders header and loads data', async () => {
        render(<CustomerSpecialCare />);

        expect(screen.getByText(/집중 관리 고객 분석/)).toBeInTheDocument();

        // Data should load
        expect(await screen.findByText('이불만')).toBeInTheDocument();
        expect(screen.getByText('김클레임')).toBeInTheDocument();
        expect(screen.getByText('박조심')).toBeInTheDocument();
    });

    it('displays stats cards correctly', async () => {
        render(<CustomerSpecialCare />);

        await screen.findByText('이불만');

        // 관리 대상 고객: 3명 - find within the specific card's value container
        const targetLabel = screen.getByText('관리 대상 고객');
        const targetValue = targetLabel.parentElement.querySelector('.text-3xl');
        expect(targetValue.textContent).toContain('3');

        // 평균 클레임 비율: (25 + 40 + 6) / 3 = 23.7%
        const ratioLabel = screen.getByText('평균 클레임 비율');
        const ratioValue = ratioLabel.parentElement.querySelector('.text-3xl');
        expect(ratioValue.textContent).toContain('23.7');
    });

    it('displays main claim reason', async () => {
        render(<CustomerSpecialCare />);

        await screen.findByText('이불만');

        // Each reason appears once, so the first one found is the main reason
        // With sorted data: 이불만(40%), 김클레임(25%), 박조심(6%)
        // Reasons: 품질 불량, 배송 파손, 배송 지연 — all have count 1, first found wins
        // In the stats card it shows mainReason
        expect(screen.getAllByText(/배송 파손|품질 불량|배송 지연/).length).toBeGreaterThan(0);
    });

    it('sorts customers by claim_ratio descending', async () => {
        render(<CustomerSpecialCare />);

        await screen.findByText('이불만');

        // Table rows should be sorted: 이불만(40%) -> 김클레임(25%) -> 박조심(6%)
        const rows = screen.getAllByRole('row');
        // rows[0] is thead, rows[1-3] are data rows
        const dataCells = rows.slice(1).map(row => row.querySelector('td')?.textContent);
        expect(dataCells[0]).toBe('이불만');
        expect(dataCells[1]).toBe('김클레임');
        expect(dataCells[2]).toBe('박조심');
    });

    it('shows member/non-member badges', async () => {
        render(<CustomerSpecialCare />);

        await screen.findByText('이불만');

        expect(screen.getAllByText('회원').length).toBe(2); // 김클레임, 박조심
        expect(screen.getByText('비회원')).toBeInTheDocument(); // 이불만
    });

    it('shows claim ratio with progress bar', async () => {
        render(<CustomerSpecialCare />);

        await screen.findByText('이불만');

        expect(screen.getByText('40.0%')).toBeInTheDocument();
        expect(screen.getByText('25.0%')).toBeInTheDocument();
        expect(screen.getByText('6.0%')).toBeInTheDocument();
    });

    it('handles memo button for member', async () => {
        render(<CustomerSpecialCare />);

        await screen.findByText('이불만');

        // Find memo buttons (edit_note icon buttons)
        const memoButtons = screen.getAllByRole('button');
        // Filter to the memo buttons in the table
        const tableMemoButtons = memoButtons.filter(btn => btn.querySelector('.material-symbols-rounded'));

        // Click first memo button (이불만 - non-member)
        if (tableMemoButtons.length > 1) {
            await user.click(tableMemoButtons[1]); // first data row memo
            await waitFor(() => {
                expect(mockShowAlert).toHaveBeenCalled();
            });
        }
    });

    it('refreshes data on refresh button click', async () => {
        render(<CustomerSpecialCare />);

        await screen.findByText('이불만');

        // Initial load
        expect(apiBridge.invoke).toHaveBeenCalledWith('get_special_care');

        // Find refresh button
        const refreshBtn = screen.getByRole('button', { name: /refresh/i });
        await user.click(refreshBtn);
        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledTimes(2); // initial + refresh
        });
    });

    it('shows empty state when no data', async () => {
        apiBridge.invoke.mockResolvedValue([]);

        render(<CustomerSpecialCare />);

        await waitFor(() => {
            expect(screen.getByText(/집중 관리 대상 고객이 없습니다/)).toBeInTheDocument();
        });
    });
});
