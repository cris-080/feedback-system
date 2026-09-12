import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import LandingPage from './Partials/LandingPage';
import { StepOne, StepTwo, StepThree, StepFour } from './Partials/FormSteps';

export default function FeedbackIndex({ form, departmentName, serviceProviders, isCC, steps, qr_id, ph_regions }) {
    const [status, setStatus] = useState('active'); 
    const [timeLeft, setTimeLeft] = useState(600); 
    const [currentStep, setCurrentStep] = useState(1);
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
        transaction_date: '' // ADDED: New transaction date state initialized
    });

    const totalSteps = isCC ? 4 : 3;

    useEffect(() => {
        if (!isQR) return; 
        if (status === 'expired' || status === 'submitted') {
            const exitTimer = setTimeout(() => {
                window.location.reload(); 
            }, 3000);
            return () => clearTimeout(exitTimer);
        }
    }, [status, isQR]);

    useEffect(() => {
        if (!isQR || status !== 'active' || !hasStarted) return; 
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
        return () => clearInterval(timer);
    }, [status, isQR, hasStarted]); 

    useEffect(() => {
        if (!isQR) return; 
        if (status === 'expired' || status === 'submitted') {
            const exitTimer = setTimeout(() => {
                window.close();
                window.location.replace('https://clsu.edu.ph'); 
            }, 3000);
            return () => clearTimeout(exitTimer);
        }
    }, [status, isQR]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const getDisplayStep = (dbStep) => {
        if (!isCC && dbStep > 2) return dbStep - 1;
        return dbStep;
    };

    const validateStep = () => {
        let dbStep = currentStep;
        if (!isCC && currentStep > 1) {
            dbStep = currentStep + 1; 
        }

        // --- Validate Transaction Date on Step 1 ---
        if (currentStep === 1) {
            if (!data.transaction_date) {
                Swal.fire({
                    title: 'Required Field Missing',
                    text: 'Please provide the Date of Transaction.',
                    icon: 'warning',
                    confirmButtonColor: '#1E6031',
                    confirmButtonText: 'Okay'
                });
                return false;
            }
        }

        const fieldsToValidate = steps[dbStep] || [];

        for (const field of fieldsToValidate) {
            const isDeptField = field.field_label === 'Name of Office/Department';
            if (isDeptField) continue;

            if (field.is_required) {
                const answer = data.answers[field.field_id];
                const isEmptyArray = Array.isArray(answer) && answer.length === 0;
                
                if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '') || isEmptyArray) {
                    Swal.fire({
                        title: 'Required Field Missing',
                        text: `Please complete the required field: "${field.field_label}"`,
                        icon: 'warning',
                        confirmButtonColor: '#1E6031',
                        confirmButtonText: 'Okay'
                    });
                    return false; 
                }
            }
        }

        // --- Validate Email on Final Step ---
        if (currentStep === totalSteps) {
            if (!data.email_address || data.email_address.trim() === '') {
                Swal.fire({
                    title: 'Required Field Missing',
                    text: 'Please provide a valid Email Address before submitting.',
                    icon: 'warning',
                    confirmButtonColor: '#1E6031',
                    confirmButtonText: 'Okay'
                });
                return false;
            }
        }
        return true; 
    };

    const handleNext = () => {
        if (!validateStep()) return; 
        if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrev = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        if (!validateStep()) return; 

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
                post(route('feedback.store'), {
                    onSuccess: () => {
                        if (isQR) {
                            sessionStorage.setItem(`submitted_dept_${form.department_id}`, 'true');
                            setStatus('submitted');
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
                        Swal.fire({
                            title: 'Submission Failed',
                            text: 'There was an issue saving your response. Please review required fields.',
                            icon: 'error',
                            confirmButtonColor: '#dc2626',
                            confirmButtonText: 'Check Form',
                        });
                    }
                });
            }
        });
    };

    if (!hasStarted && status === 'active') {
        return <LandingPage form={form} departmentName={departmentName} onStart={() => setHasStarted(true)} />;
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

                {/* 2. SUB-HEADER */}
                <div className="h-14 px-6 sm:px-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold uppercase tracking-wider text-gray-500">Current Phase:</span>
                        <span className="text-base font-extrabold text-[#1E6031]">Step {currentStep} of {totalSteps}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {[...Array(totalSteps)].map((_, i) => (
                            <div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${currentStep === i + 1 ? 'w-10 bg-[#1E6031]' : currentStep > i + 1 ? 'w-5 bg-emerald-500' : 'w-4 bg-gray-200'}`}></div>
                        ))}
                    </div>
                </div>

                {/* 3. MAIN FORM BODY */}
                <form onSubmit={submitFeedback} className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8">
                        <div className="max-w-6xl mx-auto space-y-6">
                            {currentStep === getDisplayStep(1) && <StepOne stepFields={steps[1] || []} form={form} data={data} setData={setData} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />}
                            {isCC && currentStep === getDisplayStep(2) && <StepTwo stepFields={steps[2] || []} form={form} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />}
                            {currentStep === getDisplayStep(3) && <StepThree stepFields={steps[3] || []} data={data} handleAnswerChange={handleAnswerChange} />}
                            {currentStep === getDisplayStep(4) && <StepFour stepFields={steps[4] || []} form={form} data={data} setData={setData} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />}
                        </div>
                    </div>

                    {/* 4. BOTTOM ACTION BAR */}
                    <div className="h-16 px-6 sm:px-8 border-t border-gray-200 bg-white flex justify-between items-center shrink-0 z-20 shadow-xs">
                        {currentStep > 1 ? (
                            <button type="button" onClick={handlePrev} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2">
                                <i className="fa-solid fa-arrow-left"></i><span>Previous</span>
                            </button>
                        ) : <div></div>}

                        {currentStep < totalSteps ? (
                            <button type="button" onClick={handleNext} className="px-6 py-2.5 bg-[#1E6031] hover:bg-[#144823] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-98 transition flex items-center gap-2">
                                <span>Next Step</span><i className="fa-solid fa-arrow-right text-[#FFD700]"></i>
                            </button>
                        ) : (
                            <button type="submit" disabled={processing} className="px-7 py-2.5 bg-[#FFD700] hover:bg-[#e6c200] text-[#1E6031] rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-98 transition flex items-center gap-2 disabled:opacity-50">
                                <i className="fa-solid fa-paper-plane"></i><span>Submit Feedback</span>
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}