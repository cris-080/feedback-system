import { useEffect, useState, useRef } from 'react';
import { Head, usePage, router, Link } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import Pagination from '@/Components/Pagination';
import SearchFilter from '@/Components/SearchFilter';

export default function Requests({ requests }) {
    const { flash } = usePage().props;

    // --- SEARCH & FILTER STATE ---
    const queryParams = new URLSearchParams(window.location.search);
    const [searchQuery, setSearchQuery] = useState(queryParams.get('search') || '');
    const [statusFilter, setStatusFilter] = useState(queryParams.get('status') || '');
    const isInitialRender = useRef(true);
    const hasActiveFilters = Boolean(statusFilter);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (statusFilter) params.status = statusFilter;

            router.get(
                route('superadmin.requests.index'), // Make sure this matches your route name!
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, statusFilter]);
    const handleStatusUpdate = (requestId, newStatus, actionText) => {
        const isApprove = newStatus === 'Approved';
        
        if (isApprove) {
            Swal.fire({
                title: `${actionText} Request?`,
                text: `Are you sure you want to mark this request as ${newStatus}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#009639',
                cancelButtonColor: '#6b7280',
                confirmButtonText: `Yes, ${actionText}`
            }).then((result) => {
                if (result.isConfirmed) {
                    router.patch(route('superadmin.requests.update', requestId), {
                        status: newStatus
                    }, { preserveScroll: true });
                }
            });
        } else {
            Swal.fire({
                title: 'Reject Request',
                text: 'Please provide a reason for rejecting this request:',
                input: 'textarea',
                inputPlaceholder: 'Type your reason here...',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Submit Rejection',
                inputValidator: (value) => {
                    if (!value || value.trim() === '') {
                        return 'You must provide a reason for rejection!';
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    router.patch(route('superadmin.requests.update', requestId), {
                        status: newStatus,
                        remarks: result.value
                    }, { preserveScroll: true });
                }
            });
        }
    };

    const handleDelete = (requestId) => {
        Swal.fire({
            title: 'Clear Record?',
            text: 'This will permanently delete this resolved request from the history log.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-trash-can mr-1"></i> Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.requests.destroy', requestId), {
                    preserveScroll: true
                });
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="Admin Requests">
            <Head title="Admin Requests" />
            <div className="p-8 bg-gray-50 min-h-screen">
            <div className="space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                    <SearchFilter 
                        searchValue={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder="Search by name, detail, or type..."
                        hasActiveFilters={hasActiveFilters}
                        onFilterReset={() => setStatusFilter('')}
                        filterTitle="Filter Requests"
                    >
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">By Status</label>
                            <select 
                                className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:ring-[#009639] focus:border-[#009639] bg-gray-50 hover:bg-white transition-colors cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    </SearchFilter>
                </div>

                {/* Requests Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">System Requests</h3>
                        <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                            {requests.total || 0} Total
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap divide-y divide-gray-200">
                            <thead className="bg-[#009639] text-white">
                                <tr>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Requested By</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 font-semibold text-center uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {(!requests.data || requests.data.length === 0) ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            <i className="fa-solid fa-inbox text-3xl mb-3 block text-gray-300"></i>
                                            No requests found. You're all caught up!
                                        </td>
                                    </tr>
                                ) : (
                                    requests.data.map(req => (
                                        <tr key={req.request_id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(req.created_at).toLocaleDateString('en-US', { 
                                                    month: 'short', day: 'numeric', year: 'numeric' 
                                                })}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                {req.firstname} {req.lastname}
                                                <span className="block text-xs font-normal text-gray-500 capitalize">{req.role}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                                                    {req.request_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 whitespace-normal min-w-[300px]">
                                                {req.details}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-start">
                                                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                                                        req.status === 'Pending' ? 'bg-[#FFD700]/20 text-[#E0A70D] border border-[#FFD700]/50' : 
                                                        req.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                    {req.status === 'Rejected' && req.remarks && (
                                                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 whitespace-normal max-w-xs">
                                                            <strong>Reason:</strong> {req.remarks}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center space-x-2">
                                                {req.status === 'Pending' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(req.request_id, 'Approved', 'Approve')} 
                                                            className="w-8 h-8 bg-green-50 text-green-600 hover:bg-[#009639] hover:text-white rounded inline-flex justify-center items-center transition tooltip" 
                                                            title="Approve Request"
                                                        >
                                                            <i className="fa-solid fa-check"></i>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(req.request_id, 'Rejected', 'Reject')} 
                                                            className="w-8 h-8 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" 
                                                            title="Reject Request"
                                                        >
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleDelete(req.request_id)} 
                                                        className="w-8 h-8 bg-gray-100 text-gray-500 hover:bg-gray-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" 
                                                        title="Clear Resolved Record"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                   {/* Server-Side Pagination */}
                    <Pagination
                    dataObject={requests}
                    />
                </div>
            </div>
            </div>
        </SuperAdminLayout>
        
    );
}