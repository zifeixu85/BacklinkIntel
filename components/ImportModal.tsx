import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, CheckCircle, AlertCircle, Loader2, Table as TableIcon, X } from 'lucide-react';
import { parseAhrefsCSV, parseXLSX, parseFileName, ParseResult } from '../utils/csv-parser';
import { db } from '../db/db';
import { Snapshot, BacklinkRow } from '../types';
import Modal from './Modal';

const MAX_FILES = 5;

const VALID_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

const isValidFile = (name: string) =>
    VALID_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

interface FileEntry {
    file: File;
    result: ParseResult;
    siteName: string;
    canonicalHost: string;
}

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
    const navigate = useNavigate();
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [parsing, setParsing] = useState(false);
    const [progress, setProgress] = useState({ stage: '', percent: 0 });
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Reset state every time the modal opens
    React.useEffect(() => {
        if (isOpen) {
            setEntries([]);
            setParsing(false);
            setProgress({ stage: '', percent: 0 });
            setError(null);
            setIsDragOver(false);
        }
    }, [isOpen]);

    const processFiles = async (files: File[]) => {
        const valid = files.filter(f => isValidFile(f.name));
        if (valid.length === 0) {
            setError('请上传有效的 CSV 或 Excel (.xlsx/.xls) 文件');
            return;
        }
        if (valid.length > MAX_FILES) {
            setError(`单次最多上传 ${MAX_FILES} 个文件，当前选择了 ${valid.length} 个`);
            return;
        }

        setParsing(true);
        setError(null);
        const parsed: FileEntry[] = [];

        for (let i = 0; i < valid.length; i++) {
            const f = valid[i];
            setProgress({
                stage: `正在解析 (${i + 1}/${valid.length}): ${f.name}`,
                percent: Math.round(((i) / valid.length) * 80) + 10
            });
            try {
                const ext = f.name.split('.').pop()?.toLowerCase();
                const result = (ext === 'xlsx' || ext === 'xls')
                    ? await parseXLSX(f)
                    : await parseAhrefsCSV(f);
                const { host } = parseFileName(f.name);
                parsed.push({ file: f, result, siteName: host, canonicalHost: host });
            } catch (err: any) {
                setError(`解析 ${f.name} 失败: ${err.message || '未知错误'}`);
                setParsing(false);
                return;
            }
        }

        setEntries(parsed);
        setProgress({ stage: '解析完成', percent: 100 });
        setParsing(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (selected && selected.length > 0) processFiles(Array.from(selected));
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const dropped = Array.from(e.dataTransfer.files);
        if (dropped.length > 0) {
            processFiles(dropped);
        }
    }, []);

    const removeEntry = (index: number) => {
        setEntries(prev => prev.filter((_, i) => i !== index));
    };

    const updateEntry = (index: number, field: 'siteName' | 'canonicalHost', value: string) => {
        setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    };

    const handleConfirm = async () => {
        if (entries.length === 0) return;
        let lastSiteId = '';
        try {
            setParsing(true);
            for (let ei = 0; ei < entries.length; ei++) {
                const entry = entries[ei];
                const fileLabel = `(${ei + 1}/${entries.length}) ${entry.file.name}`;

                setProgress({ stage: `${fileLabel}: 初始化项目...`, percent: Math.round((ei / entries.length) * 100) });

                let site = await db.sites.where('canonicalHost').equalsIgnoreCase(entry.canonicalHost).first();
                if (!site) {
                    site = {
                        id: crypto.randomUUID(),
                        name: entry.siteName,
                        canonicalHost: entry.canonicalHost.toLowerCase(),
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };
                    await db.sites.add(site);
                }
                lastSiteId = site.id;

                const snapshot: Snapshot = {
                    id: crypto.randomUUID(),
                    siteId: site.id,
                    sourceFileName: entry.file.name,
                    importedAt: Date.now(),
                    dataCutoffAt: Date.now(),
                    rowCount: entry.result.rows.length,
                    metrics: entry.result.metrics
                };
                await db.snapshots.add(snapshot);

                const rows = entry.result.rows.map(r => ({
                    ...r,
                    id: crypto.randomUUID(),
                    snapshotId: snapshot.id,
                    siteId: site!.id
                })) as BacklinkRow[];

                const chunkSize = 2000;
                for (let i = 0; i < rows.length; i += chunkSize) {
                    const chunk = rows.slice(i, i + chunkSize);
                    await db.backlinks.bulkAdd(chunk);
                    const fileBase = Math.round((ei / entries.length) * 100);
                    const fileSlice = Math.round((1 / entries.length) * 100);
                    const rowPercent = Math.round((i / rows.length) * fileSlice * 0.7);
                    setProgress({
                        stage: `${fileLabel}: 写入数据行 (${i + chunk.length}/${rows.length})...`,
                        percent: fileBase + rowPercent
                    });
                }

                setProgress({ stage: `${fileLabel}: 同步资源库...`, percent: Math.round(((ei + 0.9) / entries.length) * 100) });
                const uniqueDomains = Array.from(new Set(rows.map(r => r.refDomain)));
                for (const domain of uniqueDomains) {
                    const existing = await db.library.where('domain').equals(domain).first();
                    if (!existing) {
                        await db.library.add({
                            id: crypto.randomUUID(),
                            domain: domain,
                            typeTags: [],
                            pricingType: 'unknown',
                            priceAmount: null,
                            currency: 'USD',
                            submissionUrl: null,
                            contact: null,
                            status: 'not_tried',
                            notes: `自动从快照 ${snapshot.sourceFileName} 导入`,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                    }
                }
            }

            setProgress({ stage: '全部导入完成', percent: 100 });
            onClose();
            if (lastSiteId) navigate(`/intel/${lastSiteId}`);
        } catch (err: any) {
            setError(`导入失败: ${err.message}`);
        } finally {
            setParsing(false);
        }
    };

    const hasPreview = entries.length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="导入外链数据">
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-500 font-bold text-sm">支持 Ahrefs / SEMrush 导出的 CSV 和 Excel 文件，最多同时上传 {MAX_FILES} 个</p>
                    {parsing && (
                        <div className="text-right flex-1 ml-4">
                            <div className="text-[10px] font-black uppercase text-indigo-600 mb-1">{progress.stage}</div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {!hasPreview ? (
                    <div
                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] py-16 transition-all group relative
              ${isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-200 bg-slate-50/30 hover:bg-indigo-50/30 hover:border-indigo-300'}
            `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input type="file" id="file-upload" className="hidden" accept=".csv,.xlsx,.xls" multiple onChange={handleFileChange} />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full z-10">
                            <div className={`w-16 h-16 shadow-xl rounded-3xl flex items-center justify-center mb-4 transition-transform ${isDragOver ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-indigo-600 group-hover:scale-110'}`}>
                                <FileUp className="w-8 h-8" />
                            </div>
                            <span className={`text-base font-black transition-colors ${isDragOver ? 'text-indigo-700' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                                {isDragOver ? '释放文件以导入' : '点击或拖拽文件到此处'}
                            </span>
                            <span className="text-xs text-slate-400 mt-2">支持 .csv / .xlsx / .xls 格式</span>
                        </label>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {entries.map((entry, idx) => (
                            <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 min-w-0">
                                        <FileUp className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                        <span className="text-sm font-bold text-slate-700 truncate">{entry.file.name}</span>
                                        <span className="text-xs text-slate-400 flex-shrink-0">{entry.result.rows.length} 条外链</span>
                                    </div>
                                    <button onClick={() => removeEntry(idx)} className="text-slate-300 hover:text-red-500 p-1">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">项目别名</label>
                                        <input type="text" value={entry.siteName} onChange={(e) => updateEntry(idx, 'siteName', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-900 font-bold text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">标准域名</label>
                                        <input type="text" value={entry.canonicalHost} onChange={(e) => updateEntry(idx, 'canonicalHost', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-900 font-bold text-sm" />
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-xl p-4 overflow-hidden">
                                    <h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center">
                                        <TableIcon className="w-3 h-3 mr-1.5" /> 预览 (Top 5)
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-[10px] text-left">
                                            <thead className="text-slate-500 border-b border-slate-800">
                                                <tr>
                                                    <th className="py-2 font-black uppercase">域名</th>
                                                    <th className="py-2 font-black uppercase">DR</th>
                                                    <th className="py-2 font-black uppercase">发现日期</th>
                                                    <th className="py-2 font-black uppercase">类型</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {entry.result.rows.slice(0, 5).map((row, ridx) => (
                                                    <tr key={ridx}>
                                                        <td className="py-2 font-bold text-white max-w-[150px] truncate" title={row.refDomain}>{row.refDomain}</td>
                                                        <td className="py-2 font-black text-indigo-400">{row.dr}</td>
                                                        <td className="py-2 text-slate-400">{row.firstSeen ? new Date(row.firstSeen).toLocaleDateString() : '-'}</td>
                                                        <td className="py-2 uppercase">{row.nofollow ? 'Nofollow' : 'Dofollow'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100">
                            <button onClick={() => setEntries([])} className="px-6 py-3 text-sm font-black text-slate-400 hover:text-slate-900">重新选择</button>
                            <button onClick={handleConfirm} disabled={parsing || entries.length === 0} className="px-8 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center">
                                {parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                开始导入 {entries.length > 1 ? `(${entries.length} 个文件)` : ''}
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-start border border-red-100 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-black uppercase text-[10px] tracking-widest">错误</p>
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
