import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CustomerConsultation from './CustomerConsultation';
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

const mockConsultList = [
    {
        consult_id: 1,
        customer_id: 10,
        guest_name: '홍길동',
        contact: '010-1234-5678',
        channel: '전화',
        counselor_name: '관리자',
        category: '상품문의',
        priority: '긴급',
        title: '배송 지연 문의',
        content: '주문한 버섯이 아직 도착하지 않았습니다.',
        answer: '',
        status: '접수',
        consult_date: '2026-02-26',
        follow_up_date: '',
        sentiment: '부정'
    },
    {
        consult_id: 2,
        customer_id: null,
        guest_name: '비회원 고객',
        contact: '010-9999-8888',
        channel: '문자',
        counselor_name: '관리자',
        category: '대량구매',
        priority: '보통',
        title: '대량구매 상담',
        content: '100kg 이상 구매 가능한지 문의',
        answer: '',
        status: '처리중',
        consult_date: '2026-02-25',
        follow_up_date: '',
        sentiment: null
    }
];

describe('CustomerConsultation Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
        apiBridge.invoke.mockImplementation((cmd, args) => {
            if (cmd === 'get_consultations') return Promise.resolve(mockConsultList);
            if (cmd === 'create_consultation') return Promise.resolve({ success: true });
            if (cmd === 'update_consultation') return Promise.resolve({ success: true });
            if (cmd === 'delete_consultation') return Promise.resolve({ success: true });
            if (cmd === 'get_ai_summary') return Promise.resolve({ summary: 'AI 요약 결과입니다.' });
            if (cmd === 'search_customers_by_name') return Promise.resolve([]);
            return Promise.resolve(null);
        });
    });

    it('renders header and consultation table', async () => {
        render(<CustomerConsultation />);

        expect(screen.getByText(/상담 관리/)).toBeInTheDocument();

        expect(await screen.findByText('배송 지연 문의')).toBeInTheDocument();
        expect(screen.getByText('대량구매 상담')).toBeInTheDocument();
    });

    it('displays stats correctly', async () => {
        render(<CustomerConsultation />);

        await screen.findByText('배송 지연 문의');

        // 긴급 미처리: 1건 (consult_id 1 is '긴급' and not '완료')
        expect(screen.getByText('1건', { exact: false })).toBeInTheDocument();
    });

    it('displays status and priority badges', async () => {
        render(<CustomerConsultation />);

        await screen.findByText('배송 지연 문의');

        expect(screen.getByText('접수')).toBeInTheDocument();
        expect(screen.getByText('처리중')).toBeInTheDocument();
        expect(screen.getByText('긴급')).toBeInTheDocument();
    });

    it('opens new consultation modal', async () => {
        render(<CustomerConsultation />);

        await screen.findByText('배송 지연 문의');

        const addBtn = screen.getByRole('button', { name: /상담 등록/i });
        await user.click(addBtn);

        await waitFor(() => {
            expect(screen.getByText('새 상담 등록')).toBeInTheDocument();
        });
    });

    it('opens edit modal when clicking a row', async () => {
        render(<CustomerConsultation />);

        const row = await screen.findByText('배송 지연 문의');
        await user.click(row);

        await waitFor(() => {
            expect(screen.getByText('상담 상세 정보 및 처리')).toBeInTheDocument();
        });
    });

    it('deletes a consultation', async () => {
        render(<CustomerConsultation />);

        // Click row to open edit modal
        const row = await screen.findByText('배송 지연 문의');
        await user.click(row);

        await waitFor(() => {
            expect(screen.getByText('상담 상세 정보 및 처리')).toBeInTheDocument();
        });

        // Click delete
        const deleteBtn = screen.getByRole('button', { name: /삭제/i });
        await user.click(deleteBtn);

        await waitFor(() => {
            expect(mockShowConfirm).toHaveBeenCalledWith('삭제 확인', expect.any(String));
        });

        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('delete_consultation', { consult_id: 1 });
        });
    });
});
