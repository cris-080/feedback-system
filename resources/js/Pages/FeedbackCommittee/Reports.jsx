import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import Pagination from '@/Components/Pagination';
import SearchFilter from '@/Components/SearchFilter';

export default function CommitteeReports() {
    const { reports, departments, filters } = usePage().props;
    
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

    // --- ACTION DROPDOWN STATE ---
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

    // --- FORM STATE ---
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedPreset, setSelectedPreset] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        report_name: '',
        department_id: '', // Empty means Global
        start_date: '',
        end_date: '',
        report_type: 'cc',
    });

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
        
        Swal.fire({
            title: 'Compiling Global Report...',
            html: 'Aggregating University-Wide metrics and generating final documents.<br><br><span class="text-sm font-bold text-[#009639]">This may take up to 30 seconds. Please do not close this window.</span>',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        post(route('feedback_committee.reports.generate'), {
            preserveScroll: true,
            onSuccess: () => {
                setData('report_name', '');
                setActiveTab('global');
                closeModal();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Report Generated!',
                    text: 'The Global University-Wide report is now available in your archive.',
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

    // --- REPOSITORY & TAB STATE ('submissions' | 'global') ---
    const [activeTab, setActiveTab] = useState(filters?.tab || 'submissions');
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [filterDept, setFilterDept] = useState(filters?.department_id || '');
    const [filterStatus, setFilterStatus] = useState(filters?.status || '');
    const [filterType, setFilterType] = useState(filters?.report_type || '');
    
    const isInitialRender = useRef(true);

    const handleTabChange = (newTab) => {
        if (newTab === activeTab) return;
        setActiveTab(newTab);
        setSearchQuery('');
        setFilterDept('');
        setFilterStatus('');
        setFilterType('');
        setActiveDropdown(null);
    };

    // Debounced search and filtering
    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const params = { tab: activeTab };
            if (searchQuery.trim()) params.search = searchQuery.trim();

            if (activeTab === 'submissions') {
                if (filterDept) params.department_id = filterDept;
                if (filterStatus) params.status = filterStatus;
            } else {
                if (filterType) params.report_type = filterType;
            }

            router.get(
                route('feedback_committee.reports.index'),
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [activeTab, searchQuery, filterDept, filterStatus, filterType]);

    const hasActiveFilters = activeTab === 'submissions'
        ? Boolean(filterDept || filterStatus)
        : Boolean(filterType);

    const handleMarkReviewed = (id, name) => {
        Swal.fire({
            title: 'Mark as Approved?',
            text: `This will officially approve the report "${name}" and finalize it in the system.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#009639',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Approve Report'
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('feedback_committee.reports.approve', id), {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Approved!', 'The report has been marked as Approved.', 'success');
                    }
                });
            }
        });
    };

    const handleReturn = (id, name) => {
        Swal.fire({
            title: 'Return to Sender?',
            text: `This will return "${name}" back to the Focal Person for revisions.`,
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'Reason for return',
            inputPlaceholder: 'Type your remarks here...',
            inputValidator: (value) => {
                if (!value) return 'You need to write something!';
            },
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Return Report'
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('feedback_committee.reports.return', id), { remarks: result.value }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Returned', 'The report has been sent back to the Focal Person.', 'success');
                    }
                });
            }
        });
    };

    const handleDeleteReport = (id, name) => {
        Swal.fire({
            title: 'Delete Overall Report?',
            text: `Are you sure you want to remove "${name}"? It will be safely moved to the SuperAdmin archives.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete Report'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('feedback_committee.reports.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'The report has been successfully archived.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                });
            }
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    return (
        <SuperAdminLayout headerTitle="Committee Report Repository">
            <Head title="Report Repository" />
            
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Main Repository Area */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    
                    {/* Repository Toolbar */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-gray-50 px-6 py-4 border-b border-gray-200 gap-4">
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-wrap md:flex-nowrap">
                            
                            {/* Combined Search & Filter Component */}
                            <SearchFilter 
                                searchValue={searchQuery}
                                onSearchChange={setSearchQuery}
                                searchPlaceholder={activeTab === 'submissions' ? "Search FP report or office..." : "Search overall report or period..."}
                                hasActiveFilters={hasActiveFilters}
                                onFilterReset={() => { setFilterDept(''); setFilterStatus(''); setFilterType(''); }}
                                filterTitle={activeTab === 'submissions' ? "Filter FP Submissions" : "Filter Overall Reports"}
                            >
                                {activeTab === 'submissions' ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">By Department</label>
                                            <select 
                                                className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white" 
                                                value={filterDept} 
                                                onChange={(e) => setFilterDept(e.target.value)}
                                            >
                                                <option value="">All Departments</option>
                                                {departments.map(d => (
                                                    <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">By Status</label>
                                            <select 
                                                className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white" 
                                                value={filterStatus} 
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="Submitted">Pending Review</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Returned">Returned</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">By Template Type</label>
                                        <select 
                                            className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white" 
                                            value={filterType} 
                                            onChange={(e) => setFilterType(e.target.value)}
                                        >
                                            <option value="">All Overall Templates</option>
                                            <option value="cc">With Citizen's Charter (CC)</option>
                                            <option value="non-cc">Internal Services (Non-CC)</option>
                                        </select>
                                    </div>
                                )}
                            </SearchFilter>

                            {/* Tab Switcher (FP Submissions vs FC Overall Reports) */}
                            <div className="bg-gray-200/80 rounded-lg p-1 flex space-x-1 w-full sm:w-auto border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('submissions')}
                                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'submissions'
                                            ? 'bg-[#009639] text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-300/60'
                                    }`}
                                >
                                    <i className="fa-solid fa-inbox"></i>
                                    <span>Received Reports</span>
                                    {activeTab === 'submissions' && (
                                        <span className="ml-1 bg-white/20 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                                            {reports?.total || 0}
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTabChange('global')}
                                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'global'
                                            ? 'bg-[#009639] text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-300/60'
                                    }`}
                                >
                                    <i className="fa-solid fa-globe"></i>
                                    <span>Overall Reports</span>
                                    {activeTab === 'global' && (
                                        <span className="ml-1 bg-white/20 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                                            {reports?.total || 0}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={openModal}
                            disabled={reports?.total === 0 && !hasActiveFilters}
                            title={reports?.total === 0 && !hasActiveFilters ? "No data available to compile" : "Compile Overall Report"}
                            className="bg-[#009639] hover:bg-[#1E6031] text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow-sm w-full xl:w-auto flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <i className="fa-solid fa-file-circle-plus"></i> Compile Overall Report
                        </button>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap divide-y divide-gray-200">
                            <thead className="bg-[#009639] text-white">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px]">Report Name & Period</th>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                                        {activeTab === 'submissions' ? 'Department' : 'Coverage Scope'}
                                    </th>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px] text-center">Template</th>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px] text-center">
                                        {activeTab === 'submissions' ? 'Status' : 'Total Raters'}
                                    </th>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {reports.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-14 text-center text-gray-500">
                                            <i className={`fa-solid ${activeTab === 'submissions' ? 'fa-inbox' : 'fa-globe'} text-3xl mb-2 text-gray-300 block`}></i>
                                            <p className="font-semibold text-sm text-gray-700">
                                                {activeTab === 'submissions' ? 'No departmental submissions found' : 'No overall university reports compiled yet'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {activeTab === 'submissions'
                                                    ? 'Reports submitted by Focal Persons will appear here for review.'
                                                    : 'Click "Compile Overall Report" to generate a monthly, quarterly, or yearly university-wide report.'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    reports.data.map(report => {
                                        const periodText = report.report_data?.metadata?.period || `${formatDate(report.start_date)} - ${formatDate(report.end_date)}`;
                                        const customTitle = report.report_name || report.report_data?.metadata?.report_name || `University-Wide Summary (${periodText})`;
                                        const respondentsCount = report.report_data?.metadata?.total_respondents ?? 0;

                                        return (
                                            <tr key={report.id} className="hover:bg-gray-50/80 transition group">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900">{customTitle}</p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                                                        <span><i className="fa-regular fa-calendar mr-1"></i>{periodText}</span>
                                                        <span>•</span>
                                                        <span>Compiled {formatDate(report.created_at)}</span>
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4">
                                                    {activeTab === 'submissions' ? (
                                                        <span className="font-semibold text-gray-700">
                                                            {report.department?.department_name || report.report_data?.metadata?.department || 'Unknown'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                                            <i className="fa-solid fa-building-columns text-[10px]"></i> University-Wide (All Offices)
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        report.report_type === 'cc'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {report.report_type === 'cc' ? "With CC" : 'Non-CC'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    {activeTab === 'submissions' ? (
                                                        <>
                                                            {report.status === 'Submitted' && <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-50 text-blue-700 border border-blue-200"><i className="fa-solid fa-clock"></i> Pending</span>}
                                                            {report.status === 'Approved' && <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><i className="fa-solid fa-check-double"></i> Approved</span>}
                                                            {report.status === 'Returned' && <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-rose-50 text-rose-700 border border-rose-200"><i className="fa-solid fa-rotate-left"></i> Returned</span>}
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                                                            <i className="fa-solid fa-users text-gray-400 text-[10px]"></i> {respondentsCount}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action Dropdown (Feedback Committee) */}
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
                                                                href={route('feedback_committee.reports.download.pdf', report.id)}
                                                                className="px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <i className="fa-solid fa-file-pdf text-red-500 w-4"></i> Download PDF
                                                            </a>
                                                            
                                                            {activeTab === 'submissions' && report.status === 'Submitted' && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setActiveDropdown(null);
                                                                            handleMarkReviewed(report.id, report.report_name);
                                                                        }}
                                                                        className="px-4 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                                    >
                                                                        <i className="fa-solid fa-check w-4 text-emerald-600"></i> Approve Report
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setActiveDropdown(null);
                                                                            handleReturn(report.id, report.report_name);
                                                                        }}
                                                                        className="px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                                    >
                                                                        <i className="fa-solid fa-rotate-left w-4 text-amber-600"></i> Return to Sender
                                                                    </button>
                                                                </>
                                                            )}
                                                            
                                                            {activeTab === 'global' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveDropdown(null);
                                                                        handleDeleteReport(report.id, customTitle);
                                                                    }}
                                                                    className="px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                                                                >
                                                                    <i className="fa-solid fa-trash-can w-4 text-rose-500"></i> Delete Report
                                                                </button>
                                                            )}
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
                    
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                         <Pagination dataObject={reports} />
                    </div>
                </div>

            </div>

            {/* --- MODAL: COMPILE GLOBAL REPORT --- */}
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
                                    <i className="fa-solid fa-globe"></i> Compile Global Report
                                </h2>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Generate University-Wide aggregate reports
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
                                placeholder="e.g., University Overall Q1 2026 Report"
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] text-sm"
                                value={data.report_name}
                                onChange={(e) => setData('report_name', e.target.value)}
                            />
                            {errors.report_name && <p className="text-xs text-red-500 mt-1">{errors.report_name}</p>}
                        </div>

                        {/* 2. Target Report Scope */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                2. Target Report Scope *
                            </label>
                            <select
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] text-sm"
                                value={data.report_type}
                                onChange={(e) => setData('report_type', e.target.value)}
                                required
                            >
                                <option value="cc">Global University-Wide Summary (With CC)</option>
                                <option value="non-cc">Global University-Wide Summary (Non-CC)</option>
                            </select>
                            {errors.report_type && <p className="text-xs text-red-500 mt-1">{errors.report_type}</p>}
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
                                    <><i className="fa-solid fa-globe"></i> Compile & Save Report</>
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