import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';

export default function Reports() {
    // UI State for the generator form
    const [filters, setFilters] = useState({
        date_from: '',
        date_to: '',
        form_id: '',
        report_type: 'summary',
        export_format: 'pdf'
    });

    const [isGenerating, setIsGenerating] = useState(false);

    const handlePreview = (e) => {
        e.preventDefault();
        setIsGenerating(true);
        // Simulate a loading state for the UI preview
        setTimeout(() => setIsGenerating(false), 1000);
    };

    return (
        <SuperAdminLayout headerTitle="Report Generator">
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
                                Filter, compile, and export feedback data for your department's forms.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handlePreview} className="space-y-6">
                        {/* Filters Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            
                            {/* Form Selection */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Target Form / Service <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                    value={filters.form_id}
                                    onChange={e => setFilters({...filters, form_id: e.target.value})}
                                    required
                                >
                                    <option value="" disabled>-- Select a feedback form --</option>
                                    <option value="1">Front Desk Customer Service Evaluation</option>
                                    <option value="2">IT Support Ticket Feedback</option>
                                    <option value="3">Facility Maintenance Satisfaction</option>
                                </select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Date From <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                    value={filters.date_from}
                                    onChange={e => setFilters({...filters, date_from: e.target.value})}
                                    required
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Date To <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                    value={filters.date_to}
                                    onChange={e => setFilters({...filters, date_to: e.target.value})}
                                    required
                                />
                            </div>

                            {/* Report Type */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Report Type</label>
                                <div className="flex space-x-4 mt-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="report_type" 
                                            value="summary"
                                            checked={filters.report_type === 'summary'}
                                            onChange={e => setFilters({...filters, report_type: e.target.value})}
                                            className="text-[#009639] focus:ring-[#009639]"
                                        />
                                        <span className="text-sm text-gray-700">Summary Statistics</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="report_type" 
                                            value="detailed"
                                            checked={filters.report_type === 'detailed'}
                                            onChange={e => setFilters({...filters, report_type: e.target.value})}
                                            className="text-[#009639] focus:ring-[#009639]"
                                        />
                                        <span className="text-sm text-gray-700">Detailed Responses</span>
                                    </label>
                                </div>
                            </div>

                            {/* Export Format */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Export Format</label>
                                <div className="flex space-x-4 mt-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="export_format" 
                                            value="pdf"
                                            checked={filters.export_format === 'pdf'}
                                            onChange={e => setFilters({...filters, export_format: e.target.value})}
                                            className="text-[#009639] focus:ring-[#009639]"
                                        />
                                        <span className="text-sm text-gray-700"><i className="fa-solid fa-file-pdf text-red-500 mr-1"></i> PDF Document</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="export_format" 
                                            value="excel"
                                            checked={filters.export_format === 'excel'}
                                            onChange={e => setFilters({...filters, export_format: e.target.value})}
                                            className="text-[#009639] focus:ring-[#009639]"
                                        />
                                        <span className="text-sm text-gray-700"><i className="fa-solid fa-file-excel text-green-600 mr-1"></i> Excel Spreadsheet</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                            <button 
                                type="submit" 
                                disabled={isGenerating}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center shadow-sm"
                            >
                                {isGenerating ? (
                                    <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading...</>
                                ) : (
                                    <><i className="fa-solid fa-eye mr-2"></i> Preview Data</>
                                )}
                            </button>
                            <button 
                                type="button" 
                                className="bg-[#009639] hover:bg-[#1E6031] text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-sm"
                            >
                                <i className="fa-solid fa-download mr-2"></i> Generate & Download
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- 2. Data Preview Section (Static UI) --- */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden opacity-90">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800"><i className="fa-solid fa-chart-simple mr-2 text-[#009639]"></i> Live Preview</h3>
                        <span className="text-xs font-semibold bg-[#FFD700]/20 text-[#B8860B] px-3 py-1 rounded-full border border-[#FFD700]/50">
                            Draft Mode
                        </span>
                    </div>

                    <div className="p-6 space-y-6">
                        
                        {/* Summary Metrics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Total Submissions</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">142</p>
                                </div>
                                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <i className="fa-solid fa-users"></i>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-semibold uppercase tracking-wide">Avg. Satisfaction</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">4.8 <span className="text-sm font-medium text-green-700">/ 5.0</span></p>
                                </div>
                                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <i className="fa-solid fa-star"></i>
                                </div>
                            </div>

                            <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-600 font-semibold uppercase tracking-wide">Top Sentiment</p>
                                    <p className="text-2xl font-bold text-purple-900 mt-1">Positive</p>
                                </div>
                                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                    <i className="fa-regular fa-face-smile"></i>
                                </div>
                            </div>
                        </div>

                        {/* Tabular Preview */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full text-left text-sm whitespace-nowrap divide-y divide-gray-200">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Date</th>
                                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Client Type</th>
                                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Rating</th>
                                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Primary Comment</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {/* Dummy Data Rows */}
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">Oct 12, 2026</td>
                                        <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600">Student</span></td>
                                        <td className="px-6 py-4 text-yellow-500">
                                            <i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 truncate max-w-xs">Very fast and accommodating service.</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">Oct 11, 2026</td>
                                        <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600">Faculty</span></td>
                                        <td className="px-6 py-4 text-yellow-500">
                                            <i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-regular fa-star text-gray-300"></i>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 truncate max-w-xs">The staff was helpful but the queue was long.</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">Oct 10, 2026</td>
                                        <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600">Visitor</span></td>
                                        <td className="px-6 py-4 text-yellow-500">
                                            <i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 truncate max-w-xs">Excellent assistance provided.</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
                                <span className="text-sm text-gray-500 italic">Preview limited to recent 3 entries. Full dataset will be exported.</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </SuperAdminLayout>
    );
}