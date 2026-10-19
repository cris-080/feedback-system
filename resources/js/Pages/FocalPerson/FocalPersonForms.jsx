import React from 'react';
import { Head } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function FocalPersonForms({ deploymentData }) {
    
    const handleCopyLink = () => {
        if (deploymentData?.kiosk_link) {
            navigator.clipboard.writeText(deploymentData.kiosk_link);
            Swal.fire({
                title: 'Link Copied!',
                text: 'The Kiosk link has been copied to your clipboard.',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                iconColor: '#1E6031'
            });
        }
    };

    return (
        <SuperAdminLayout headerTitle="Active Deployment Kit">
            <Head title="Department Forms" />

            {/* --- CUSTOM PRINT STYLESHEET --- */}
            {/* This forcibly removes margins, headers, and sidebars from the layout during printing */}
            <style type="text/css" media="print">
                {`
                    @page { size: portrait; margin: 0; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    aside, nav, header { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
                `}
            </style>

            {/* --- STANDARD WEB UI (Hidden during print) --- */}
            <div className="max-w-7xl mx-auto space-y-6 pb-10 print:hidden">
                
                {/* Header */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <i className="fa-solid fa-file-signature text-[#009639]"></i>
                            Department Evaluation Form
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Access your active QR code and Kiosk link to collect feedback from citizens.
                        </p>
                    </div>
                </div>

                {/* Deployment Kit Content */}
                {deploymentData ? (
                    <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden">
                        <div className="bg-[#009639] px-6 py-4">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <i className="fa-solid fa-qrcode mr-2"></i> Active Deployment Kit
                            </h3>
                        </div>
                        
                        <div className="p-6">
                            <div className="space-y-4 max-w-2xl">
                                <h4 className="font-bold text-gray-800 text-lg">Secure Desktop Kiosk</h4>
                                <p className="text-sm text-gray-600">
                                    Use this link on your department's dedicated feedback tablet or computer. The Kiosk automatically generates and rotates a highly secure, spam-proof QR code every 15 minutes for citizens to scan.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                    <a 
                                        href={deploymentData.kiosk_link} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex-1 bg-gray-800 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-700 transition flex items-center justify-center shadow-md"
                                    >
                                        <i className="fa-solid fa-desktop mr-2.5"></i> Launch Secure Kiosk
                                    </a>
                                    <button 
                                        onClick={handleCopyLink}
                                        className="flex-1 bg-white border-2 border-gray-200 text-gray-700 px-6 py-3.5 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition flex items-center justify-center shadow-sm"
                                    >
                                        <i className="fa-regular fa-copy mr-2.5"></i> Copy Kiosk Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-50 text-yellow-800 p-8 rounded-xl border border-yellow-200 text-center shadow-sm">
                        <i className="fa-solid fa-hourglass-half text-4xl mb-4 opacity-70"></i>
                        <h3 className="text-xl font-bold">Waiting for Active Form</h3>
                        <p className="mt-2 text-sm max-w-md mx-auto">
                            The SuperAdmin has not published an evaluation form for your department yet. Your deployment kit will appear here once a form is assigned.
                        </p>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}