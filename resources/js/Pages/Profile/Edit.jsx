import { Head, useForm, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function Edit() {
    const { auth } = usePage().props;
    const user = auth.user;

    // --- 1. Profile Information Form ---
    const { 
        data, setData, patch, errors, processing 
    } = useForm({
        firstname: user.firstname || user.first_name || '',
        lastname: user.lastname || user.last_name || '',
        email: user.email || '',
    });

    const submitProfile = (e) => {
        e.preventDefault();
        patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    title: 'Profile Updated!',
                    text: 'Your account information has been successfully saved.',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    iconColor: '#009639'
                });
            },
            onError: () => {
                Swal.fire('Error', 'Please check the form for validation errors.', 'error');
            }
        });
    };

    // --- 2. Update Password Form ---
    const { 
        data: pwdData, setData: setPwdData, put, errors: pwdErrors, processing: pwdProcessing, reset 
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submitPassword = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                Swal.fire({
                    title: 'Security Updated!',
                    text: 'Your password has been securely changed.',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    iconColor: '#009639'
                });
            },
            onError: () => {
                Swal.fire('Update Failed', 'Ensure your current password is correct and the new passwords match.', 'error');
            }
        });
    };

    return (
        <SuperAdminLayout headerTitle="Account Settings">
            <Head title="Profile Settings" />

            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Header Profile Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center gap-6">
                    <div className="h-20 w-20 rounded-full bg-[#1E6031] text-[#FFD700] flex items-center justify-center font-bold text-4xl shadow-inner uppercase">
                        {data.firstname.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {data.firstname} {data.lastname}
                        </h2>
                        <p className="text-sm font-medium text-[#009639] uppercase tracking-wide mt-0.5">
                            {user.role || 'System User'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage your personal data and security preferences below.
                        </p>
                    </div>
                </div>

                {/* Profile Information Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-lg font-bold text-gray-800">Profile Information</h3>
                        <p className="text-sm text-gray-500">Update your account's profile information and email address.</p>
                    </div>

                    <form onSubmit={submitProfile} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={data.firstname}
                                    onChange={(e) => setData('firstname', e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                    required
                                />
                                {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={data.lastname}
                                    onChange={(e) => setData('lastname', e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                    required
                                />
                                {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                    required
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                type="submit" 
                                disabled={processing}
                                className="bg-[#009639] hover:bg-[#1E6031] text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center shadow-sm"
                            >
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Security Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-lg font-bold text-gray-800">Update Password</h3>
                        <p className="text-sm text-gray-500">Ensure your account is using a long, random password to stay secure.</p>
                    </div>

                    <form onSubmit={submitPassword} className="space-y-5 max-w-xl">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={pwdData.current_password}
                                onChange={(e) => setPwdData('current_password', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                required
                            />
                            {pwdErrors.current_password && <p className="text-red-500 text-xs mt-1">{pwdErrors.current_password}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                value={pwdData.password}
                                onChange={(e) => setPwdData('password', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                required
                            />
                            {pwdErrors.password && <p className="text-red-500 text-xs mt-1">{pwdErrors.password}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={pwdData.password_confirmation}
                                onChange={(e) => setPwdData('password_confirmation', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-green-200 text-sm"
                                required
                            />
                            {pwdErrors.password_confirmation && <p className="text-red-500 text-xs mt-1">{pwdErrors.password_confirmation}</p>}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                type="submit" 
                                disabled={pwdProcessing}
                                className="bg-gray-800 hover:bg-black text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center shadow-sm"
                            >
                                {pwdProcessing ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </SuperAdminLayout>
    );
}