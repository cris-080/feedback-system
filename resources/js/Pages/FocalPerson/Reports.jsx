import React from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function Reports() {
    const { reports, department, flash } = usePage().props;
    
    // According to Department.php, the column is 'classification' and holds values like 'CC'
    const isCC = department?.classification?.toLowerCase() === 'cc';

    // Native JS for first and last day of current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // Native JS Date Formatter (e.g., "Oct 12, 2026")
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    // Inertia form state for generation
    const { data, setData, post, processing, errors, reset } = useForm({
        report_name: '',
        start_date: firstDay,
        end_date: lastDay,
        report_type: isCC ? 'cc' : 'non-cc',
    });

    // Handle form submission to generate report
    const handleGenerate = (e) => {
        e.preventDefault();
        
        post(route('focalperson.reports.generate'), {
            preserveScroll: true,
            onSuccess: () => {
                if (flash?.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Generated!',
                        text: flash.success,
                        timer: 2500,
                        showConfirmButton: false
                    });
                    reset('report_name');
                }
            },
            onError: (err) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Generation Failed',
                    text: err.error || 'Please check your inputs and try again.'
                });
            }
        });
    };

    // Handle submitting a draft to the committee
    const handleSubmitToCommittee = (id, name) => {
        Swal.fire({
            title: 'Submit Report?',
            text: `Are you sure you want to submit "${name}" to the Feedback Committee? You cannot edit or delete it once submitted.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#009639',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Submit'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('focalperson.reports.submit', id), {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Submitted!', 'Report has been sent to the committee.', 'success');
                    }
                });
            }
        });
    };

    // Handle deleting a draft
    const handleDelete = (id, name) => {
        Swal.fire({
            title: 'Delete Draft?',
            text: `Are you sure you want to permanently delete "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('focalperson.reports.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', 'Draft report removed.', 'success');
                    }
                });
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="Departmental Reports">
            <Head title="Generate Reports" />
            
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* --- 1. Report Configuration & Compiler --- */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-[#1E6031]">
                                <i className="fa-solid fa-file-invoice mr-2"></i> Report Configuration
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Compile Citizen's Charter and SQD feedback data for your department.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleGenerate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Report Name (Optional) */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Custom Report Name <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <input 
                                    type="text" 
                                    placeholder={`e.g., Q1 Report - ${department?.department_name || 'My Department'}`}
                                    className={`w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm ${errors.report_name ? 'border-red-500' : ''}`}
                                    value={data.report_name}
                                    onChange={e => setData('report_name', e.target.value)}
                                />
                                {errors.report_name && <p className="text-red-500 text-xs mt-1">{errors.report_name}</p>}
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    className={`w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm ${errors.start_date ? 'border-red-500' : ''}`}
                                    value={data.start_date}
                                    onChange={e => setData('start_date', e.target.value)}
                                    required
                                />
                                {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    End Date <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    className={`w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm ${errors.end_date ? 'border-red-500' : ''}`}
                                    value={data.end_date}
                                    onChange={e => setData('end_date', e.target.value)}
                                    required
                                />
                                {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
                            </div>

                            {/* Automatic Report Type Indicator */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Template</label>
                                <div className="flex items-start p-4 border bg-gray-50 border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 text-green-700 shrink-0">
                                        <i className={`fa-solid ${isCC ? 'fa-file-signature' : 'fa-file-lines'} text-lg`}></i>
                                    </div>
                                    <div className="ml-4 text-sm">
                                        <span className="font-bold text-gray-900 block">
                                            {isCC ? "Citizen's Charter (CC) Format" : "Internal Services (Non-CC) Format"}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                            {isCC 
                                                ? "Your department is configured for frontline services. The ARTA template will automatically include CC visibility and awareness metrics." 
                                                : "Your department is configured for internal services. The template will exclude CC-specific questions."}
                                        </span>
                                    </div>
                                </div>
                                {/* Hidden input to ensure the required field is still passed to the backend */}
                                <input type="hidden" name="report_type" value={data.report_type} />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button 
                                type="submit" 
                                disabled={processing}
                                className="bg-[#009639] hover:bg-[#1E6031] text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center shadow-sm"
                            >
                                {processing ? (
                                    <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Compiling Data...</>
                                ) : (
                                    <><i className="fa-solid fa-microchip mr-2"></i> Generate Local Report</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- 2. Report History & Submission Section --- */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800"><i className="fa-solid fa-folder-open mr-2 text-[#009639]"></i> My Reports</h3>
                    </div>

                    <div className="p-0 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Report Title</th>
                                    <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Coverage Period</th>
                                    <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs">Responses</th>
                                    <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs">Status</th>
                                    <th className="px-6 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reports && reports.data.length > 0 ? (
                                    reports.data.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-800">{report.report_name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Generated: {formatDate(report.created_at)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                                {formatDate(report.start_date)} - {formatDate(report.end_date)}
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-gray-700">
                                                {report.report_data?.metadata?.total_respondents || 0}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {report.status === 'Submitted' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        <i className="fa-solid fa-paper-plane mr-1.5"></i> Submitted
                                                    </span>
                                                ) : report.status === 'Approved' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <i className="fa-solid fa-check-circle mr-1.5"></i> Approved
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        <i className="fa-solid fa-file-pen mr-1.5"></i> Draft
                                                    </span>
                                                )}
                                            </td>
                                           <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                                                <a 
                                                    href={route('focalperson.reports.download.pdf', report.id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <i className="fa-solid fa-file-pdf"></i>
                                                </a>
                                                
                                                <a 
                                                    href={route('focalperson.reports.download.docx', report.id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                                    title="Download DOCX"
                                                >
                                                    <i className="fa-solid fa-file-word"></i>
                                                </a>

                                                {report.status === 'Draft' && (
                                                    <button 
                                                        onClick={() => handleSubmitToCommittee(report.id, report.report_name)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:bg-green-100 hover:text-green-700 transition-colors"
                                                        title="Submit to Committee"
                                                    >
                                                        <i className="fa-solid fa-paper-plane"></i>
                                                    </button>
                                                )}

                                                {report.status === 'Draft' && (
                                                    <button 
                                                        onClick={() => handleDelete(report.id, report.report_name)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Delete Draft"
                                                    >
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-regular fa-folder-open text-4xl mb-3 text-gray-300"></i>
                                                <p>No reports generated yet.</p>
                                                <p className="text-xs text-gray-400 mt-1">Use the configuration form above to generate your first report.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {reports?.links && reports.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-center">
                           <div className="flex space-x-1">
                                {reports.links.map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => link.url && router.visit(link.url)}
                                        disabled={!link.url}
                                        className={`px-3 py-1 text-sm border rounded-md ${link.active ? 'bg-[#009639] text-white border-[#009639]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'} ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                           </div>
                        </div>
                    )}
                </div>

            </div>
        </SuperAdminLayout>
    );
}