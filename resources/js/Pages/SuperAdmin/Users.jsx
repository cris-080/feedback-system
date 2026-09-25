import { useState, useEffect, useRef } from 'react';
import { Head, useForm, usePage, router, Link } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import SearchFilter from '@/Components/SearchFilter';
import Pagination from '@/Components/Pagination';

export default function Users({ accounts, departments, roles, filters }) {
    const { flash, auth } = usePage().props;
    
    // --- TAB STATE ('accounts' | 'roles') ---
    const [activeTab, setActiveTab] = useState('accounts');


    // --- SERVER-SIDE SEARCH & FILTER STATE ---
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [roleFilter, setRoleFilter] = useState(filters?.role || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters?.department || '');

    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const queryParams = {};
            if (searchQuery) queryParams.search = searchQuery;
            if (roleFilter) queryParams.role = roleFilter;
            if (departmentFilter) queryParams.department = departmentFilter;

            router.get(
                route('superadmin.users.index'),
                queryParams,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, roleFilter, departmentFilter]);

    // Account Form state
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        firstname: '',
        lastname: '',
        username: '',
        email: '',
        password: '',
        role: '',
        department_id: '',
    });

    // --- SWEETALERT2 TOAST & ERROR NOTIFICATIONS ---
    useEffect(() => {
        if (flash?.success) {
            Swal.fire({ title: 'Success!', text: flash.success, icon: 'success', toast: true, position: 'top-end', timer: 3000, timerProgressBar: true, showConfirmButton: false });
        }
        if (flash?.error) {
            Swal.fire({ title: 'Action Denied', text: flash.error, icon: 'error', confirmButtonColor: '#dc2626' });
        }
    }, [flash]);

    // --- ACCOUNTS MODAL STATE ---
    const [showModal, setShowModal] = useState(false); 
    const [animateModal, setAnimateModal] = useState(false); 
    const [isEditing, setIsEditing] = useState(false);
    const [editUserId, setEditUserId] = useState(null);

    const openModal = (user = null) => {
        if (user && user.user_id) {
            setIsEditing(true);
            setEditUserId(user.user_id);
            setData({
                firstname: user.firstname,
                lastname: user.lastname,
                username: user.username || '',
                email: user.email,
                password: '',
                role: user.role,
                department_id: user.department_id || '',
            });
        } else {
            setIsEditing(false);
            setEditUserId(null);
            // Explicitly clear the fields instead of relying on reset()
            setData({
                firstname: '',
                lastname: '',
                username: '',
                email: '',
                password: '',
                role: '',
                department_id: '',
            });
            clearErrors();
        }
        setShowModal(true); 
        setTimeout(() => setAnimateModal(true), 10); 
    };
    
    const closeModal = () => {
        setAnimateModal(false); 
        setTimeout(() => {
            setShowModal(false); 
            // Explicitly clear the fields on close
            setData({
                firstname: '',
                lastname: '',
                username: '',
                email: '',
                password: '',
                role: '',
                department_id: '',
            });
            clearErrors();
            setIsEditing(false);
            setEditUserId(null);
        }, 300); 
    };

    // --- ROLE MODAL STATE & FORM ---
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    const { data: roleData, setData: setRoleData, post: postRole, put: putRole, reset: resetRole, errors: roleErrors, processing: roleProcessing } = useForm({
        role_name: '',
        description: '',
    });

    const openCreateRoleModal = () => {
        setEditingRole(null);
        resetRole();
        setShowRoleModal(true);
    };

    const openEditRoleModal = (role) => {
        setEditingRole(role);
        setRoleData({
            role_name: role.role_name,
            description: role.description || '',
        });
        setShowRoleModal(true);
    };

    const handleRoleSubmit = (e) => {
        e.preventDefault();
        if (editingRole) {
            putRole(route('superadmin.roles.update', editingRole.role_id), {
                onSuccess: () => {
                    setShowRoleModal(false);
                    Swal.fire({ title: 'Role Updated!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                }
            });
        } else {
            postRole(route('superadmin.roles.store'), {
                onSuccess: () => {
                    setShowRoleModal(false);
                    Swal.fire({ title: 'Role Created!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                }
            });
        }
    };

    const handleRoleDelete = (role) => {
        Swal.fire({
            title: `Delete ${role.role_name}?`,
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete Role'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.roles.destroy', role.role_id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ title: 'Role Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                    }
                });
            }
        });
    };

  // --- ACTION HANDLERS ---
    const submitForm = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(route('superadmin.users.update', editUserId), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({ 
                        title: 'Account Updated!', 
                        text: 'The user account has been updated.', 
                        icon: 'success', 
                        toast: true, 
                        position: 'top-end', 
                        timer: 3000, 
                        showConfirmButton: false });
                },
            });
        } else {
            post(route('superadmin.users.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({ title: 'Account Created!', text: 'The new user account has been created.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                },
            });
        }
    };;

   // 1. ARCHIVE ACCOUNT (Formerly Delete)
    const handleArchive = (user) => {
        // Prevent self-archiving (assuming auth.user.id is available via usePage().props)
        if (user.user_id === auth?.user?.user_id) {
            Swal.fire('Action Denied', 'You cannot archive your own active session.', 'error');
            return;
        }

        const isFocalPerson = user.role === 'Focal Person';
        const warningText = isFocalPerson 
            ? `Archiving ${user.firstname} will leave the "${user.department_name}" department without a manager. Their account will be moved to the archives and they will lose system access.`
            : `Are you sure you want to move ${user.firstname}'s account to the archives? They will lose system access, but their history will be preserved.`;

        Swal.fire({
            title: isFocalPerson ? 'Archive Focal Person?' : 'Archive Account?',
            text: warningText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-box-archive"></i> Yes, Archive it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.users.destroy', user.user_id), { 
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ title: 'Archived!', text: 'The user account has been moved to archives.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                    }
                });
            }
        });
    };

   // 2. SUSPEND / DISABLE ACCESS
   const handleSuspend = (userId, userName, currentStatus) => {
        const isSuspended = currentStatus === 'Suspended';
        
        if (isSuspended) {
            // Flow for Restoring Access (No reason needed)
            Swal.fire({
                title: 'Restore Access?',
                text: `Allow ${userName} to log in again?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#10b981', 
                cancelButtonColor: '#6b7280',
                confirmButtonText: '<i class="fa-solid fa-check"></i> Yes, Restore!'
            }).then((result) => {
                if (result.isConfirmed) {
                    router.patch(route('superadmin.users.suspend', userId), {}, {
                        preserveScroll: true,
                        onSuccess: () => {
                            Swal.fire({ title: 'Success!', text: 'Account access restored.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                        }
                    });
                }
            });
        } else {
            // Flow for Suspending Access (Prompt for reason)
            Swal.fire({
                title: 'Suspend Access?',
                text: `Provide a reason for suspending ${userName}:`,
                input: 'textarea',
                inputPlaceholder: 'e.g., Policy violation, Pending investigation...',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280',
                confirmButtonText: '<i class="fa-solid fa-ban"></i> Suspend',
                inputValidator: (value) => {
                    if (!value) {
                        return 'You need to provide a reason for the suspension!';
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    // Pass the typed reason to the backend
                    router.patch(route('superadmin.users.suspend', userId), { reason: result.value }, {
                        preserveScroll: true,
                        onSuccess: () => {
                            Swal.fire({ title: 'Suspended!', text: 'Account access revoked.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                        }
                    });
                }
            });
        }
    };

    // 3. RESET PASSWORD
    const handleResetPassword = (userId, userName) => {
        Swal.fire({
            title: 'Reset Password?',
            text: `Generate a new default password for ${userName}?`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-key"></i> Yes, Reset!'
        }).then((result) => {
            if (result.isConfirmed) {
                // Point this to a new route in your web.php
                router.post(route('superadmin.users.reset-password', userId), {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        // The backend should ideally flash the new temporary password to the frontend so the admin can copy it!
                        Swal.fire('Reset Complete', 'The password has been reset to the default system password.', 'success');
                    }
                });
            }
        });
    };
    const hasActiveFilters = Boolean(roleFilter || departmentFilter);

    return (
        <SuperAdminLayout headerTitle="System Accounts">
            <Head title="System Accounts & Roles" />
            
            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* --- TAB 1: ACCOUNTS SECTION --- */}
                    {activeTab === 'accounts' && (
                        <>
                            {/* Toolbar Section */}
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                                
                               <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-wrap md:flex-nowrap">
                                        
                                        {/* Combined Search & Filter Component */}
                                        <SearchFilter 
                                            searchValue={searchQuery}
                                            onSearchChange={setSearchQuery}
                                            searchPlaceholder="Search names or emails..."
                                            hasActiveFilters={hasActiveFilters}
                                            onFilterReset={() => { setRoleFilter(''); setDepartmentFilter(''); }}
                                            filterTitle="Filter Accounts"
                                        >
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">By System Role</label>
                                                <select 
                                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white" 
                                                    value={roleFilter} 
                                                    onChange={(e) => setRoleFilter(e.target.value)}
                                                >
                                                    <option value="">All Roles</option>
                                                    <option value="SuperAdmin">SuperAdmin</option>
                                                    <option value="Feedback Committee">Feedback Committee</option>
                                                    <option value="Focal Person">Focal Person</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">By Department</label>
                                                <select 
                                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white" 
                                                    value={departmentFilter} 
                                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                                >
                                                    <option value="">All Departments</option>
                                                    <option value="unassigned">System Wide Access</option>
                                                    {departments.map(dept => (
                                                        <option key={dept.department_id} value={dept.department_name}>{dept.department_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </SearchFilter>

                                        {/* Accounts / Roles Tab Switcher */}
                                        <div className="bg-gray-100 rounded-lg p-1 flex space-x-1 w-full sm:w-auto border border-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('accounts')}
                                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center ${
                                                    activeTab === 'accounts'
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                <i className="fa-solid fa-users-gear mr-1.5"></i> Accounts
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('roles')}
                                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center ${
                                                    activeTab === 'roles'
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                <i className="fa-solid fa-user-shield mr-1.5"></i> Roles
                                            </button>
                                        </div>

                                    </div>

                                {/* Add Account Button */}
                                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-semibold text-sm transition shadow-sm whitespace-nowrap w-full xl:w-auto flex items-center justify-center">
                                    <i className="fa-solid fa-user-plus mr-2"></i> Add Account
                                </button>
                            </div>

                            {/* Active Accounts Table */}
                 
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-full">
                                 <table className="min-w-full text-left text-sm divide-y divide-gray-200 table-fixed">
                                    <thead className="bg-[#009639] text-white">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Username</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Department</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 font-semibold text-center uppercase tracking-wider whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                       {accounts.data.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500"> {/* Changed 6 to 7 */}
                                                    <i className="fa-solid fa-filter-circle-xmark text-4xl mb-4 block text-gray-300"></i>
                                                    <p className="text-base font-semibold">No users found</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            accounts.data.map(acc => {
                                                const userId = acc.user_id; 
                                                const fullName = `${acc.firstname} ${acc.lastname}`;

                                                return (
                                                    <tr key={userId} className="hover:bg-gray-50 transition">
                                                        <td className="px-4 py-4 font-semibold text-gray-900 break-words">
                                                            {acc.lastname}, {acc.firstname}
                                                        </td>
                                                        <td className="px-4 py-4 text-gray-600 break-words">
                                                            {acc.username}
                                                        </td>
                                                        <td className="px-4 py-4 text-gray-600 break-all">
                                                            {acc.email}
                                                        </td>
                                                        
                                                        <td className="px-4 py-4">
                                                            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full whitespace-nowrap ${acc.role === 'SuperAdmin' ? 'bg-purple-100 text-purple-800' : acc.role === 'Feedback Committee' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                                {acc.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-gray-600 break-words">
                                                            {acc.department_name || (acc.role !== 'Focal Person' ? 'System Wide' : 'Unassigned')}
                                                        </td>
                                                        
                                                        <td className="px-4 py-4">
                                                            <span className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full whitespace-nowrap ${
                                                                acc.status === 'Suspended' 
                                                                    ? 'bg-red-100 text-red-700 border border-red-200' 
                                                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                            }`}>
                                                                {acc.status === 'Suspended' ? 'Suspended' : 'Active'}
                                                            </span>
                                                        </td>

                                                        {/* UPDATED ACTIONS COLUMN (Allows stacking) */}
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="flex flex-nowrap justify-center items-center gap-1.5">
                                                                <button onClick={() => openModal(acc)} className="w-8 h-8 flex-shrink-0 bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white rounded flex justify-center items-center transition tooltip" title="Edit User">
                                                                    <i className="fa-solid fa-pen"></i>
                                                                </button>
                                                                
                                                                <button onClick={() => handleResetPassword(userId, fullName)} className="w-8 h-8 flex-shrink-0 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded flex justify-center items-center transition tooltip" title="Reset Password to Default">
                                                                    <i className="fa-solid fa-key"></i>
                                                                </button>

                                                                <button onClick={() => handleSuspend(userId, fullName, acc.status)} className={`w-8 h-8 flex-shrink-0 rounded flex justify-center items-center transition tooltip ${acc.status === 'Suspended' ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white'}`} title={acc.status === 'Suspended' ? "Restore Access" : "Suspend Access"}>
                                                                    <i className={`fa-solid ${acc.status === 'Suspended' ? 'fa-unlock' : 'fa-ban'}`}></i>
                                                                </button>

                                                              <button onClick={() => handleArchive(acc)} className="w-8 h-8 flex-shrink-0 bg-gray-100 text-gray-600 hover:bg-orange-500 hover:text-white rounded flex justify-center items-center transition tooltip" title="Archive User">
                                                                    <i className="fa-solid fa-box-archive"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>

                                {/* Server-Side Pagination */}
                                <Pagination dataObject={accounts} />
                            </div>
                        </>
                    )}

                    {/* --- TAB 2: ROLES SECTION --- */}
                    {activeTab === 'roles' && (
                        <div className="space-y-6">
                            
                            {/* Roles Header Banner */}
                            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-gray-100 rounded-lg p-1 flex space-x-1 border border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('accounts')}
                                            className="px-4 py-1.5 rounded-md text-xs font-bold text-gray-600 hover:bg-gray-200 transition"
                                        >
                                            <i className="fa-solid fa-users-gear mr-1.5"></i> Accounts
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('roles')}
                                            className="px-4 py-1.5 rounded-md text-xs font-bold bg-blue-600 text-white shadow-sm"
                                        >
                                            <i className="fa-solid fa-user-shield mr-1.5"></i> Roles
                                        </button>
                                    </div>

                                    <div>
                                        <h2 className="text-lg font-bold text-[#1E6031]">System & Custom Roles</h2>
                                        <p className="text-xs text-gray-500">Configure account access levels for current and future system modules.</p>
                                    </div>
                                </div>

                                <button 
                                    type="button"
                                    onClick={openCreateRoleModal}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition shadow-sm flex items-center"
                                >
                                    <i className="fa-solid fa-plus mr-2"></i> Add New Role
                                </button>
                            </div>

                            {/* Roles Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {roles?.map((role) => (
                                    <div key={role.role_id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg font-bold text-gray-900">{role.role_name}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                                                    role.is_system ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {role.is_system ? 'System Core' : 'Custom'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-mono text-gray-400 mb-3">Key: {role.role_key}</p>
                                            <p className="text-sm text-gray-600 mb-4">{role.description || 'No description provided.'}</p>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                            <span><strong>{role.accounts_count || 0}</strong> Active Users</span>
                                            
                                            <div className="space-x-3">
                                                <button type="button" onClick={() => openEditRoleModal(role)} className="text-blue-600 hover:text-blue-800 font-bold">Edit</button>
                                                {!role.is_system && (
                                                    <button type="button" onClick={() => handleRoleDelete(role)} className="text-red-600 hover:text-red-800 font-bold">Delete</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Modal for Creating & Editing Account */}
{showModal && (
    <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ease-out ${animateModal ? 'opacity-100' : 'opacity-0'}`} 
        onClick={closeModal}
    >
        <div 
            className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden transition-all duration-300 ease-out flex flex-col max-h-[90vh] ${animateModal ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}`} 
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#009639]/10 text-[#009639] flex items-center justify-center font-bold">
                        <i className={`fa-solid ${isEditing ? 'fa-user-pen' : 'fa-user-plus'}`}></i>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 leading-tight">
                            {isEditing ? 'Edit Account' : 'Provision New Account'}
                        </h3>
                        <p className="text-xs text-gray-500">Configure credentials, access boundaries, and institutional role</p>
                    </div>
                </div>
                <button 
                    onClick={closeModal} 
                    className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition flex items-center justify-center"
                >
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <form onSubmit={submitForm} className="overflow-y-auto p-6 space-y-6">
                
                {/* Section 1: Personal Details */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-1.5">
                        <i className="fa-regular fa-id-card text-xs text-[#009639]"></i>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Personal Information</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-700">First Name <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                className="w-full text-sm border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639]" 
                                placeholder="Juan" 
                                value={data.firstname} 
                                onChange={e => setData('firstname', e.target.value)} 
                                required 
                            />
                            {errors.firstname && <div className="text-red-500 text-xs mt-1 font-medium">{errors.firstname}</div>}
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-700">Last Name <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                className="w-full text-sm border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639]" 
                                placeholder="Dela Cruz" 
                                value={data.lastname} 
                                onChange={e => setData('lastname', e.target.value)} 
                                required 
                            />
                            {errors.lastname && <div className="text-red-500 text-xs mt-1 font-medium">{errors.lastname}</div>}
                        </div>
                    </div>
                </div>

                {/* Section 2: Account & Authentication */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-1.5">
                        <i className="fa-solid fa-shield-halved text-xs text-[#009639]"></i>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Credentials & Security</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-700">Username <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                className="w-full text-sm border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639]" 
                                placeholder="juandelacruz" 
                                value={data.username} 
                                onChange={e => setData('username', e.target.value)} 
                                required 
                            />
                            {errors.username && <div className="text-red-500 text-xs mt-1 font-medium">{errors.username}</div>}
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-700">Email Address <span className="text-red-500">*</span></label>
                            <input 
                                type="email" 
                                className="w-full text-sm border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639]" 
                                placeholder="example@clsu.edu.ph" 
                                value={data.email} 
                                onChange={e => setData('email', e.target.value)} 
                                required 
                            />
                            {errors.email && <div className="text-red-500 text-xs mt-1 font-medium">{errors.email}</div>}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold mb-1 text-gray-700">
                                {isEditing ? 'Update Password' : 'Initial Temporary Password'} {!isEditing && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                                type="text" 
                                className="w-full text-sm border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639]" 
                                placeholder={isEditing ? 'Leave blank to preserve current password' : 'Enter temporary password'}
                                value={data.password} 
                                onChange={e => setData('password', e.target.value)} 
                                required={!isEditing} 
                            />
                            {errors.password && <div className="text-red-500 text-xs mt-1 font-medium">{errors.password}</div>}
                        </div>
                    </div>
                </div>

                {/* Section 3: Access Control & Permissions */}
                <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-200/70 pb-2">
                        <i className="fa-solid fa-lock text-xs text-amber-600"></i>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Access Scope & Role Assignment</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={(data.role === 'SuperAdmin' || data.role === 'Feedback Committee' || data.role === '') ? 'sm:col-span-2' : ''}>
                            <label className="block text-xs font-semibold mb-1 text-gray-700">System Role <span className="text-red-500">*</span></label>
                            <select 
                                className="w-full text-sm bg-white border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] cursor-pointer" 
                                value={data.role} 
                                onChange={e => {
                                    const selected = e.target.value;
                                    setData(prev => ({
                                        ...prev, 
                                        role: selected,
                                        department_id: (selected === 'SuperAdmin' || selected === 'Feedback Committee') ? '' : prev.department_id,
                                    }));
                                }} 
                                required
                            >
                                <option value="" disabled>-- Select a Role --</option>
                                {roles.map((role) => (
                                    <option key={role.role_id} value={role.role_name}>
                                        {role.role_name}
                                    </option>
                                ))}
                            </select>
                            {errors.role && <div className="text-red-500 text-xs mt-1 font-semibold">{errors.role}</div>}
                        </div>
                        
                        {/* Dynamic Department Scope */}
                        {(data.role !== 'SuperAdmin' && data.role !== 'Feedback Committee' && data.role !== '') && (
                            <div className="animate-fade-in-up">
                                <label className="block text-xs font-semibold mb-1 text-gray-700">Department Scope <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full text-sm bg-white border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639] cursor-pointer" 
                                    value={data.department_id || ''} 
                                    onChange={e => setData('department_id', e.target.value)} 
                                    required
                                >
                                    <option value="">-- Select Department --</option>
                                    {departments.map(dept => (
                                        <option key={dept.department_id} value={dept.department_id}>
                                            {dept.department_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.department_id && <div className="text-red-500 text-xs mt-1 font-medium">{errors.department_id}</div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                    <button 
                        type="button" 
                        onClick={closeModal} 
                        className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={processing} 
                        className="px-5 py-2 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-2"
                    >
                        {processing && <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>}
                        <span>{processing ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
)}

            {/* Modal for Creating & Editing Roles */}
            {showRoleModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {editingRole ? (editingRole.is_system ? 'Edit System Role Details' : 'Edit Custom Role') : 'Create Custom Role'}
                        </h3>
                        <form onSubmit={handleRoleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Role Display Name</label>
                                <input 
                                    type="text" 
                                    value={roleData.role_name}
                                    onChange={e => setRoleData('role_name', e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#009639] focus:border-[#009639]"
                                    placeholder="e.g. Quality Assurance Officer"
                                    required 
                                />
                                {roleErrors.role_name && <p className="text-red-500 text-xs mt-1">{roleErrors.role_name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                <textarea 
                                    value={roleData.description}
                                    onChange={e => setRoleData('description', e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#009639] focus:border-[#009639]"
                                    rows="3"
                                    placeholder="Briefly describe what this role does..."
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button 
                                    type="button" 
                                    onClick={() => setShowRoleModal(false)}
                                    className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={roleProcessing}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md font-bold hover:bg-blue-600 text-sm"
                                >
                                    {editingRole ? 'Update Role' : 'Save Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}