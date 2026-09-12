import React from 'react';
import { Head } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';

export default function GlobalReports() {
    return (
        <SuperAdminLayout headerTitle="Global System Reports">
            <Head title="System Reports" />
            
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* --- 1. Global Analytics --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[#1E6031] text-white p-5 rounded-lg shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <i className="fa-solid fa-server text-2xl opacity-80"></i>
                            <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">+12% vs last month</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-3xl font-bold">14,209</p>
                            <p className="text-sm opacity-90 mt-1">Total System Feedbacks</p>
                        </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                        <i className="fa-solid fa-building-flag text-2xl text-gray-400"></i>
                        <div className="mt-4">
                            <p className="text-3xl font-bold text-gray-900">24 / 26</p>
                            <p className="text-sm text-gray-500 mt-1">Active Departments</p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                        <i className="fa-solid fa-file-circle-check text-2xl text-green-500"></i>
                        <div className="mt-4">
                            <p className="text-3xl font-bold text-gray-900">85%</p>
                            <p className="text-sm text-gray-500 mt-1">Report Compliance Rate</p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                        <i className="fa-solid fa-star text-2xl text-[#FFD700]"></i>
                        <div className="mt-4">
                            <p className="text-3xl font-bold text-gray-900">4.62 <span className="text-sm text-gray-400 font-normal">/ 5.0</span></p>
                            <p className="text-sm text-gray-500 mt-1">Global Satisfaction Avg</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* --- 2. Compliance Tracker --- */}
                    <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-5 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">Compliance Tracker</h3>
                            <p className="text-xs text-gray-500 mt-1">Q3 2026 Submissions</p>
                        </div>
                        <div className="p-0">
                            <ul className="divide-y divide-gray-100">
                                <li className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div className="flex items-center">
                                        <i className="fa-solid fa-circle-check text-green-500 mr-3"></i>
                                        <span className="text-sm font-semibold text-gray-700">Office of Admissions</span>
                                    </div>
                                    <span className="text-xs text-gray-500">Submitted Oct 2</span>
                                </li>
                                <li className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div className="flex items-center">
                                        <i className="fa-solid fa-circle-check text-green-500 mr-3"></i>
                                        <span className="text-sm font-semibold text-gray-700">Main Library</span>
                                    </div>
                                    <span className="text-xs text-gray-500">Submitted Oct 5</span>
                                </li>
                                <li className="p-4 flex items-center justify-between bg-red-50 hover:bg-red-100 transition border-l-4 border-red-500">
                                    <div className="flex items-center">
                                        <i className="fa-solid fa-circle-exclamation text-red-500 mr-3"></i>
                                        <span className="text-sm font-semibold text-red-700">University Clinic</span>
                                    </div>
                                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Overdue</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* --- 3. Master Archive Table --- */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800">Master Report Archive</h3>
                                <p className="text-xs text-gray-500 mt-1">Access all generated reports across the system.</p>
                            </div>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Search departments..." 
                                    className="pl-9 pr-4 py-2 border-gray-300 rounded-lg text-sm shadow-sm focus:ring focus:ring-green-200"
                                />
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400"></i>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm whitespace-nowrap divide-y divide-gray-200">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Generated</th>
                                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Department</th>
                                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Data Period</th>
                                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">Oct 15, 2026</td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">Office of Admissions</td>
                                        <td className="px-6 py-4 text-gray-500">Q3 2026</td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="text-gray-400 hover:text-[#009639] transition">
                                                <i className="fa-solid fa-download"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">Oct 10, 2026</td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">Main Library</td>
                                        <td className="px-6 py-4 text-gray-500">Q3 2026</td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="text-gray-400 hover:text-[#009639] transition">
                                                <i className="fa-solid fa-download"></i>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </SuperAdminLayout>
    );
}