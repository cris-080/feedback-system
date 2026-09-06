import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function Archives({ archivedForms, archivedDepartments, uniqueDepartments, filters }) {
    const { flash } = usePage().props;

    // --- STATE MANAGEMENT ---
    const queryParams = new URLSearchParams(window.location.search);
    const initialTab = queryParams.get('tab') || 'forms';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Search & Filter State
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
            const params = { tab: activeTab };
            if (searchQuery) params.search = searchQuery;
            if (departmentFilter) params.department = departmentFilter;

            router.get(
                window.location.pathname,
                params,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, departmentFilter, activeTab]);

    // Safely fallback arrays
    const safeDepartments = uniqueDepartments || [];
    const formList = archivedForms?.data || archivedForms || [];
    const deptList = archivedDepartments?.data || archivedDepartments || [];

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

    // --- FORM ACTION HANDLERS ---
    const handleRestoreForm = (formId, formTitle) => {
        Swal.fire({
            title: 'Restore Form?',
            text: `Are you sure you want to restore "${formTitle}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-undo"></i> Yes, Restore!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('superadmin.forms.restore', formId), {}, { preserveScroll: true });
            }
        });
    };

    const handleDeleteForm = (formId, formTitle) => {
        Swal.fire({
            title: 'Permanently Delete Form?',
            text: `WARNING: "${formTitle}" will be removed. Historical feedback is preserved.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-trash"></i> Yes, Delete!'
       }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.forms.force-delete', formId), { preserveScroll: true });
            }
        });
    };

    // --- DEPARTMENT ACTION HANDLERS ---
    const handleRestoreDepartment = (deptId, deptName) => {
        Swal.fire({
            title: 'Restore Department?',
            text: `Are you sure you want to reactivate "${deptName}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-undo"></i> Yes, Restore!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('superadmin.departments.restore', deptId), {}, { preserveScroll: true });
            }
        });
    };

    const handleDeleteDepartment = (deptId, deptName) => {
        Swal.fire({
            title: 'Permanently Delete Department?',
            text: `CRITICAL WARNING: Deleting "${deptName}" permanently may orphan historical feedback data. Are you absolutely sure?`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-skull"></i> Force Delete'
       }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.departments.force-delete', deptId), { preserveScroll: true });
            }
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    // --- SMART PAGINATION COMPONENT ---
    const Pagination = ({ dataObject }) => {
        if (!dataObject) return null;

        // Auto-detect standard pagination vs API Resource wrapper
        const paginationLinks = dataObject.meta?.links || dataObject.links;
        const from = dataObject.meta?.from || dataObject.from || 0;
        const to = dataObject.meta?.to || dataObject.to || 0;
        const total = dataObject.meta?.total || dataObject.total || 0;
        
        if (!paginationLinks) return null;

        return (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                    
                    <div>
                        <p className="text-sm text-gray-700">
                            Showing <span className="font-bold">{from}</span> to <span className="font-bold">{to}</span> of <span className="font-bold">{total}</span> results
                        </p>
                    </div>
                    
                    {/* Removed the length > 3 check so it always shows the buttons */}
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            {paginationLinks.map((link, index) => {
                                let className = "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ";
                                
                                if (link.active) {
                                    className += "z-10 bg-[#009639] border-[#009639] text-white";
                                } else if (!link.url) {
                                    className += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
                                } else {
                                    className += "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                                }
                                
                                if (index === 0) className += " rounded-l-md";
                                if (index === paginationLinks.length - 1) className += " rounded-r-md";

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
        );
    };

    return (
        <SuperAdminLayout headerTitle="System Archives">
            <Head title="System Archives" />
            
            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* --- TABS NAVIGATION --- */}
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-full max-w-md">
                        <button
                            onClick={() => setActiveTab('forms')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${
                                activeTab === 'forms' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="fa-solid fa-file-signature mr-2"></i> Archived Forms
                        </button>
                        <button
                            onClick={() => setActiveTab('departments')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${
                                activeTab === 'departments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="fa-solid fa-building mr-2"></i> Archived Departments
                        </button>
                    </div>

                    {/* --- TOOLBAR --- */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-wrap md:flex-nowrap">
                            <div className="relative w-full sm:w-64 md:w-80">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
                                </div>
                                <input 
                                    type="text" 
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 text-sm" 
                                    placeholder={`Search archived ${activeTab}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {activeTab === 'forms' && (
                                <div className="w-full sm:w-auto">
                                    <select 
                                        className="block w-full py-2.5 pl-3 pr-10 border border-gray-300 rounded-md text-sm focus:ring-gray-800 focus:border-gray-800 bg-white"
                                        value={departmentFilter}
                                        onChange={(e) => setDepartmentFilter(e.target.value)}
                                    >
                                        <option value="">All Departments</option>
                                        <option value="general">General (System Wide)</option>
                                        {safeDepartments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- DYNAMIC TABLES --- */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            
                            {/* FORMS TABLE */}
                            {activeTab === 'forms' && (
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-[#009639] text-white">
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
                                                </td>
                                            </tr>
                                        ) : (
                                            formList.map((form) => (
                                                <tr key={form.form_id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{form.form_id}</td>
                                                    <td className="px-6 py-4 font-semibold text-gray-800">{form.title}</td>
                                                    <td className="px-6 py-4 text-gray-600">{form.department_name || 'General'}</td>
                                                    <td className="px-6 py-4 text-gray-500">{formatDate(form.deleted_at || form.created_at)}</td>
                                                    <td className="px-6 py-4 text-center space-x-2">
                                                        <button onClick={() => handleRestoreForm(form.form_id, form.title)} className="w-8 h-8 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded transition tooltip"><i className="fa-solid fa-undo"></i></button>
                                                        <button onClick={() => handleDeleteForm(form.form_id, form.title)} className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded transition tooltip"><i className="fa-solid fa-trash"></i></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* DEPARTMENTS TABLE */}
                            {activeTab === 'departments' && (
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-[#009639]  text-white">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">ID</th>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Department Name</th>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Date Archived</th>
                                            <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {deptList.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                    <i className="fa-solid fa-building-circle-xmark text-4xl mb-4 block text-gray-300"></i>
                                                    <p className="text-base font-semibold">No archived departments found</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            deptList.map((dept) => (
                                                <tr key={dept.department_id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{dept.department_id}</td>
                                                    <td className="px-6 py-4 font-semibold text-gray-800">{dept.department_name}</td>
                                                    <td className="px-6 py-4 text-gray-500">{formatDate(dept.deleted_at)}</td>
                                                    <td className="px-6 py-4 text-center space-x-2">
                                                        <button onClick={() => handleRestoreDepartment(dept.department_id, dept.department_name)} className="w-8 h-8 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded transition tooltip"><i className="fa-solid fa-undo"></i></button>
                                                        <button onClick={() => handleDeleteDepartment(dept.department_id, dept.department_name)} className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded transition tooltip"><i className="fa-solid fa-trash"></i></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination wrapper pass the raw object */}
                        <Pagination 
                            dataObject={activeTab === 'forms' ? archivedForms : archivedDepartments} 
                        />
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}