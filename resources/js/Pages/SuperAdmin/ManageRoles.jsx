import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function ManageRoles({ roles }) {
    const [editingRole, setEditingRole] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data, setData, post, put, reset, errors, processing } = useForm({
        role_name: '',
        description: '',
    });

    const openCreateModal = () => {
        setEditingRole(null);
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (role) => {
        setEditingRole(role);
        setData({
            role_name: role.role_name,
            description: role.description || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingRole) {
            put(route('superadmin.roles.update', editingRole.role_id), {
                onSuccess: () => setIsModalOpen(false),
            });
        } else {
            post(route('superadmin.roles.store'), {
                onSuccess: () => setIsModalOpen(false),
            });
        }
    };

    const handleDelete = (role) => {
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
                router.delete(route('superadmin.roles.destroy', role.role_id));
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="Role Management">
            <Head title="Manage Roles" />

            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-[#1E6031]">System & Custom Roles</h2>
                        <p className="text-sm text-gray-500 mt-1">Configure account access levels for current and future system modules.</p>
                    </div>
                    <button 
                        onClick={openCreateModal}
                        className="bg-[#009639] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#1E6031] transition shadow-sm flex items-center"
                    >
                        <i className="fa-solid fa-plus mr-2"></i> Add New Role
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {roles.map((role) => (
                        <div key={role.role_id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative flex flex-col justify-between">
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
                                <span><strong>{role.accounts_count}</strong> Active Users</span>
                                
                                {!role.is_system && (
                                    <div className="space-x-2">
                                        <button onClick={() => openEditModal(role)} className="text-blue-600 hover:text-blue-800 font-bold">Edit</button>
                                        <button onClick={() => handleDelete(role)} className="text-red-600 hover:text-red-800 font-bold">Delete</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal for Creating / Editing */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {editingRole ? 'Edit Role' : 'Create Custom Role'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Role Display Name</label>
                                <input 
                                    type="text" 
                                    value={data.role_name}
                                    onChange={e => setData('role_name', e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#009639] focus:border-[#009639]"
                                    placeholder="e.g. Quality Assurance Officer"
                                    required 
                                />
                                {errors.role_name && <p className="text-red-500 text-xs mt-1">{errors.role_name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                <textarea 
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#009639] focus:border-[#009639]"
                                    rows="3"
                                    placeholder="Briefly describe what this role does..."
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="px-4 py-2 bg-[#009639] text-white rounded-md font-bold hover:bg-[#1E6031]"
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