import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import SearchFilter from '@/Components/SearchFilter';
import Pagination from '@/Components/Pagination';

export default function Reports() {
    const { reports, department, flash, filters } = usePage().props;
    
    // --- SEARCH STATE ---
    const [archiveSearch, setArchiveSearch] = useState(filters?.search || '');
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const delayDebounce = setTimeout(() => {
            const params = {};
            if (archiveSearch.trim()) params.search = archiveSearch.trim();
            
            router.get(
                route('focalperson.reports.index'),
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);
        
        return () => clearTimeout(delayDebounce);
    }, [archiveSearch]);
    
    // Check department classification for Citizen's Charter
    const isCC = department?.classification?.toLowerCase() === 'cc';

    // Helper to format ISO date string (YYYY-MM-DD)
    const toISODate = (date) => {
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
        return adjustedDate.toISOString().split('T')[0];
    };

    const today = new Date();
    const firstDay = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
    const lastDay = toISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    // Native JS Date Formatter (e.g., "Oct 12, 2026")
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // --- MODAL STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [animateModal, setAnimateModal] = useState(false);

    const openModal = () => {
        setIsModalOpen(true);
        setTimeout(() => setAnimateModal(true), 10);
    };

    const closeModal = () => {
        setAnimateModal(false);
        setTimeout(() => setIsModalOpen(false), 300);
    };

    // --- DROPDOWN STATE & CLICK LISTENER ---
    const [activeDropdown, setActiveDropdown] = useState(null);

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

    // Inertia form state for report generation
    const { data, setData, post, processing, errors, reset } = useForm({
        report_name: '',
        start_date: firstDay,
        end_date: lastDay,
        report_type: isCC ? 'cc' : 'non-cc',
    });;

    // Date Presets Handler
    const handlePresetSelect = (preset) => {
        const now = new Date();
        let start;
        let end;

        if (preset === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (preset === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (preset === 'quarter') {
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        } else if (preset === 'ytd') {
            start = new Date(now.getFullYear(), 0, 1);
            end = now;
        }

        if (start && end) {
            setData((prev) => ({
                ...prev,
                start_date: toISODate(start),
                end_date: toISODate(end),
            }));
        }
    };

   // Handle form submission to generate report
    const handleGenerate = (e) => {
        e.preventDefault();
        
        // Blocking Loader for LibreOffice Pre-Compile
        Swal.fire({
            title: 'Compiling Report Data...',
            html: 'Aggregating metrics and exporting official DOCX & PDF documents.<br><br><span class="text-sm font-bold text-[#009639]">This may take up to 30 seconds. Please do not close this window.</span>',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        post(route('focalperson.reports.generate'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('report_name');
                closeModal();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Report Generated!',
                    text: 'The report and its files are now instantly available for download in the archive.',
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
    // Handle submitting a draft to the committee
    const handleSubmitToCommittee = (id, name) => {
        Swal.fire({
            title: 'Submit Report to Committee?',
            text: `Are you sure you want to finalize and transmit "${name}"? Please ensure the date range is completely accurate before submitting. (If you make a mistake, you can recall this submission as long as the Feedback Committee hasn't started reviewing it).`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#009639',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-paper-plane mr-1.5"></i> Transmit Report'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('focalperson.reports.submit', id), {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Submitted!',
                            text: 'The departmental report has been forwarded to the Feedback Committee.',
                            timer: 2500,
                            showConfirmButton: false
                        });
                    }
                });
            }
        });
    };

    // Handle deleting a draft
    const handleDelete = (id, name) => {
        Swal.fire({
            title: 'Discard Draft Report?',
            text: `Permanently remove "${name}" from your records? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-trash-can mr-1.5"></i> Delete Draft'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('focalperson.reports.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Removed!',
                            text: 'Draft report was successfully deleted.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                });
            }
        });
    };

    const getStatusBadge = (status) => {
        if (status === 'Submitted') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <i className="fa-solid fa-paper-plane text-[10px]"></i> Submitted
                </span>
            );
        }
        if (status === 'Approved') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <i className="fa-solid fa-circle-check text-[10px]"></i> Approved
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <i className="fa-solid fa-file-pen text-[10px]"></i> Draft
            </span>
        );
    };

    return (
        <SuperAdminLayout headerTitle="Departmental Reports">
            <Head title="Department Reports" />
            
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* --- 1. Top Toolbar --- */}
                <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-[#1E6031]/10 text-[#1E6031] flex items-center justify-center font-bold">
                                    <i className="fa-solid fa-file-chart-column text-base"></i>
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                                        Departmental Reports Archive
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Manage your office's ARTA compliance and SQD reports.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 self-start md:self-auto">
                            {/* Department Info Badge */}
                            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700">
                                <i className="fa-solid fa-building text-[#009639]"></i>
                                <span>{department?.department_name || 'My Department'}</span>
                            </div>

                            <button
                                onClick={openModal}
                                className="bg-[#009639] hover:bg-[#1E6031] text-white px-5 py-2 rounded-xl text-sm font-semibold transition shadow-sm w-full md:w-auto flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-file-circle-plus"></i> Compile New Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- 2. Report History & Transmission Section --- */}
                <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden">
                    
                    {/* Archive Toolbar */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 mr-auto">
                            <i className="fa-solid fa-clock-rotate-left text-[#009639] text-sm"></i>
                            <h3 className="font-bold text-gray-900 text-sm">Generated Reports Archive</h3>
                            <span className="px-2.5 py-0.5 bg-green-100 border border-green-200 rounded-full text-[11px] font-bold text-[#1E6031]">
                                {reports?.total || reports?.data?.length || 0}
                            </span>
                        </div>
                        
                        <div className="w-full sm:w-auto flex-shrink-0">
                            <SearchFilter 
                                searchValue={archiveSearch}
                                onSearchChange={setArchiveSearch}
                                searchPlaceholder="Search report name or period..."
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                            <thead className="bg-[#009639] text-white">
                                <tr>
                                    <th className="px-6 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Report Name</th>
                                    <th className="px-6 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Coverage Period</th>
                                    <th className="px-6 py-3.5 text-center font-semibold uppercase tracking-wider text-[11px]">Respondents</th>
                                    <th className="px-6 py-3.5 text-center font-semibold uppercase tracking-wider text-[11px]">Status</th>
                                    <th className="px-6 py-3.5 text-right font-semibold uppercase tracking-wider text-[11px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {reports && reports.data.length > 0 ? (
                                    reports.data.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{report.report_name}</div>
                                                <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                                                    <i className="fa-regular fa-calendar-check text-[10px]"></i>
                                                    <span>Compiled on {formatDate(report.created_at)}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 font-mono">
                                                    {formatDate(report.start_date)} – {formatDate(report.end_date)}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 min-w-8">
                                                    {report.report_data?.metadata?.total_respondents || 0}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                {getStatusBadge(report.status)}
                                            </td>

                                            {/* Action Dropdown (Focal Person) */}
                                            <td className="px-6 py-4 text-right whitespace-nowrap relative action-dropdown-container">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDropdown(report.id)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition"
                                                >
                                                    <i className="fa-solid fa-ellipsis-vertical text-sm px-2"></i>
                                                </button>
                                                
                                                {activeDropdown === report.id && (
                                                    <div className="absolute right-8 top-10 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 flex flex-col">
                                                        <a
                                                            href={route('focalperson.reports.download.pdf', report.id)}
                                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                            <i className="fa-solid fa-file-pdf text-red-500 w-4"></i> Download PDF
                                                        </a>
                                                        
                                                        {report.status === 'Submitted' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveDropdown(null);
                                                                    router.post(route('focalperson.reports.recall', report.id), {}, { preserveScroll: true });
                                                                }}
                                                                className="px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                            >
                                                                <i className="fa-solid fa-rotate-left w-4"></i> Recall Submission
                                                            </button>
                                                        )}

                                                        {(report.status === 'Draft' || report.status === 'Returned') && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveDropdown(null);
                                                                        handleSubmitToCommittee(report.id, report.report_name);
                                                                    }}
                                                                    className="px-4 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                                >
                                                                    <i className="fa-solid fa-paper-plane w-4"></i> Submit to Committee
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveDropdown(null);
                                                                        handleDelete(report.id, report.report_name);
                                                                    }}
                                                                    className="px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                                >
                                                                    <i className="fa-solid fa-trash-can w-4"></i> Delete Draft
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center">
                                            <div className="w-14 h-14 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-100 text-2xl">
                                                <i className="fa-solid fa-folder-open"></i>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-800">No departmental reports generated yet</p>
                                            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                                                Configure a reporting period above to compile client feedback into an ARTA-compliant report.
                                            </p>
                                        </td>
                                    </tr>
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
                        className={`bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transition-all duration-300 ease-out flex flex-col max-h-[90vh] ${animateModal ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-[#1E6031] flex items-center gap-2">
                                    <i className="fa-solid fa-sliders"></i> Compile New Report
                                </h2>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Configure parameters for {department?.department_name || 'your department'}
                                </p>
                            </div>
                            <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition p-1">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleGenerate} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                
                                {/* Custom Report Title */}
                                <div className="md:col-span-12">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                        Custom Report Title <span className="text-gray-400 font-normal lowercase">(optional)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <i className="fa-solid fa-pen-nib text-xs"></i>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder={`e.g., Q1 Performance Review - ${department?.department_name || 'Department'}`}
                                            className={`w-full pl-9 pr-4 py-2.5 bg-gray-50/70 border rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] transition ${errors.report_name ? 'border-red-400 bg-red-50/30' : 'border-gray-300/80'}`}
                                            value={data.report_name}
                                            onChange={e => setData('report_name', e.target.value)}
                                        />
                                    </div>
                                    {errors.report_name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.report_name}</p>}
                                </div>

                                {/* Date Presets Toolbar */}
                                <div className="md:col-span-12 flex flex-wrap items-center gap-2 pt-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mr-1">
                                        Date Presets:
                                    </span>
                                    <button type="button" onClick={() => handlePresetSelect('this_month')} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">This Month</button>
                                    <button type="button" onClick={() => handlePresetSelect('last_month')} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Last Month</button>
                                    <button type="button" onClick={() => handlePresetSelect('quarter')} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">This Quarter</button>
                                    <button type="button" onClick={() => handlePresetSelect('ytd')} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Year to Date</button>
                                </div>

                                {/* Start Date */}
                                <div className="md:col-span-6">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                        Start Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <i className="fa-solid fa-calendar-day text-xs"></i>
                                        </div>
                                        <input 
                                            type="date" 
                                            className={`w-full pl-9 pr-4 py-2 bg-gray-50/70 border rounded-xl text-xs sm:text-sm text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] transition ${errors.start_date ? 'border-red-400 bg-red-50/30' : 'border-gray-300/80'}`}
                                            value={data.start_date}
                                            onChange={e => setData('start_date', e.target.value)}
                                            required
                                        />
                                    </div>
                                    {errors.start_date && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.start_date}</p>}
                                </div>

                                {/* End Date */}
                                <div className="md:col-span-6">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                        End Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <i className="fa-solid fa-calendar-check text-xs"></i>
                                        </div>
                                        <input 
                                            type="date" 
                                            className={`w-full pl-9 pr-4 py-2 bg-gray-50/70 border rounded-xl text-xs sm:text-sm text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] transition ${errors.end_date ? 'border-red-400 bg-red-50/30' : 'border-gray-300/80'}`}
                                            value={data.end_date}
                                            onChange={e => setData('end_date', e.target.value)}
                                            required
                                        />
                                    </div>
                                    {errors.end_date && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.end_date}</p>}
                                </div>

                                {/* Template Card Information */}
                                <div className="md:col-span-12">
                                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-start gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                                            <i className={`fa-solid ${isCC ? 'fa-shield-halved' : 'fa-building-circle-check'} text-sm`}></i>
                                        </div>
                                        <div className="text-xs">
                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                                <span>{isCC ? "Citizen's Charter (Frontline / External Services)" : "Internal Department Services Format"}</span>
                                                <span className="px-2 py-0.2 bg-emerald-200/60 text-emerald-800 rounded font-bold text-[10px] uppercase">
                                                    Active Template
                                                </span>
                                            </div>
                                            <p className="text-gray-600 mt-1 leading-relaxed">
                                                {isCC 
                                                    ? "Your office serves citizen-facing clients. Output includes CC awareness, CC visibility, and CC helpfulness alongside standardized SQD scores." 
                                                    : "Your office serves internal personnel. Output summarizes service response metrics and general SQD ratings, omitting external CC questions."}
                                            </p>
                                        </div>
                                    </div>
                                    <input type="hidden" name="report_type" value={data.report_type} />
                                </div>
                            </div>

                            {/* Submit Action */}
                            <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="bg-[#009639] hover:bg-[#1E6031] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {processing ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                                            <span>Compiling Departmental Data...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                                            <span>Generate Report</span>
                                        </>
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