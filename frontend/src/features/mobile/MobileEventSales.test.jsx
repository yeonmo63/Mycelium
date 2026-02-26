import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import MobileEventSales from './MobileEventSales';
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

vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        Plus: (props) => <div data-testid="plus-icon" {...props} />,
        Search: (props) => <div data-testid="search-icon" {...props} />,
        Save: (props) => <div data-testid="save-icon" {...props} />,
        QrCode: (props) => <div data-testid="qr-icon" {...props} />
    };
});

vi.mock('../../contexts/ModalContext', () => ({
    useModal: () => ({
        showAlert: vi.fn(),
        showConfirm: vi.fn(() => Promise.resolve(true))
    }),
    ModalProvider: ({ children }) => <div>{children}</div>
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => false)
    }
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('MobileEventSales Component', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
        vi.clearAllMocks();

        apiBridge.callBridge.mockImplementation((cmd) => {
            if (cmd === 'get_product_list') return Promise.resolve([
                { product_id: 1, product_name: '느타리버섯', unit_price: 10000, status: '판매중' }
            ]);
            if (cmd === 'get_all_events') return Promise.resolve([
                { event_id: 'e1', event_name: '가을 축제' }
            ]);
            if (cmd === 'search_events_by_name') return Promise.resolve([
                { event_id: 'e1', event_name: '가을 축제' }
            ]);
            if (cmd === 'save_general_sales_batch') return Promise.resolve({ success: true });
            return Promise.resolve([]);
        });

        // Mock localStorage
        const store = {};
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
    });

    it('renders and displays event search initially', async () => {
        render(
            <BrowserRouter>
                <MobileEventSales />
            </BrowserRouter>
        );

        expect(await screen.findByText(/특판 접수/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/고객명 또는 이벤트명 검색/i)).toBeInTheDocument();
    });

    it('performs event search and selects an event', async () => {
        render(
            <BrowserRouter>
                <MobileEventSales />
            </BrowserRouter>
        );

        const searchInput = screen.getByPlaceholderText(/고객명 또는 이벤트명 검색/i);
        await user.type(searchInput, '가을');

        const searchBtn = screen.getByRole('button', { name: /검색/i });
        await user.click(searchBtn);

        expect(apiBridge.callBridge).toHaveBeenCalledWith('search_events_by_name', { name: '가을' });

        const eventResult = await screen.findByText(/가을 축제/i);
        await user.click(eventResult);

        // event info should be visible (in the select)
        const select = await screen.findByRole('combobox');
        expect(select.value).toBe('e1');
    });

    it('adds a product to cart via quick select and checks out', async () => {
        render(
            <BrowserRouter>
                <MobileEventSales />
            </BrowserRouter>
        );

        // Select event first
        const searchInput = screen.getByPlaceholderText(/고객명 또는 이벤트명 검색/i);
        await user.type(searchInput, '가을');
        await user.click(screen.getByRole('button', { name: /검색/i }));
        await user.click(await screen.findByText(/가을 축제/i));

        // Add product via quick select
        const quickProduct = await screen.findByText(/느타리버섯/i);
        await user.click(quickProduct);

        // Show input section to click '담기'
        const showInputBtn = screen.getByText(/품목 추가/i);
        await user.click(showInputBtn);

        const addBtn = screen.getByRole('button', { name: /담기/i });
        await user.click(addBtn);

        expect(screen.getByText(/담긴 상품 \(1\)/i)).toBeInTheDocument();

        // Checkout button containing save icon
        const saveIcon = screen.getByTestId('save-icon');
        const checkoutBtn = saveIcon.parentElement;
        await user.click(checkoutBtn);

        await waitFor(() => {
            expect(apiBridge.callBridge).toHaveBeenCalledWith('save_general_sales_batch', expect.objectContaining({
                items: expect.arrayContaining([
                    expect.objectContaining({ productName: '느타리버섯' })
                ])
            }));
        });
    });

    it('opens QR scanner UI', async () => {
        render(
            <BrowserRouter>
                <MobileEventSales />
            </BrowserRouter>
        );

        // Select event
        const searchInput = screen.getByPlaceholderText(/고객명 또는 이벤트명 검색/i);
        await user.type(searchInput, '가을');
        await user.click(screen.getByRole('button', { name: /검색/i }));
        await user.click(await screen.findByText(/가을 축제/i));

        const qrBtn = screen.getByRole('button', { name: /QR 스캔/i });
        await user.click(qrBtn);

        expect(screen.getByText(/특판 품목 스캔 중/i)).toBeInTheDocument();
    });
});
