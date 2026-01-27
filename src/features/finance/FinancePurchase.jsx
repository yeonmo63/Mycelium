import React, { useState, useEffect } from 'react';
import { formatCurrency, parseNumber, showAlert, showConfirm } from '../../utils/common';

const FinancePurchase = () => {
    const [purchases, setPurchases] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const [filter, setFilter] = useState({ start: startOfMonth, end: today, vendorId: '' });

    // Form
    const [form, setForm] = useState({
        id: null,
        date: today,
        vendorId: '',
        itemName: '',
        spec: '',
        qty: 1,
        price: 0,
        paymentStatus: '계좌이체',
        memo: '',
        linkProductId: '',
        inventoryMode: false,
        syncMode: false
    });

    // Sync suggestions
    const [syncSuggestions, setSyncSuggestions] = useState([]);
    const [syncQty, setSyncQty] = useState({});

    // --- Init ---
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        await Promise.all([loadPurchases(), loadVendors(), loadProducts()]);
    };

    const loadPurchases = async () => {
        if (!window.__TAURI__) return;
        setIsLoading(true);
        try {
            const list = await window.__TAURI__.core.invoke('get_purchase_list', {
                startDate: filter.start,
                endDate: filter.end,
                vendorId: filter.vendorId ? parseInt(filter.vendorId) : null
            });
            setPurchases(list || []);
        } catch (e) {
            console.error(e);
            setPurchases([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadVendors = async () => {
        if (!window.__TAURI__) return;
        try {
            const list = await window.__TAURI__.core.invoke('get_vendor_list');
            setVendors(list || []);
        } catch (e) {
            console.error(e);
        }
    };

    const loadProducts = async () => {
        if (!window.__TAURI__) return;
        try {
            await window.__TAURI__.core.invoke('init_db_schema');
            const list = await window.__TAURI__.core.invoke('get_product_list');
            setProducts(list || []);
            setMaterials((list || []).filter(p => p.item_type === 'material'));
        } catch (e) {
            console.error(e);
        }
    };

    // --- Handlers ---
    const handleSave = async () => {
        if (!form.itemName.trim()) return showAlert("알림", "품목명을 입력해주세요.");
        if (!form.vendorId) return showAlert("알림", "거래처를 선택해주세요.");

        let inventorySyncData = null;
        if (form.syncMode) {
            const items = Object.entries(syncQty)
                .filter(([_, qty]) => qty > 0)
                .map(([pid, qty]) => ({ product_id: parseInt(pid), quantity: qty }));
            if (items.length > 0) inventorySyncData = items;
        }

        const purchase = {
            purchase_id: form.id,
            vendor_id: parseInt(form.vendorId),
            purchase_date: form.date,
            item_name: form.itemName,
            specification: form.spec,
            quantity: form.qty,
            unit_price: form.price,
            total_amount: form.qty * form.price,
            payment_status: form.paymentStatus,
            memo: form.memo,
            inventory_synced: inventorySyncData !== null,
            material_item_id: form.linkProductId ? parseInt(form.linkProductId) : null
        };

        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('save_purchase', { purchase, inventorySyncData });
                await showAlert("성공", "매입 내역이 저장되었습니다." + (inventorySyncData ? "\n(재고가 반영되었습니다)" : ""));
                handleReset();
                loadPurchases();
                loadProducts();
            }
        } catch (e) {
            showAlert("오류", "저장 실패: " + e);
        }
    };

    const handleDelete = async (id) => {
        if (!await showConfirm("삭제 확인", "이 매입 내역을 삭제하시겠습니까?")) return;
        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('delete_purchase', { id });
                loadPurchases();
            }
        } catch (e) {
            showAlert("오류", "삭제 실패: " + e);
        }
    };

    const handleReset = () => {
        setForm({
            id: null,
            date: new Date().toISOString().split('T')[0],
            vendorId: '',
            itemName: '',
            spec: '',
            qty: 1,
            price: 0,
            paymentStatus: '계좌이체',
            memo: '',
            linkProductId: '',
            inventoryMode: false,
            syncMode: false
        });
        setSyncSuggestions([]);
        setSyncQty({});
    };

    const loadToForm = (p) => {
        setForm({
            id: p.purchase_id,
            date: p.purchase_date,
            vendorId: p.vendor_id,
            itemName: p.item_name,
            spec: p.specification || '',
            qty: p.quantity,
            price: p.unit_price,
            paymentStatus: p.payment_status,
            memo: p.memo || '',
            linkProductId: p.material_item_id || '',
            inventoryMode: !!p.material_item_id,
            syncMode: false
        });
        setSyncSuggestions([]);
        setSyncQty({});
    };

    // Sync suggestions
    useEffect(() => {
        if (form.syncMode && form.itemName) {
            updateSuggestions();
        }
    }, [form.itemName, form.syncMode]);

    const updateSuggestions = () => {
        const regex = /(\d+\s*(kg|g|호|세트|종|입))/i;
        const match = form.itemName.match(regex);
        const keyword = match ? match[0].toLowerCase() : form.itemName.toLowerCase();

        if (keyword.length < 2) {
            setSyncSuggestions([]);
            return;
        }

        const filtered = products.filter(p =>
            p.item_type === 'product' && (
                p.product_name.toLowerCase().includes(keyword) ||
                (p.specification && p.specification.toLowerCase().includes(keyword))
            )
        ).slice(0, 20);

        setSyncSuggestions(filtered);
    };

    // Stats
    const totalSum = purchases.reduce((sum, p) => sum + p.total_amount, 0);
    const unpaidSum = purchases.filter(p => p.payment_status === '미지급').reduce((sum, p) => sum + p.total_amount, 0);

    return (
        <div className="sales-v3-container fade-in flex gap-4 p-4 h-full bg-slate-50">
            {/* Left: Form */}
            <div className="w-[400px] flex flex-col gap-4">
                <div className="modern-card bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-green-600">shopping_cart</span>
                        {form.id ? '매입 수정' : '매입 등록'}
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">매입일자</label>
                            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field w-full" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">거래처</label>
                            <select value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })} className="input-field w-full">
                                <option value="">거래처 선택</option>
                                {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
                            </select>
                        </div>

                        {/* Inventory Mode Toggle */}
                        <label className="flex items-center gap-2 p-2 bg-blue-50 rounded cursor-pointer border border-blue-100">
                            <input type="checkbox" checked={form.inventoryMode} onChange={e => setForm({ ...form, inventoryMode: e.target.checked, linkProductId: '', syncMode: false })} />
                            <span className="text-sm font-bold text-blue-700">재고 연동 모드</span>
                        </label>

                        {form.inventoryMode && (
                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <label className="text-xs font-bold text-slate-500 block mb-1">연계 재고 품목</label>
                                <select value={form.linkProductId} onChange={e => {
                                    const val = e.target.value;
                                    setForm({ ...form, linkProductId: val });
                                    if (val && !form.itemName) {
                                        const mat = materials.find(m => m.product_id == val);
                                        if (mat) setForm(prev => ({ ...prev, itemName: mat.product_name, linkProductId: val }));
                                    }
                                }} className="input-field w-full text-sm">
                                    <option value="">재고 연동 안함 (일반 지출)</option>
                                    {materials.map(m => <option key={m.product_id} value={m.product_id}>{m.product_name} {m.specification ? `(${m.specification})` : ''}</option>)}
                                </select>

                                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                    <input type="checkbox" checked={form.syncMode} disabled={!form.linkProductId} onChange={e => setForm({ ...form, syncMode: e.target.checked })} />
                                    <span className="text-xs font-bold text-slate-600">완제품 재고도 함께 입고</span>
                                </label>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">품목명</label>
                            <input value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} className="input-field w-full" placeholder="ex. 생표고버섯" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">규격</label>
                            <input value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })} className="input-field w-full" placeholder="ex. 1kg" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">수량</label>
                                <input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: Number(e.target.value) })} className="input-field w-full text-right" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">단가</label>
                                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="input-field w-full text-right" />
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded">
                            <div className="text-xs font-bold text-slate-500 mb-1">총액</div>
                            <div className="text-2xl font-black text-blue-600">{formatCurrency(form.qty * form.price)}원</div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">지급 상태</label>
                            <select value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })} className="input-field w-full">
                                <option>계좌이체</option>
                                <option>현금</option>
                                <option>미지급</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">메모</label>
                            <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} className="input-field w-full h-16 resize-none" />
                        </div>

                        {/* Sync Suggestions */}
                        {form.syncMode && syncSuggestions.length > 0 && (
                            <div className="bg-purple-50 p-3 rounded border border-purple-200">
                                <div className="text-xs font-bold text-purple-700 mb-2">완제품 입고 수량</div>
                                <div className="space-y-2 max-h-[200px] overflow-auto">
                                    {syncSuggestions.map(p => (
                                        <div key={p.product_id} className="flex items-center gap-2 bg-white p-2 rounded text-xs">
                                            <span className="flex-1 font-bold truncate" title={p.product_name}>{p.product_name}</span>
                                            <span className="text-slate-400 text-[10px]">재고 {formatCurrency(p.stock_quantity)}</span>
                                            <input type="number" value={syncQty[p.product_id] || ''} onChange={e => setSyncQty({ ...syncQty, [p.product_id]: Number(e.target.value) })}
                                                className="input-field w-16 h-7 text-right text-xs" placeholder="0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <button onClick={handleReset} className="btn-secondary flex-1">초기화</button>
                            <button onClick={handleSave} className="btn-primary flex-1">저장</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: List */}
            <div className="flex-1 flex flex-col">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg">매입 내역</h3>
                        <div className="flex gap-4 text-sm">
                            <div className="bg-blue-50 px-3 py-1 rounded">총 매입액: <span className="font-bold text-blue-600">{formatCurrency(totalSum)}원</span></div>
                            <div className="bg-red-50 px-3 py-1 rounded">미지급: <span className="font-bold text-red-600">{formatCurrency(unpaidSum)}원</span></div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input type="date" value={filter.start} onChange={e => setFilter({ ...filter, start: e.target.value })} className="input-field h-8 text-sm" />
                        <span className="flex items-center">~</span>
                        <input type="date" value={filter.end} onChange={e => setFilter({ ...filter, end: e.target.value })} className="input-field h-8 text-sm" />
                        <select value={filter.vendorId} onChange={e => setFilter({ ...filter, vendorId: e.target.value })} className="input-field h-8 text-sm w-40">
                            <option value="">모든 거래처</option>
                            {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
                        </select>
                        <button onClick={loadPurchases} className="btn-primary h-8 px-4 text-sm">조회</button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white rounded-lg shadow-sm border border-slate-200">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold sticky top-0">
                            <tr>
                                <th className="p-3 w-28 text-center">매입일</th>
                                <th className="p-3 text-left w-32">거래처</th>
                                <th className="p-3 text-left">품목</th>
                                <th className="p-3 text-right w-24">수량</th>
                                <th className="p-3 text-right w-32">총액</th>
                                <th className="p-3 text-center w-24">지급상태</th>
                                <th className="p-3 text-center w-20">편집</th>
                                <th className="p-3 text-center w-20">삭제</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="8" className="p-20 text-center"><span className="material-symbols-rounded spin text-3xl text-slate-400">sync</span></td></tr>
                            ) : purchases.length === 0 ? (
                                <tr><td colSpan="8" className="p-20 text-center text-slate-400">매입 내역이 없습니다.</td></tr>
                            ) : (
                                purchases.map(p => (
                                    <tr key={p.purchase_id} onClick={() => loadToForm(p)} className="hover:bg-slate-50 cursor-pointer">
                                        <td className="p-3 text-center text-slate-500">{p.purchase_date}</td>
                                        <td className="p-3 font-bold text-slate-700">{p.vendor_name || '-'}</td>
                                        <td className="p-3 text-slate-600">
                                            {p.item_name} {p.specification && <span className="text-slate-400 text-xs">({p.specification})</span>}
                                        </td>
                                        <td className="p-3 text-right font-mono">{formatCurrency(p.quantity)}</td>
                                        <td className="p-3 text-right font-mono font-bold">{formatCurrency(p.total_amount)}원</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.payment_status === '미지급' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
                                                }`}>{p.payment_status}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={(e) => { e.stopPropagation(); loadToForm(p); }} className="text-blue-500 hover:text-blue-700">
                                                <span className="material-symbols-rounded text-base">edit</span>
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(p.purchase_id); }} className="text-red-400 hover:text-red-600">
                                                <span className="material-symbols-rounded text-base">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancePurchase;
