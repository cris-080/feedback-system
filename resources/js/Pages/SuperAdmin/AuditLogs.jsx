import { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Pagination from '@/Components/Pagination';
import Swal from 'sweetalert2';

export default function AuditLogs({ logs, modules = [], filters = {} }) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || '');
    const [moduleFilter, setModuleFilter] = useState(filters.module || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [selectedLog, setSelectedLog] = useState(null);

    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (roleFilter) params.role = roleFilter;
            if (moduleFilter) params.module = moduleFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            router.get(
                route('superadmin.audit-logs.index'),
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 350);

        return () => clearTimeout(timeout);
    }, [searchQuery, roleFilter, moduleFilter, dateFrom, dateTo]);

    const resetFilters = () => {
        setSearchQuery('');
        setRoleFilter('');
        setModuleFilter('');
        setDateFrom('');
        setDateTo('');
    };

    const applyDatePreset = (preset) => {
        const now = new Date();
        const formatDate = (d) => d.toISOString().split('T')[0];

        if (preset === 'today') {
            const todayStr = formatDate(now);
            setDateFrom(todayStr);
            setDateTo(todayStr);
        } else if (preset === 'week') {
            const past = new Date();
            past.setDate(now.getDate() - 7);
            setDateFrom(formatDate(past));
            setDateTo(formatDate(now));
        } else if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            setDateFrom(formatDate(firstDay));
            setDateTo(formatDate(now));
        }
    };

    const handleClearLogs = () => {
        Swal.fire({
            title: 'Wipe All Audit Logs?',
            text: "This will permanently erase ALL system audit logs from the database. This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-triangle-exclamation"></i> Yes, Wipe Everything'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.audit-logs.clear'), {
                    preserveScroll: true,
                    preserveState: false, // Forces a full data refresh to clear the table UI
                });
            }
        });
    };

    const hasActiveFilters = Boolean(searchQuery || roleFilter || moduleFilter || dateFrom || dateTo);

    const getActionBadge = (action) => {
        const normalized = (action || '').toLowerCase();
        if (normalized.includes('create') || normalized.includes('publish')) {
            return {
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: 'fa-solid fa-plus-circle text-emerald-500'
            };
        }
        if (normalized.includes('delete') || normalized.includes('archive') || normalized.includes('suspend')) {
            return {
                bg: 'bg-rose-50 text-rose-700 border-rose-200',
                icon: 'fa-solid fa-triangle-exclamation text-rose-500'
            };
        }
        if (normalized.includes('update') || normalized.includes('restore') || normalized.includes('reset')) {
            return {
                bg: 'bg-blue-50 text-blue-700 border-blue-200',
                icon: 'fa-solid fa-pen-to-square text-blue-500'
            };
        }
        if (normalized.includes('log in') || normalized.includes('login')) {
            return {
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                icon: 'fa-solid fa-arrow-right-to-bracket text-emerald-600'
            };
        }
        if (normalized.includes('log out') || normalized.includes('logout')) {
            return {
                bg: 'bg-slate-100 text-slate-700 border-slate-300',
                icon: 'fa-solid fa-arrow-right-from-bracket text-slate-500'
            };
        }
        return {
            bg: 'bg-gray-100 text-gray-700 border-gray-200',
            icon: 'fa-solid fa-circle-info text-gray-400'
        };
    };

    const getModuleIcon = (moduleName) => {
        const mod = (moduleName || '').toLowerCase();
        if (mod.includes('account') || mod.includes('user')) return 'fa-solid fa-users-gear text-purple-600';
        if (mod.includes('form')) return 'fa-solid fa-file-waveform text-emerald-600';
        if (mod.includes('department') || mod.includes('office')) return 'fa-solid fa-building text-blue-600';
        if (mod.includes('auth')) return 'fa-solid fa-shield-halved text-amber-600';
        return 'fa-solid fa-cubes text-gray-500';
    };

    return (
        <SuperAdminLayout headerTitle="System Audit Logs">
            <Head title="Audit Logs" />

            <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    

                    <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200/90 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-5 relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-magnifying-glass text-xs"></i>
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by action, user, keyword, or IP..."
                                    className="w-full pl-9 pr-9 py-2 bg-gray-50/70 border border-gray-300/80 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                                />
                                {searchQuery && (
                                    <button 
                                        type="button" 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fa-solid fa-xmark text-xs"></i>
                                    </button>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="w-full py-2 px-3 bg-gray-50/70 border border-gray-300/80 rounded-xl text-xs text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                                >
                                    <option value="">All Roles</option>
                                    <option value="SuperAdmin">SuperAdmin</option>
                                    <option value="Feedback Committee">Feedback Committee</option>
                                    <option value="Focal Person">Focal Person</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <select
                                    value={moduleFilter}
                                    onChange={(e) => setModuleFilter(e.target.value)}
                                    className="w-full py-2 px-3 bg-gray-50/70 border border-gray-300/80 rounded-xl text-xs text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                                >
                                    <option value="">All Modules</option>
                                    {modules.map((mod) => (
                                        <option key={mod} value={mod}>{mod}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-3 flex items-center gap-1.5">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-1/2 py-2 px-2 bg-gray-50/70 border border-gray-300/80 rounded-xl text-xs text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                                />
                                <span className="text-gray-400 text-xs">-</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-1/2 py-2 px-2 bg-gray-50/70 border border-gray-300/80 rounded-xl text-xs text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span className="font-semibold text-gray-400 mr-1 text-[11px] uppercase tracking-wider">Presets:</span>
                                <button
                                    type="button"
                                    onClick={() => applyDatePreset('today')}
                                    className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyDatePreset('week')}
                                    className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                                >
                                    Past 7 Days
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyDatePreset('month')}
                                    className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                                >
                                    This Month
                                </button>

                                 <div className="flex items-center gap-2 self-start md:self-auto ml-auto">
                                    <div className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600">
                                        Total Logged Events: <span className="text-gray-900 font-bold ml-1">{logs.total || logs.data.length}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearLogs}
                                        className="px-3.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        <i className="fa-solid fa-trash-can"></i> Clear All Logs
                                    </button>
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                                >
                                    <i className="fa-solid fa-arrow-rotate-left text-[10px]"></i>
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden">
                        <div className="w-full">
                            <table className="w-full table-fixed divide-y divide-gray-200 text-xs sm:text-sm">
                                <thead className="bg-[#009639] text-white select-none">
                                    <tr>
                                       <th className="w-40 px-5 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Timestamp / IP</th>
                                        <th className="w-48 px-5 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">User Actor</th>
                                        <th className="w-40 px-5 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Module</th>
                                        <th className="w-44 px-5 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Action</th>
                                        <th className="px-5 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Activity Details</th>
                                        <th className="w-20 px-5 py-3.5 text-right font-semibold uppercase tracking-wider text-[11px]">Inspect</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {logs.data.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-16 text-center">
                                                <div className="w-14 h-14 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-100 text-2xl">
                                                    <i className="fa-solid fa-box-open"></i>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-700">No matching audit logs found</p>
                                                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                                                    Try loosening your search terms or expanding your date filters.
                                                </p>
                                                {hasActiveFilters && (
                                                    <button
                                                        type="button"
                                                        onClick={resetFilters}
                                                        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition"
                                                    >
                                                        Clear all active filters
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.data.map((log) => {
                                            const badge = getActionBadge(log.action);
                                            const userInitials = log.account
                                                ? `${(log.account.firstname || '').charAt(0)}${(log.account.lastname || '').charAt(0)}`.toUpperCase()
                                                : 'SY';

                                            return (
                                                <tr key={log.log_id} className="hover:bg-gray-50/80 transition-colors group">
                                                    <td className="px-5 py-3.5 text-gray-600">
                                                        <div className="font-semibold text-gray-800 truncate">
                                                            {new Date(log.created_at).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                                                            <span>
                                                                {new Date(log.created_at).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                            {log.ip_address && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="font-mono text-[10px] bg-gray-100 px-1 py-0.2 rounded text-gray-600 truncate">
                                                                        {log.ip_address}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-3.5">
                                                        {log.account ? (
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-8 h-8 rounded-lg bg-[#1E6031]/10 text-[#1E6031] font-bold text-xs flex items-center justify-center border border-[#1E6031]/20 shrink-0">
                                                                    {userInitials}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold text-gray-900 leading-tight truncate">
                                                                        {log.account.firstname} {log.account.lastname}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-[#009639] uppercase tracking-wider truncate">
                                                                        {log.account.role}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center border border-gray-200 shrink-0">
                                                                    <i className="fa-solid fa-server"></i>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold text-gray-700 leading-tight truncate">System Worker</div>
                                                                    <div className="text-[10px] text-gray-400 truncate">Automated Task</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 whitespace-nowrap">
                                                            <i className={`${getModuleIcon(log.module)} text-[11px] shrink-0`}></i>
                                                            <span>{log.module}</span>
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.bg} whitespace-nowrap`}>
                                                            <i className={`${badge.icon} text-[11px] shrink-0`}></i>
                                                            <span>{log.action}</span>
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-3.5">
                                                        <p className="text-gray-700 truncate font-normal leading-relaxed text-xs sm:text-[13px]" title={log.details}>
                                                            {log.details || '—'}
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-3.5 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLog(log)}
                                                            className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-gray-200 hover:border-emerald-200 transition"
                                                            title="Inspect complete log payload"
                                                        >
                                                            <i className="fa-solid fa-eye mr-1 text-[10px]"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                            <Pagination dataObject={logs} />
                        </div>
                    </div>
                </div>
            </div>

            {selectedLog && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden transform transition-all animate-fade-in">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-fingerprint text-emerald-600 text-base"></i>
                                <h3 className="font-bold text-gray-900 text-sm">Audit Payload Details</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 flex items-center justify-center transition"
                            >
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs sm:text-sm">
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Timestamp</span>
                                    <p className="font-semibold text-gray-800">
                                        {new Date(selectedLog.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Client IP Address</span>
                                    <p className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded inline-block">
                                        {selectedLog.ip_address || 'Not Recorded'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Actor Identity</span>
                                    <p className="font-semibold text-gray-900">
                                        {selectedLog.account
                                            ? `${selectedLog.account.firstname} ${selectedLog.account.lastname}`
                                            : 'System Automation'}
                                    </p>
                                    {selectedLog.account && (
                                        <p className="text-gray-500 text-xs">{selectedLog.account.email}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Assigned Role</span>
                                    <p className="font-bold text-[#009639]">
                                        {selectedLog.account?.role || 'SYSTEM'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Target Module</span>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-xs">
                                        {selectedLog.module}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Executed Action</span>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-xs">
                                        {selectedLog.action}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Action Remarks & Metadata</span>
                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 leading-relaxed font-mono text-xs break-words">
                                    {selectedLog.details || 'No additional parameters logged.'}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition"
                            >
                                Close Payload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}