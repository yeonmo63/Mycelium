import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SettingsDbReset from './SettingsDbReset';
import { ModalProvider } from '../../contexts/ModalContext';
import * as apiBridge from '../../utils/apiBridge';
import { BrowserRouter } from 'react-router-dom';

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

vi.mock('../../hooks/useAdminGuard', () => ({
    useAdminGuard: () => ({
        isAuthorized: true,
        checkAdmin: vi.fn().mockResolvedValue(true),
        isVerifying: false
    })
}));

const mockPresetData = {
    products: [
        { name: '생표고 1kg', specification: '1kg', category: '판매', price: 15000 }
    ],
    spaces: [
        { name: '1동 재배사', space_type: '재배' }
    ],
    boms: [
        { product_name: '생표고 1kg', materials: [{ material_name: '박스', ratio: 1 }] }
    ]
};

describe('SettingsDbReset Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();
        apiBridge.callBridge.mockImplementation((cmd) => {
            if (cmd === 'get_custom_presets') return Promise.resolve([]);
            if (cmd === 'get_preset_data') return Promise.resolve(mockPresetData);
            if (cmd === 'apply_preset') return Promise.resolve({ success: true });
            if (cmd === 'save_current_as_preset') return Promise.resolve({ success: true });
            if (cmd === 'delete_custom_preset') return Promise.resolve({ success: true });
            if (cmd === 'reset_database') return Promise.resolve('초기화가 완료되었습니다.');
            return Promise.resolve({ success: true });
        });
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <SettingsDbReset />
            </BrowserRouter>
        );
    };

    it('renders header and preset cards', async () => {
        renderComponent();

        expect(await screen.findByText(/데이터 초기화 및 프리셋/)).toBeInTheDocument();
        expect(await screen.findByText('버섯 농장 (표고/느타리)')).toBeInTheDocument();
        expect(screen.getByText('딸기 농가')).toBeInTheDocument();
        expect(screen.getByText('토마토 농가')).toBeInTheDocument();
    });

    it('selects a preset and opens preview', async () => {
        renderComponent();
        await screen.findByText(/데이터 초기화 및 프리셋/);

        // Click on mushroom preset
        const mushroomCard = screen.getByText('버섯 농장 (표고/느타리)');
        await user.click(mushroomCard);

        // Click preview button
        const previewBtn = screen.getByRole('button', { name: /구성 미리보기/i });
        await user.click(previewBtn);

        // Preview modal should show
        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('get_preset_data', expect.objectContaining({ presetType: 'mushroom' }));
        });

        await waitFor(() => {
            expect(screen.getByText(/구성 확인/)).toBeInTheDocument();
        });
    });

    it('applies a preset from preview modal', async () => {
        renderComponent();
        await screen.findByText(/데이터 초기화 및 프리셋/);

        // Select preset
        await user.click(screen.getByText('버섯 농장 (표고/느타리)'));

        // Open preview
        const previewBtn = screen.getByRole('button', { name: /구성 미리보기/i });
        await user.click(previewBtn);

        await waitFor(() => {
            expect(screen.getByText(/구성 확인/)).toBeInTheDocument();
        });

        // Click apply
        const applyBtn = screen.getByRole('button', { name: /데이터 생성 시작/i });
        await user.click(applyBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('apply_preset', { presetType: 'mushroom' });
        });
    });

    it('opens save preset modal and saves', async () => {
        renderComponent();
        await screen.findByText(/데이터 초기화 및 프리셋/);

        // Click save config button
        const saveBtn = screen.getByText('현재 구성 저장하기');
        await user.click(saveBtn);

        // Modal should open
        await waitFor(() => {
            expect(screen.getByText('현재 구성을 프리셋으로 저장')).toBeInTheDocument();
        });

        // Fill name
        const nameInput = screen.getByPlaceholderText('우리 집 농장 구성 A');
        await user.type(nameInput, '테스트 프리셋');

        // Click save - Need to find the button within the modal specifically
        const modal = screen.getByText('현재 구성을 프리셋으로 저장').closest('div.relative');
        const { getByRole } = within(modal);
        const saveBtnModal = getByRole('button', { name: /저장하기/i });
        await user.click(saveBtnModal);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('save_current_as_preset', expect.objectContaining({
                name: '테스트 프리셋'
            }));
        });
    });

    it('performs factory reset with confirmation text', async () => {
        renderComponent();
        await screen.findByText(/데이터 초기화 및 프리셋/);

        // Type confirmation text
        const confirmInput = screen.getByPlaceholderText("'초기화'를 입력하세요");
        await user.type(confirmInput, '초기화');

        // Click reset button
        const resetBtn = screen.getByRole('button', { name: /전체 데이터 즉시 삭제/i });
        await user.click(resetBtn);

        // showConfirm should be called
        await waitFor(() => {
            expect(mockShowConfirm).toHaveBeenCalledWith('데이터 영구 삭제 경고', expect.any(String));
        });

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('reset_database');
        });
    });

    it('shows alert when reset button clicked without confirmation text', async () => {
        renderComponent();
        await screen.findByText(/데이터 초기화 및 프리셋/);

        // Reset button should be disabled when text is not '초기화'
        const resetBtn = screen.getByRole('button', { name: /전체 데이터 즉시 삭제/i });
        expect(resetBtn).toBeDisabled();
    });
});
