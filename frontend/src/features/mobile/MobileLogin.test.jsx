import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import MobileLogin from './MobileLogin';
import * as apiBridge from '../../utils/apiBridge';

vi.mock('../../utils/apiBridge', () => ({
    invoke: vi.fn()
}));

describe('MobileLogin Component', () => {
    let user;
    const onLoginSuccess = vi.fn();

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();

        // Mock localStorage
        const store = {
            'API_BASE_URL': 'http://localhost:3000'
        };
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
    });

    it('renders login screen', () => {
        render(<MobileLogin onLoginSuccess={onLoginSuccess} />);
        expect(screen.getByText(/현장 모바일 접속/i)).toBeInTheDocument();
        expect(screen.getByText(/6자리 보안 PIN을 입력하세요/i)).toBeInTheDocument();
    });

    it('successfully logs in when 6-digit PIN is entered correctly', async () => {
        apiBridge.invoke.mockResolvedValue({
            success: true,
            username: '관리자',
            role: 'admin',
            token: 'test-token'
        });

        render(<MobileLogin onLoginSuccess={onLoginSuccess} />);

        // Type 123456
        for (let i = 1; i <= 6; i++) {
            await user.click(screen.getByText(i.toString()));
        }

        await waitFor(() => {
            expect(apiBridge.invoke).toHaveBeenCalledWith('verify_mobile_pin', { pin: '123456' });
        });

        await waitFor(() => {
            expect(onLoginSuccess).toHaveBeenCalled();
        });

        expect(localStorage.setItem).toHaveBeenCalledWith('username', '관리자');
        expect(localStorage.setItem).toHaveBeenCalledWith('isLoggedIn', 'true');
    });

    it('shows error message on incorrect PIN', async () => {
        apiBridge.invoke.mockResolvedValue({ success: false, error: 'PIN 번호가 올바르지 않습니다.' });

        render(<MobileLogin onLoginSuccess={onLoginSuccess} />);

        // Type 111111
        for (let i = 0; i < 6; i++) {
            await user.click(screen.getByText('1'));
        }

        expect(await screen.findByText(/PIN 번호가 올바르지 않습니다/i)).toBeInTheDocument();
    });

    it('allows changing server settings', async () => {
        render(<MobileLogin onLoginSuccess={onLoginSuccess} />);

        const settingsBtn = screen.getByText(/서버설정/i);
        await user.click(settingsBtn);

        const serverInput = screen.getByPlaceholderText(/http:\/\/100\.x\.x\.x:3000/i);
        await user.clear(serverInput);
        await user.type(serverInput, 'http://192.168.0.10:3000');

        const saveBtn = screen.getByText(/주소 저장 및 적용/i);
        await user.click(saveBtn);

        expect(localStorage.setItem).toHaveBeenCalledWith('API_BASE_URL', 'http://192.168.0.10:3000');
        expect(screen.queryByText(/서버 연결 설정/i)).not.toBeInTheDocument();
    });
});
