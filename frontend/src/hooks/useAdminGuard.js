import { useState, useCallback } from 'react';
import { callBridge } from '../utils/apiBridge';
import { useModal } from '../contexts/ModalContext';

let isPromptingActive = false;
let pendingPrompt = null;

export const useAdminGuard = () => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const { promptAdminPassword, showAlert } = useModal();

    const checkAdmin = useCallback(async () => {
        // 이미 다른 인증 요청이 진행 중이면 해당 결과 대기
        if (isPromptingActive && pendingPrompt) {
            const result = await pendingPrompt;
            if (result) setIsAuthorized(true);
            return result;
        }

        isPromptingActive = true;
        pendingPrompt = (async () => {
            try {
                const password = await promptAdminPassword();
                if (password === null) {
                    return false;
                }

                setIsVerifying(true);
                const isValid = await callBridge('verify_admin_password', { password });
                if (isValid) {
                    setIsAuthorized(true);
                    return true;
                } else {
                    await showAlert('인증 실패', '비밀번호가 올바르지 않습니다.');
                    return false;
                }
            } catch (err) {
                await showAlert('오류', '인증 중 오류가 발생했습니다: ' + err);
                return false;
            } finally {
                setIsVerifying(false);
                isPromptingActive = false;
                pendingPrompt = null;
            }
        })();

        return await pendingPrompt;
    }, [promptAdminPassword, showAlert]);

    const verifyPassword = useCallback(async (password) => {
        setIsVerifying(true);
        try {
            const isValid = await callBridge('verify_admin_password', { password });
            if (isValid) {
                setIsAuthorized(true);
                return true;
            }
            return false;
        } catch (err) {
            console.error(err);
            return false;
        } finally {
            setIsVerifying(false);
        }
    }, []);

    return { isAuthorized, isVerifying, checkAdmin, verifyPassword };
};
