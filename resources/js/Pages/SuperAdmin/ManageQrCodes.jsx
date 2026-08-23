import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function ManageQrCodes({ departments }) {
    // Inertia's useForm hook manages our state perfectly
    const { data, setData, reset } = useForm({
        department_id: '',
        label: '',
        focal_person_email: ''
    });

    const [isSending, setIsSending] = useState(false);

    const handleDeploy = async (e) => {
        e.preventDefault();
        setIsSending(true);

        try {
            // Trigger the backend controller to generate the token and fire the email
            const response = await axios.post(route('superadmin.qrcodes.store'), data);
            
            // Show a beautiful success message to the SuperAdmin
            Swal.fire({
                title: 'Kit Deployed!',
                text: 'The QR Code and Kiosk Link have been successfully emailed to the focal person.',
                icon: 'success',
                confirmButtonColor: '#16a34a'
            });

            // Reset only the label and email so they can quickly send another one to the same department if needed
            reset('label', 'focal_person_email');

        } catch (error) {
            console.error("Deployment Error:", error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to deploy the kit. Please check your mailer settings and ensure the email is valid.',
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <SuperAdminLayout headerTitle="Deployment Hub: Evaluation Kits">
            <Head title="Deploy QR Codes" />

            <div className="max-w-4xl mx-auto space-y-8 py-8">
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <div className="border-b pb-4 mb-6">
                        <h3 className="text-2xl font-bold text-gray-800">Deploy New Desk Kiosk</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Generate a permanent QR code token and email the deployment kit directly to the office's focal person.
                        </p>
                    </div>

                    <form onSubmit={handleDeploy} className="space-y-6">
                        {/* 1. Department Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Department <span className="text-red-500">*</span>
                            </label>
                            <select 
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5"
                                value={data.department_id} 
                                onChange={e => setData('department_id', e.target.value)} 
                                required
                            >
                                <option value="">-- Choose Department --</option>
                                {departments?.map(dept => (
                                    <option key={dept.department_id} value={dept.department_id}>
                                        {dept.department_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Desk Label */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                QR Code Label / Location <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5"
                                placeholder="e.g., Registrar Window 1, Cashier Desk"
                                value={data.label} 
                                onChange={e => setData('label', e.target.value)} 
                                required 
                            />
                            <p className="text-xs text-gray-500 mt-1">This helps you identify which specific desk the feedback came from.</p>
                        </div>

                        {/* 3. Focal Person Email (NEW) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Focal Person Email Address <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="email" 
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5"
                                placeholder="focalperson@university.edu"
                                value={data.focal_person_email} 
                                onChange={e => setData('focal_person_email', e.target.value)} 
                                required 
                            />
                            <p className="text-xs text-gray-500 mt-1">The system will email the Kiosk Link and printable QR Code to this address.</p>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={isSending}
                                className={`w-full text-white py-3.5 rounded-lg font-bold text-lg shadow-md transition-all ${
                                    isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {isSending ? (
                                    <span><i className="fa-solid fa-spinner fa-spin mr-2"></i> Generating & Emailing...</span>
                                ) : (
                                    <span><i className="fa-solid fa-paper-plane mr-2"></i> Generate & Email Deployment Kit</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </SuperAdminLayout>
    );
}