import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import SearchFilter from '@/Components/SearchFilter';
import Pagination from '@/Components/Pagination';

export default function Archives({ archivedForms, archivedDepartments, archivedAccounts, uniqueDepartments, filters }) {
    const { flash } = usePage().props;

    // --- STATE MANAGEMENT ---
    const queryParams = new URLSearchParams(window.location.search);
    const initialTab = queryParams.get('tab') || 'forms';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters?.department || '');
    const isInitialRender = useRef(true);
    const hasActiveFilters = !!departmentFilter;

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
    const accountList = archivedAccounts?.data || archivedAccounts || [];

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

    const handleRestoreAccount = (userId, userName) => {
        Swal.fire({
            title: 'Restore Account?',
            text: `Are you sure you want to reactivate ${userName}'s access?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-undo"></i> Yes, Restore!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('superadmin.users.restore', userId), {}, { preserveScroll: true });
            }
        });
    };

    const handleDeleteAccount = (userId, userName) => {
        Swal.fire({
            title: 'Permanently Delete Account?',
            text: `CRITICAL WARNING: "${userName}" will be permanently erased. Are you sure?`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-skull"></i> Force Delete'
       }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.users.force-delete', userId), { preserveScroll: true });
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="System Archives">
            <Head title="System Archives" />
            
            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                {/* --- TABS NAVIGATION --- */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-gray-200 p-1 rounded-lg w-full max-w-2xl">
                        <button
                            onClick={() => setActiveTab('forms')}
                            className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${
                                activeTab === 'forms' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="fa-solid fa-file-signature mr-2"></i> Archived Forms
                        </button>
                        <button
                            onClick={() => setActiveTab('departments')}
                            className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${
                                activeTab === 'departments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="fa-solid fa-building mr-2"></i> Archived Depts
                        </button>
                        <button
                            onClick={() => setActiveTab('accounts')}
                            className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${
                                activeTab === 'accounts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="fa-solid fa-users-slash mr-2"></i> Archived Accounts
                        </button>
                    </div>

                    {/* --- TOOLBAR --- */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                        {/* Combined Search & Filter Component */}
                            <SearchFilter 
                                searchValue={searchQuery}
                                onSearchChange={setSearchQuery}
                                searchPlaceholder={`Search archived ${activeTab}...`}
                                hasActiveFilters={activeTab === 'forms' && hasActiveFilters}
                                onFilterReset={() => setDepartmentFilter('')}
                                filterTitle="Filter Archives"
                            >
                                {/* Only inject the filter dropdown if we are on the Forms tab */}
                                {activeTab === 'forms' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">By Department</label>
                                        <select 
                                            className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:ring-[#009639] focus:border-[#009639] bg-gray-50 hover:bg-white transition-colors cursor-pointer"
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
                                )}
                            </SearchFilter>

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

                            {/* ACCOUNTS TABLE */}
                            {activeTab === 'accounts' && (
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-[#009639] text-white">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Date Archived</th>
                                            <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {accountList.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                    <i className="fa-solid fa-user-xmark text-4xl mb-4 block text-gray-300"></i>
                                                    <p className="text-base font-semibold">No archived accounts found</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            accountList.map((acc) => (
                                                <tr key={acc.user_id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-semibold text-gray-800">{acc.firstname} {acc.lastname}</td>
                                                    <td className="px-6 py-4 text-gray-600">{acc.email}</td>
                                                    <td className="px-6 py-4 text-gray-600">{acc.role}</td>
                                                    <td className="px-6 py-4 text-gray-500">{formatDate(acc.deleted_at)}</td>
                                                    <td className="px-6 py-4 text-center space-x-2">
                                                        <button onClick={() => handleRestoreAccount(acc.user_id, `${acc.firstname} ${acc.lastname}`)} className="w-8 h-8 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded transition tooltip" title="Restore"><i className="fa-solid fa-undo"></i></button>
                                                        <button onClick={() => handleDeleteAccount(acc.user_id, `${acc.firstname} ${acc.lastname}`)} className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded transition tooltip" title="Force Delete"><i className="fa-solid fa-trash"></i></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination wrapper pass the raw object */}
                        {/* Pagination wrapper */}
                        <Pagination 
                            dataObject={
                                activeTab === 'forms' ? archivedForms : 
                                activeTab === 'departments' ? archivedDepartments : 
                                archivedAccounts
                            } 
                        />
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
