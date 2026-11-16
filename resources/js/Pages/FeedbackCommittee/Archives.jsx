import { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import SearchFilter from '@/Components/SearchFilter';
import Pagination from '@/Components/Pagination';

export default function Archives({ archivedReports, filters }) {
    const { flash } = usePage().props;

    const [activeTab, setActiveTab] = useState(filters?.tab || 'reports');
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const params = { tab: activeTab };
            if (searchQuery.trim()) params.search = searchQuery.trim();

            router.get(
                route('feedback_committee.archives.index'),
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, activeTab]);

    const reportList = archivedReports?.data || archivedReports || [];

    const handleRestoreReport = (reportId, reportName) => {
        Swal.fire({
            title: 'Restore Report?',
            text: `Are you sure you want to return "${reportName}" to your active dashboard?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-undo"></i> Yes, Restore!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('feedback_committee.archives.reports.restore', reportId), {}, { preserveScroll: true });
            }
        });
    };

    const handleDeleteReport = (reportId, reportName) => {
        Swal.fire({
            title: 'Permanently Delete Report?',
            text: `CRITICAL WARNING: "${reportName}" and its generated PDF/DOCX files will be permanently erased. This cannot be undone.`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-trash"></i> Yes, Delete!'
       }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('feedback_committee.archives.reports.force-delete', reportId), { preserveScroll: true });
            }
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    return (
        <SuperAdminLayout headerTitle="Global Archives">
            <Head title="System Archives" />
            
            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-gray-200 p-1 rounded-lg w-full max-w-sm">
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${
                                activeTab === 'reports' ? 'bg-white text-[#009639] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="fa-solid fa-file-pdf mr-2"></i> Archived Global Reports
                        </button>
                    </div>

                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                        <SearchFilter 
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder={`Search archived ${activeTab}...`}
                            hasActiveFilters={false}
                            onFilterReset={() => {}}
                            filterTitle="Filter Archives"
                        />
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            {activeTab === 'reports' && (
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-[#009639] text-white">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Report Name</th>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Department / Scope</th>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Template</th>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Date Archived</th>
                                            <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {reportList.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                    <i className="fa-solid fa-file-circle-xmark text-4xl mb-4 block text-gray-300"></i>
                                                    <p className="text-base font-semibold">No archived reports found</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            reportList.map((rep) => {
                                                const title = rep.report_name || rep.report_data?.metadata?.report_name || `Report #${rep.id}`;
                                                const scope = rep.department?.department_name || rep.report_data?.metadata?.department || 'University-Wide';
                                                return (
                                                    <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 font-semibold text-gray-800 line-clamp-1 max-w-[250px]" title={title}>{title}</td>
                                                        <td className="px-6 py-4 text-gray-600">{scope}</td>
                                                        <td className="px-6 py-4 text-gray-600 uppercase font-bold text-[10px]">{rep.report_type === 'cc' ? 'With CC' : 'Non-CC'}</td>
                                                        <td className="px-6 py-4 text-gray-500">{formatDate(rep.report_data?.metadata?.deleted_at || rep.updated_at)}</td>
                                                        <td className="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                                                            <button onClick={() => handleRestoreReport(rep.id, title)} className="w-8 h-8 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded transition tooltip" title="Restore"><i className="fa-solid fa-undo"></i></button>
                                                            <button onClick={() => handleDeleteReport(rep.id, title)} className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded transition tooltip" title="Force Delete (Removes PDF)"><i className="fa-solid fa-trash"></i></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <Pagination dataObject={archivedReports} />
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}