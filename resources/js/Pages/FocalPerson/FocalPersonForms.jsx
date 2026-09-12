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
                        
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Kiosk Option */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-800 text-lg">Option 1: Desktop Kiosk</h4>
                                <p className="text-sm text-gray-600">
                                    Use this link on a provided tablet or computer. The timer is disabled so it stays open for the next citizen.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                    <a 
                                        href={deploymentData.kiosk_link} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex-1 bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition flex items-center justify-center shadow-sm"
                                    >
                                        <i className="fa-solid fa-desktop mr-2"></i> Launch Kiosk
                                    </a>
                                    <button 
                                        onClick={handleCopyLink}
                                        className="flex-1 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center shadow-sm"
                                    >
                                        <i className="fa-regular fa-copy mr-2"></i> Copy Link
                                    </button>
                                </div>
                            </div>

                            {/* QR Code Option */}
                            <div className="space-y-4 flex flex-col items-center md:border-l border-gray-200 md:pl-8 pt-6 md:pt-0 border-t md:border-t-0">
                                <h4 className="font-bold text-gray-800 text-lg self-start">Option 2: Print QR Code</h4>
                                <p className="text-sm text-gray-600 self-start">
                                    Print this official signage for citizens to scan with their own smartphones.
                                </p>
                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <img 
                                        src={deploymentData.qr_image_url} 
                                        alt="Department QR Code" 
                                        className="w-40 h-40 object-contain"
                                    />
                                </div>
                                <button 
                                    onClick={() => window.print()}
                                    className="bg-[#FFD700] text-[#1E6031] px-6 py-2 rounded-lg font-bold hover:bg-yellow-500 transition w-full shadow-sm"
                                >
                                    <i className="fa-solid fa-print mr-2"></i> Print Official Signage
                                </button>
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

            {/* --- PRINT ONLY POSTER OVERLAY (Hidden on web, visible only when printing) --- */}
            {deploymentData && (
                <div className="hidden print:flex print:absolute print:inset-0 print:z-[99999] print:bg-white flex-col items-center justify-center w-full min-h-screen text-center pb-20 pt-10">
                    
                        

                    {/* Department Name Banner */}
                    <div className="bg-[#1E6031] text-white w-full py-5 mb-12 border-y-4 border-[#FFD700] shadow-sm">
                        <h2 className="text-4xl font-black uppercase tracking-wider px-10">
                            {deploymentData.department_name || 'Evaluation Form'}
                        </h2>
                    </div>

                    {/* QR Code Frame */}
                    <div className="border-8 border-gray-100 rounded-[2rem] p-8 mb-12 shadow-sm bg-white">
                        <img 
                            src={deploymentData.qr_image_url} 
                            alt="Scan this QR Code" 
                            className="w-[450px] h-[450px] object-contain" 
                        />
                    </div>

                    {/* Footer Instructions */}
                    <h3 className="text-6xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                        Scan To Rate Us!
                    </h3>
                    <p className="text-2xl text-gray-600 font-medium max-w-4xl leading-snug px-10">
                        Open your smartphone camera and scan the QR code above to access the Client Satisfaction Measurement (CSM) form. Your feedback helps us serve you better.
                    </p>
                </div>
            )}
        </SuperAdminLayout>
    );
}