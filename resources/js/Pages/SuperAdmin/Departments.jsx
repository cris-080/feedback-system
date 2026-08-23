import { Head, useForm, usePage, router, Link } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function Departments({ departments, filters }) {
    const { flash } = usePage().props;
    const [activeServiceDept, setActiveServiceDept] = useState(null);
    
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
    
    // NEW: State to hold the synced email for the read-only display
    const [syncedEmail, setSyncedEmail] = useState('');

    // Form for creating/editing a Department (Removed focal_person_id)
    const { data, setData, post, put, processing, reset, clearErrors, errors } = useForm({
        name: '',
        description: ''
    });

    const { data: serviceData, setData: setServiceData, post: postService, processing: processingService, reset: resetService } = useForm({
        service_name: ''
    });

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
            // Grab the email for the locked UI box
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

    // --- ACTION HANDLERS ---
    const submitDepartment = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(route('superadmin.departments.update', editDeptId), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('superadmin.departments.store'), {
                onSuccess: () => closeModal(),
            });
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
            confirmButtonText: '<i class="fa-solid fa-trash"></i> Yes, Delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.departments.destroy', id), { preserveScroll: true });
            }
        });
    };

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
            text: `Are you sure you want to remove "${serviceName}" from this department?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-times"></i> Yes, Remove it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('superadmin.departments.services.destroy', serviceId), { preserveScroll: true });
            }
        });
    };

    const deptList = departments?.data || departments || [];

    return (
        <SuperAdminLayout headerTitle="Department & Services Configuration">
            <Head title="Manage Departments" />

            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Toolbar Section */}
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
                        <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-semibold transition shadow-sm whitespace-nowrap w-full xl:w-auto flex items-center justify-center">
                            <i className="fa-solid fa-building-circle-check mr-2"></i> Add Department
                        </button>
                    </div>

                    {/* Department Directory Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-green-600 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Department Name</th>
                                        <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Focal Person</th>
                                        <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider">Managed Services</th>
                                        <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {deptList.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                <i className="fa-solid fa-filter-circle-xmark text-4xl mb-4 block text-gray-300"></i>
                                                <p className="text-base font-semibold">No departments found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        deptList.map((dept) => (
                                            <tr key={dept.department_id} className="hover:bg-gray-50 align-top transition-colors">
                                                <td className="px-6 py-4 w-1/4">
                                                    <div className="font-bold text-gray-900">{dept.department_name}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{dept.description}</div>
                                                </td>

                                                {/* Synced Focal Person Display Column */}
                                                <td className="px-6 py-4 w-1/4">
                                                    {dept.focal_person ? (
                                                        <span className="flex items-center text-gray-700 text-sm font-medium">
                                                            <i className="fa-solid fa-user-tie mr-2 text-blue-500"></i>
                                                            {dept.focal_person.email}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-red-500 italic">Unassigned (Link via Users tab)</span>
                                                    )}
                                                </td>
                                                
                                                <td className="px-6 py-4 w-1/3">
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {dept.services && dept.services.length > 0 ? (
                                                            dept.services.map(service => (
                                                                <span key={service.service_id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                    {service.service_name}
                                                                    <button onClick={() => handleDeleteService(service.service_id, service.service_name)} className="ml-1 text-blue-400 hover:text-red-500 transition">
                                                                        <i className="fa-solid fa-times-circle ml-1"></i>
                                                                    </button>
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-red-500 italic">No services configured.</span>
                                                        )}
                                                    </div>

                                                    {activeServiceDept === dept.department_id ? (
                                                        <form onSubmit={(e) => submitService(e, dept.department_id)} className="flex mt-2 animate-fade-in-up">
                                                            <input type="text" className="text-sm border border-gray-300 rounded-l p-1.5 flex-1 focus:ring focus:ring-blue-200 outline-none" placeholder="e.g. Issuance of TOR" required autoFocus value={serviceData.service_name} onChange={e => setServiceData('service_name', e.target.value)} />
                                                            <button type="submit" disabled={processingService} className="bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700 text-sm font-semibold transition">Add</button>
                                                            <button type="button" onClick={() => setActiveServiceDept(null)} className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-r hover:bg-gray-300 transition"><i className="fa-solid fa-times"></i></button>
                                                        </form>
                                                    ) : (
                                                        <button onClick={() => setActiveServiceDept(dept.department_id)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition">
                                                            <i className="fa-solid fa-plus mr-1"></i> Add Service
                                                        </button>
                                                    )}
                                                </td>
                                                
                                                <td className="px-6 py-4 text-center whitespace-nowrap space-x-2">
                                                    <button onClick={() => openModal(dept)} className="w-8 h-8 bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" title="Edit Department">
                                                        <i className="fa-solid fa-pen"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(dept.department_id, dept.department_name)} className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded inline-flex justify-center items-center transition tooltip" title="Delete Department">
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
                        {departments?.meta?.links && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-bold">{departments.meta.from || 0}</span> to <span className="font-bold">{departments.meta.to || 0}</span> of <span className="font-bold">{departments.meta.total}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            {departments.meta.links.map((link, index) => {
                                                let className = "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ";
                                                if (link.active) {
                                                    className += "z-10 bg-blue-600 border-blue-600 text-white";
                                                } else if (!link.url) {
                                                    className += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
                                                } else {
                                                    className += "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                                                }
                                                
                                                if (index === 0) className += " rounded-l-md";
                                                if (index === departments.meta.links.length - 1) className += " rounded-r-md";

                                                return link.url ? (
                                                    <Link key={index} href={link.url} preserveScroll preserveState className={className} dangerouslySetInnerHTML={{ __html: link.label }} />
                                                ) : (
                                                    <span key={index} className={className} dangerouslySetInnerHTML={{ __html: link.label }} />
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

            {/* --- TAILWIND MODAL FOR DEPARTMENT CREATION & EDITING --- */}
            {showModal && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-300 ease-out ${animateModal ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0'}`} onClick={closeModal}>
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

                            {/* LOCKED READ-ONLY UI FOR FOCAL PERSON */}
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">
                                    Assigned Focal Person (Auto-Synced)
                                </label>
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
                                <p className="text-xs text-gray-500 mt-1">
                                    To assign or change the Focal Person, go to the <strong>Manage Users</strong> tab and assign an account to this department.
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">Description</label>
                                <textarea className="w-full border-gray-300 rounded focus:ring focus:ring-emerald-200 focus:border-emerald-500 shadow-sm" rows="3"
                                    value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Optional details..."></textarea>
                            </div>
                        
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                                <button type="button" onClick={closeModal} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-semibold transition">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="px-5 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                                    {processing ? 'Saving...' : isEditing ? 'Update Department' : 'Save Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}