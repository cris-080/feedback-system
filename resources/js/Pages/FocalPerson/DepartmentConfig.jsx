import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useEffect } from 'react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function DepartmentConfig({ department }) {
    const { flash } = usePage().props;

    // Forms
    const { data: serviceData, setData: setServiceData, post: postService, processing: processingService, reset: resetService } = useForm({ service_name: '' });
    const { data: positionData, setData: setPositionData, post: postPosition, processing: processingPosition, reset: resetPosition } = useForm({ position_name: '' });
    const { data: providerData, setData: setProviderData, post: postProvider, processing: processingProvider, reset: resetProvider } = useForm({ name: '', position: '' });

    // Toast Notifications
    useEffect(() => {
        if (flash?.success) {
            Swal.fire({ title: 'Success!', text: flash.success, icon: 'success', toast: true, position: 'top-end', timer: 3000, timerProgressBar: true, showConfirmButton: false });
        }
    }, [flash]);

    // Handlers
    const submitService = (e) => {
        e.preventDefault();
        postService(route('focalperson.department.services.store'), { onSuccess: () => resetService() });
    };

    const submitPosition = (e) => {
        e.preventDefault();
        postPosition(route('focalperson.department.positions.store'), { onSuccess: () => resetPosition() });
    };

    const submitProvider = (e) => {
        e.preventDefault();
        postProvider(route('focalperson.department.providers.store'), { onSuccess: () => resetProvider() });
    };

    const handleDelete = (routeUrl, name, type) => {
        Swal.fire({
            title: `Remove ${type}?`,
            text: `Are you sure you want to remove "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Remove'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(routeUrl, { preserveScroll: true });
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="My Department Configuration">
            <Head title="My Department" />

            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header Card */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">{department.department_name}</h2>
                        <p className="text-sm text-gray-500 mt-1">{department.description || 'No description provided.'}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Services Card */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col h-full">
                            <h3 className="text-md font-bold text-gray-800 mb-4 border-b pb-2"><i className="fa-solid fa-briefcase text-blue-600 mr-2"></i> Offered Services</h3>
                            
                            <form onSubmit={submitService} className="flex mb-4">
                                <input type="text" className="flex-1 border-gray-300 rounded-l-md text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="New Service (e.g. Clearance)" required value={serviceData.service_name} onChange={e => setServiceData('service_name', e.target.value)} />
                                <button type="submit" disabled={processingService} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md text-sm font-semibold disabled:opacity-50">Add</button>
                            </form>

                            <div className="flex-1 overflow-y-auto max-h-64 pr-2">
                                <ul className="space-y-2">
                                    {department.services?.map(service => (
                                        <li key={service.service_id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-md border border-gray-100">
                                            <span className="text-sm font-medium text-gray-700">{service.service_name}</span>
                                            <button onClick={() => handleDelete(route('focalperson.department.services.destroy', service.service_id), service.service_name, 'Service')} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                                        </li>
                                    ))}
                                    {(!department.services || department.services.length === 0) && <li className="text-sm text-gray-400 italic text-center py-4">No services configured.</li>}
                                </ul>
                            </div>
                        </div>

                        {/* Positions Card */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col h-full">
                            <h3 className="text-md font-bold text-gray-800 mb-4 border-b pb-2"><i className="fa-solid fa-user-tag text-emerald-600 mr-2"></i> Staff Positions</h3>
                            
                            <form onSubmit={submitPosition} className="flex mb-4">
                                <input type="text" className="flex-1 border-gray-300 rounded-l-md text-sm focus:ring-emerald-500 focus:border-emerald-500" placeholder="New Position (e.g. Staff)" required value={positionData.position_name} onChange={e => setPositionData('position_name', e.target.value)} />
                                <button type="submit" disabled={processingPosition} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-r-md text-sm font-semibold disabled:opacity-50">Add</button>
                            </form>

                            <div className="flex-1 overflow-y-auto max-h-64 pr-2">
                                <ul className="space-y-2">
                                    {department.positions?.map(pos => (
                                        <li key={pos.position_id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-md border border-gray-100">
                                            <span className="text-sm font-medium text-gray-700">{pos.position_name}</span>
                                            <button onClick={() => handleDelete(route('focalperson.department.positions.destroy', pos.position_id), pos.position_name, 'Position')} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                                        </li>
                                    ))}
                                    {(!department.positions || department.positions.length === 0) && <li className="text-sm text-gray-400 italic text-center py-4">No positions configured.</li>}
                                </ul>
                            </div>
                        </div>

                        {/* Providers Card */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col h-full">
                            <h3 className="text-md font-bold text-gray-800 mb-4 border-b pb-2"><i className="fa-solid fa-users text-purple-600 mr-2"></i> Service Providers</h3>
                            
                            <form onSubmit={submitProvider} className="mb-4 bg-gray-50 p-3 rounded-md border border-gray-200 space-y-2">
                                <input type="text" className="w-full border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Provider Name (e.g. Dr. Santos)" required value={providerData.name} onChange={e => setProviderData('name', e.target.value)} />
                                <div className="flex gap-2">
                                    <select className="flex-1 border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500" value={providerData.position} onChange={e => setProviderData('position', e.target.value)}>
                                        <option value="">-- Optional Position --</option>
                                        {department.positions?.map(p => <option key={p.position_id} value={p.position_name}>{p.position_name}</option>)}
                                    </select>
                                    <button type="submit" disabled={processingProvider} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50">Add</button>
                                </div>
                            </form>

                            <div className="flex-1 overflow-y-auto max-h-56 pr-2">
                                <ul className="space-y-2">
                                    {department.service_providers?.map(prov => (
                                        <li key={prov.provider_id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-md border border-gray-100">
                                            <div>
                                                <div className="text-sm font-bold text-gray-800">{prov.name}</div>
                                                {prov.position && <div className="text-xs text-gray-500">{prov.position}</div>}
                                            </div>
                                            <button onClick={() => handleDelete(route('focalperson.department.providers.destroy', prov.provider_id), prov.name, 'Provider')} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                                        </li>
                                    ))}
                                    {(!department.service_providers || department.service_providers.length === 0) && <li className="text-sm text-gray-400 italic text-center py-4">No providers configured.</li>}
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}