import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function Archives({ archivedForms, uniqueDepartments, filters }) {
    const { flash } = usePage().props;

    // --- SERVER-SIDE SEARCH & FILTER STATE ---
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters?.department || '');

    const isInitialRender = useRef(true);

    // Watch for changes and ping Laravel automatically
    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const queryParams = {};
            if (searchQuery) queryParams.search = searchQuery;
            if (departmentFilter) queryParams.department = departmentFilter;

            // Using window.location.pathname ensures it hits the exact current route safely
            router.get(
                window.location.pathname,
                queryParams,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, departmentFilter]);

    // Safely fallback arrays
    const safeDepartments = uniqueDepartments || [];
    const formList = archivedForms?.data || archivedForms || [];

    // --- SWEETALERT2 TOAST NOTIFICATIONS ---
    useEffect(() => {
        if (flash?.success) {
            Swal.fire({
                title: 'Success!',
                text: flash.success,
                icon: 'success',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    }, [flash]);

    // --- ACTION HANDLERS ---
    const handleRestore = (formId, formTitle) => {
        Swal.fire({
            title: 'Restore Form?',
            text: `Are you sure you want to restore "${formTitle}"? It will be moved back to your active Drafts.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', // emerald-500
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-undo"></i> Yes, Restore it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('superadmin.forms.restore', formId), {}, { preserveScroll: true });
            }
        });
    };

    const handleDelete = (formId, formTitle) => {
        Swal.fire({
            title: 'Delete Archived Form?',
            text: `WARNING: "${formTitle}" will be removed from this list. Historical feedback data will be preserved, but the form blueprint will be deleted.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626', // red-600
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-trash"></i> Yes, Delete it!'
       }).then((result) => {
            if (result.isConfirmed) {
                // Use the exact parameter name from your function definition
                router.delete(route('superadmin.forms.soft-delete', formId), {preserveScroll: true });
            }
        });
    };

    // Helper function to format the date
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    return (
        <SuperAdminLayout headerTitle="Archived Forms">
            <Head title="Archived Forms" />
            
            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Toolbar Section (Search & Filters) */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-wrap md:flex-nowrap">
                            {/* Search Bar UI */}
                            <div className="relative w-full sm:w-64 md:w-80">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
                                </div>
                                <input 
                                    type="text" 
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-gray-800 focus:border-gray-800 text-sm transition duration-150 ease-in-out" 
                                    placeholder="Search archives by title or ID..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                )}
                            </div>

                            {/* Department Filter */}
                            <div className="w-full sm:w-auto">
                                <select 
                                    className="block w-full py-2.5 pl-3 pr-10 border border-gray-300 rounded-md text-sm focus:ring-gray-800 focus:border-gray-800 bg-white"
                                    value={departmentFilter}
                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                >
                                    <option value="">All Departments</option>
                                    <option value="general">General (System Wide)</option>
                                    {safeDepartments.map(dept => (
                                        <option key={dept} value={dept}>
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Back Button */}
                        <Link href={route('superadmin.forms.index')} className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2.5 rounded-md font-semibold transition shadow-sm w-full xl:w-auto text-center flex items-center justify-center whitespace-nowrap">
                            <i className="fa-solid fa-arrow-left mr-2"></i> Back to Manage
                        </Link>
                    </div>

                    {/* Archives Table Panel */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-green-600 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Form Title</th>
                                        <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Date Archived</th>
                                        <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formList.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                <i className="fa-solid fa-box-open text-4xl mb-4 block text-gray-300"></i>
                                                <p className="text-base font-semibold">No archived forms found</p>
                                                <p className="text-sm mt-1">Try adjusting your search criteria or filters.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        formList.map((form) => (
                                            <tr key={form.form_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{form.form_id}</td>
                                                <td className="px-6 py-4 font-semibold text-gray-800">{form.title}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                    {form.department_name || 'General Transaction'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                    {formatDate(form.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap space-x-2">
                                                    
                                                    {/* Restore Button */}
                                                    <button 
                                                        onClick={() => handleRestore(form.form_id, form.title)} 
                                                        className="w-8 h-8 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" 
                                                        title="Restore to Drafts">
                                                        <i className="fa-solid fa-undo"></i>
                                                    </button>
                                                    
                                                    {/* Delete Button */}
                                                    <button 
                                                        onClick={() => handleDelete(form.form_id, form.title)} 
                                                        className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" 
                                                        title="Permanently Delete">
                                                        <i className="fa-solid fa-trash"></i>
                                                    </button>

                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* --- SERVER-SIDE PAGINATION CONTROLS --- */}
                        {archivedForms?.meta.links && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                                    <div>
                                        <p className="text-sm text-gray-700">
    Showing <span className="font-bold">{archivedForms.meta?.from || 0}</span> to <span className="font-bold">{archivedForms.meta?.to || 0}</span> of <span className="font-bold">{archivedForms.meta?.total || 0}</span> results
</p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            {archivedForms.meta.links.map((link, index) => {
                                                let className = "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ";
                                                if (link.active) {
                                                    className += "z-10 bg-gray-800 border-gray-800 text-white";
                                                } else if (!link.url) {
                                                    className += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
                                                } else {
                                                    className += "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                                                }
                                                
                                                if (index === 0) className += " rounded-l-md";
                                                if (index === archivedForms.links.length - 1) className += " rounded-r-md";

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
            </div>
        </SuperAdminLayout>
    );
}