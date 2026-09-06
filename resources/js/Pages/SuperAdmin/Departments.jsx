import { Head, useForm, usePage, router, Link } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function Departments({ departments, filters }) {
    const { flash } = usePage().props;
    const [activeServiceDept, setActiveServiceDept] = useState(null);
    const [activePositionDept, setActivePositionDept] = useState(null);
    const [activeProviderDept, setActiveProviderDept] = useState(null);
    
    // --- SERVER-SIDE SEARCH STATE ---
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const queryParams = {};
            if (searchQuery) queryParams.search = searchQuery;

            router.get(
                route('superadmin.departments.index'),
                queryParams,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery]);
    
    // --- MODAL & EDITING STATE ---
    const [showModal, setShowModal] = useState(false);
    const [animateModal, setAnimateModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editDeptId, setEditDeptId] = useState(null);
    const [syncedEmail, setSyncedEmail] = useState('');

    // Department Form
    const { data, setData, post, put, processing, reset, clearErrors, errors } = useForm({
        name: '',
        description: ''
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

    // --- SWEETALERT2 TOAST NOTIFICATIONS ---
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
        if (dept) {
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
            reset('name', 'description');
            setSyncedEmail('');
        }
        setShowModal(true);
        setTimeout(() => setAnimateModal(true), 10);
    };
    
    const closeModal = () => {
        setAnimateModal(false);
        setTimeout(() => {
            setShowModal(false);
            reset('name', 'description');
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
            put(route('superadmin.departments.update', editDeptId), { onSuccess: () => closeModal() });
        } else {
            post(route('superadmin.departments.store'), { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id, name) => {
        Swal.fire({
            title: 'Delete Department?',
            text: `WARNING: Deleting "${name}" will also permanently delete all associated services and users. This cannot be undone!`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.departments.destroy', id), { preserveScroll: true });
            }
        });
    };

    // Services
    const submitService = (e, deptId) => {
        e.preventDefault();
        postService(route('superadmin.departments.services.store', deptId), {
            preserveScroll: true,
            onSuccess: () => {
                resetService();
                setActiveServiceDept(null);
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
                router.delete(route('superadmin.departments.services.destroy', serviceId), { preserveScroll: true });
            }
        });
    };

    // Positions
    const submitPosition = (e, deptId) => {
        e.preventDefault();
        postPosition(route('superadmin.departments.positions.store', deptId), {
            preserveScroll: true,
            onSuccess: () => {
                resetPosition();
                setActivePositionDept(null);
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
                router.delete(route('superadmin.departments.positions.destroy', positionId), { preserveScroll: true });
            }
        });
    };

    // Providers
    const submitProvider = (e, deptId) => {
        e.preventDefault();
        postProvider(route('superadmin.departments.providers.store', deptId), {
            preserveScroll: true,
            onSuccess: () => {
                resetProvider();
                setActiveProviderDept(null);
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
                router.delete(route('superadmin.departments.providers.destroy', providerId), { preserveScroll: true });
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

    return (
        <SuperAdminLayout headerTitle="Department & Services Configuration">
            <Head title="Manage Departments" />

            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Toolbar */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-wrap md:flex-nowrap">
                            <div className="relative w-full sm:w-80">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
                                </div>
                                <input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition duration-150 ease-in-out" placeholder="Search departments or services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark"></i></button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                            <button onClick={openBulkModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-semibold transition shadow-sm whitespace-nowrap w-full sm:w-auto flex items-center justify-center">
                                <i className="fa-solid fa-layer-group mr-2"></i> Bulk Add Position
                            </button>
                            
                            <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-semibold transition shadow-sm whitespace-nowrap w-full sm:w-auto flex items-center justify-center">
                                <i className="fa-solid fa-building-circle-check mr-2"></i> Add Department
                            </button>
                        </div>
                    </div>

                    {/* Department Directory Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-[#009639] text-white">
                                    <tr>
                                        <th className="px-5 py-4 text-left font-semibold uppercase tracking-wider">Department</th>
                                        <th className="px-5 py-4 text-left font-semibold uppercase tracking-wider">Focal Person</th>
                                        <th className="px-5 py-4 text-left font-semibold uppercase tracking-wider">Services</th>
                                        <th className="px-5 py-4 text-left font-semibold uppercase tracking-wider">Positions</th>
                                        <th className="px-5 py-4 text-left font-semibold uppercase tracking-wider">Service Providers</th>
                                        <th className="px-5 py-4 text-center font-semibold uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {deptList.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                <i className="fa-solid fa-filter-circle-xmark text-4xl mb-4 block text-gray-300"></i>
                                                <p className="text-base font-semibold">No departments found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        deptList.map((dept) => (
                                            <tr key={dept.department_id} className="hover:bg-gray-50 align-top transition-colors">
                                                
                                                {/* Department Details */}
                                                <td className="px-5 py-4">
                                                    <div className="font-bold text-gray-900">{dept.department_name}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{dept.description}</div>
                                                </td>

                                                {/* Focal Person */}
                                                <td className="px-5 py-4">
                                                    {dept.focal_person ? (
                                                        <span className="flex items-center text-gray-700 text-sm font-medium">
                                                            <i className="fa-solid fa-user-tie mr-2 text-blue-500"></i>
                                                            {dept.focal_person.email}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-red-500 italic">Unassigned</span>
                                                    )}
                                                </td>
                                                
                                                {/* Services */}
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {dept.services && dept.services.length > 0 ? (
                                                            dept.services.map(service => (
                                                                <span key={service.service_id} className="inline-flex items-center px-2 py-0.5 box-border text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                    {service.service_name}
                                                                    <button onClick={() => handleDeleteService(service.service_id, service.service_name)} className="ml-1 text-blue-400 hover:text-red-500 transition">
                                                                        <i className="fa-solid fa-times-circle ml-1"></i>
                                                                    </button>
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No services.</span>
                                                        )}
                                                    </div>

                                                    {activeServiceDept === dept.department_id ? (
                                                        <form onSubmit={(e) => submitService(e, dept.department_id)} className="flex mt-2">
                                                            <input type="text" className="text-xs border border-gray-300 rounded-l p-1.5 w-28 focus:ring focus:ring-blue-200 outline-none" placeholder="e.g. Clearance" required autoFocus value={serviceData.service_name} onChange={e => setServiceData('service_name', e.target.value)} />
                                                            <button type="submit" disabled={processingService} className="bg-blue-600 text-white px-2 py-1 hover:bg-blue-700 text-xs font-semibold">Add</button>
                                                            <button type="button" onClick={() => setActiveServiceDept(null)} className="bg-gray-200 text-gray-600 px-2 py-1 rounded-r hover:bg-gray-300"><i className="fa-solid fa-times"></i></button>
                                                        </form>
                                                    ) : (
                                                        <button onClick={() => setActiveServiceDept(dept.department_id)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                                                            <i className="fa-solid fa-plus mr-1"></i> Add Service
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Positions */}
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {dept.positions && dept.positions.length > 0 ? (
                                                            dept.positions.map(pos => (
                                                                <span key={pos.position_id} className="inline-flex items-center px-2 py-0.5 box-border text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    {pos.position_name}
                                                                    <button onClick={() => handleDeletePosition(pos.position_id, pos.position_name)} className="ml-1 text-emerald-400 hover:text-red-500 transition">
                                                                        <i className="fa-solid fa-times-circle ml-1"></i>
                                                                    </button>
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No positions.</span>
                                                        )}
                                                    </div>

                                                    {activePositionDept === dept.department_id ? (
                                                        <form onSubmit={(e) => submitPosition(e, dept.department_id)} className="flex mt-2">
                                                            <input type="text" className="text-xs border border-gray-300 rounded-l p-1.5 w-28 focus:ring focus:ring-emerald-200 outline-none" placeholder="e.g. Staff" required autoFocus value={positionData.position_name} onChange={e => setPositionData('position_name', e.target.value)} />
                                                            <button type="submit" disabled={processingPosition} className="bg-emerald-600 text-white px-2 py-1 hover:bg-emerald-700 text-xs font-semibold">Add</button>
                                                            <button type="button" onClick={() => setActivePositionDept(null)} className="bg-gray-200 text-gray-600 px-2 py-1 rounded-r hover:bg-gray-300"><i className="fa-solid fa-times"></i></button>
                                                        </form>
                                                    ) : (
                                                        <button onClick={() => setActivePositionDept(dept.department_id)} className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold">
                                                            <i className="fa-solid fa-plus mr-1"></i> Add Position
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Service Providers */}
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {dept.service_providers && dept.service_providers.length > 0 ? (
                                                            dept.service_providers.map(prov => (
                                                                <span key={prov.provider_id} className="inline-flex items-center px-2 py-0.5 box-border text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                                    <span>{prov.name}</span>
                                                                    {prov.position && (
                                                                        <span className="text-purple-400 font-normal ml-1">({prov.position})</span>
                                                                    )}
                                                                    <button onClick={() => handleDeleteProvider(prov.provider_id, prov.name)} className="ml-1 text-purple-400 hover:text-red-500 transition">
                                                                        <i className="fa-solid fa-times-circle ml-1"></i>
                                                                    </button>
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No providers.</span>
                                                        )}
                                                    </div>

                                                    {activeProviderDept === dept.department_id ? (
                                                        <form onSubmit={(e) => submitProvider(e, dept.department_id)} className="flex flex-col gap-1.5 mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                                                            <input 
                                                                type="text" 
                                                                className="text-xs border border-gray-300 rounded p-1.5 w-full focus:ring focus:ring-purple-200 outline-none" 
                                                                placeholder="Provider Name (e.g. Dr. Santos)" 
                                                                required 
                                                                autoFocus 
                                                                value={providerData.name} 
                                                                onChange={e => setProviderData('name', e.target.value)} 
                                                            />
                                                            <select 
                                                                className="text-xs border border-gray-300 rounded p-1.5 w-full bg-white focus:ring focus:ring-purple-200 outline-none"
                                                                value={providerData.position}
                                                                onChange={e => setProviderData('position', e.target.value)}
                                                            >
                                                                <option value="">-- Optional Position --</option>
                                                                {dept.positions?.map(p => (
                                                                    <option key={p.position_id} value={p.position_name}>{p.position_name}</option>
                                                                ))}
                                                            </select>
                                                            <div className="flex justify-end gap-1 mt-1">
                                                                <button type="button" onClick={() => setActiveProviderDept(null)} className="bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300 text-xs">Cancel</button>
                                                                <button type="submit" disabled={processingProvider} className="bg-purple-600 text-white px-2.5 py-1 rounded hover:bg-purple-700 text-xs font-semibold">Save</button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <button onClick={() => setActiveProviderDept(dept.department_id)} className="text-xs text-purple-600 hover:text-purple-800 font-semibold">
                                                            <i className="fa-solid fa-user-plus mr-1"></i> Add Provider
                                                        </button>
                                                    )}
                                                </td>
                                                
                                                {/* Actions */}
                                                <td className="px-5 py-4 text-center whitespace-nowrap space-x-2">
                                                    <button onClick={() => openModal(dept)} className="w-8 h-8 bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white rounded inline-flex justify-center items-center transition" title="Edit Department">
                                                        <i className="fa-solid fa-pen"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(dept.department_id, dept.department_name)} className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded inline-flex justify-center items-center transition" title="Delete Department">
                                                        <i className="fa-solid fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Server-Side Pagination */}
                        {departments?.links && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-bold">{departments.from || 0}</span> to <span className="font-bold">{departments.to || 0}</span> of <span className="font-bold">{departments.total}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            {departments.links.map((link, index) => {
                                                let className = "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ";
                                                
                                                if (link.active) {
                                                    className += "z-10 bg-[#009639] border-[#009639] text-white";
                                                } else if (!link.url) {
                                                    className += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
                                                } else {
                                                    className += "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                                                }
                                                
                                                if (index === 0) className += " rounded-l-md";
                                                if (index === departments.links.length - 1) className += " rounded-r-md";

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

            {/* Department Modal */}
            {showModal && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm transition-opacity duration-300 ease-out ${animateModal ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0'}`} onClick={closeModal}>
                    <div className={`bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden transition-all duration-300 ease-out ${animateModal ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`} onClick={(e) => e.stopPropagation()}>
                        
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">{isEditing ? 'Edit Department' : 'Provision New Department'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><i className="fa-solid fa-xmark text-xl"></i></button>
                        </div>

                        <form onSubmit={submitDepartment} className="p-6 space-y-4">
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
                                <textarea className="w-full border-gray-300 rounded focus:ring focus:ring-emerald-200 focus:border-emerald-500 shadow-sm" rows="3"
                                    value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Optional details..."></textarea>
                            </div>
                        
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                                <button type="button" onClick={closeModal} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-semibold transition">Cancel</button>
                                <button type="submit" disabled={processing} className="px-5 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                                    {processing ? 'Saving...' : isEditing ? 'Update Department' : 'Save Department'}
                                </button>
                            </div>
                        </form>
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