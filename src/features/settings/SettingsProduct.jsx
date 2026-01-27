import React, { useState, useEffect } from 'react';
import { formatCurrency, parseNumber, showAlert, showConfirm } from '../../utils/common';

const SettingsProduct = () => {
    const [products, setProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [tabMode, setTabMode] = useState('product'); // 'product' | 'material'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({
        id: null,
        name: '',
        spec: '',
        price: 0,
        cost: 0,
        safety: 10,
        type: 'product',
        materialId: null,
        materialRatio: 1.0
    });

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        filterProducts();
    }, [searchQuery, tabMode, allProducts]);

    const loadProducts = async () => {
        if (!window.__TAURI__) return;
        try {
            await window.__TAURI__.core.invoke('init_db_schema');
            const list = await window.__TAURI__.core.invoke('get_product_list');
            setAllProducts(list || []);
        } catch (e) {
            console.error(e);
        }
    };

    const filterProducts = () => {
        let filtered = allProducts;

        // Tab filter
        if (tabMode === 'material') {
            filtered = filtered.filter(p => p.item_type === 'material');
        } else {
            filtered = filtered.filter(p => !p.item_type || p.item_type === 'product');
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p => p.product_name.toLowerCase().includes(q));
        }

        setProducts(filtered);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return showAlert("알림", "상품명을 입력해주세요.");

        try {
            if (window.__TAURI__) {
                if (form.id) {
                    await window.__TAURI__.core.invoke('update_product', {
                        productId: form.id,
                        productName: form.name,
                        specification: form.spec || null,
                        unitPrice: form.price,
                        stockQuantity: null,
                        safetyStock: form.safety,
                        costPrice: form.cost,
                        materialId: form.materialId,
                        materialRatio: form.materialRatio,
                        itemType: form.type
                    });
                } else {
                    await window.__TAURI__.core.invoke('create_product', {
                        productName: form.name,
                        specification: form.spec || null,
                        unitPrice: form.price,
                        stockQuantity: 0,
                        safetyStock: form.safety,
                        costPrice: form.cost,
                        materialId: form.materialId,
                        materialRatio: form.materialRatio,
                        itemType: form.type
                    });
                }
                setIsModalOpen(false);
                loadProducts();
                window.dispatchEvent(new Event('product-data-changed'));
            }
        } catch (e) {
            showAlert("오류", "저장 실패: " + e);
        }
    };

    const handleDelete = async (p) => {
        if (!await showConfirm("삭제 확인", `[${p.product_name}] 상품을 정말 삭제하시겠습니까?`)) return;
        try {
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('delete_product', { productId: p.product_id });
                loadProducts();
                window.dispatchEvent(new Event('product-data-changed'));
            }
        } catch (e) {
            showAlert("오류", "삭제 실패: " + e);
        }
    };

    const openModal = (product = null) => {
        if (product) {
            setForm({
                id: product.product_id,
                name: product.product_name,
                spec: product.specification || '',
                price: product.unit_price,
                cost: product.cost_price || 0,
                safety: product.safety_stock || 10,
                type: product.item_type || 'product',
                materialId: product.material_id || null,
                materialRatio: product.material_ratio || 1.0
            });
        } else {
            setForm({
                id: null,
                name: '',
                spec: '',
                price: 0,
                cost: 0,
                safety: 10,
                type: tabMode,
                materialId: null,
                materialRatio: 1.0
            });
        }
        setIsModalOpen(true);
    };

    const materials = allProducts.filter(p => p.item_type === 'material');

    return (
        <div className="sales-v3-container fade-in flex flex-col p-4 h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-xl">상품/자재 관리</h2>
                    <button onClick={() => openModal()} className="btn-primary h-9">
                        <span className="material-symbols-rounded mr-2">add</span> 새 항목 등록
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-3">
                    <button onClick={() => setTabMode('product')} className={`px-4 py-2 rounded font-bold text-sm transition-all ${tabMode === 'product' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        완제품
                    </button>
                    <button onClick={() => setTabMode('material')} className={`px-4 py-2 rounded font-bold text-sm transition-all ${tabMode === 'material' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        자재/부원료
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-2 text-slate-400">search</span>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="input-field pl-10 w-full" placeholder="상품명 검색..." />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto bg-white rounded-lg shadow-sm border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold sticky top-0">
                        <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3 w-20 text-center">유형</th>
                            <th className="p-3 text-left">상품명</th>
                            <th className="p-3 text-center w-32">규격</th>
                            <th className="p-3 text-center w-24">안전재고</th>
                            <th className="p-3 text-right w-28">판매가</th>
                            <th className="p-3 text-right w-24">재고</th>
                            <th className="p-3 text-center w-32">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {products.length === 0 ? (
                            <tr><td colSpan="8" className="p-20 text-center text-slate-400">상품이 없습니다.</td></tr>
                        ) : (
                            products.map((p, idx) => {
                                const isLow = (p.stock_quantity || 0) <= (p.safety_stock || 10);
                                return (
                                    <tr key={p.product_id} className="hover:bg-slate-50">
                                        <td className="p-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.item_type === 'material' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'
                                                }`}>{p.item_type === 'material' ? '자재' : '상품'}</span>
                                        </td>
                                        <td className="p-3 font-bold text-slate-700">{p.product_name}</td>
                                        <td className="p-3 text-center text-slate-500 text-xs">{p.specification || '-'}</td>
                                        <td className="p-3 text-center text-slate-500">{p.safety_stock || 10}</td>
                                        <td className="p-3 text-right font-mono">{formatCurrency(p.unit_price)}</td>
                                        <td className={`p-3 text-right font-bold ${isLow ? 'text-red-500' : 'text-slate-600'}`}>
                                            {p.stock_quantity || 0}
                                            {isLow && <span className="material-symbols-rounded text-xs ml-1 align-middle">error</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openModal(p)} className="text-blue-500 hover:text-blue-700">
                                                    <span className="material-symbols-rounded text-base">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(p)} className="text-red-400 hover:text-red-600">
                                                    <span className="material-symbols-rounded text-base">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal flex">
                    <div className="modal-content w-[500px]">
                        <h3 className="mb-4">{form.id ? '상품 수정' : `${tabMode === 'material' ? '자재' : '상품'} 등록`}</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">상품명 <span className="text-red-500">*</span></label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field w-full" autoFocus />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">규격</label>
                                    <input value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })} className="input-field w-full" placeholder="ex. 1kg" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">안전재고</label>
                                    <input type="number" value={form.safety} onChange={e => setForm({ ...form, safety: Number(e.target.value) })} className="input-field w-full" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">판매가</label>
                                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="input-field w-full text-right" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">원가</label>
                                    <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} className="input-field w-full text-right" />
                                </div>
                            </div>

                            {form.type === 'product' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">연계 자재 (선택)</label>
                                    <select value={form.materialId || ''} onChange={e => setForm({ ...form, materialId: e.target.value ? Number(e.target.value) : null })} className="input-field w-full">
                                        <option value="">연동 안함</option>
                                        {materials.map(m => <option key={m.product_id} value={m.product_id}>{m.product_name} {m.specification && `(${m.specification})`}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">취소</button>
                            <button onClick={handleSave} className="btn-primary flex-1">저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsProduct;
