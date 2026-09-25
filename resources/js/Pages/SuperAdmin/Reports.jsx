import React, { useState } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Pagination from '@/Components/Pagination'; // Assuming you have this from earlier
import Swal from 'sweetalert2';

export default function Reports({ departments = [], reports = { data: [] } }) {
    const [showModal, setShowModal] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        department_id: 'all',
        month: new Date().getMonth() + 1, // Current month (1-12)
        year: new Date().getFullYear(),
        report_type: 'cc'
    });

    const handleGenerate = (e) => {
        e.preventDefault();
        post(route('superadmin.reports.generate'), {
            onSuccess: () => {
                setShowModal(false);
                reset();
            },
            onError: (err) => {
                if (err.error) {
                    Swal.fire('Notice', err.error, 'warning');
                }
            }
        });
    };

    const months = [
        { val: 1, name: 'January' }, { val: 2, name: 'February' }, { val: 3, name: 'March' },
        { val: 4, name: 'April' }, { val: 5, name: 'May' }, { val: 6, name: 'June' },
        { val: 7, name: 'July' }, { val: 8, name: 'August' }, { val: 9, name: 'September' },
        { val: 10, name: 'October' }, { val: 11, name: 'November' }, { val: 12, name: 'December' }
    ];

    return (
        <SuperAdminLayout headerTitle="Global System Reports">
            <Head title="System Reports" />
            
            <div className="max-w-7xl mx-auto space-y-8 p-8 bg-gray-50 min-h-screen">
                
                {/* --- Action Bar --- */}
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg">Report Management</h2>
                        <p className="text-sm text-gray-500">Generate and archive system-wide CSM reports.</p>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="bg-[#009639] hover:bg-[#007a2e] text-white px-5 py-2.5 rounded-md font-bold text-sm transition shadow-sm flex items-center"
                    >
                        <i className="fa-solid fa-file-invoice mr-2"></i> Generate New Report
                    </button>
                </div>

                {/* --- Master Archive Table --- */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Master Report Archive</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap divide-y divide-gray-200">
                            <thead className="bg-[#009639] text-white">
                                <tr>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Generated On</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Department</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Data Period</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Type</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {reports.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <i className="fa-solid fa-folder-open text-4xl mb-3 text-gray-300 block"></i>
                                            No reports generated yet.
                                        </td>
                                    </tr>
                                ) : (
                                    reports.data.map(report => (
                                               <tr key={report.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                {report.department ? report.department.department_name : 'All Departments (Global)'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {months.find(m => m.val === report.month)?.name} {report.year}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded ${report.report_type === 'cc' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {report.report_type === 'cc' ? 'ARTA CC' : 'Internal Non-CC'}
                                                </span>
                                            </td>
                                           <td className="px-6 py-4 text-center">
                                            <Link 
                                                href={route('superadmin.reports.show', report.id)}
                                                title="View Document"
                                                className="text-gray-400 hover:text-[#009639] transition text-lg inline-block"
                                            >
                                                <i className="fa-solid fa-file-pdf"></i>
                                            </Link>
                                        </td>
                                                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Use your shared Pagination Component */}
                    {reports.data.length > 0 && <Pagination dataObject={reports} />}
                </div>
            </div>

            {/* --- Generation Modal --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-[#009639] p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">Generate Report</h3>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handleGenerate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Target Department</label>
                                <select 
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#009639] focus:border-[#009639]"
                                    value={data.department_id}
                                    onChange={e => setData('department_id', e.target.value)}
                                >
                                    <option value="all">Global System (All Departments)</option>
                                    {departments.map(dept => (
                                        <option key={dept.department_id} value={dept.department_id}>
                                            {dept.department_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Month</label>
                                    <select 
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#009639] focus:border-[#009639]"
                                        value={data.month}
                                        onChange={e => setData('month', e.target.value)}
                                    >
                                        {months.map(m => (
                                            <option key={m.val} value={m.val}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                                    <input 
                                        type="number" 
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#009639] focus:border-[#009639]"
                                        value={data.year}
                                        onChange={e => setData('year', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Report Standard</label>
                                <div className="flex space-x-4 mt-2">
                                    <label className="flex items-center text-sm cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="report_type" 
                                            value="cc"
                                            checked={data.report_type === 'cc'}
                                            onChange={e => setData('report_type', e.target.value)}
                                            className="text-[#009639] focus:ring-[#009639]" 
                                        />
                                        <span className="ml-2 text-gray-700 font-medium">ARTA Compliant (CC)</span>
                                    </label>
                                    <label className="flex items-center text-sm cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="report_type" 
                                            value="non-cc"
                                            checked={data.report_type === 'non-cc'}
                                            onChange={e => setData('report_type', e.target.value)}
                                            className="text-[#009639] focus:ring-[#009639]" 
                                        />
                                        <span className="ml-2 text-gray-700 font-medium">Internal Analytics (Non-CC)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium text-sm transition">Cancel</button>
                                <button type="submit" disabled={processing} className="bg-[#009639] hover:bg-[#007a2e] text-white px-5 py-2 rounded-md font-bold text-sm shadow-sm transition disabled:opacity-50">
                                    {processing ? 'Calculating...' : 'Generate & Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}