import { useEffect, useState, useRef } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
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
                route('superadmin.requests.index'), 
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
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Cleared!',
                            text: 'The request record has been successfully cleared.',
                            icon: 'success',
                            confirmButtonColor: '#009639',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                });
            }
        });
    };

    // Helper to color-code Request Types
    const getTypeBadge = (type) => {
        switch(type) {
            case 'System Access': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'New Feature Request': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Technical Support': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Add Service/Position': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <SuperAdminLayout headerTitle="SuperAdmin Inbox & Requests">
            <Head title="SuperAdmin Requests" />
            
            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="space-y-6 max-w-7xl mx-auto">
                    
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
                        <SearchFilter 
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder="Search by requester or details..."
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
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900"><i className="fa-solid fa-server mr-2 text-blue-600"></i> Technical & System Requests</h3>
                            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                                {requests.total || 0} Total
                            </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[#009639] text-white">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Date</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Requested By</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Request Category</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Details</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-center">Status</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(!requests.data || requests.data.length === 0) ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                                <i className="fa-solid fa-inbox text-4xl mb-3 block text-gray-300"></i>
                                                <p className="font-medium text-gray-500">No system requests found. You're all caught up!</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        requests.data.map(req => (
                                            <tr key={req.request_id} className="hover:bg-gray-50 transition align-top">
                                                <td className="px-6 py-5 text-gray-500 text-xs font-medium">
                                                    {new Date(req.created_at).toLocaleDateString('en-US', { 
                                                        month: 'short', day: 'numeric', year: 'numeric' 
                                                    })}
                                                </td>
                                                
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-gray-900">
                                                        {req.firstname} {req.lastname}
                                                    </div>
                                                    <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-0.5">
                                                        {req.role}
                                                    </div>
                                                </td>
                                                
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getTypeBadge(req.request_type)}`}>
                                                        {req.request_type}
                                                    </span>
                                                </td>
                                                
                                                <td className="px-6 py-5 whitespace-normal min-w-[300px]">
                                                    <p className="text-sm text-gray-700 leading-relaxed">{req.details}</p>
                                                </td>
                                                
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                                                            req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                                            req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                                            'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                            {req.status}
                                                        </span>
                                                        {req.status === 'Rejected' && req.remarks && (
                                                            <div className="mt-2 text-[11px] text-red-700 bg-red-50 p-2 rounded-md border border-red-100 whitespace-normal text-left max-w-[200px] shadow-sm">
                                                                <span className="font-bold block mb-0.5">Reason:</span> 
                                                                {req.remarks}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {req.status === 'Pending' ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleStatusUpdate(req.request_id, 'Approved', 'Approve')} 
                                                                    className="w-8 h-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg flex justify-center items-center transition tooltip border border-emerald-100 shadow-sm" 
                                                                    title="Approve Request"
                                                                >
                                                                    <i className="fa-solid fa-check"></i>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleStatusUpdate(req.request_id, 'Rejected', 'Reject')} 
                                                                    className="w-8 h-8 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg flex justify-center items-center transition tooltip border border-red-100 shadow-sm" 
                                                                    title="Reject Request"
                                                                >
                                                                    <i className="fa-solid fa-xmark"></i>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleDelete(req.request_id)} 
                                                                className="w-8 h-8 bg-gray-100 text-gray-500 hover:bg-red-500 hover:text-white rounded-lg flex justify-center items-center transition tooltip border border-gray-200 shadow-sm" 
                                                                title="Clear Resolved Record"
                                                            >
                                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination dataObject={requests} />
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}