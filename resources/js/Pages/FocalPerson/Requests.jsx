import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout'; // Adjust if Focal Person uses a different layout
import Swal from 'sweetalert2';
import Pagination from '@/Components/Pagination';
import SearchFilter from '@/Components/SearchFilter';

export default function Requests({ requests }) {
    const { flash } = usePage().props;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data, setData, post, reset, errors } = useForm({
        recipient: '',
        request_type: '',
        details: '',
    });
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
            if (searchQuery.trim()) params.search = searchQuery.trim();
            if (statusFilter) params.status = statusFilter;

            router.get(
                window.location.pathname,
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, statusFilter]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        post(route('focalperson.requests.store'), {
            onSuccess: () => {
                reset();
                setIsSubmitting(false);
            },
            onError: () => setIsSubmitting(false),
        });
    };

    const handleClear = (id) => {
        Swal.fire({
            title: 'Clear Record?',
            text: "Remove this resolved request from your history log?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, clear it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('focalperson.requests.destroy', id), {
                    preserveScroll: true
                });
            }
        });
    };
    
    const handleCancel = (id) => {
        Swal.fire({
            title: 'Cancel Request?',
            text: "Are you sure you want to cancel this pending request?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, cancel it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('focalperson.requests.destroy', id));
            }
        });
    };

    // Determine options based on selected recipient
    const typeOptions = data.recipient === 'Feedback Committee' 
        ? ['Compliance Review', 'Report Extension', 'Audit Inquiry', 'Other']
        : ['System Access', 'New Feature Request', 'Add Service/Position', 'Technical Support', 'Other'];

    return (
        <SuperAdminLayout headerTitle="Support & Requests">
            <Head title="My Requests" />

            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Column: Create Request Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                            <div className="mb-5 border-b border-gray-100 pb-4">
                                <h2 className="text-lg font-bold text-gray-900"><i className="fa-solid fa-paper-plane text-blue-600 mr-2"></i> Submit Request</h2>
                                <p className="text-xs text-gray-500 mt-1">Route your inquiry to the correct administrative body.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Send Request To <span className="text-red-500">*</span></label>
                                    <select 
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                                        value={data.recipient} 
                                        onChange={e => {
                                            setData(prev => ({ ...prev, recipient: e.target.value, request_type: '' }));
                                        }} 
                                        required
                                    >
                                        <option value="" disabled>-- Select Recipient --</option>
                                        <option value="SuperAdmin">SuperAdmin (Technical & System)</option>
                                        <option value="Feedback Committee">Feedback Committee (Reports & Compliance)</option>
                                    </select>
                                    {errors.recipient && <p className="text-red-500 text-xs mt-1">{errors.recipient}</p>}
                                </div>

                                {data.recipient && (
                                    <div className="animate-fade-in-up">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Request Type <span className="text-red-500">*</span></label>
                                        <select 
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                                            value={data.request_type} 
                                            onChange={e => setData('request_type', e.target.value)} 
                                            required
                                        >
                                            <option value="" disabled>-- Select Topic --</option>
                                            {typeOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                        </select>
                                        {errors.request_type && <p className="text-red-500 text-xs mt-1">{errors.request_type}</p>}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Details <span className="text-red-500">*</span></label>
                                    <textarea 
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[120px]" 
                                        placeholder="Provide necessary context or details..." 
                                        value={data.details} 
                                        onChange={e => setData('details', e.target.value)} 
                                        required
                                    ></textarea>
                                    {errors.details && <p className="text-red-500 text-xs mt-1">{errors.details}</p>}
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || !data.recipient || !data.request_type} 
                                    className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Request'}
                                </button>
                            </form>
                        </div>
                    </div>

                   {/* Right Column: Request History */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-gray-900">
                                        <i className="fa-solid fa-clock-rotate-left mr-2 text-gray-500"></i> My Request History
                                    </h2>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                                        {requests?.total || 0}
                                    </span>
                                </div>
                                <SearchFilter
                                    searchValue={searchQuery}
                                    onSearchChange={setSearchQuery}
                                    searchPlaceholder="Search recipient, type, date, details, status..."
                                    hasActiveFilters={hasActiveFilters}
                                    onFilterReset={() => setStatusFilter('')}
                                    filterTitle="Filter History"
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
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white border-b border-gray-200 text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Recipient & Type</th>
                                            <th className="px-6 py-4 font-semibold">Details</th>
                                            <th className="px-6 py-4 font-semibold text-center">Status</th>
                                            <th className="px-6 py-4 font-semibold text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {requests?.data?.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                                    <i className="fa-solid fa-inbox text-3xl mb-3 text-gray-300"></i>
                                                    <p>No requests submitted yet.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            requests.data.map(req => (
                                                <tr key={req.request_id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{req.request_type}</div>
                                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">
                                                            <i className={`fa-solid ${req.recipient === 'SuperAdmin' ? 'fa-server text-blue-500' : 'fa-users text-emerald-500'} mr-1`}></i>
                                                            {req.recipient}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                                            {new Date(req.created_at).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-gray-600 line-clamp-2 text-xs">{req.details}</p>
                                                        {req.remarks && (
                                                            <div className="mt-2 bg-amber-50 p-2 rounded border border-amber-100 text-xs">
                                                                <span className="font-bold text-amber-800">Reply:</span> <span className="text-amber-700">{req.remarks}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${
                                                            req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                   <td className="px-6 py-4 text-center">
                                                        {req.status === 'Pending' ? (
                                                            <button 
                                                                onClick={() => handleCancel(req.request_id)} 
                                                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
                                                            >
                                                                Cancel
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleClear(req.request_id)} 
                                                                className="w-8 h-8 bg-gray-100 text-gray-500 hover:bg-red-600 hover:text-white rounded-lg inline-flex justify-center items-center transition tooltip border border-gray-200" 
                                                                title="Clear Resolved Record"
                                                            >
                                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                                            </button>
                                                        )}
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
            </div>
        </SuperAdminLayout>
    );
}