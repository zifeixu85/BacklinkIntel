import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, CheckCircle, AlertCircle, Loader2, Table as TableIcon } from 'lucide-react';
import { parseAhrefsCSV, parseFileName, ParseResult } from '../utils/csv-parser';
import { db } from '../db/db';
import { Snapshot, BacklinkRow } from '../types';
import Modal from './Modal';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [progress, setProgress] = useState({ stage: '', percent: 0 });
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<ParseResult | null>(null);
    const [siteName, setSiteName] = useState('');
    const [canonicalHost, setCanonicalHost] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    // Reset state when modal closes or opens fresh
    React.useEffect(() => {
        if (!isOpen) {
            // Optional: reset state after a delay or immediately
            // setFile(null);
            // setPreview(null);
            // setError(null);
        }
    }, [isOpen]);

    const processFile = async (selectedFile: File) => {
        setFile(selectedFile);
        setParsing(true);
        setProgress({ stage: '正在解析 CSV...', percent: 20 });
        setError(null);
        try {
            const result = await parseAhrefsCSV(selectedFile);
            setPreview(result);
            const { host } = parseFileName(selectedFile.name);
            setSiteName(host);
            setCanonicalHost(host);
            setProgress({ stage: '解析完成', percent: 100 });
        } catch (err: any) {
            setError(`解析失败: ${err.message || '未知错误'}`);
        } finally {
            setParsing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
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
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.name.endsWith('.csv')) {
            processFile(droppedFile);
        } else {
            setError('请上传有效的 CSV 文件');
        }
    }, []);

    const handleConfirm = async () => {
        if (!preview || !file) return;
        try {
            setParsing(true);
            setProgress({ stage: '初始化数据库项目...', percent: 10 });
            let site = await db.sites.where('canonicalHost').equalsIgnoreCase(canonicalHost).first();
            if (!site) {
                site = {
                    id: crypto.randomUUID(),
                    name: siteName,
                    canonicalHost: canonicalHost.toLowerCase(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                await db.sites.add(site);
            }
            const snapshot: Snapshot = {
                id: crypto.randomUUID(),
                siteId: site.id,
                sourceFileName: file.name,
                importedAt: Date.now(),
                dataCutoffAt: Date.now(),
                rowCount: preview.rows.length,
                metrics: preview.metrics
            };
            await db.snapshots.add(snapshot);
            const siteId = site.id;
            const rows = preview.rows.map(r => ({
                ...r,
                id: crypto.randomUUID(),
                snapshotId: snapshot.id,
                siteId: siteId
            })) as BacklinkRow[];
            const chunkSize = 2000;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                await db.backlinks.bulkAdd(chunk);
                const currentProgress = 10 + Math.floor((i / rows.length) * 60);
                setProgress({
                    stage: `写入数据行 (${i + chunk.length} / ${rows.length})...`,
                    percent: currentProgress
                });
            }
            setProgress({ stage: '同步资源库...', percent: 80 });
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
            setProgress({ stage: '分析完成', percent: 100 });
            onClose();
            navigate(`/intel/${site.id}`);
        } catch (err: any) {
            setError(`导入失败: ${err.message}`);
        } finally {
            setParsing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="导入 Ahrefs 背向链接">
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                    {/* Header info moved to Modal title, simplified here if needed or removed */}
                    <p className="text-slate-500 font-bold text-sm">请确保导出文件为 UTF-8 CSV 格式。</p>
                    {parsing && (
                        <div className="text-right flex-1 ml-4">
                            <div className="text-[10px] font-black uppercase text-indigo-600 mb-1">{progress.stage}</div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {!preview ? (
                    <div
                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] py-16 transition-all group relative
              ${isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-200 bg-slate-50/30 hover:bg-indigo-50/30 hover:border-indigo-300'}
            `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input type="file" id="file-upload" className="hidden" accept=".csv" onChange={handleFileChange} />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full z-10">
                            <div className={`w-16 h-16 shadow-xl rounded-3xl flex items-center justify-center mb-4 transition-transform ${isDragOver ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-indigo-600 group-hover:scale-110'}`}>
                                <FileUp className="w-8 h-8" />
                            </div>
                            <span className={`text-base font-black transition-colors ${isDragOver ? 'text-indigo-700' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                                {isDragOver ? '释放文件以导入' : '点击或拖拽 Ahrefs CSV 文件'}
                            </span>
                        </label>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">项目别名</label>
                                <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-900 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">标准域名</label>
                                <input type="text" value={canonicalHost} onChange={(e) => setCanonicalHost(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-900 font-bold" />
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-[1.5rem] p-6 overflow-hidden shadow-xl">
                            <h4 className="text-xs font-black text-slate-500 uppercase mb-4 flex items-center">
                                <TableIcon className="w-4 h-4 mr-2" /> 导入预览 (Top 5 Rows)
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] text-left">
                                    <thead className="text-slate-500 border-b border-slate-800">
                                        <tr>
                                            <th className="py-3 font-black uppercase">域名</th>
                                            <th className="py-3 font-black uppercase">DR</th>
                                            <th className="py-3 font-black uppercase">发现日期</th>
                                            <th className="py-3 font-black uppercase">类型</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {preview.rows.slice(0, 5).map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="py-3 font-bold text-white max-w-[150px] truncate" title={row.refDomain}>{row.refDomain}</td>
                                                <td className="py-3 font-black text-indigo-400">{row.dr}</td>
                                                <td className="py-3 text-slate-400">{row.firstSeen ? new Date(row.firstSeen).toLocaleDateString() : '-'}</td>
                                                <td className="py-3 uppercase">{row.nofollow ? 'Nofollow' : 'Dofollow'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100">
                            <button onClick={() => setPreview(null)} className="px-6 py-3 text-sm font-black text-slate-400 hover:text-slate-900">重新选择</button>
                            <button onClick={handleConfirm} disabled={parsing} className="px-8 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center">
                                {parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                开始导入
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
