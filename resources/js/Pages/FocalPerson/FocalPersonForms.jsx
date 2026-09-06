import React from 'react';
import { Head } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';

export default function FocalPersonForms({ deploymentData }) {
    return (
        <SuperAdminLayout headerTitle="Active Deployment Kit">
            <Head title="Department Forms" />

            <div className="max-w-7xl mx-auto space-y-6 pb-10">
                
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
                                <a 
                                    href={deploymentData.kiosk_link} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-block bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition w-full text-center shadow-sm"
                                >
                                    <i className="fa-solid fa-desktop mr-2"></i> Launch Kiosk Mode
                                </a>
                            </div>

                            {/* QR Code Option */}
                            <div className="space-y-4 flex flex-col items-center border-l border-gray-200 pl-8">
                                <h4 className="font-bold text-gray-800 text-lg self-start">Option 2: Print QR Code</h4>
                                <p className="text-sm text-gray-600 self-start">
                                    Print this for citizens to scan with their own smartphones.
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
                                    <i className="fa-solid fa-print mr-2"></i> Print QR Code
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
        </SuperAdminLayout>
    );
}