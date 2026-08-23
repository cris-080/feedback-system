import { useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
// Replace with your actual Admin layout if you have one (e.g., AdminLayout)
import SuperAdminLayout from '@/Layouts/SuperAdminLayout'; 

export default function Requests({ requests }) {
    const { flash } = usePage().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        request_type: '',
        details: ''
    });

    useEffect(() => {
        if (flash?.success) {
            Swal.fire({
                title: 'Sent!',
                text: flash.success,
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
            });
            reset();
        }
    }, [flash]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Updated to match the newly named route!
        post(route('feedback_committee.requests.store')); 
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
                                    className="w-full border-gray-300 rounded shadow-sm focus:ring focus:ring-green-200"
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
                                    className="w-full border-gray-300 rounded shadow-sm focus:ring focus:ring-green-200 h-24"
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
                                className="bg-[#009639] hover:bg-[#1E6031] text-white px-6 py-2 rounded font-semibold transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Sending...' : 'Submit Ticket'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- 2. Request History Table --- */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-bold text-gray-800">My Request History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap divide-y divide-gray-200">
                            <thead className="bg-[#1E6031] text-white">
                                <tr>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider">Date Submitted</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                            No requests submitted yet.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map(req => (
                                        <tr key={req.request_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-800">{req.request_type}</td>
                                            <td className="px-6 py-4 text-gray-600 whitespace-normal min-w-[250px]">{req.details}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                                                    req.status === 'Pending' ? 'bg-[#FFD700]/20 text-[#E0A70D]' : 
                                                    req.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {req.status}
                                                </span>
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