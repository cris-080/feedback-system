import { Head, useForm, usePage, router, Link } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';
import SearchFilter from '@/Components/SearchFilter';
import Pagination from '@/Components/Pagination';

export default function Departments({ departments, filters, isSuperAdmin }) {
    const { flash } = usePage().props;
    const [activeServiceDept, setActiveServiceDept] = useState(null);
    const [activePositionDept, setActivePositionDept] = useState(null);
    const [activeProviderDept, setActiveProviderDept] = useState(null);
    
    // --- SERVER-SIDE SEARCH STATE ---
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const queryParams = {};
            if (searchQuery) queryParams.search = searchQuery;
            if (statusFilter !== 'all') queryParams.status = statusFilter; // Add status payload

            router.get(
                route('superadmin.departments.index'),
                queryParams,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, statusFilter]);
    
    // --- MODAL & EDITING STATE ---
    const [showModal, setShowModal] = useState(false);
    const [animateModal, setAnimateModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editDeptId, setEditDeptId] = useState(null);
    const [syncedEmail, setSyncedEmail] = useState('');

    // Department Form
    const { data, setData, post, put, processing, reset, clearErrors, errors } = useForm({
        name: '',
        description: '',
        initial_services: '',
        initial_positions: '',
        initial_providers: ''
    });

    // Service Form
    const { data: serviceData, setData: setServiceData, post: postService, processing: processingService, reset: resetService } = useForm({
        service_name: ''
    });

    // Position Form
    const { data: positionData, setData: setPositionData, post: postPosition, processing: processingPosition, reset: resetPosition } = useForm({
        position_name: ''
    });

    // Provider Form
    const { data: providerData, setData: setProviderData, post: postProvider, processing: processingProvider, reset: resetProvider } = useForm({
        name: '',
        position: ''
    });

    // Bulk Positions Form
    const { data: bulkData, setData: setBulkData, post: postBulk, processing: processingBulk, reset: resetBulk } = useForm({
        position_name: '',
        department_ids: []
    });
    const [showBulkModal, setShowBulkModal] = useState(false);

    // --- SWEETALERT2 TOAST NOTIFICATIONS (For minor actions) ---
    useEffect(() => {
        if (flash?.success) {
            Swal.fire({
                title: 'Success!',
                text: flash.success,
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
            });
        }
    }, [flash]);

   // --- MODAL CONTROLS ---
    const openModal = (dept = null) => {
        if (dept && dept.department_id) {
            setIsEditing(true);
            setEditDeptId(dept.department_id);
            setData({
                name: dept.department_name,
                description: dept.description || ''
            });
            setSyncedEmail(dept.focal_person ? dept.focal_person.email : '');
        } else {
            setIsEditing(false);
            setEditDeptId(null);
            // Explicitly clear the fields instead of using reset()
            setData({ name: '', description: '' });
            setSyncedEmail('');
        }
        setShowModal(true);
        setTimeout(() => setAnimateModal(true), 10);
    };
    
    const closeModal = () => {
        setAnimateModal(false);
        setTimeout(() => {
            setShowModal(false);
            // Explicitly clear the fields on close
            setData({ name: '', description: '' });
            clearErrors();
            setIsEditing(false);
            setEditDeptId(null);
            setSyncedEmail('');
        }, 300); 
    };
    // --- ACTIONS ---
    const submitDepartment = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(route('superadmin.departments.update', editDeptId), { 
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        title: 'Updated!',
                        text: 'The department has been successfully updated.',
                        icon: 'success',
                        confirmButtonColor: '#009639'
                    });
                }
            });
        } else {
            post(route('superadmin.departments.store'), { 
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        title: 'Created!',
                        text: 'The new department has been successfully created.',
                        icon: 'success',
                        confirmButtonColor: '#009639'
                    });
                }
            });
        }
    };

    const handleDelete = (id, name) => {
        Swal.fire({
            title: 'Archive Department?',
            text: `Are you sure you want to archive "${name}"? It will be moved to the archives.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Archive it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.departments.destroy', id), { 
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Archived!',
                            text: 'The department has been successfully archived.',
                            icon: 'success',
                            confirmButtonColor: '#009639'
                        });
                    }
                });
            }
        });
    };

    // --- Services ---
    const submitService = (e, deptId) => {
        e.preventDefault();
        
        // Prevent Duplicate Service Check
        const currentDept = deptList.find(d => d.department_id === deptId);
        const isDuplicate = currentDept?.services?.some(s => s.service_name.trim().toLowerCase() === serviceData.service_name.trim().toLowerCase());
        
        if (isDuplicate) {
            Swal.fire({ title: 'Duplicate Found', text: 'This service already exists in this department.', icon: 'warning', confirmButtonColor: '#f59e0b' });
            return;
        }

        postService(route('superadmin.departments.services.store', deptId), {
            preserveScroll: true,
            onSuccess: () => {
                resetService();
                setActiveServiceDept(null);
                Swal.fire({ title: 'Service Added!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
            },
        });
    };

    const handleDeleteService = (serviceId, serviceName) => {
        Swal.fire({
            title: 'Remove Service?',
            text: `Are you sure you want to remove "${serviceName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Remove'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.departments.services.destroy', serviceId), { 
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ title: 'Removed!', text: 'The service has been removed.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                    }
                });
            }
        });
    };

    // --- Positions ---
    const submitPosition = (e, deptId) => {
        e.preventDefault();

        // Prevent Duplicate Position Check
        const currentDept = deptList.find(d => d.department_id === deptId);
        const isDuplicate = currentDept?.positions?.some(p => p.position_name.trim().toLowerCase() === positionData.position_name.trim().toLowerCase());
        
        if (isDuplicate) {
            Swal.fire({ title: 'Duplicate Found', text: 'This position already exists in this department.', icon: 'warning', confirmButtonColor: '#f59e0b' });
            return;
        }

        postPosition(route('superadmin.departments.positions.store', deptId), {
            preserveScroll: true,
            onSuccess: () => {
                resetPosition();
                setActivePositionDept(null);
                Swal.fire({ title: 'Position Added!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
            },
        });
    };

    const handleDeletePosition = (positionId, positionName) => {
        Swal.fire({
            title: 'Remove Position?',
            text: `Are you sure you want to remove "${positionName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Remove'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.departments.positions.destroy', positionId), { 
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ title: 'Removed!', text: 'The position has been removed.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                    }
                });
            }
        });
    };

   // --- Providers ---
    const submitProvider = (e, deptId) => {
        e.preventDefault();

        // Prevent Duplicate Provider Check
        const currentDept = deptList.find(d => d.department_id === deptId);
        const isDuplicate = currentDept?.service_providers?.some(p => p.name.trim().toLowerCase() === providerData.name.trim().toLowerCase());
        
        if (isDuplicate) {
            Swal.fire({ title: 'Duplicate Found', text: 'This provider already exists in this department.', icon: 'warning', confirmButtonColor: '#f59e0b' });
            return;
        }

        postProvider(route('superadmin.departments.providers.store', deptId), {
            preserveScroll: true,
            onSuccess: () => {
                resetProvider();
                setActiveProviderDept(null);
                Swal.fire({ title: 'Provider Added!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
            },
        });
    };
    const handleDeleteProvider = (providerId, providerName) => {
        Swal.fire({
            title: 'Remove Provider?',
            text: `Are you sure you want to remove "${providerName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Remove'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.departments.providers.destroy', providerId), { 
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ title: 'Removed!', text: 'The provider has been removed.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
                    }
                });
            }
        });
    };

    const deptList = departments?.data || departments || [];

    // Bulk Positions Handlers
    const openBulkModal = () => {
        setBulkData({ position_name: '', department_ids: [] });
        setShowBulkModal(true);
    };

    const handleBulkSubmit = (e) => {
        e.preventDefault();
        postBulk(route('superadmin.departments.positions.bulk'), {
            onSuccess: () => {
                setShowBulkModal(false);
                resetBulk();
                Swal.fire({
                    title: 'Positions Added!',
                    text: 'The position was successfully assigned to the selected departments.',
                    icon: 'success',
                    confirmButtonColor: '#009639'
                });
            }
        });
    };

    const handleSelectAllDepts = (e) => {
        if (e.target.checked) {
            setBulkData('department_ids', deptList.map(d => d.department_id));
        } else {
            setBulkData('department_ids', []);
        }
    };

    const handleDeptCheckbox = (deptId) => {
        const currentIds = bulkData.department_ids;
        if (currentIds.includes(deptId)) {
            setBulkData('department_ids', currentIds.filter(id => id !== deptId));
        } else {
            setBulkData('department_ids', [...currentIds, deptId]);
        }
    };
    const currentDeptData = isEditing ? deptList.find(d => d.department_id === editDeptId) : null;

    return (
        <SuperAdminLayout headerTitle="Department & Services Configuration">
            <Head title="Manage Departments" />

            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                   {/* Toolbar */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-wrap md:flex-nowrap">
                            
                            {/* Combined Search & Filter Component */}
                            <SearchFilter 
                                searchValue={searchQuery}
                                onSearchChange={setSearchQuery}
                                searchPlaceholder="Search departments or services..."
                                hasActiveFilters={statusFilter !== 'all'}
                                onFilterReset={() => setStatusFilter('all')}
                                filterTitle="Filter by Status"
                            >
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Assignment Status</label>
                                    <select 
                                        className="block w-full py-2 px-3 border border-gray-300 rounded-md text-xs focus:ring-[#009639] focus:border-[#009639] bg-white cursor-pointer"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Departments</option>
                                        <option value="assigned">Assigned Focal Person</option>
                                        <option value="unassigned">Unassigned (Missing)</option>
                                    </select>
                                </div>
                            </SearchFilter>
                            
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                            <button onClick={openBulkModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-semibold transition shadow-sm whitespace-nowrap w-full sm:w-auto flex items-center justify-center">
                                <i className="fa-solid fa-layer-group mr-2"></i> Bulk Add Position
                            </button>
                            
                            {isSuperAdmin && (
                            <button 
                                onClick={() => openModal()} 
                                className="bg-[#009639] hover:bg-[#1E6031] text-white px-5 py-2.5 rounded-md font-semibold text-sm transition shadow-sm flex items-center"
                            >
                                <i className="fa-solid fa-plus mr-2"></i> Add Department
                            </button>
                            )}
                        </div>
                    </div>

                    {/* Department Directory Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-[#009639] text-white">
                                    <tr>
                                        {/* Reduced padding to px-4 and removed fixed widths to save space */}
                                        <th className="px-4 py-4 text-left font-semibold uppercase tracking-wider">Department</th>
                                        <th className="px-4 py-4 text-left font-semibold uppercase tracking-wider">Focal Person</th>
                                        <th className="px-4 py-4 text-left font-semibold uppercase tracking-wider">Services</th>
                                        <th className="px-4 py-4 text-left font-semibold uppercase tracking-wider">Positions</th>
                                        <th className="px-4 py-4 text-left font-semibold uppercase tracking-wider">Providers</th>
                                       {isSuperAdmin && (
                                            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {deptList.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                                                <i className="fa-solid fa-filter-circle-xmark text-4xl mb-4 block text-gray-300"></i>
                                                <p className="text-base font-semibold">No departments found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        deptList.map((dept) => (
                                            <tr key={dept.department_id} className="hover:bg-gray-50 align-top transition-colors">
                                                
                                                {/* Department Details */}
                                                <td className="px-4 py-4 w-1/5 min-w-[180px]">
                                                    {/* Removed whitespace-nowrap so long titles wrap nicely! */}
                                                    <div className="font-bold text-gray-900 text-base leading-tight">
                                                        {dept.department_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                                                        {dept.description || 'No description provided.'}
                                                    </div>
                                                </td>

                                                {/* Focal Person */}
                                                <td className="px-4 py-4 min-w-[160px]">
                                                    {dept.focal_person ? (
                                                        <span className="flex items-center text-gray-700 text-[11px] font-medium bg-blue-50 px-2 py-1.5 rounded-md border border-blue-100 w-fit whitespace-nowrap">
                                                            <i className="fa-solid fa-user-tie mr-1.5 text-blue-600"></i>
                                                            {dept.focal_person.email}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 italic">Unassigned</span>
                                                    )}
                                                </td>

                                                {/* READ-ONLY: Services */}
                                                <td className="px-4 py-4 min-w-[120px]">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {dept.services && dept.services.length > 0 ? (
                                                            dept.services.map(service => (
                                                                <span key={service.service_id} className="inline-flex items-center px-2 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                                                                    {service.service_name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">None</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* READ-ONLY: Positions */}
                                                <td className="px-4 py-4 min-w-[120px]">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {dept.positions && dept.positions.length > 0 ? (
                                                            dept.positions.map(pos => (
                                                                <span key={pos.position_id} className="inline-flex items-center px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                                                    {pos.position_name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">None</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* READ-ONLY: Providers */}
                                                <td className="px-4 py-4 min-w-[140px]">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {dept.service_providers && dept.service_providers.length > 0 ? (
                                                            dept.service_providers.map(prov => (
                                                                <span key={prov.provider_id} className="inline-flex items-center px-2 py-1 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded">
                                                                    {prov.name} {prov.position && <span className="font-normal opacity-75 ml-1">({prov.position})</span>}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">None</span>
                                                        )}
                                                    </div>
                                                </td>
                                                
                                                {/* Actions */}
                                                {isSuperAdmin && (
                                                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                                        <button 
                                                            onClick={() => openModal(dept)}
                                                            className="w-8 h-8 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded inline-flex justify-center items-center transition" 
                                                            title="Edit & Configure"
                                                        >
                                                            <i className="fa-solid fa-pen"></i>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(dept.department_id, dept.department_name)}
                                                            className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded inline-flex justify-center items-center transition" 
                                                            title="Archive"
                                                        >
                                                            <i className="fa-solid fa-box-archive"></i>
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Server-Side Pagination */}
                            <Pagination dataObject={departments} />
                    </div>
                </div>
            </div>

            {/* Department Modal */}
            {showModal && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm transition-opacity duration-300 ease-out p-4 ${animateModal ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0'}`} onClick={closeModal}>
                    <div className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300 ease-out ${animateModal ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`} onClick={(e) => e.stopPropagation()}>
                        
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="text-lg font-bold text-gray-800">
                                {isEditing ? <><i className="fa-solid fa-building-circle-check mr-2 text-[#009639]"></i>Edit Department Configuration</> : <><i className="fa-solid fa-plus mr-2 text-[#009639]"></i>Provision New Department</>}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><i className="fa-solid fa-xmark text-xl"></i></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">Department Name <span className="text-red-500">*</span></label>
                                    <input type="text" className="w-full border-gray-300 rounded focus:ring focus:ring-emerald-200 focus:border-emerald-500 shadow-sm" 
                                        value={data.name} onChange={e => setData('name', e.target.value)} required placeholder="e.g. Office of Admission" />
                                    {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">Assigned Focal Person (Auto-Synced)</label>
                                    <div className="w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm px-4 py-2 text-sm text-gray-600 flex items-center">
                                        {isEditing && syncedEmail ? (
                                            <>
                                                <i className="fa-solid fa-lock mr-2 text-gray-500"></i>
                                                <span className="font-medium">{syncedEmail}</span>
                                            </>
                                        ) : (
                                            <span className="italic text-gray-400">
                                                {isEditing ? 'No Focal Person assigned yet.' : 'Assign a Focal Person via User Management after creating.'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">To assign or change the Focal Person, go to the <strong>Manage Users</strong> tab.</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">Description</label>
                                    <textarea className="w-full border-gray-300 rounded focus:ring focus:ring-emerald-200 focus:border-emerald-500 shadow-sm" rows="2"
                                        value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Optional details..."></textarea>
                                </div>
                            </div>
                                        {/* --- QUICK ADD CONFIGURATIONS (Visible only when creating) --- */}
                                {!isEditing && (
                                    <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Initial Setup (Optional)</h4>
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">Comma-separated</span>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold mb-1 text-gray-700">Services Offered</label>
                                            <input type="text" className="w-full border-gray-300 rounded focus:ring focus:ring-blue-200 focus:border-blue-500 shadow-sm text-sm" 
                                                value={data.initial_services || ''} onChange={e => setData('initial_services', e.target.value)} placeholder="e.g. Clearance, Enrollment, Consultation" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-1 text-gray-700">Job Positions</label>
                                            <input type="text" className="w-full border-gray-300 rounded focus:ring focus:ring-emerald-200 focus:border-emerald-500 shadow-sm text-sm" 
                                                value={data.initial_positions || ''} onChange={e => setData('initial_positions', e.target.value)} placeholder="e.g. Faculty Member, Staff, Cashier" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-1 text-gray-700">Service Providers</label>
                                            <input type="text" className="w-full border-gray-300 rounded focus:ring focus:ring-purple-200 focus:border-purple-500 shadow-sm text-sm" 
                                                value={data.initial_providers || ''} onChange={e => setData('initial_providers', e.target.value)} placeholder="e.g. John Doe, Jane Smith, Dr. Banner" />
                                            <p className="text-[11px] text-gray-500 mt-1.5 italic">Note: You can link specific positions to these providers later by clicking the edit icon.</p>
                                        </div>
                                    </div>
                                )}
                            {/* --- EDITABLE CONFIGURATIONS (Only visible when editing an existing dept) --- */}
                            {isEditing && currentDeptData && (
                                <div className="mt-8 pt-6 border-t border-gray-200 space-y-6">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Internal Configuration</h4>

                                    {/* SERVICES */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <h5 className="font-bold text-gray-800 mb-3 text-sm"><i className="fa-solid fa-layer-group mr-2 text-blue-600"></i>Services Offered</h5>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {currentDeptData.services && currentDeptData.services.length > 0 ? (
                                                currentDeptData.services.map(service => (
                                                    <span key={service.service_id} className="inline-flex items-center px-2.5 py-1 box-border text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                                                        {service.service_name}
                                                        <button onClick={() => handleDeleteService(service.service_id, service.service_name)} className="ml-2 text-blue-400 hover:text-red-500 transition">
                                                            <i className="fa-solid fa-times-circle"></i>
                                                        </button>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No services added yet.</span>
                                            )}
                                        </div>
                                        {activeServiceDept === currentDeptData.department_id ? (
                                            <form onSubmit={(e) => submitService(e, currentDeptData.department_id)} className="flex mt-2">
                                                <input type="text" className="text-sm border border-gray-300 rounded-l p-2 w-full focus:ring focus:ring-blue-200 outline-none" placeholder="Service Name (e.g. Clearance)" required autoFocus value={serviceData.service_name} onChange={e => setServiceData('service_name', e.target.value)} />
                                                <button type="submit" disabled={processingService} className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 text-sm font-semibold">Save</button>
                                                <button type="button" onClick={() => setActiveServiceDept(null)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-r hover:bg-gray-300"><i className="fa-solid fa-times"></i></button>
                                            </form>
                                        ) : (
                                            <button onClick={() => setActiveServiceDept(currentDeptData.department_id)} className="text-sm text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition">
                                                <i className="fa-solid fa-plus mr-1"></i> Add Service
                                            </button>
                                        )}
                                    </div>

                                    {/* POSITIONS */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <h5 className="font-bold text-gray-800 mb-3 text-sm"><i className="fa-solid fa-user-tie mr-2 text-emerald-600"></i>Job Positions</h5>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {currentDeptData.positions && currentDeptData.positions.length > 0 ? (
                                                currentDeptData.positions.map(pos => (
                                                    <span key={pos.position_id} className="inline-flex items-center px-2.5 py-1 box-border text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                                        {pos.position_name}
                                                        <button onClick={() => handleDeletePosition(pos.position_id, pos.position_name)} className="ml-2 text-emerald-400 hover:text-red-500 transition">
                                                            <i className="fa-solid fa-times-circle"></i>
                                                        </button>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No positions added yet.</span>
                                            )}
                                        </div>
                                        {activePositionDept === currentDeptData.department_id ? (
                                            <form onSubmit={(e) => submitPosition(e, currentDeptData.department_id)} className="flex mt-2">
                                                <input type="text" className="text-sm border border-gray-300 rounded-l p-2 w-full focus:ring focus:ring-emerald-200 outline-none" placeholder="Position Name (e.g. Staff)" required autoFocus value={positionData.position_name} onChange={e => setPositionData('position_name', e.target.value)} />
                                                <button type="submit" disabled={processingPosition} className="bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 text-sm font-semibold">Save</button>
                                                <button type="button" onClick={() => setActivePositionDept(null)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-r hover:bg-gray-300"><i className="fa-solid fa-times"></i></button>
                                            </form>
                                        ) : (
                                            <button onClick={() => setActivePositionDept(currentDeptData.department_id)} className="text-sm text-emerald-600 hover:text-emerald-800 font-semibold border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition">
                                                <i className="fa-solid fa-plus mr-1"></i> Add Position
                                            </button>
                                        )}
                                    </div>

                                    {/* PROVIDERS */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <h5 className="font-bold text-gray-800 mb-3 text-sm"><i className="fa-solid fa-users mr-2 text-purple-600"></i>Service Providers</h5>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {currentDeptData.service_providers && currentDeptData.service_providers.length > 0 ? (
                                                currentDeptData.service_providers.map(prov => (
                                                    <span key={prov.provider_id} className="inline-flex items-center px-2.5 py-1 box-border text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded">
                                                        <span>{prov.name}</span>
                                                        {prov.position && (
                                                            <span className="text-purple-400 font-normal ml-1">({prov.position})</span>
                                                        )}
                                                        <button onClick={() => handleDeleteProvider(prov.provider_id, prov.name)} className="ml-2 text-purple-400 hover:text-red-500 transition">
                                                            <i className="fa-solid fa-times-circle"></i>
                                                        </button>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No providers added yet.</span>
                                            )}
                                        </div>
                                        {activeProviderDept === currentDeptData.department_id ? (
                                            <form onSubmit={(e) => submitProvider(e, currentDeptData.department_id)} className="flex flex-col gap-2 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <input 
                                                    type="text" 
                                                    className="text-sm border border-gray-300 rounded p-2 w-full focus:ring focus:ring-purple-200 outline-none" 
                                                    placeholder="Provider Name (e.g. Dr. Santos)" 
                                                    required 
                                                    autoFocus 
                                                    value={providerData.name} 
                                                    onChange={e => setProviderData('name', e.target.value)} 
                                                />
                                                <select 
                                                    className="text-sm border border-gray-300 rounded p-2 w-full bg-white focus:ring focus:ring-purple-200 outline-none"
                                                    value={providerData.position}
                                                    onChange={e => setProviderData('position', e.target.value)}
                                                >
                                                    <option value="">-- Optional Position --</option>
                                                    {currentDeptData.positions?.map(p => (
                                                        <option key={p.position_id} value={p.position_name}>{p.position_name}</option>
                                                    ))}
                                                </select>
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button type="button" onClick={() => setActiveProviderDept(null)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded hover:bg-gray-300 text-sm font-semibold">Cancel</button>
                                                    <button type="submit" disabled={processingProvider} className="bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700 text-sm font-semibold">Save Provider</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button onClick={() => setActiveProviderDept(currentDeptData.department_id)} className="text-sm text-purple-600 hover:text-purple-800 font-semibold border border-purple-200 bg-purple-50 px-3 py-1.5 rounded-md hover:bg-purple-100 transition">
                                                <i className="fa-solid fa-user-plus mr-1"></i> Add Provider
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-xl">
                            <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold transition shadow-sm">Cancel</button>
                            <button type="button" onClick={submitDepartment} disabled={processing} className="px-6 py-2.5 bg-[#009639] text-white rounded-lg font-semibold hover:bg-[#1E6031] transition shadow-sm disabled:opacity-50 flex items-center">
                                {processing ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Saving...</> : isEditing ? <><i className="fa-solid fa-floppy-disk mr-2"></i> Update Department</> : <><i className="fa-solid fa-plus mr-2"></i> Save Department</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Add Position Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowBulkModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="text-lg font-bold text-gray-800">
                                <i className="fa-solid fa-layer-group text-emerald-600 mr-2"></i> 
                                Bulk Add Position
                            </h3>
                            <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>

                        <form onSubmit={handleBulkSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">Position Name <span className="text-red-500">*</span></label>
                                <input type="text" className="w-full border-gray-300 rounded-md focus:ring-emerald-200 focus:border-emerald-500 shadow-sm" 
                                    value={bulkData.position_name} onChange={e => setBulkData('position_name', e.target.value)} required autoFocus placeholder="e.g. Faculty Member" />
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2 border-b pb-2">
                                    <label className="block text-sm font-semibold text-gray-700">Select Departments</label>
                                    <label className="flex items-center text-xs font-bold text-blue-600 cursor-pointer hover:text-blue-800">
                                        <input type="checkbox" className="mr-1.5 rounded text-blue-600 focus:ring-blue-500" 
                                            checked={bulkData.department_ids.length === deptList.length && deptList.length > 0} 
                                            onChange={handleSelectAllDepts} 
                                        />
                                        Select All
                                    </label>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border rounded-md border-gray-100">
                                    {deptList.map(dept => (
                                        <label key={dept.department_id} className="flex items-start p-2 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer transition">
                                            <input type="checkbox" className="mt-0.5 mr-2 rounded text-emerald-600 focus:ring-emerald-500" 
                                                checked={bulkData.department_ids.includes(dept.department_id)}
                                                onChange={() => handleDeptCheckbox(dept.department_id)} 
                                            />
                                            <span className="text-sm text-gray-700 leading-tight">{dept.department_name}</span>
                                        </label>
                                    ))}
                                </div>
                                {bulkData.department_ids.length === 0 && <p className="text-red-500 text-xs mt-2 font-medium"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Please select at least one department.</p>}
                            </div>
                        </form>
                        
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-md font-semibold transition">
                                Cancel
                            </button>
                            <button type="button" onClick={handleBulkSubmit} disabled={processingBulk || bulkData.department_ids.length === 0 || !bulkData.position_name} className="px-5 py-2 bg-emerald-600 text-white rounded-md font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                                {processingBulk ? 'Processing...' : `Add to ${bulkData.department_ids.length} Departments`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}