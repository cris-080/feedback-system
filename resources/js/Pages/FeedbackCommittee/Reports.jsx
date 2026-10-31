import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import Pagination from '@/Components/Pagination';

export default function CommitteeReports() {
    const { reports, departments, filters } = usePage().props;
    
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [filterDept, setFilterDept] = useState(filters.department_id || '');
    const [filterStatus, setFilterStatus] = useState(filters.status || '');
    
    const isInitialRender = useRef(true);

    // Debounced search and filtering
    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (filterDept) params.department_id = filterDept;
            if (filterStatus) params.status = filterStatus;

            router.get(
                route('feedback_committee.reports.index'),
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 350);

        return () => clearTimeout(timeout);
    }, [searchQuery, filterDept, filterStatus]);

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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    return (
        <SuperAdminLayout headerTitle="Committee Report Repository">
            <Head title="Report Repository" />
            
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-[#FFD700]">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pending Reviews</p>
                        <p className="text-3xl font-black text-gray-900 mt-2">
                            {reports.data.filter(r => r.status === 'Submitted').length}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-[#009639]">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Approved</p>
                        <p className="text-3xl font-black text-gray-900 mt-2">
                            {reports.data.filter(r => r.status === 'Approved').length}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Received</p>
                        <p className="text-3xl font-black text-gray-900 mt-2">{reports.total}</p>
                    </div>
                </div>

                {/* Main Repository Area */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/90 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                <i className="fa-solid fa-inbox text-[#009639] mr-2"></i> Departmental Submissions
                            </h2>
                        </div>
                        
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="text"
                                placeholder="Search reports..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full md:w-48 py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs focus:ring-[#009639]/20 focus:border-[#009639] transition"
                            />
                            <select 
                                className="w-full md:w-48 py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs focus:ring-[#009639]/20 focus:border-[#009639] transition"
                                value={filterDept}
                                onChange={e => setFilterDept(e.target.value)}
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => (
                                    <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                                ))}
                            </select>
                            <select 
                                className="w-full md:w-40 py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs focus:ring-[#009639]/20 focus:border-[#009639] transition"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="Submitted">Pending Review</option>
                                <option value="Approved">Approved</option>
                                <option value="Returned">Returned</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs sm:text-sm whitespace-nowrap divide-y divide-gray-200">
                            <thead className="bg-[#009639] text-white">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px]">Report / Period</th>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px]">Department</th>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px]">Type</th>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px] text-center">Status</th>
                                    <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {reports.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <i className="fa-solid fa-inbox text-3xl mb-2 text-gray-300"></i>
                                            <p className="font-medium text-sm">No reports match your filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    reports.data.map(report => (
                                        <tr key={report.id} className="hover:bg-gray-50/80 transition group">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900">{report.report_name || 'Unnamed Report'}</p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {formatDate(report.start_date)} - {formatDate(report.end_date)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-700">{report.department?.department_name || 'Unknown'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 border border-gray-200 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                                    {report.report_type === 'cc' ? 'Citizen\'s Charter' : 'Internal'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {report.status === 'Submitted' && <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-50 text-blue-700 border border-blue-200"><i className="fa-solid fa-clock"></i> Pending</span>}
                                                {report.status === 'Approved' && <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><i className="fa-solid fa-check-double"></i> Approved</span>}
                                                {report.status === 'Returned' && <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-rose-50 text-rose-700 border border-rose-200"><i className="fa-solid fa-rotate-left"></i> Returned</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <a 
                                                    href={route('feedback_committee.reports.download.pdf', report.id)}
                                                    className="w-8 h-8 bg-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-600 border border-gray-200 hover:border-rose-200 rounded-lg inline-flex justify-center items-center transition" 
                                                    title="View PDF Document"
                                                >
                                                    <i className="fa-solid fa-file-pdf"></i>
                                                </a>
                                                
                                                {report.status === 'Submitted' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleReturn(report.id, report.report_name)} 
                                                            className="w-8 h-8 bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600 border border-gray-200 hover:border-amber-200 rounded-lg inline-flex justify-center items-center transition" 
                                                            title="Return to Focal Person"
                                                        >
                                                            <i className="fa-solid fa-rotate-left"></i>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMarkReviewed(report.id, report.report_name)} 
                                                            className="w-8 h-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg inline-flex justify-center items-center transition shadow-sm" 
                                                            title="Approve Report"
                                                        >
                                                            <i className="fa-solid fa-check"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                         <Pagination dataObject={reports} />
                    </div>
                </div>

            </div>
        </SuperAdminLayout>
    );
}