import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import LandingPage from './Partials/LandingPage';
import { StepOne, StepTwo, StepThree, StepFour } from './Partials/FormSteps';

export default function FeedbackIndex({ form, departmentName, serviceProviders = [], isCC, steps, qr_id, ph_regions, qr_data }) {
    const [status, setStatus] = useState('active');
    const [timeLeft, setTimeLeft] = useState(3600); 
    const [hasStarted, setHasStarted] = useState(false);

    const urlParams = new URLSearchParams(window.location.search);
    const isKiosk = urlParams.get('kiosk') === 'true';
    const isQR = !isKiosk; 

    const { data, setData, post, processing } = useForm({
        form_id: form.form_id,
        department_id: form.department_id,
        qr_id: qr_id,
        answers: {},
        email_address: '',
        transaction_date: '',
        is_kiosk: isKiosk
    });

    

    useEffect(() => {
        if (!isQR || status !== 'active' || !hasStarted) return; 
        const timer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    setStatus('expired');
                    
                    Swal.fire({
                        title: 'Session Expired',
                        text: 'Your secure session has expired. Please scan the QR code again.',
                        icon: 'warning',
                        confirmButtonColor: '#1E6031',
                        confirmButtonText: 'Okay'
                    }).then(() => {
                        window.close();
                        window.location.replace('https://clsu.edu.ph');
                    });
                    
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status, isQR, hasStarted]);

    useEffect(() => {
        if (!isQR) return; 
        if (status === 'submitted') {
            // Auto-close the Thank You page after 2 minutes (120,000 milliseconds)
            const exitTimer = setTimeout(() => {
                window.close();
                window.location.replace('https://clsu.edu.ph'); 
            }, 120000);
            return () => clearTimeout(exitTimer);
        }
    }, [status, isQR]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Global Validation for the entire form at once
   const validateForm = () => {
        if (!data.transaction_date) {
            Swal.fire({ title: 'Required Field Missing', text: 'Please provide the Date of Transaction.', icon: 'warning', confirmButtonColor: '#1E6031' });
            return false;
        }
        if (!data.email_address || data.email_address.trim() === '') {
            Swal.fire({ title: 'Required Field Missing', text: 'Please provide a valid Email Address.', icon: 'warning', confirmButtonColor: '#1E6031' });
            return false;
        }

        for (const stepKey in steps) {
            // If it's a non-CC form, skip checking CC questions (step 2)
            if (!isCC && parseInt(stepKey) === 2) continue;

            for (const field of steps[stepKey]) {
                if (field.field_label === 'Name of Office/Department') continue;

                if (field.is_required) {
                    const answer = data.answers[field.field_id];
                    const isEmptyArray = Array.isArray(answer) && answer.length === 0;
                    
                    if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '') || isEmptyArray) {
                        Swal.fire({ title: 'Required Field Missing', text: `Please complete the required field: "${field.field_label}"`, icon: 'warning', confirmButtonColor: '#1E6031' });
                        return false; 
                    }
                }
            }
        }
        return true; 
    };
    const handleAnswerChange = (fieldId, value) => {
        let newAnswers = { ...data.answers, [fieldId]: value };

        let changedField = null;
        let positionField = null;
        
        Object.values(steps).forEach(stepFields => {
            const found = stepFields.find(f => f.field_id === fieldId);
            if (found) changedField = found;
            const pos = stepFields.find(f => f.field_label.trim().replace(/:$/, '') === 'Position of Service Provider');
            if (pos) positionField = pos;
        });

        if (changedField && changedField.field_label.trim().replace(/:$/, '') === 'Name of Service Provider') {
            const matchedProvider = serviceProviders?.find(p => p.name === value);
            if (matchedProvider && positionField) {
                newAnswers[positionField.field_id] = matchedProvider.position || '';
            } else if (value === 'I do not know' && positionField) {
                newAnswers[positionField.field_id] = 'I do not know';
            } else if (value === '' && positionField && newAnswers[positionField.field_id] === 'I do not know') {
                newAnswers[positionField.field_id] = '';
            }
        }

        if (isCC && steps[2]) {
            const cc1Field = steps[2].find(f => f.field_label.toUpperCase().includes('CC1'));
            if (cc1Field && fieldId === cc1Field.field_id) {
                const isOption4 = value.startsWith('4') || value.includes('I do not know');
                steps[2].forEach(f => {
                    const label = f.field_label.toUpperCase();
                    if (label.includes('CC2') || label.includes('CC3')) {
                        if (isOption4) {
                            const naOption = f.options.find(o => o === 'N/A' || o.includes('N/A') || o.includes('Not Applicable'));
                            if (naOption) newAnswers[f.field_id] = naOption;
                        } else {
                            const currentAnswer = newAnswers[f.field_id];
                            if (currentAnswer && (currentAnswer === 'N/A' || currentAnswer.includes('N/A') || currentAnswer.includes('Not Applicable'))) {
                                newAnswers[f.field_id] = '';
                            }
                        }
                    }
                });
            }
        }

        if (steps[4]) {
            const harassmentField = steps[4].find(f => f.field_label.toLowerCase().includes('harassment') && !f.field_label.toLowerCase().includes('detail'));
            if (harassmentField && fieldId === harassmentField.field_id) {
                if (value.toUpperCase() !== 'YES') {
                    const detailsField = steps[4].find(f => f.field_label.toLowerCase().includes('if yes') || f.field_label.toLowerCase().includes('detail'));
                    if (detailsField) {
                        newAnswers[detailsField.field_id] = ''; 
                    }
                }
            }
        }

        setData('answers', newAnswers);
    };

    const submitFeedback = (e) => {
        e.preventDefault();
        if (!validateForm()) return; 

        Swal.fire({
            title: 'Submit Evaluation?',
            text: 'Please ensure all your responses are accurate before final submission.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1E6031',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-paper-plane mr-1.5"></i> Yes, Submit Feedback',
            cancelButtonText: 'Review Answers',
            reverseButtons: true,
        }).then((result) => {
            if (result.isConfirmed) {
                
                // Trigger the highly visible global loading screen
                Swal.fire({
                    title: 'Processing Feedback...',
                    html: 'Please wait while we securely save your responses.',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                post(route('feedback.store'), {
                   onSuccess: () => {
                        if (isQR) {
                            sessionStorage.setItem(`submitted_dept_${form.department_id}`, 'true');
                            
                            Swal.fire({
                                title: 'Feedback Recorded!',
                                text: 'Thank you! Your feedback has been successfully submitted.',
                                icon: 'success',
                                confirmButtonColor: '#1E6031',
                                confirmButtonText: 'Done',
                            }).then(() => {
                                setStatus('submitted'); // Change to Thank You screen after they click Done
                            });
                        } else {
                            Swal.fire({
                                title: 'Feedback Recorded!',
                                text: 'Thank you! Your feedback has been successfully submitted.',
                                icon: 'success',
                                confirmButtonColor: '#1E6031',
                                confirmButtonText: 'Done',
                            }).then(() => {
                                window.location.reload();
                            });
                        }
                    },
                  onError: (errors) => {
                        console.error("Submission Errors:", errors);
                        
                        // Extract the specific spam message if it exists, otherwise use fallback
                       const errorMessage = errors.email_address || errors.spam || 'There was an issue saving your response. Please review required fields.';
                        
                        Swal.fire({
                            title: 'Submission Failed',
                            text: errorMessage,
                            icon: 'error',
                            confirmButtonColor: '#dc2626',
                            confirmButtonText: 'Okay',
                        });
                    }
                });
            }
        });
    };

   if (status === 'submitted') {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
                <Head title="Feedback Submitted - CLSU" />
                <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-200 text-center max-w-md w-full animate-fade-in-up">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-200">
                        <i className="fa-solid fa-check text-4xl text-[#009639]"></i>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3 tracking-tight">Thank You!</h2>
                    <p className="text-gray-600 mb-8 font-medium leading-relaxed">
                        Your feedback has been successfully submitted. It will help us improve our services at {departmentName}.
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center gap-3">
                        <i className="fa-solid fa-shield-halved text-gray-400"></i>
                        <p className="text-xs text-gray-500 font-semibold text-left">
                            For your privacy, this page will automatically close in 2 minutes. You may also close this tab now.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasStarted && status === 'active') {
        return <LandingPage form={form} departmentName={departmentName} onStart={() => setHasStarted(true)} qrData={qr_data} />;
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-2 sm:p-4 lg:p-6 font-sans">
            <Head title="Client Satisfaction Measurement - CLSU" />
            
            <div className="w-full max-w-7xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col lg:h-[94vh]">
                
                {/* 1. TOP HEADER */}
                <div className="bg-[#1E6031] text-white px-6 py-4 sm:px-8 border-b-4 border-[#FFD700] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                    <div className="flex items-center space-x-3">
                        <img src="/images/clsu-logo-white.png" alt="CLSU Logo" className="h-10 w-10 object-contain drop-shadow" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <div>
                            <span className="text-lg sm:text-xl font-black tracking-wide text-white">CLSU <span className="text-[#FFD700]">FMS</span></span>
                            <span className="hidden sm:inline-block text-white/50 mx-2.5 text-sm">|</span>
                            <span className="text-sm sm:text-base text-white/90 font-medium">Client Satisfaction Measurement</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="bg-white/15 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-sm font-semibold text-white border border-white/20">
                            Evaluating: <span className="text-[#FFD700] font-bold">{departmentName}</span>
                        </div>
                        {isQR && (
                            <div className="bg-black/30 px-3.5 py-1.5 rounded-full text-sm font-mono font-bold text-[#FFD700] border border-white/10 flex items-center gap-2">
                                <i className="fa-solid fa-clock text-xs"></i>
                                <span>{formatTime(timeLeft)}</span>
                            </div>
                        )}
                    </div>
                </div>

               {/* 2. MAIN SCROLLING FORM BODY */}
                <form onSubmit={submitFeedback} className="flex-1 flex flex-col justify-between overflow-y-auto">
                    <div className="p-4 sm:p-6 lg:p-8 space-y-10 max-w-5xl mx-auto w-full">
                        
                        <StepOne stepFields={steps[1] || []} form={form} data={data} setData={setData} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                        
                        {isCC && (
                            <>
                                <hr className="border-gray-200 border-2 rounded" />
                                <StepTwo stepFields={steps[2] || []} form={form} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                            </>
                        )}
                        
                        <hr className="border-gray-200 border-2 rounded" />
                        <StepThree stepFields={steps[3] || []} data={data} handleAnswerChange={handleAnswerChange} />
                        
                       <hr className="border-gray-200 border-2 rounded" />
                        <StepFour stepFields={steps[4] || []} form={form} data={data} setData={setData} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                    </div>
                    
                    {/* 3. BOTTOM ACTION BAR */}
                    <div className="py-5 px-6 sm:px-8 border-t border-gray-200 bg-white flex justify-center sm:justify-end items-center shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <button type="submit" disabled={processing} className="w-full sm:w-auto px-10 py-3.5 bg-[#009639] hover:bg-[#1E6031] text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-wait">
                            {processing ? (
                                <i className="fa-solid fa-circle-notch fa-spin text-[#FFD700]"></i>
                            ) : (
                                <i className="fa-solid fa-paper-plane text-[#FFD700]"></i>
                            )}
                            <span>{processing ? 'Submitting...' : 'Submit Feedback'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}