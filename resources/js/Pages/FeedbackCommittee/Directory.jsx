import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import SearchFilter from '@/Components/SearchFilter';
import Pagination from '@/Components/Pagination';

export default function Directory({ focalPersons, filters }) {
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const delayDebounce = setTimeout(() => {
            const params = {};
            if (searchQuery.trim()) params.search = searchQuery.trim();

            router.get(
                route('feedback_committee.directory.index'),
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    return (
        <SuperAdminLayout headerTitle="University Directory">
            <Head title="Focal Person Directory" />

            <div className="max-w-7xl mx-auto space-y-6">
                
                
                {/* Directory Workspace */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-auto flex-shrink-0 mr-auto">
                            <SearchFilter 
                                searchValue={searchQuery}
                                onSearchChange={setSearchQuery}
                                searchPlaceholder="Search names, emails, or offices..."
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                                {focalPersons?.total || 0} Registered
                            </span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-[#009639] text-white">
                                <tr>
                                    <th className="px-6 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Representative</th>
                                    <th className="px-6 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Contact Email</th>
                                    <th className="px-6 py-3.5 text-left font-semibold uppercase tracking-wider text-[11px]">Department / Office</th>
                                    <th className="px-6 py-3.5 text-center font-semibold uppercase tracking-wider text-[11px]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {focalPersons && focalPersons.data.length > 0 ? (
                                    focalPersons.data.map((person) => (
                                        <tr key={person.user_id} className="hover:bg-gray-50/80 transition-colors">
                                            
                                            {/* Representative Name */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                                                        {person.firstname.charAt(0)}{person.lastname.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{person.firstname} {person.lastname}</div>
                                                        <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
                                                            <i className="fa-solid fa-id-badge mr-1"></i> Focal Person
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact Email */}
                                            <td className="px-6 py-4">
                                                <a href={`mailto:${person.email}`} className="text-gray-600 hover:text-blue-600 font-medium transition flex items-center gap-2">
                                                    <i className="fa-regular fa-envelope text-gray-400"></i> {person.email}
                                                </a>
                                            </td>

                                            {/* Department */}
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700">
                                                    <i className="fa-regular fa-building text-[#009639]"></i>
                                                    {person.department_name || 'Unassigned'}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                                    person.status === 'Suspended' 
                                                        ? 'bg-red-50 text-red-700 border border-red-200' 
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {person.status === 'Suspended' ? 'Suspended' : 'Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-16 text-center">
                                            <div className="w-14 h-14 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-100 text-2xl">
                                                <i className="fa-solid fa-address-book"></i>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-800">No Focal Persons found</p>
                                            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                                                Adjust your search terms to find registered representatives.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Component */}
                    <Pagination dataObject={focalPersons} />
                </div>
            </div>
        </SuperAdminLayout>
    );
}