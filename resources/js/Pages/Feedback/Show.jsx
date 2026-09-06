import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function PublicFeedbackForm({ department }) {
    // Session states
    const [status, setStatus] = useState('active'); // 'active', 'submitted', or 'expired'
    const [timeLeft, setTimeLeft] = useState(20); // Kept at 20 seconds for your testing

    // Check for prior submission on initial load
    useEffect(() => {
        const hasSubmitted = sessionStorage.getItem(`submitted_dept_${department.department_id}`);
        if (hasSubmitted) {
            setStatus('submitted');
        }
    }, [department.department_id]);

    // Handle the active countdown timer
    useEffect(() => {
        if (status !== 'active') return;

        const timer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    setStatus('expired');
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        // Cleanup the interval if the component unmounts
        return () => clearInterval(timer);
    }, [status]);

    // NEW: Handle auto-redirect or auto-close when expired or submitted
    useEffect(() => {
        if (status === 'expired' || status === 'submitted') {
            const exitTimer = setTimeout(() => {
                // Attempt 1: Try to physically close the mobile browser tab
                window.close();
                
                // Attempt 2: If the browser refuses to close, forcefully redirect
                window.location.replace('https://clsu.edu.ph'); 
            }, 3000); // 3 seconds delay

            // Cleanup the timer
            return () => clearTimeout(exitTimer);
        }
    }, [status]);

    const { data, setData, post, processing } = useForm({
        // ... your form state variables
    });

    const submit = (e) => {
        e.preventDefault();
        
        post(route('feedback.store'), {
            onSuccess: () => {
                sessionStorage.setItem(`submitted_dept_${department.department_id}`, 'true');
                setStatus('submitted');
            }
        });
    };

    // Format seconds into MM:SS for the UI
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // UI State 1: Time Limit Exceeded
    if (status === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
                <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
                    <i className="fa-solid fa-clock text-5xl text-red-500 mb-4"></i>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        You have exceeded the time limit. Redirecting you away...
                    </p>
                </div>
            </div>
        );
    }

    // UI State 2: Successfully Submitted & Locked
    if (status === 'submitted') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
                <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
                    <i className="fa-solid fa-shield-check text-5xl text-[#009639] mb-4"></i>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Feedback Secured</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Thank you for your response. Redirecting to the homepage...
                    </p>
                </div>
            </div>
        );
    }

    // UI State 3: Active Form
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <Head title={`Feedback - ${department?.department_name || 'Form'}`} />
            
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Timer Header */}
                <div className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center">
                    <span className="text-sm font-semibold tracking-wide">Time Remaining</span>
                    <span className={`text-lg font-mono font-bold ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-[#FFD700]'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>

                {/* Main Form Body */}
                <div className="p-6 sm:p-8">
                    <form onSubmit={submit}>
                        {/* 
                            Your existing form fields go here 
                        */}
                        <div className="mt-8">
                            <button 
                                type="submit" 
                                disabled={processing}
                                className="w-full bg-[#009639] text-white font-bold py-3 rounded-lg hover:bg-[#1E6031] transition-colors shadow-sm disabled:opacity-50"
                            >
                                {processing ? 'Submitting...' : 'Submit Evaluation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}