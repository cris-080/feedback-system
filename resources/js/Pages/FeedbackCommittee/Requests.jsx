import { useEffect, useState, useRef } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout'; 
import Swal from 'sweetalert2';
import Pagination from '@/Components/Pagination';
import SearchFilter from '@/Components/SearchFilter';

export default function Requests({ inboxRequests, carRequests, departments = [] }) {
    const { flash } = usePage().props;
    
    // Tab State: 'inbox' (From FP) | 'car' (Corrective Actions to FP)
    const [activeTab, setActiveTab] = useState('inbox');

    const inboxData = inboxRequests || { data: [], total: 0 };
    const carData = carRequests || { data: [], total: 0 };

    // --- FORM STATE (Corrective Action Request to Focal Person) ---
    const {
        data: carFormData,
        setData: setCarFormData,
        post: postCar,
        processing: carProcessing,
        errors: carErrors,
        reset: resetCar
    } = useForm({
        target_department_id: '',
        request_type: '',
        priority: 'Normal',
        due_date: '',
        details: ''
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

    // --- INBOX ACTIONS (Responding to Focal Persons) ---
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
                    router.patch(route('feedback_committee.requests.update', requestId), { status: newStatus }, { preserveScroll: true });
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
                    if (!value || value.trim() === '') return 'You must provide a reason for rejection!';
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    router.patch(route('feedback_committee.requests.update', requestId), { status: newStatus, remarks: result.value }, { preserveScroll: true });
                }
            });
        }
    };

    const handleClearInbox = (requestId) => {
        Swal.fire({
            title: 'Clear Record?',
            text: 'Remove this resolved request from your inbox?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, clear it!'
        }).then((result) => {
            if (result.isConfirmed) router.delete(route('feedback_committee.requests.destroy', requestId), { preserveScroll: true });
        });
    };

    const handleCancelTicket = (requestId) => {
        Swal.fire({
            title: 'Cancel Notice?',
            text: 'Permanently cancel this pending corrective action notice?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Cancel it!'
        }).then((result) => {
            if (result.isConfirmed) router.delete(route('feedback_committee.requests.destroy', requestId), { preserveScroll: true });
        });
    };

    // --- CAR ACTIONS (Issuing & Closing Focal Person Notices) ---
    const handleSubmitCar = (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Issue Corrective Action Notice?',
            text: 'The assigned Focal Person will be notified immediately to address this concern.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d97706',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Issue Notice'
        }).then((result) => {
            if (result.isConfirmed) {
                postCar(route('feedback_committee.requests.car.store'), {
                    preserveScroll: true,
                    onSuccess: () => resetCar()
                });
            }
        });
    };

    const handleCloseCar = (requestId) => {
        Swal.fire({
            title: 'Verify & Close Notice?',
            text: 'Optional closing remarks for the Focal Person:',
            input: 'textarea',
            inputPlaceholder: 'e.g., Action verified. Thank you for the prompt resolution.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#009639',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Verify & Close'
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(
                    route('feedback_committee.requests.car.close', requestId),
                    { remarks: result.value || '' },
                    { preserveScroll: true }
                );
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="Requests & Approvals">
            <Head title="System Requests" />
            
            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Toolbar & Tabs */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-inbox"></i>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Communication Center</h2>
                                <p className="text-xs text-gray-500">Review Focal Person requests and manage departmental compliance notices.</p>
                            </div>
                        </div>

                        <div className="bg-gray-100 rounded-lg p-1 flex flex-wrap sm:flex-nowrap gap-1 border border-gray-200 w-full sm:w-auto">
                            <button
                                onClick={() => setActiveTab('inbox')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                    activeTab === 'inbox' ? 'bg-[#1E6031] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <i className="fa-solid fa-download"></i> Inbox Review
                            </button>
                            <button
                                onClick={() => setActiveTab('car')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                    activeTab === 'car' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <i className="fa-solid fa-clipboard-check"></i> Corrective Actions (FP)
                            </button>
                        </div>
                    </div>

                    {/* Search & Status Filter Toolbar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
                        <SearchFilter
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder={
                                activeTab === 'inbox'
                                    ? 'Search date, focal person, category, details, or status...'
                                    : 'Search date, category, details, or status...'
                            }
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
                                    {activeTab === 'car' ? (
                                        <>
                                            <option value="Addressed">Addressed</option>
                                            <option value="Closed">Closed</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Approved">Approved</option>
                                            <option value="Rejected">Rejected</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </SearchFilter>
                    </div>

                    {/* --- TAB 1: INBOX (Reviewing Focal Person Requests) --- */}
                    {activeTab === 'inbox' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in-up">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800"><i className="fa-solid fa-list-check mr-2 text-[#1E6031]"></i> Pending & Resolved Approvals</h3>
                                <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                                    {inboxData.total || 0} Total
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#1E6031] text-white">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Date</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Focal Person</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Request Category</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Details</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-center">Status</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(!inboxData.data || inboxData.data.length === 0) ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                                    <i className="fa-solid fa-inbox text-4xl mb-3 block text-gray-300"></i>
                                                    <p>No compliance requests from Focal Persons found.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            inboxData.data.map(req => (
                                                <tr key={req.request_id} className="hover:bg-gray-50 transition align-top">
                                                    <td className="px-6 py-5 text-gray-500 text-xs font-medium">
                                                        {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="font-bold text-gray-900">{req.firstname} {req.lastname}</div>
                                                        <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-0.5">{req.role}</div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-bold border border-gray-200">
                                                            {req.request_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-normal min-w-[250px]">
                                                        <p className="text-sm text-gray-700 leading-relaxed">{req.details}</p>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border ${
                                                                req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                                                req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                                                'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                                {req.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center space-x-2">
                                                        {req.status === 'Pending' ? (
                                                            <div className="flex justify-center gap-2">
                                                                <button onClick={() => handleStatusUpdate(req.request_id, 'Approved', 'Approve')} className="w-8 h-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg flex justify-center items-center transition border border-emerald-100" title="Approve Request">
                                                                    <i className="fa-solid fa-check"></i>
                                                                </button>
                                                                <button onClick={() => handleStatusUpdate(req.request_id, 'Rejected', 'Reject')} className="w-8 h-8 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg flex justify-center items-center transition border border-red-100" title="Reject Request">
                                                                    <i className="fa-solid fa-xmark"></i>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => handleClearInbox(req.request_id)} className="w-8 h-8 bg-gray-100 text-gray-500 hover:bg-red-500 hover:text-white rounded-lg inline-flex justify-center items-center transition border border-gray-200" title="Clear Record">
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
                            <Pagination dataObject={inboxData} />
                        </div>
                    )}

                    {/* --- TAB 2: CORRECTIVE ACTIONS (FC -> Focal Persons) --- */}
                    {activeTab === 'car' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            {/* Issue CAR Form */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                                    <div className="mb-5 border-b border-gray-100 pb-4">
                                        <h2 className="text-lg font-bold text-gray-900">
                                            <i className="fa-solid fa-triangle-exclamation text-amber-600 mr-2"></i>
                                            Issue Compliance Notice
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Escalate service provider concerns, harassment follow-ups, or low SQD scores to a department Focal Person.
                                        </p>
                                    </div>
                                    <form onSubmit={handleSubmitCar} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Target Department <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                className="w-full border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm bg-gray-50"
                                                value={carFormData.target_department_id}
                                                onChange={e => setCarFormData('target_department_id', e.target.value)}
                                                required
                                            >
                                                <option value="" disabled>-- Select Department --</option>
                                                {departments.map(dept => (
                                                    <option key={dept.department_id} value={dept.department_id}>
                                                        {dept.department_name}
                                                        {dept.fp_firstname ? ` (FP: ${dept.fp_firstname} ${dept.fp_lastname})` : ' (No FP assigned)'}
                                                    </option>
                                                ))}
                                            </select>
                                            {carErrors.target_department_id && <p className="text-red-500 text-xs mt-1">{carErrors.target_department_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Concern Category <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                className="w-full border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm bg-gray-50"
                                                value={carFormData.request_type}
                                                onChange={e => setCarFormData('request_type', e.target.value)}
                                                required
                                            >
                                                <option value="" disabled>-- Select Category --</option>
                                                <option value="Service Provider Conduct">Service Provider Conduct</option>
                                                <option value="Harassment Follow-up">Harassment Follow-up</option>
                                                <option value="Low SQD Performance">Low SQD Performance</option>
                                                <option value="Service Delay / Bottleneck">Service Delay / Bottleneck</option>
                                                <option value="Report Clarification">Report Clarification</option>
                                                <option value="General Compliance Notice">General Compliance Notice</option>
                                            </select>
                                            {carErrors.request_type && <p className="text-red-500 text-xs mt-1">{carErrors.request_type}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Priority <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    className="w-full border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm bg-gray-50"
                                                    value={carFormData.priority}
                                                    onChange={e => setCarFormData('priority', e.target.value)}
                                                    required
                                                >
                                                    <option value="Normal">Normal</option>
                                                    <option value="Urgent">Urgent</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Due Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm bg-gray-50"
                                                    value={carFormData.due_date}
                                                    onChange={e => setCarFormData('due_date', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Concern & Required Action <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                className="w-full border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 min-h-[120px] text-sm bg-gray-50"
                                                placeholder="Specify the service provider, control number (if applicable), and corrective action required..."
                                                value={carFormData.details}
                                                onChange={e => setCarFormData('details', e.target.value)}
                                                required
                                            ></textarea>
                                            {carErrors.details && <p className="text-red-500 text-xs mt-1">{carErrors.details}</p>}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={carProcessing}
                                            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {carProcessing ? (
                                                <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Issuing...</>
                                            ) : (
                                                <><i className="fa-solid fa-paper-plane mr-2"></i> Issue Compliance Notice</>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Issued CAR History */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800">
                                            <i className="fa-solid fa-clipboard-list mr-2 text-amber-600"></i>
                                            Issued Corrective Action Notices
                                        </h3>
                                        <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                                            {carData.total || 0} Total
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-gray-100 text-gray-600">
                                                <tr>
                                                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Department</th>
                                                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Category & Concern</th>
                                                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs text-center">Status</th>
                                                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {(!carData.data || carData.data.length === 0) ? (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                                            <i className="fa-solid fa-clipboard-check text-3xl mb-3 block text-gray-300"></i>
                                                            No corrective action notices issued yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    carData.data.map(car => (
                                                        <tr key={car.request_id} className="hover:bg-gray-50 transition align-top">
                                                            <td className="px-5 py-4">
                                                                <div className="font-bold text-gray-900">{car.department_name || 'Unassigned Office'}</div>
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                                                                        car.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        {car.priority || 'Normal'}
                                                                    </span>
                                                                    {car.due_date && (
                                                                        <span className="text-[10px] text-gray-500">
                                                                            Due: {new Date(car.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4 whitespace-normal min-w-[240px]">
                                                                <div className="font-semibold text-gray-800 text-xs">{car.request_type}</div>
                                                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{car.details}</p>
                                                                {car.fp_response && (
                                                                    <div className="mt-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                                                                        <strong className="block text-[10px] uppercase tracking-wider text-emerald-700 mb-0.5">
                                                                            Focal Person Action Taken:
                                                                        </strong>
                                                                        {car.fp_response}
                                                                    </div>
                                                                )}
                                                                {car.remarks && (
                                                                    <div className="mt-1.5 text-[11px] text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                                                                        <strong>FC Closing Remarks:</strong> {car.remarks}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${
                                                                    car.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    car.status === 'Addressed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                }`}>
                                                                    {car.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                {car.status === 'Pending' && (
                                                                    <button
                                                                        onClick={() => handleCancelTicket(car.request_id)}
                                                                        className="text-red-500 hover:bg-red-50 text-xs font-bold px-2.5 py-1 rounded transition"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                )}
                                                                {car.status === 'Addressed' && (
                                                                    <button
                                                                        onClick={() => handleCloseCar(car.request_id)}
                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition shadow-xs"
                                                                    >
                                                                        Verify & Close
                                                                    </button>
                                                                )}
                                                                {car.status === 'Closed' && (
                                                                    <span className="text-emerald-600 text-xs font-semibold">
                                                                        <i className="fa-solid fa-circle-check mr-1"></i> Closed
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination dataObject={carData} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 3: OUTBOX (Submitting to SuperAdmin) --- */}
                    {activeTab === 'outbox' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            {/* Submit Form */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                                    <div className="mb-5 border-b border-gray-100 pb-4">
                                        <h2 className="text-lg font-bold text-gray-900"><i className="fa-solid fa-headset text-blue-600 mr-2"></i> SuperAdmin Ticket</h2>
                                        <p className="text-xs text-gray-500 mt-1">Need technical system changes or a new account? Submit a ticket.</p>
                                    </div>
                                    <form onSubmit={handleSubmitTicket} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                                            <select 
                                                className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50"
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
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Request Details <span className="text-red-500">*</span></label>
                                            <textarea 
                                                className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[120px] text-sm bg-gray-50"
                                                placeholder="Please provide exact details..."
                                                value={data.details}
                                                onChange={e => setData('details', e.target.value)}
                                                required
                                            ></textarea>
                                            {errors.details && <p className="text-red-500 text-xs mt-1">{errors.details}</p>}
                                        </div>
                                        <button type="submit" disabled={processing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center">
                                            {processing ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Sending...</> : <><i className="fa-solid fa-paper-plane mr-2"></i> Send Ticket</>}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Outbox History */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800"><i className="fa-solid fa-clock-rotate-left mr-2 text-gray-500"></i> My Ticket History</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-gray-100 text-gray-600">
                                                <tr>
                                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Date</th>
                                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Category</th>
                                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Details</th>
                                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-center">Status</th>
                                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {(!outboxData.data || outboxData.data.length === 0) ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                                            <i className="fa-solid fa-inbox text-3xl mb-3 block text-gray-300"></i>
                                                            No tickets sent yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    outboxData.data.map(req => (
                                                        <tr key={req.request_id} className="hover:bg-gray-50 transition align-top">
                                                            <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                                                                {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </td>
                                                            <td className="px-6 py-4 font-semibold text-gray-800">{req.request_type}</td>
                                                            <td className="px-6 py-4 whitespace-normal min-w-[200px]">
                                                                <p className="text-xs text-gray-700">{req.details}</p>
                                                                {req.remarks && (
                                                                    <div className="mt-2 text-[10px] text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                                                                        <strong>Reply:</strong> {req.remarks}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${
                                                                    req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                                                    req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                                                    'bg-red-50 text-red-700 border-red-200'
                                                                }`}>
                                                                    {req.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {req.status === 'Pending' ? (
                                                                    <button onClick={() => handleCancelTicket(req.request_id)} className="text-red-500 hover:bg-red-50 text-xs font-bold px-2 py-1 rounded transition">
                                                                        Cancel
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-gray-300 text-xs italic">Processed</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination dataObject={outboxData} />
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </SuperAdminLayout>
    );
}