import { Head, useForm, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout'; 

export default function Requests({ requests }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        request_type: '',
        details: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'Submit Ticket?',
            text: 'Are you sure you want to dispatch this request to the SuperAdmin?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#009639',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-paper-plane mr-1"></i> Yes, Submit!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                post(route('feedback_committee.requests.store'), {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        Swal.fire({
                            title: 'Request Submitted!',
                            text: page.props.flash?.success || 'Your ticket has been successfully sent to the SuperAdmin.',
                            icon: 'success',
                            toast: true,
                            position: 'top-end',
                            timer: 3500,
                            timerProgressBar: true,
                            showConfirmButton: false,
                            iconColor: '#009639',
                            customClass: {
                                popup: 'border border-gray-200 shadow-xl'
                            }
                        });
                        reset(); 
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Validation Error',
                            text: 'Please check your inputs and ensure all required fields are filled properly.',
                            icon: 'error',
                            confirmButtonColor: '#dc2626'
                        });
                    }
                });
            }
        });
    };

    const handleCancel = (requestId) => {
        Swal.fire({
            title: 'Cancel Request?',
            text: 'Are you sure you want to cancel this pending request? This will remove it permanently.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-trash-can mr-1"></i> Yes, Cancel it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('feedback_committee.requests.destroy', requestId), {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        Swal.fire({
                            title: 'Cancelled!',
                            text: page.props.flash?.success || 'Your request has been cancelled.',
                            icon: 'success',
                            toast: true,
                            position: 'top-end',
                            timer: 3000,
                            showConfirmButton: false
                        });
                    }
                });
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="System Requests">
            <Head title="My Requests" />
            
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* --- 1. Submission Form --- */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-[#1E6031] mb-2">
                        <i className="fa-solid fa-headset mr-2"></i> Submit a New Request
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Need a new staff account, department reassignment, or system change? Submit a ticket to the SuperAdmin.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    className="w-full border-gray-300 rounded shadow-sm focus:ring focus:ring-green-200 text-sm"
                                    value={data.request_type}
                                    onChange={e => setData('request_type', e.target.value)}
                                    required
                                >
                                    <option value="" disabled>-- Select a category --</option>
                                    <option value="Account Creation">Account Creation</option>
                                    <option value="Department Reassignment">Department Reassignment</option>
                                    <option value="Form Modification">Form Modification</option>
                                    <option value="General Support">General Support</option>
                                </select>
                                {errors.request_type && <p className="text-red-500 text-xs mt-1">{errors.request_type}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Request Details <span className="text-red-500">*</span>
                                </label>
                                <textarea 
                                    className="w-full border-gray-300 rounded shadow-sm focus:ring focus:ring-green-200 h-24 text-sm"
                                    placeholder="Please provide exact details..."
                                    value={data.details}
                                    onChange={e => setData('details', e.target.value)}
                                    required
                                ></textarea>
                                {errors.details && <p className="text-red-500 text-xs mt-1">{errors.details}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button 
                                type="submit" 
                                disabled={processing}
                                className="bg-[#009639] hover:bg-[#1E6031] text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center shadow-sm"
                            >
                                {processing ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-paper-plane mr-2"></i> Submit Ticket
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- 2. Request History Table --- */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">My Request History</h3>
                        <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                            {requests.total || 0} Total
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap divide-y divide-gray-200">
                            <thead className="bg-[#1E6031] text-white">
                                <tr>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Date Submitted</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Category</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Details</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Status</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {(!requests.data || requests.data.length === 0) ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                            <i className="fa-solid fa-inbox text-3xl mb-2 block text-gray-300"></i>
                                            No requests submitted yet.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.data.map(req => (
                                        <tr key={req.request_id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-800">{req.request_type}</td>
                                            <td className="px-6 py-4 text-gray-600 whitespace-normal min-w-[250px]">{req.details}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-start">
                                                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                                                        req.status === 'Pending' ? 'bg-[#FFD700]/20 text-[#B8860B]' : 
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
                                            <td className="px-6 py-4 text-center">
                                                {req.status === 'Pending' ? (
                                                    <button 
                                                        onClick={() => handleCancel(req.request_id)} 
                                                        className="w-8 h-8 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" 
                                                        title="Cancel Request"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">N/A</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Server-Side Pagination */}
                    {requests.links && (
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between rounded-b-lg">
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-bold">{requests.from || 0}</span> to <span className="font-bold">{requests.to || 0}</span> of <span className="font-bold">{requests.total}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        {requests.links.map((link, index) => {
                                            let className = "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ";
                                            
                                            if (link.active) {
                                                // Using your green theme for the active state
                                                className += "z-10 bg-[#009639] border-[#009639] text-white";
                                            } else if (!link.url) {
                                                className += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
                                            } else {
                                                className += "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                                            }
                                            
                                            if (index === 0) className += " rounded-l-md";
                                            if (index === requests.links.length - 1) className += " rounded-r-md";

                                            return link.url ? (
                                                <Link
                                                    key={index}
                                                    href={link.url}
                                                    preserveScroll
                                                    preserveState
                                                    className={className}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ) : (
                                                <span
                                                    key={index}
                                                    className={className}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        })}
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </SuperAdminLayout>
    );
}