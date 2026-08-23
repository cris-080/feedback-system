import { useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function Requests({ requests }) {
    const { flash } = usePage().props;

    // SweetAlert Toast for successful updates
    useEffect(() => {
        if (flash?.success) {
            Swal.fire({
                title: 'Success!',
                text: flash.success,
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
            });
        }
    }, [flash]);

    // Handle Status Updates
    const handleStatusUpdate = (requestId, newStatus, actionText) => {
        const isApprove = newStatus === 'Approved';
        
        Swal.fire({
            title: `${actionText} Request?`,
            text: `Are you sure you want to mark this request as ${newStatus}?`,
            icon: isApprove ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: isApprove ? '#009639' : '#dc2626', // CLSU Green or Danger Red
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Yes, ${actionText}`
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('superadmin.requests.update', requestId), {
                    status: newStatus
                });
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="Admin Requests">
            <Head title="Admin Requests" />
            
            <div className="space-y-6">
                
                {/* Header Section */}
                <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-[#1E6031]">Pending Actions</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Review and manage system requests submitted by the Feedback Committee and Admins.
                        </p>
                    </div>
                </div>

                {/* Requests Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            <i className="fa-solid fa-inbox text-3xl mb-3 block text-gray-300"></i>
                                            No requests found. You're all caught up!
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map(req => (
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
                                                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                                                    req.status === 'Pending' ? 'bg-[#FFD700]/20 text-[#E0A70D] border border-[#FFD700]/50' : 
                                                    req.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {req.status}
                                                </span>
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
                                                    <span className="text-xs text-gray-400 font-semibold italic">Resolved</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}