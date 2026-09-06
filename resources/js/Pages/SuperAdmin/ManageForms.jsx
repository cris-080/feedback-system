import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import SuperAdminLayout from '../../Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';


export default function ManageForms({ forms, uniqueDepartments, filters, isSuperAdmin }) {
    const { flash } = usePage().props;
    
    // Safely fallback to an empty array if uniqueDepartments is undefined
    const safeDepartments = uniqueDepartments || [];

    // --- FILTER MENU TOGGLE STATE ---
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // --- SERVER-SIDE SEARCH & FILTER STATE ---
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters?.department || '');

    const isInitialRender = useRef(true);

   
    useEffect(() => {
        if (!isSuperAdmin) return; // Skip filtering listener if not SuperAdmin

        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const queryParams = {};
            if (searchQuery) queryParams.search = searchQuery;
            if (statusFilter) queryParams.status = statusFilter;
            if (departmentFilter) queryParams.department = departmentFilter;

            router.get(
                route('superadmin.forms.index'),
                queryParams,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, statusFilter, departmentFilter, isSuperAdmin]);

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

    // --- SWEETALERT2 ACTION HANDLERS ---
    const handlePublish = (formId, formTitle) => {
        Swal.fire({
            title: 'Publish Form?',
            text: `Are you sure you want to publish "${formTitle}"? It will become active for the department.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-upload"></i> Yes, Publish it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('superadmin.forms.publish', formId), {}, { preserveScroll: true });
            }
        });
    };

    const handleArchive = (formId, formTitle) => {
        Swal.fire({
            title: 'Archive Form?',
            text: `"${formTitle}" will be hidden from the public portal.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-box-archive"></i> Yes, Archive it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('superadmin.forms.archive', formId), {}, { preserveScroll: true });
            }
        });
    };

    const handleClone = (formId) => {
        Swal.fire({
            title: 'Clone Form Blueprint?',
            text: "This will create an exact duplicate of this form as a Draft.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-copy"></i> Yes, Clone it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('superadmin.forms.clone', formId), {}, { preserveScroll: true });
            }
        });
    };

   
    // --- DEPLOYMENT KIT MODAL STATE & HANDLERS ---
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const { data: deployData, setData: setDeployData, reset: resetDeploy } = useForm({
        department_id: '',
        department_name: '', 
        label: '',
        focal_person_email: ''
    });

  
    

    // Check if any filters are active
    const hasActiveFilters = Boolean(statusFilter || departmentFilter);
    const formList = forms?.data || forms || [];

    return (
        <SuperAdminLayout headerTitle={isSuperAdmin ? "Manage Evaluation Forms" : "Department Evaluation Forms"}>
            <Head title="Manage Forms" />
            <div className="p-8 bg-gray-50 min-h-screen">
                
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* --- TOOLBAR SECTION (SuperAdmin ONLY) --- */}
                    {isSuperAdmin && (
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-wrap md:flex-nowrap">
                                
                                {/* Search Bar UI */}
                                <div className="relative w-full sm:w-64 md:w-72">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
                                    </div>
                                    <input 
                                        type="text" 
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#009639] focus:border-[#009639] text-sm transition duration-150 ease-in-out" 
                                        placeholder="Search form title, ID..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                                            <i className="fa-solid fa-xmark"></i>
                                        </button>
                                    )}
                                </div>

                                {/* --- COLLAPSIBLE FILTER MENU BUTTON & DROPDOWN --- */}
                                <div className="relative w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                        className={`w-full sm:w-auto p-2.5 rounded-md border text-sm font-semibold transition flex items-center justify-center relative ${
                                            hasActiveFilters 
                                                ? 'bg-emerald-50 border-[#009639] text-[#1E6031]' 
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                        title="Filter Forms"
                                    >
                                        <i className="fa-solid fa-filter text-base"></i>
                                      
                                        {hasActiveFilters && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009639] opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#009639]"></span>
                                            </span>
                                        )}
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isFilterOpen && (
                                        <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-30 p-4 space-y-3">
                                            <div className="flex justify-between items-center border-b pb-2">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filter Forms</span>
                                                {hasActiveFilters && (
                                                    <button 
                                                        onClick={() => { setStatusFilter(''); setDepartmentFilter(''); }}
                                                        className="text-xs text-red-600 hover:underline font-semibold"
                                                    >
                                                        Reset All
                                                    </button>
                                                )}
                                            </div>

                                            {/* Status Filter */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">By Status</label>
                                                <select 
                                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white"
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                >
                                                    <option value="">All Statuses</option>
                                                    <option value="Active">Active</option>
                                                    <option value="Draft">Draft</option>
                                                    <option value="Archived">Archived</option>
                                                </select>
                                            </div>

                                            {/* Department Filter */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">By Department</label>
                                                <select 
                                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white"
                                                    value={departmentFilter}
                                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                                >
                                                    <option value="">All Departments</option>
                                                    {safeDepartments.map(dept => (
                                                        <option key={dept} value={dept}>
                                                            {dept}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Action Buttons */}
                            <div className="flex w-full xl:w-auto gap-3 flex-col sm:flex-row">
                                <Link href={route('superadmin.forms.builder')} className="bg-blue-600 hover:bg-blue-600 text-white px-6 py-2 rounded-md font-semibold text-sm transition shadow-sm w-full sm:w-auto text-center flex items-center justify-center whitespace-nowrap">
                                    <i className="fa-solid fa-plus mr-2"></i> Create Form
                                </Link>
                                
                            </div>
                        </div>
                    )}

                    {/* Forms Data Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-[#009639] text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Form Title</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                                        {isSuperAdmin && (
                                            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {!(forms?.data || forms).length ? (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                                                <i className="fa-solid fa-filter-circle-xmark text-4xl mb-4 block text-gray-300"></i>
                                                <p className="text-base font-semibold">No forms found</p>
                                                <p className="text-sm mt-1">Try adjusting your search or filter settings.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        (forms.data || forms).map((form) => (
                                            <tr key={form.form_id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{form.form_id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{form.title}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {form.department_name || 'General'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {form.status === 'Active' && <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-800">Active</span>}
                                                    {form.status === 'Draft' && <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">Draft</span>}
                                                    {form.status === 'Archived' && <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-gray-100 text-gray-800">Archived</span>}
                                                </td>
                                                {isSuperAdmin && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                                        
                                                        {form.status === 'Draft' && (
                                                            <button onClick={() => handlePublish(form.form_id, form.title)} 
                                                                className="w-8 h-8 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white rounded inline-flex justify-center items-center transition" title="Publish">
                                                                <i className="fa-solid fa-upload"></i>
                                                            </button>
                                                        )}
                                                        
                                                        <button onClick={() => handleArchive(form.form_id, form.title)} 
                                                            className="w-8 h-8 bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white rounded inline-flex justify-center items-center transition" title="Archive">
                                                            <i className="fa-solid fa-box-archive"></i>
                                                        </button>
                                                        
                                                        <button onClick={() => handleClone(form.form_id)} 
                                                            className="w-8 h-8 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded inline-flex justify-center items-center transition" title="Clone">
                                                            <i className="fa-solid fa-copy"></i>
                                                        </button>

                                                        
                                                                                                            
                                                        <Link href={`/superAdmin/forms/${form.form_id}/edit`} 
                                                            className="w-8 h-8 bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white rounded inline-flex justify-center items-center transition" title="Edit">
                                                            <i className="fa-solid fa-pen"></i>
                                                        </Link>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* --- SERVER-SIDE PAGINATION CONTROLS --- */}
                        {forms.meta?.links && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-bold">{forms.meta?.from || 0}</span> to <span className="font-bold">{forms.meta?.to || 0}</span> of <span className="font-bold">{forms.meta?.total || 0}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            {forms.meta.links.map((link, index) => {
                                                let className = "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ";
                                                if (link.active) {
                                                    className += "z-10 bg-blue-600 border-[#009639] text-white";
                                                } else if (!link.url) {
                                                    className += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
                                                } else {
                                                    className += "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                                                }
                                                
                                                if (index === 0) className += " rounded-l-md";
                                                if (index === forms.meta.links.length - 1) className += " rounded-r-md";

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

                {/* --- DEPLOYMENT KIT MODAL UI --- */}
                {isDeployModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm px-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
                            
                            {/* Modal Header */}
                            <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Deploy Evaluation Kit</h3>
                                <button 
                                    onClick={() => setIsDeployModalOpen(false)} 
                                    className="text-white hover:text-gray-200 focus:outline-none"
                                >
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={submitDeployment} className="p-6 space-y-5">
                                
                                {/* Synced Department (Read-Only) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Department (Synced)</label>
                                    <div className="w-full bg-gray-100 border border-gray-300 rounded-md px-4 py-2 text-gray-600 font-medium">
                                        <i className="fa-solid fa-building mr-2"></i>
                                        {deployData.department_name}
                                    </div>
                                </div>

                                {/* Editable QR Label */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        QR Code Label / Location <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                        value={deployData.label} 
                                        onChange={e => setDeployData('label', e.target.value)} 
                                        required 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">You can edit this to specify the exact desk (e.g., "Registrar Window 2").</p>
                                </div>

                                {/* Synced Focal Person Email (Read-Only) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Focal Person Email Address (Synced)
                                    </label>
                                    <div className="w-full bg-gray-100 border border-gray-300 rounded-md px-4 py-2 text-gray-600 font-medium">
                                        <i className="fa-solid fa-envelope mr-2 text-gray-500"></i>
                                        {deployData.focal_person_email ? (
                                            <span>{deployData.focal_person_email}</span>
                                        ) : (
                                            <span className="text-red-500 italic text-sm">No email assigned in database</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">The QR Code and direct link will be sent to this official address.</p>
                                </div>

                                {/* Modal Actions */}
                                <div className="pt-4 flex justify-end space-x-3 border-t">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsDeployModalOpen(false)}
                                        className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
                                        disabled={isSending}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                
                                        disabled={isSending || !deployData.focal_person_email}
                                        className={`px-5 py-2.5 rounded-lg text-white font-semibold transition flex items-center ${
                                            (isSending || !deployData.focal_person_email) ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                    >
                                        {isSending ? (
                                            <>
                                                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Deploying...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-paper-plane mr-2"></i> Send Kit
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}