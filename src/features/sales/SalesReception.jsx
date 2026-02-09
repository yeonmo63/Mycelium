import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { formatPhoneNumber } from '../../utils/common';
import { useSalesReception } from './hooks/useSalesReception';

import ReceptionHeader from './components/reception/ReceptionHeader';
import CustomerInfoBar from './components/reception/CustomerInfoBar';
import SalesInputPanel from './components/reception/SalesInputPanel';
import SalesRowsTable from './components/reception/SalesRowsTable';
import ReceptionFooter from './components/reception/ReceptionFooter';
import CustomerSelectionModal from './components/reception/CustomerSelectionModal';
import QuickRegisterModal from './components/reception/QuickRegisterModal';
import AddressLayer from './components/reception/AddressLayer';

const SalesReception = () => {
    const { showAlert, showConfirm } = useModal();
    const {
        orderDate, setOrderDate,
        customer, setCustomer,
        addresses,
        products,
        salesRows,
        editingTempId,
        isProcessing,
        isDirty,
        inputState, setInputState,
        loadProducts, loadCompanyInfo, loadSalesHistory,
        selectCustomer,
        handleInputChange,
        handleAddRow,
        handleEditRow,
        handleDeleteRow,
        handleSaveAll,
        handleReset,
        handlePrintStatement,
        handleCsvUpload,
        summary,
        isDraftRestored
    } = useSalesReception(showAlert, showConfirm);

    // Refs
    const custSearchRef = useRef(null);
    const prodSelectRef = useRef(null);
    const fileInputRef = useRef(null);

    // Local UI Modals State
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showAddrLayer, setShowAddrLayer] = useState(false);
    const [quickRegisterName, setQuickRegisterName] = useState('');

    useEffect(() => {
        loadProducts();
        loadCompanyInfo();
    }, [loadProducts, loadCompanyInfo]);

    const initialLoadRef = useRef(true);
    useEffect(() => {
        if (!customer && custSearchRef.current) {
            custSearchRef.current.value = '';
        }
        if (isDraftRestored && initialLoadRef.current) {
            initialLoadRef.current = false;
            if (customer && custSearchRef.current) custSearchRef.current.value = customer.customer_name;
            return;
        }
        if (customer && orderDate) {
            loadSalesHistory(customer.customer_id, orderDate);
        }
    }, [customer, orderDate, loadSalesHistory, isDraftRestored]);

    const handleSearchCustomer = async () => {
        const query = custSearchRef.current?.value.trim();
        if (!query) return showAlert('알림', '조회할 고객명을 입력해주세요.');

        try {
            const results = await window.__TAURI__.core.invoke('search_customers_by_name', { name: query });
            if (!results || results.length === 0) {
                if (await showConfirm('신규 고객', '검색 결과가 없습니다. 새로운 고객으로 등록하시겠습니까?')) {
                    setQuickRegisterName(query);
                    setShowRegisterModal(true);
                }
                return;
            }
            if (results.length === 1) selectCustomer(results[0]);
            else { setSearchResults(results); setShowSelectionModal(true); }
        } catch (e) { showAlert('오류', '고객 검색 중 오류가 발생했습니다.'); }
    };

    const handleQuickRegister = async (data) => {
        try {
            await window.__TAURI__.core.invoke('create_customer', {
                ...data,
                joinDate: new Date().toISOString().split('T')[0],
                mobile: formatPhoneNumber(data.mobile),
                phone: formatPhoneNumber(data.phone)
            });
            const results = await window.__TAURI__.core.invoke('search_customers_by_name', { name: data.name });
            const created = results.find(r => r.mobile_number === data.mobile) || results[0];
            if (created) {
                selectCustomer(created);
                setShowRegisterModal(false);
                showAlert('성공', '신규 고객이 등록되었습니다.');
            }
        } catch (e) { showAlert('오류', `고객 등록 실패: ${e}`); }
    };

    const handleAddressSearch = (target = 'input') => {
        if (!window.daum || !window.daum.Postcode) return showAlert('오류', '주소 검색 서비스를 불러올 수 없습니다.');
        setShowAddrLayer(true);
        setTimeout(() => {
            new window.daum.Postcode({
                oncomplete: (data) => {
                    let fullAddr = data.address;
                    if (data.addressType === 'R') {
                        let extra = (data.bname !== '' ? data.bname : '') + (data.buildingName !== '' ? (data.bname !== '' ? `, ${data.buildingName}` : data.buildingName) : '');
                        fullAddr += extra !== '' ? ` (${extra})` : '';
                    }
                    if (target === 'input') setInputState(prev => ({ ...prev, shipZip: data.zonecode, shipAddr1: fullAddr }));
                    else {
                        if (target.zipId) document.getElementById(target.zipId).value = data.zonecode;
                        if (target.addr1Id) document.getElementById(target.addr1Id).value = fullAddr;
                    }
                    setShowAddrLayer(false);
                }, width: '100%', height: '100%'
            }).embed(document.getElementById('addr-layer-container'));
        }, 100);
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden animate-in fade-in duration-700">
            <div className="px-6 lg:px-8 min-[2000px]:px-12 pt-6 lg:pt-8 min-[2000px]:pt-12 pb-1">
                <ReceptionHeader fileInputRef={fileInputRef} onCsvUpload={handleCsvUpload} />
                <CustomerInfoBar
                    orderDate={orderDate} setOrderDate={setOrderDate}
                    custSearchRef={custSearchRef} handleSearchCustomer={handleSearchCustomer}
                    customer={customer}
                />
            </div>

            <div className={`px-6 lg:px-8 min-[2000px]:px-12 mt-1 flex flex-col gap-3 overflow-hidden flex-1 pb-6 lg:pb-8 min-[2000px]:pb-12 ${!customer ? 'pointer-events-none opacity-50' : ''}`}>
                <SalesInputPanel
                    inputState={inputState} handleInputChange={handleInputChange}
                    products={products} addresses={addresses} prodSelectRef={prodSelectRef}
                    handleAddressSearch={handleAddressSearch} handleAddRow={handleAddRow}
                    editingTempId={editingTempId}
                />
                <SalesRowsTable
                    salesRows={salesRows} editingTempId={editingTempId}
                    handleEditRow={handleEditRow} handleDeleteRow={handleDeleteRow}
                />
                <ReceptionFooter
                    summary={summary} handleReset={handleReset}
                    handlePrintStatement={handlePrintStatement} handleSaveAll={handleSaveAll}
                    isProcessing={isProcessing} customer={customer} salesRows={salesRows}
                />
            </div>

            <CustomerSelectionModal
                isOpen={showSelectionModal} onClose={() => setShowSelectionModal(false)}
                searchResults={searchResults} selectCustomer={selectCustomer}
                setQuickRegisterName={setQuickRegisterName} setShowRegisterModal={setShowRegisterModal}
                custSearchRef={custSearchRef}
            />

            <QuickRegisterModal
                isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)}
                quickRegisterName={quickRegisterName} fileInputRef={fileInputRef}
                handleQuickRegister={handleQuickRegister} handleAddressSearch={handleAddressSearch}
            />

            <AddressLayer isOpen={showAddrLayer} onClose={() => setShowAddrLayer(false)} />
        </div>
    );
};

export default SalesReception;
