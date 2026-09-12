import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function CommitteeReports() {
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const handleMarkReviewed = (id) => {
        Swal.fire({
            title: 'Mark as Reviewed?',
            text: 'This will update the report status and notify the Focal Person.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#009639',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, mark it'
        });
    };

    return (
        <SuperAdminLayout headerTitle="Committee Report Repository">
            <Head title="Report Repository" />
            
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#FFD700]">
                        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Pending Reviews</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#009639]">
                        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Reviewed This Month</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">45</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Total Reports Received</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">1,284</p>
                    </div>
                </div>

                {/* Main Repository Area */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-[#1E6031]">Departmental Reports</h2>
                            <p className="text-sm text-gray-500 mt-1">Review compiled feedback reports submitted by Focal Persons.</p>
                        </div>
                        
                        {/* Filters */}
                        <div className="flex space-x-3">
                            <select 
                                className="border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                value={filterDept}
                                onChange={e => setFilterDept(e.target.value)}
                            >
                                <option value="">All Departments</option>
                                <option value="registrar">Office of Admissions</option>
                                <option value="clinic">University Clinic</option>
                                <option value="library">Main Library</option>
                            </select>
                            <select 
                                className="border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending Review</option>
                                <option value="reviewed">Reviewed</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap divide-y divide-gray-200">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Date Submitted</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Department</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Report Period</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Status</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {/* Dummy Row 1 */}
                                <tr className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-gray-600">Oct 15, 2026</td>
                                    <td className="px-6 py-4 font-semibold text-gray-900">Office of Admissions</td>
                                    <td className="px-6 py-4 text-gray-600">Sept 1 - Sept 30, 2026</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-[#FFD700]/20 text-[#B8860B] border border-[#FFD700]/50">
                                            Pending Review
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center space-x-2">
                                        <button className="w-8 h-8 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" title="View PDF">
                                            <i className="fa-solid fa-file-pdf"></i>
                                        </button>
                                        <button onClick={() => handleMarkReviewed(1)} className="w-8 h-8 bg-green-50 text-green-600 hover:bg-[#009639] hover:text-white rounded inline-flex justify-center items-center transition tooltip" title="Mark as Reviewed">
                                            <i className="fa-solid fa-check-double"></i>
                                        </button>
                                    </td>
                                </tr>
                                {/* Dummy Row 2 */}
                                <tr className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-gray-600">Oct 14, 2026</td>
                                    <td className="px-6 py-4 font-semibold text-gray-900">Main Library</td>
                                    <td className="px-6 py-4 text-gray-600">Sept 1 - Sept 30, 2026</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-green-100 text-green-800">
                                            Reviewed
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center space-x-2">
                                        <button className="w-8 h-8 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" title="View PDF">
                                            <i className="fa-solid fa-file-pdf"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </SuperAdminLayout>
    );
}