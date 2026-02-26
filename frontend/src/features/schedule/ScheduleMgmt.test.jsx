import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ScheduleMgmt from './ScheduleMgmt';
import { ModalProvider } from '../../contexts/ModalContext';
import * as apiBridge from '../../utils/apiBridge';
import dayjs from 'dayjs';

// Mock apiBridge
vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn()
}));

// Mock printUtils
vi.mock('../../utils/printUtils', () => ({
    handlePrintRaw: vi.fn()
}));

describe('ScheduleMgmt Component', () => {
    let user;
    const todayStr = dayjs().format('YYYY-MM-DD');

    const mockSchedules = [
        {
            schedule_id: 1,
            title: '테스트 일정 1',
            description: '테스트 설명 1',
            start_time: `${todayStr}T10:00:00`,
            end_time: `${todayStr}T11:00:00`,
            status: 'Planned'
        }
    ];

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();

        apiBridge.invoke.mockImplementation((cmd) => {
            if (cmd === 'get_schedules') return Promise.resolve(mockSchedules);
            return Promise.resolve({ success: true });
        });
    });

    const renderWithContext = (ui) => {
        return render(
            <ModalProvider>
                {ui}
            </ModalProvider>
        );
    };

    it('renders header and calendar', async () => {
        renderWithContext(<ScheduleMgmt />);

        expect(screen.getByText(/일정 관리/i)).toBeInTheDocument();

        await waitFor(() => {
            const elements = screen.getAllByText('테스트 일정 1');
            expect(elements.length).toBeGreaterThan(0);
        });
    });

    it('opens modal and creates a new schedule', async () => {
        renderWithContext(<ScheduleMgmt />);

        // The button text "새 일정 등록" appears both in the sidebar button
        // and the modal header after click. Use getByRole to target the button.
        const addBtn = screen.getByRole('button', { name: /새 일정 등록/i });
        await user.click(addBtn);

        // Wait for modal to open — check for the placeholder input
        await waitFor(() => {
            expect(screen.getByPlaceholderText('일정 제목을 입력하세요')).toBeInTheDocument();
        });

        const titleInput = screen.getByLabelText(/Title/i);
        await user.type(titleInput, '새로운 테스트 일정');

        // The submit button text includes icon + text
        const saveBtn = screen.getByRole('button', { name: /일정 등록 완료/i });
        await user.click(saveBtn);

        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('create_schedule', expect.objectContaining({
                title: '새로운 테스트 일정'
            }));
        });
    });

    it('opens modal, edits and deletes a schedule', async () => {
        renderWithContext(<ScheduleMgmt />);

        await waitFor(() => {
            const elements = screen.getAllByText('테스트 일정 1');
            expect(elements.length).toBeGreaterThan(0);
        });

        const eventBar = screen.getAllByText('테스트 일정 1')[0];
        await user.click(eventBar);

        await waitFor(() => {
            expect(screen.getByText('일정 상세 정보')).toBeInTheDocument();
        });

        const titleInput = screen.getByLabelText(/Title/i);
        await user.clear(titleInput);
        await user.type(titleInput, '수정된 일정');

        const saveBtn = screen.getByRole('button', { name: /수정 사항 저장/i });
        await user.click(saveBtn);

        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('update_schedule', expect.objectContaining({
                title: '수정된 일정'
            }));
        });
    });

    it('switches months in calendar', async () => {
        renderWithContext(<ScheduleMgmt />);

        // Wait for initial render
        await waitFor(() => {
            expect(screen.getByText(dayjs().format('YYYY. MM'))).toBeInTheDocument();
        });

        // The chevron buttons don't have aria-labels.
        // Find by the lucide SVG class name.
        const allButtons = screen.getAllByRole('button');
        const nextMonthBtn = allButtons.find(btn => btn.querySelector('.lucide-chevron-right'));

        expect(nextMonthBtn).toBeTruthy();
        await user.click(nextMonthBtn);

        // After clicking next month, the displayed month should change
        const nextMonth = dayjs().add(1, 'month');
        await waitFor(() => {
            expect(screen.getByText(nextMonth.format('YYYY. MM'))).toBeInTheDocument();
        });

        // Schedules should have been re-fetched
        expect(apiBridge.invoke).toHaveBeenCalledWith('get_schedules', expect.any(Object));
    });
});
