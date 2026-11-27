import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import SearchFilter from '@/Components/SearchFilter';
import Pagination from '@/Components/Pagination';

export default function Reports({ departments = [], reports = { data: [] }, filters = {} }) {
    const { flash, auth } = usePage().props;
    const rawRole = auth?.user?.role?.toLowerCase()?.trim() || '';
    const routePrefix = (rawRole === 'feedback committee' || rawRole === 'feedbackcommittee') ? 'feedback_committee' : 'superadmin';

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedPreset, setSelectedPreset] = useState('');
    const [archiveSearch, setArchiveSearch] = useState(filters?.search || '');
    const [deptFilter, setDeptFilter] = useState(filters?.department || 'all');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [animateModal, setAnimateModal] = useState(false);
    const isInitialMount = useRef(true);

    const hasActiveFilters = Boolean(deptFilter && deptFilter !== 'all');

    const openModal = () => {
        setIsModalOpen(true);
        setTimeout(() => setAnimateModal(true), 10);
    };

    const closeModal = () => {
        setAnimateModal(false);
        setTimeout(() => setIsModalOpen(false), 300);
    };

   const { data, setData, post, processing, errors } = useForm({
        report_name: '',
        department_id: '', // Force user to manually select a target
        start_date: '',
        end_date: '',
        report_type: 'cc',
        export_format: 'docx',
    });

  // Auto-sync Template Type (CC vs Non-CC) when selecting a department
    const handleDepartmentChange = (e) => {
        const deptId = e.target.value;
        
        if (deptId === 'all_non_cc') {
            setData('department_id', 'all_non_cc');
            setData('report_type', 'non-cc');
            return;
        } else if (deptId === 'all_cc') {
            setData('department_id', 'all_cc');
            setData('report_type', 'cc');
            return;
        }

        const matchedDept = departments.find((d) => String(d.department_id) === String(deptId));
        const inferredType = matchedDept?.default_report_type || 'cc';

        setData((prev) => ({
            ...prev,
            department_id: deptId,
            report_type: inferredType,
        }));
    };

    const formatDateYMD = (year, monthIndex, day) => {
        const y = String(year);
        const m = String(monthIndex + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const applyPeriodPreset = (periodKey, yearVal) => {
        const yr = parseInt(yearVal, 10);
        setSelectedPreset(periodKey);
        if (!periodKey) return;

        const now = new Date();

        if (periodKey === 'THIS_MONTH') {
            const mIdx = now.getMonth();
            const yNow = now.getFullYear();
            const lastDay = new Date(yNow, mIdx + 1, 0).getDate();
            setSelectedYear(String(yNow));
            setData((prev) => ({
                ...prev,
                start_date: formatDateYMD(yNow, mIdx, 1),
                end_date: formatDateYMD(yNow, mIdx, lastDay),
            }));
        } else if (periodKey === 'LAST_MONTH') {
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const mIdx = lastMonthDate.getMonth();
            const yLast = lastMonthDate.getFullYear();
            const lastDay = new Date(yLast, mIdx + 1, 0).getDate();
            setSelectedYear(String(yLast));
            setData((prev) => ({
                ...prev,
                start_date: formatDateYMD(yLast, mIdx, 1),
                end_date: formatDateYMD(yLast, mIdx, lastDay),
            }));
        } else if (periodKey >= '01' && periodKey <= '12') {
            const mIdx = parseInt(periodKey, 10) - 1;
            const lastDay = new Date(yr, mIdx + 1, 0).getDate();
            setData((prev) => ({
                ...prev,
                start_date: formatDateYMD(yr, mIdx, 1),
                end_date: formatDateYMD(yr, mIdx, lastDay),
            }));
        } else if (periodKey === 'Q1') {
            setData((prev) => ({ ...prev, start_date: `${yr}-01-01`, end_date: `${yr}-03-31` }));
        } else if (periodKey === 'Q2') {
            setData((prev) => ({ ...prev, start_date: `${yr}-04-01`, end_date: `${yr}-06-30` }));
        } else if (periodKey === 'Q3') {
            setData((prev) => ({ ...prev, start_date: `${yr}-07-01`, end_date: `${yr}-09-30` }));
        } else if (periodKey === 'Q4') {
            setData((prev) => ({ ...prev, start_date: `${yr}-10-01`, end_date: `${yr}-12-31` }));
        } else if (periodKey === 'SEM1') {
            setData((prev) => ({ ...prev, start_date: `${yr}-08-01`, end_date: `${yr}-12-31` }));
        } else if (periodKey === 'SEM2') {
            setData((prev) => ({ ...prev, start_date: `${yr}-01-01`, end_date: `${yr}-05-31` }));
        } else if (periodKey === 'FULL') {
            setData((prev) => ({ ...prev, start_date: `${yr}-01-01`, end_date: `${yr}-12-31` }));
        }
    };

    const handleYearChange = (e) => {
        const yr = e.target.value;
        setSelectedYear(yr);
        if (selectedPreset && !['THIS_MONTH', 'LAST_MONTH'].includes(selectedPreset)) {
            applyPeriodPreset(selectedPreset, yr);
        }
    };

   const handleCompile = (e) => {
        e.preventDefault();
        
        // Show a blocking loading screen that cannot be closed
        Swal.fire({
            title: 'Compiling Report Data...',
            html: 'Aggregating metrics and exporting official documents.<br><br><span class="text-sm font-bold text-[#009639]">This may take up to 30 seconds. Please do not close this window.</span>',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        post(route(`${routePrefix}.reports.generate`), {
            preserveScroll: true,
            onSuccess: () => {
                setData('report_name', '');
                closeModal(); // Smoothly close the modal on success
                
                Swal.fire({
                    icon: 'success',
                    title: 'Report Generated!',
                    text: 'The report and its PDF files are now instantly available for download.',
                    timer: 3000,
                    showConfirmButton: false
                });
            },
            onError: (err) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Generation Failed',
                    text: err.error || 'Please check your inputs and try again.',
                    confirmButtonColor: '#009639'
                });
            }
        });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdown && !event.target.closest('.action-dropdown-container')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    const toggleDropdown = (id) => {
        setActiveDropdown(activeDropdown === id ? null : id);
    };


    // Status Badge Formatter for Overseer View
    const getStatusBadge = (status, deptId) => {
        // If it has no department, it's a University-Wide global report
        if (!deptId) {
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200"><i className="fa-solid fa-globe"></i> GLOBAL</span>;
        }
        
        if (status === 'Submitted') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> SUBMITTED</span>;
        if (status === 'Approved') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> APPROVED</span>;
        if (status === 'Returned') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> RETURNED</span>;
        
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> DRAFT</span>;
    };

   const handleApprove = (rep, title) => {
        Swal.fire({
            title: 'Mark as Approved?',
            text: `This will officially approve "${title}" and finalize it in the system.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#009639',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Approve Report',
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route(`${routePrefix}.reports.approve`, rep.id), {}, {
                    preserveScroll: true,
                });
            }
        });
    };

    const handleReturn = (rep, title) => {
        Swal.fire({
            title: 'Return to Sender?',
            text: `This will return "${title}" back to the Focal Person for revisions.`,
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'Reason for return',
            inputPlaceholder: 'Type your remarks here...',
            inputValidator: (value) => {
                if (!value || value.trim() === '') return 'Please provide a reason for returning this report.';
            },
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Return Report',
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route(`${routePrefix}.reports.return`, rep.id), { remarks: result.value }, {
                    preserveScroll: true,
                });
            }
        });
    };

    // Soft Delete confirmation
    const handleSoftDelete = (rep) => {
        const deptName = rep.report_data?.metadata?.department ?? rep.department?.department_name ?? 'All Departments';
        const periodText = rep.report_data?.metadata?.period ?? `${rep.start_date} to ${rep.end_date}`;
        const title = rep.report_data?.metadata?.report_name || `${deptName} (${periodText})`;

        Swal.fire({
            title: 'Archive this report?',
            text: `"${title}" will be archived.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Archive',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
               router.delete(route(`${routePrefix}.reports.destroy`, rep.id), {
                    preserveScroll: true,
                });
            }
        });
    };

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const delayDebounce = setTimeout(() => {
            const trimmed = archiveSearch.trim();
            const params = {};
            
            if (trimmed) params.search = trimmed;
            if (deptFilter !== 'all') params.department = deptFilter;

            router.get(
                route(`${routePrefix}.reports.index`),
                params,
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [archiveSearch, deptFilter]);

    const filteredArchive = reports?.data || [];

    return (
        <SuperAdminLayout headerTitle="ARTA Report Management">
            <Head title="Reports" />

            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center shadow-sm">
                        <i className="fa-solid fa-circle-check mr-2.5 text-[#009639]"></i>
                        <span>{flash.success}</span>
                    </div>
                )}

                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center shadow-sm">
                        <i className="fa-solid fa-circle-exclamation mr-2.5 text-red-600"></i>
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* ================= FULL WIDTH WORKSPACE: SAVED ARCHIVE ================= */}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                
               {/* Saved Archive Toolbar */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-gray-50 px-6 py-4 border-b border-gray-200 gap-4">
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-wrap md:flex-nowrap">
                        
                        <div className="flex items-center gap-2.5 mr-2">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                                <i className="fa-solid fa-clock-rotate-left text-[#009639]"></i> Archive
                            </h3>
                            <span className="bg-green-100 text-[#1E6031] px-2.5 py-0.5 rounded-full text-xs font-bold">
                                {reports?.total ?? filteredArchive.length}
                            </span>
                        </div>

                        {/* Combined Search & Filter Component */}
                        <SearchFilter 
                            searchValue={archiveSearch}
                            onSearchChange={setArchiveSearch}
                            searchPlaceholder="Search report name or period..."
                            hasActiveFilters={hasActiveFilters}
                            onFilterReset={() => setDeptFilter('all')}
                            filterTitle="Filter Reports"
                        >
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">By Scope / Department</label>
                                <select 
                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white" 
                                    value={deptFilter} 
                                    onChange={(e) => setDeptFilter(e.target.value)}
                                >
                                    <option value="all">All Reports</option>
                                    <option value="global">Global / University-Wide Only</option>
                                    <optgroup label="Specific Departments">
                                        {departments.map((d) => (
                                            <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        </SearchFilter>
                    </div>

                    <button
                        onClick={openModal}
                        className="bg-[#009639] hover:bg-[#1E6031] text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow-sm w-full xl:w-auto flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-file-circle-plus"></i> Compile New Report
                    </button>
                </div>

                        {/* Saved Archive Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm divide-y divide-gray-200">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                        <th className="px-5 py-3 font-bold uppercase text-[11px] tracking-wider">Report Name</th>
                                        <th className="px-5 py-3 font-bold uppercase text-[11px] tracking-wider">Department & Period</th>
                                        <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wider text-center">Template</th>
                                        <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wider text-center">Pipeline Status</th>
                                        <th className="px-5 py-3 font-bold uppercase text-[11px] tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filteredArchive.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400 text-lg">
                                                    <i className="fa-solid fa-folder-open"></i>
                                                </div>
                                                <p className="font-semibold text-gray-600 text-sm">No Saved Reports Found</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Use the Compile New Report panel on the left to generate a report.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredArchive.map((rep) => {
                                            const deptName = rep.report_data?.metadata?.department ?? rep.department?.department_name ?? 'All Departments';
                                            const periodText = rep.report_data?.metadata?.period ?? `${rep.start_date} to ${rep.end_date}`;
                                            const customTitle = rep.report_data?.metadata?.report_name || `${deptName} — ${periodText}`;
                                            const respondentsCount = rep.report_data?.metadata?.total_respondents ?? 0;

                                            return (
                                                <tr key={rep.id} className="hover:bg-gray-50/80 transition">
                                                    {/* Report Name & Meta */}
                                                    <td className="px-5 py-4">
                                                        <div className="font-bold text-gray-900 text-sm line-clamp-1">
                                                            {customTitle}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                                                            <span>#{rep.id}</span>
                                                            <span>•</span>
                                                            <span><i className="fa-solid fa-users mr-1"></i>{respondentsCount} raters</span>
                                                            <span>•</span>
                                                            <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </td>

                                                    {/* Department & Period */}
                                                    <td className="px-5 py-4">
                                                        <div className="text-xs font-semibold text-gray-800 line-clamp-1">
                                                            {deptName}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 mt-0.5">
                                                            {periodText}
                                                        </div>
                                                    </td>

                                                    {/* Template Badge */}
                                                    <td className="px-4 py-4 text-center whitespace-nowrap">
                                                        <span
                                                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                                rep.report_type === 'cc'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-gray-100 text-gray-700'
                                                            }`}
                                                        >
                                                            {rep.report_type === 'cc' ? 'With CC' : 'Non-CC'}
                                                        </span>
                                                    </td>

                                                    {/* Pipeline Status */}
                                                    <td className="px-4 py-4 text-center whitespace-nowrap">
                                                        {getStatusBadge(rep.status, rep.department_id)}
                                                    </td>

                                                    {/* Action Dropdown (Overseer strictly Views/Deletes) */}
                                                    <td className="px-5 py-4 text-right whitespace-nowrap relative action-dropdown-container">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleDropdown(rep.id)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition"
                                                        >
                                                            <i className="fa-solid fa-ellipsis-vertical text-sm px-2"></i>
                                                        </button>
                                                        
                                                        {activeDropdown === rep.id && (
                                                            <div className="absolute right-6 top-10 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 flex flex-col">
                                                                <a
                                                                   href={route(`${routePrefix}.reports.pdf`, rep.id)}
                                                                    className="px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <i className="fa-solid fa-file-pdf text-red-500 w-4"></i> Download as PDF
                                                                </a>
                                                                {rep.department_id && rep.status === 'Submitted' && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveDropdown(null);
                                                                                handleApprove(rep, customTitle);
                                                                            }}
                                                                            className="px-4 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                                        >
                                                                            <i className="fa-solid fa-check text-emerald-600 w-4"></i> Approve Report
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveDropdown(null);
                                                                                handleReturn(rep, customTitle);
                                                                            }}
                                                                            className="px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                                        >
                                                                            <i className="fa-solid fa-rotate-left text-amber-600 w-4"></i> Return to Sender
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveDropdown(null);
                                                                        handleSoftDelete(rep);
                                                                    }}
                                                                    className="px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                                >
                                                                    <i className="fa-solid fa-box-archive w-4"></i> Archive    
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Component-Based Pagination */}
                        <Pagination dataObject={reports} />
                    </div>
                </div>

            {/* --- MODAL: COMPILE NEW REPORT --- */}
            {isModalOpen && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-opacity duration-300 ease-out ${animateModal ? 'opacity-100' : 'opacity-0'}`}
                    onClick={closeModal}
                >
                    <div
                        className={`bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transition-all duration-300 ease-out flex flex-col max-h-[90vh] ${animateModal ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-[#1E6031] flex items-center gap-2">
                                    <i className="fa-solid fa-sliders"></i> Compile New Report
                                </h2>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Configure parameters and save to archive
                                </p>
                            </div>
                            <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition p-1">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleCompile} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            {/* 1. Custom Report Name */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                    1. Report Name <span className="text-[10px] font-normal text-gray-400 lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Q1 2026 Registrar ARTA Report"
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] text-sm"
                                    value={data.report_name}
                                    onChange={(e) => setData('report_name', e.target.value)}
                                />
                                {errors.report_name && <p className="text-xs text-red-500 mt-1">{errors.report_name}</p>}
                            </div>

                            {/* 2. Target Department */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                    2. Target College / Office / Division *
                                </label>
                                <select
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] text-sm"
                                    value={data.department_id}
                                    onChange={handleDepartmentChange}
                                    required
                                >
                                  <option value="" disabled>-- Select Target --</option>
                                    <option value="all_non_cc">University-Wide Summary (Non-CC)</option>
                                    <option value="all_cc">University-Wide Summary (With CC)</option>
                                    <optgroup label="Individual Departments">
                                        {departments.map((dept) => (
                                            <option key={dept.department_id} value={dept.department_id}>
                                                {dept.department_name} ({dept.default_report_type === 'non-cc' ? 'Non-CC' : 'CC'})
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                                {errors.department_id && <p className="text-xs text-red-500 mt-1">{errors.department_id}</p>}
                            </div>

                            {/* 3. Evaluation Period Selector */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                                    3. Evaluation Period *
                                </label>

                                {/* Quick 1-Click Period Pills */}
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { id: 'THIS_MONTH', label: 'This Month' },
                                        { id: 'LAST_MONTH', label: 'Last Month' },
                                        { id: 'FULL', label: 'Full Year' },
                                    ].map((pill) => (
                                        <button
                                            key={pill.id}
                                            type="button"
                                            onClick={() => applyPeriodPreset(pill.id, selectedYear)}
                                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition border ${
                                                selectedPreset === pill.id
                                                    ? 'bg-[#1E6031] text-white border-[#1E6031]'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {pill.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Month & Year Dropdowns */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <select
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#009639] focus:border-[#009639] text-xs"
                                            value={selectedPreset}
                                            onChange={(e) => applyPeriodPreset(e.target.value, selectedYear)}
                                        >
                                            <option value="">-- Select Month --</option>
                                            <option value="01">January</option>
                                            <option value="02">February</option>
                                            <option value="03">March</option>
                                            <option value="04">April</option>
                                            <option value="05">May</option>
                                            <option value="06">June</option>
                                            <option value="07">July</option>
                                            <option value="08">August</option>
                                            <option value="09">September</option>
                                            <option value="10">October</option>
                                            <option value="11">November</option>
                                            <option value="12">December</option>
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#009639] focus:border-[#009639] text-xs"
                                            value={selectedYear}
                                            onChange={handleYearChange}
                                        >
                                            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                                                <option key={yr} value={yr}>{yr}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Exact Start & End Date Inputs */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Date From *</label>
                                        <input
                                            type="date"
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#009639] focus:border-[#009639] text-xs"
                                            value={data.start_date}
                                            onChange={(e) => {
                                                setSelectedPreset('');
                                                setData('start_date', e.target.value);
                                            }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Date To *</label>
                                        <input
                                            type="date"
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#009639] focus:border-[#009639] text-xs"
                                            value={data.end_date}
                                            onChange={(e) => {
                                                setSelectedPreset('');
                                                setData('end_date', e.target.value);
                                            }}
                                            required
                                        />
                                    </div>
                                </div>
                                {(errors.start_date || errors.end_date) && (
                                    <p className="text-xs text-red-500">{errors.start_date || errors.end_date}</p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-[#009639] hover:bg-[#1E6031] text-white py-2.5 px-4 rounded-lg font-bold text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing ? (
                                        <><i className="fa-solid fa-spinner fa-spin"></i> Compiling Report...</>
                                    ) : (
                                        <><i className="fa-solid fa-plus"></i> Compile & Save Report</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}