import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SettingsApiKeys from './SettingsApiKeys';
import * as apiBridge from '../../utils/apiBridge';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn(),
    callBridge: vi.fn()
}));

vi.mock('../../utils/aiErrorHandler', () => ({
    invokeAI: vi.fn()
}));

const mockShowAlert = vi.fn().mockResolvedValue(true);
vi.mock('../../contexts/ModalContext', () => ({
    useModal: () => ({
        showAlert: mockShowAlert,
        showConfirm: vi.fn().mockResolvedValue(true)
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

const mockConfig = {
    gemini_api_key: 'test-gemini-key',
    sms: { apiKey: 'sms-key-123', senderNumber: '010-1234-5678', provider: 'aligo' },
    naver: { clientId: 'naver-id', clientSecret: 'naver-secret' },
    mall: {
        naver_commerce_id: '', naver_commerce_secret: '',
        coupang_access_key: '', coupang_secret_key: '', coupang_vendor_id: '',
        sabangnet_api_key: 'sab-key', sabangnet_id: 'sab-id',
        playauto_api_key: '', playauto_id: ''
    },
    courier: { provider: 'sweettracker', api_key: 'courier-key', client_id: 'courier-client' },
    tax: { api_key: '', client_id: '' },
    weather: { api_key: 'weather-key', location: 'Gangneung', provider: 'openweathermap' }
};

describe('SettingsApiKeys Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();

        // Note: SettingsApiKeys uses `callBridge as invoke`
        apiBridge.callBridge.mockImplementation((cmd) => {
            if (cmd === 'get_all_integrations_config') return Promise.resolve(mockConfig);
            if (cmd === 'save_gemini_api_key') return Promise.resolve({ success: true });
            if (cmd === 'save_sms_config') return Promise.resolve({ success: true });
            if (cmd === 'save_naver_keys') return Promise.resolve({ success: true });
            if (cmd === 'save_mall_keys') return Promise.resolve({ success: true });
            if (cmd === 'save_courier_config') return Promise.resolve({ success: true });
            if (cmd === 'save_weather_config') return Promise.resolve({ success: true });
            return Promise.resolve({ success: true });
        });
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <SettingsApiKeys />
            </BrowserRouter>
        );
    };

    it('renders all API section cards', async () => {
        renderComponent();

        expect(await screen.findByText('Google Gemini AI')).toBeInTheDocument();
        expect(screen.getByText(/SMS & Messaging/)).toBeInTheDocument();
        expect(screen.getByText(/Naver Search & Trends/)).toBeInTheDocument();
        expect(screen.getByText(/Weather Service/)).toBeInTheDocument();
        expect(screen.getByText(/E-commerce & Mall Sync/)).toBeInTheDocument();
        expect(screen.getByText(/Courier Service Integration/)).toBeInTheDocument();
    });

    it('loads and displays existing config values', async () => {
        renderComponent();

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('get_all_integrations_config');
        });

        // Config values should be loaded (password fields won't show text directly)
        await waitFor(() => {
            const geminiInput = screen.getByPlaceholderText('AI 분석 기능을 사용하려면 키를 입력하세요');
            expect(geminiInput).toHaveValue('test-gemini-key');
        });
    });

    it('saves Gemini API key', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByPlaceholderText('AI 분석 기능을 사용하려면 키를 입력하세요')).toHaveValue('test-gemini-key');
        });

        // Find the Gemini save button (first 저장하기 button)
        const saveButtons = screen.getAllByRole('button', { name: /저장하기|저장/i });
        // The Gemini card has "저장하기"
        const geminiSaveBtn = saveButtons[0];
        await user.click(geminiSaveBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('save_gemini_api_key', { key: 'test-gemini-key' });
        });
    });

    it('saves SMS config', async () => {
        renderComponent();

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('get_all_integrations_config');
        });

        // Find the SMS save button (the one inside SMS card)
        // SMS card has "저장" button (4th character match)
        const smsSection = screen.getByText(/SMS & Messaging/);
        const smsSaveBtn = smsSection.closest('div[class*="bg-white"]').querySelector('button[class*="bg-orange"]');
        await user.click(smsSaveBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('save_sms_config', expect.objectContaining({
                apiKey: 'sms-key-123',
                senderNumber: '010-1234-5678'
            }));
        });
    });

    it('saves weather config', async () => {
        renderComponent();

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('get_all_integrations_config');
        });

        const weatherSection = screen.getByText(/Weather Service/);
        const weatherSaveBtn = weatherSection.closest('div[class*="bg-white"]').querySelector('button[class*="bg-sky"]');
        await user.click(weatherSaveBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('save_weather_config', expect.objectContaining({
                api_key: 'weather-key',
                location: 'Gangneung'
            }));
        });
    });
});
