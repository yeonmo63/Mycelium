import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModal } from '../../../contexts/ModalContext';
import {
    Plus, Search, Filter, History, Calendar, User,
    Thermometer, Droplets, Image as ImageIcon, CheckCircle,
    ChevronDown, ClipboardList, PenTool, FlaskConical,
    Droplet, Sprout, Wind, Trash2, Edit2, Boxes, Paperclip,
    FileText, X as CloseIcon, Camera
} from 'lucide-react';
import dayjs from 'dayjs';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

const ProductionLogs = () => {
    const [logs, setLogs] = useState([]);
    const [spaces, setSpaces] = useState([]);
    const [batches, setBatches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showAlert, showConfirm } = useModal();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState(null);

    const [formData, setFormData] = useState({
        log_id: 0,
        batch_id: null,
        space_id: null,
        log_date: dayjs().format('YYYY-MM-DD'),
        worker_name: '',
        work_type: 'plant',
        work_content: '',
        input_materials: null,
        env_data: { temp: '', humidity: '', co2: '' },
        photos: [] // Initialized as empty array for JSONB
    });

    const workTypes = [
        { id: 'plant', label: '식재/종균접종', icon: Sprout, color: 'emerald' },
        { id: 'water', label: '관수/영양제', icon: Droplet, color: 'blue' },
        { id: 'fertilize', label: '비료/시비', icon: FlaskConical, color: 'purple' },
        { id: 'pesticide', label: '방제/약제', icon: Wind, color: 'red' },
        { id: 'harvest', label: '수확/채취', icon: CheckCircle, color: 'teal' },
        { id: 'process', label: '가공/포장', icon: Boxes, color: 'indigo' },
        { id: 'clean', label: '청소/소독', icon: Droplets, color: 'indigo' },
        { id: 'inspect', label: '점검/예찰', icon: Search, color: 'amber' },
        { id: 'education', label: '교육/훈련', icon: ClipboardList, color: 'slate' },
    ];

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [logsData, spacesData, batchesData] = await Promise.all([
                invoke('get_farming_logs', {
                    batchId: null,
                    spaceId: null,
                    startDate: null,
                    endDate: null
                }),
                invoke('get_production_spaces'),
                invoke('get_production_batches')
            ]);
            setLogs(logsData);
            setSpaces(spacesData);
            setBatches(batchesData);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleOpenModal = (log = null) => {
        if (log) {
            setEditingLog(log);
            setFormData({
                ...log,
                env_data: log.env_data || { temp: '', humidity: '', co2: '' },
                photos: Array.isArray(log.photos) ? log.photos : []
            });
        } else {
            setEditingLog(null);
            setFormData({
                log_id: 0,
                batch_id: null,
                space_id: null,
                log_date: dayjs().format('YYYY-MM-DD'),
                worker_name: localStorage.getItem('last_worker') || '',
                work_type: 'plant',
                work_content: '',
                input_materials: null,
                env_data: { temp: '', humidity: '', co2: '' },
                photos: []
            });
        }
        setIsModalOpen(true);
    };

    const handleFileUpload = async (type = 'photo') => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
            });

            if (selected) {
                // In some Tauri versions, open might return an array even for multiple: false
                const filePath = Array.isArray(selected) ? selected[0] : selected;
                if (!filePath) return;

                const fileName = await invoke('upload_farming_photo', { filePath });
                const newPhotos = [...(formData.photos || [])];
                const labelIndex = newPhotos.length + 1;

                newPhotos.push({
                    id: Date.now(),
                    type, // 'photo' or 'receipt'
                    path: fileName,
                    label: `증${labelIndex})`,
                    displayPath: convertFileSrc(filePath)
                });

                setFormData({ ...formData, photos: newPhotos });
            }
        } catch (err) {
            console.error('File upload failed:', err);
            showAlert('오류', '이미지 처리 실패: ' + (err.message || typeof err === 'string' ? err : JSON.stringify(err)));
        }
    };

    const removeAttachment = (id) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter(p => p.id !== id)
        }));
    };

    const handleSave = async () => {
        if (!formData.work_content || !formData.worker_name) {
            showAlert('알림', '작업 내용과 작업자 이름을 입력해주세요.');
            return;
        }

        try {
            await invoke('save_farming_log', {
                log: {
                    ...formData,
                    batch_id: formData.batch_id ? parseInt(formData.batch_id) : null,
                    space_id: formData.space_id ? parseInt(formData.space_id) : null,
                }
            });
            localStorage.setItem('last_worker', formData.worker_name);
            setIsModalOpen(false);
            loadData();
            showAlert('성공', '영농일지가 저장되었습니다.');
        } catch (err) {
            showAlert('오류', `저장 실패: ${err}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-xl font-black text-slate-700">영농일지 (GAP/HACCP 연동)</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">현장 작업을 실시간으로 기록하여 인증 서류 자동 생성 기반을 마련합니다.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="h-12 px-6 bg-indigo-600 border-none rounded-2xl font-black text-sm text-white flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-[0.95] hover:bg-indigo-500"
                >
                    <Plus size={18} /> 일지 새로 쓰기
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" placeholder="작업 내용이나 작업자 검색..." className="w-full h-10 pl-12 pr-4 bg-white border-none rounded-xl text-sm font-bold shadow-sm ring-1 ring-slate-100 focus:ring-indigo-500/20 transition-all" />
                    </div>
                    <button className="h-10 px-4 bg-white rounded-xl border border-slate-100 text-slate-500 font-bold text-xs flex items-center gap-2 shadow-sm"><Filter size={14} /> 필터</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">날짜/작업형태</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">장소/배치</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">작업 내용</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">작업자</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">전실 환경</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.map(log => {
                                const workType = workTypes.find(t => t.id === log.work_type) || workTypes[0];
                                const space = spaces.find(s => s.space_id === log.space_id);
                                return (
                                    <tr key={log.log_id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-[10px] font-black text-slate-400 leading-none">{dayjs(log.log_date).format('MMM')}</span>
                                                    <span className="text-sm font-black text-slate-700 leading-none mt-0.5">{dayjs(log.log_date).format('DD')}</span>
                                                </div>
                                                <div className={`px-2 py-1 rounded bg-${workType.color}-50 text-${workType.color}-600 text-[10px] font-black uppercase`}>
                                                    {workType.label}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1">
                                                <p className="text-xs font-black text-slate-700">{space?.space_name || '-'}</p>
                                                {log.batch_id && <p className="text-[10px] text-indigo-500 font-bold">BATCH-{log.batch_id}</p>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed max-w-sm">
                                                {log.work_content}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500">{log.worker_name?.[0]}</div>
                                                {log.worker_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex gap-3 text-[10px] font-black text-slate-400">
                                                {log.env_data?.temp && <span className="flex items-center gap-1"><Thermometer size={12} /> {log.env_data.temp}°C</span>}
                                                {log.env_data?.humidity && <span className="flex items-center gap-1"><Droplets size={12} /> {log.env_data.humidity}%</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button onClick={() => handleOpenModal(log)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {logs.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <ClipboardList size={48} className="mx-auto text-slate-100 mb-3" />
                                        <p className="text-slate-400 font-bold">오늘 작성된 일지가 없습니다.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Log Entry Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"></div>
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800">{editingLog ? '영농일지 수정' : '영농일지 작성'}</h3>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">자동 저장 시스템</p>
                                <p className="text-xs font-bold text-teal-600">HACCP Compliance Active</p>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-2 gap-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="space-y-2 text-left">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">작업 날짜</label>
                                <input type="date" value={formData.log_date} onChange={e => setFormData({ ...formData, log_date: e.target.value })} className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl font-bold text-sm ring-1 ring-slate-100" />
                            </div>
                            <div className="space-y-2 text-left">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">작업자 이름</label>
                                <input type="text" value={formData.worker_name} onChange={e => setFormData({ ...formData, worker_name: e.target.value })} placeholder="실무자 성함" className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl font-bold text-sm ring-1 ring-slate-100" />
                            </div>

                            <div className="space-y-2 text-left col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">작업 유형 선택</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {workTypes.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setFormData({ ...formData, work_type: type.id })}
                                            className={`
                                                flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all
                                                ${formData.work_type === type.id
                                                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                                                    : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'}
                                            `}
                                        >
                                            <type.icon size={20} className="mb-2" />
                                            <span className="text-[10px] font-black">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">시설/필지</label>
                                <select
                                    value={formData.space_id || ''}
                                    onChange={e => setFormData({ ...formData, space_id: e.target.value || null })}
                                    className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl font-bold text-sm ring-1 ring-slate-100"
                                >
                                    <option value="">장소 선택 안함</option>
                                    {spaces.map(s => <option key={s.space_id} value={s.space_id}>{s.space_name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2 text-left">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">생산 배치 (선택사항)</label>
                                <select
                                    value={formData.batch_id || ''}
                                    onChange={e => setFormData({ ...formData, batch_id: e.target.value || null })}
                                    className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl font-bold text-sm ring-1 ring-slate-100"
                                >
                                    <option value="">배치 선택 안함</option>
                                    {batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.batch_code}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2 text-left col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">구체적 작업 내용</label>
                                <textarea
                                    value={formData.work_content}
                                    onChange={e => setFormData({ ...formData, work_content: e.target.value })}
                                    placeholder="어떤 작업을 하셨나요? (예: 관수 2시간 진행, 배지 500개 입고 등)"
                                    className="w-full h-32 p-5 bg-slate-50 border-none rounded-[2rem] font-bold text-sm ring-1 ring-slate-100 resize-none"
                                />
                            </div>

                            <div className="col-span-2 grid grid-cols-3 gap-4 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">온도 (°C)</label>
                                    <input type="number" step="0.1" value={formData.env_data.temp} onChange={e => setFormData({ ...formData, env_data: { ...formData.env_data, temp: e.target.value } })} className="w-full h-10 px-4 bg-white border-none rounded-xl text-sm font-black ring-1 ring-slate-100" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">습도 (%)</label>
                                    <input type="number" step="0.1" value={formData.env_data.humidity} onChange={e => setFormData({ ...formData, env_data: { ...formData.env_data, humidity: e.target.value } })} className="w-full h-10 px-4 bg-white border-none rounded-xl text-sm font-black ring-1 ring-slate-100" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">CO2 (ppm)</label>
                                    <input type="number" value={formData.env_data.co2} onChange={e => setFormData({ ...formData, env_data: { ...formData.env_data, co2: e.target.value } })} className="w-full h-10 px-4 bg-white border-none rounded-xl text-sm font-black ring-1 ring-slate-100" />
                                </div>
                            </div>

                            <div className="col-span-2 space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">증빙 자료 첨부 (사진/영수증)</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleFileUpload('photo')}
                                        className="flex-1 h-20 rounded-[1.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-1.5 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all"
                                    >
                                        <Camera size={20} />
                                        현장 사진 추가
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFileUpload('receipt')}
                                        className="flex-1 h-20 rounded-[1.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-1.5 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
                                    >
                                        <FileText size={20} />
                                        자재 영수증 추가
                                    </button>
                                </div>

                                {formData.photos?.length > 0 && (
                                    <div className="grid grid-cols-4 gap-3 mt-4">
                                        {formData.photos.map(p => (
                                            <div key={p.id} className="relative group aspect-square rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden shadow-sm">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    {p.displayPath ? (
                                                        <img
                                                            src={p.displayPath}
                                                            alt={p.label}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                // If asset URL fails (e.g. session expired or fresh load)
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : p.type === 'receipt' ? (
                                                        <FileText size={24} className="text-blue-300" />
                                                    ) : (
                                                        <ImageIcon size={24} className="text-emerald-300" />
                                                    )}
                                                </div>
                                                {/* Label tag */}
                                                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-[8px] font-black text-white">
                                                    {p.label}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(p.id)}
                                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <CloseIcon size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-2xl font-black text-sm text-slate-400 hover:text-slate-600">취소</button>
                            <button onClick={handleSave} className="flex-1 h-12 bg-indigo-600 rounded-2xl font-black text-sm text-white shadow-xl shadow-indigo-100 hover:bg-indigo-500">
                                {editingLog ? '일지 수정 완료' : '일지 저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionLogs;
