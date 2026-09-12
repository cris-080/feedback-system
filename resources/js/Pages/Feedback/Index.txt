import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';

// --- CUSTOM MULTI-SELECT DROPDOWN COMPONENT ---
const MultiSelectDropdown = ({ field, answerVal, handleAnswerChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentSelection = Array.isArray(answerVal) ? answerVal : (answerVal ? [answerVal] : []);

    const toggleOption = (opt) => {
        if (currentSelection.includes(opt)) {
            handleAnswerChange(field.field_id, currentSelection.filter(item => item !== opt));
        } else {
            handleAnswerChange(field.field_id, [...currentSelection, opt]);
        }
    };

    return (
        <div className="relative">
            {/* The Dropdown Box */}
            <div 
                className="w-full border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 py-2 px-3 bg-white cursor-pointer min-h-[46px] flex flex-wrap gap-1.5 items-center shadow-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                {currentSelection.length === 0 && <span className="text-gray-500 text-[15px]">Select services...</span>}
                
                {/* Selected Option Pills */}
                {currentSelection.map(sel => (
                    <span key={sel} className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5 border border-green-200">
                        {sel}
                        <i 
                            className="fa-solid fa-xmark cursor-pointer hover:text-red-500 transition-colors" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                toggleOption(sel); 
                            }}
                        ></i>
                    </span>
                ))}
                
                {/* Dropdown Arrow */}
                <div className="ml-auto pl-2">
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400 text-xs transition-transform`}></i>
                </div>
            </div>
            
            {/* Invisible backdrop to close dropdown when clicking outside */}
            {isOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
            )}

            {/* The Dropdown List Menu */}
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {field.options.map(opt => (
                        <div 
                            key={opt} 
                            className="px-4 py-2.5 flex items-center hover:bg-green-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation(); 
                                toggleOption(opt);
                            }}
                        >
                            <input 
                                type="checkbox" 
                                checked={currentSelection.includes(opt)}
                                readOnly
                                className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500 rounded border-gray-300 cursor-pointer"
                            />
                            <span className="text-[15px] text-gray-700 font-medium">{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


export default function FeedbackIndex({ form, departmentName, serviceProviders, isCC, steps, qr_id, ph_regions }) {
    // --- Session & Timer States ---
    const [status, setStatus] = useState('active'); // 'active', 'submitted', or 'expired'
    const [timeLeft, setTimeLeft] = useState(600); 

    const [currentStep, setCurrentStep] = useState(1);
    
    const [hasStarted, setHasStarted] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);
    // Check the URL for the kiosk flag. 
    const urlParams = new URLSearchParams(window.location.search);
    const isKiosk = urlParams.get('kiosk') === 'true';
    const isQR = !isKiosk; 

    const { data, setData, post, processing } = useForm({
        form_id: form.form_id,
        department_id: form.department_id,
        qr_id: qr_id,
        answers: {},
        email_address: ''
    });

    const totalSteps = isCC ? 4 : 3;
    const stepMeta = [
        { num: 1, title: 'Transaction Profile', desc: 'Office & Demographics' },
        ...(isCC ? [{ num: 2, title: "Citizen's Charter", desc: 'Awareness & Visibility' }] : []),
        { num: isCC ? 3 : 2, title: 'Service Dimensions', desc: 'SQD Criteria Rating' },
        { num: isCC ? 4 : 3, title: 'Experience & Remarks', desc: 'Insights & Confirmation' },
    ];

    // --- Timer & Lockout Logic ---
   useEffect(() => {
        if (!isQR) return; 

        if (status === 'expired' || status === 'submitted') {
            const exitTimer = setTimeout(() => {
                window.location.reload(); // Returns exactly to the Landing Page
            }, 3000);

            return () => clearTimeout(exitTimer);
        }
    }, [status, isQR]);

   useEffect(() => {
        // Only run timer if form is active, it is a QR link, AND user clicked Get Started
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
        if (!isQR) return; // Skip auto-redirect for Kiosks

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
    // ---------------------------------

    const getDisplayStep = (dbStep) => {
        if (!isCC && dbStep > 2) return dbStep - 1;
        return dbStep;
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

    const validateStep = () => {
        let dbStep = currentStep;
        if (!isCC && currentStep > 1) {
            dbStep = currentStep + 1; 
        }

        const fieldsToValidate = steps[dbStep] || [];

        for (const field of fieldsToValidate) {
            const isDeptField = field.field_label === 'Name of Office/Department';
            if (isDeptField) continue;

            if (field.is_required) {
                const answer = data.answers[field.field_id];
                // Support validation for empty arrays (Multi-select)
                const isEmptyArray = Array.isArray(answer) && answer.length === 0;
                
                if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '') || isEmptyArray) {
                    alert(`Please complete the required field: "${field.field_label}"`);
                    return false; 
                }
            }
        }

        if (currentStep === totalSteps) {
            if (!data.email_address || data.email_address.trim() === '') {
                alert("Please provide a valid Email Address before submitting.");
                return false;
            }
        }

        return true; 
    };

    const handleAnswerChange = (fieldId, value) => {
        let newAnswers = { ...data.answers, [fieldId]: value };

        // --- AUTO-FILL POSITION LOGIC (Robust Matching) ---
        let changedField = null;
        let positionField = null;
        
        Object.values(steps).forEach(stepFields => {
            const found = stepFields.find(f => f.field_id === fieldId);
            if (found) changedField = found;
            
            // Ignores trailing colons and spaces for a bulletproof match
            const pos = stepFields.find(f => f.field_label.trim().replace(/:$/, '') === 'Position of Service Provider');
            if (pos) positionField = pos;
        });

        if (changedField && changedField.field_label.trim().replace(/:$/, '') === 'Name of Service Provider') {
            const matchedProvider = serviceProviders?.find(p => p.name === value);
            if (matchedProvider && positionField) {
                newAnswers[positionField.field_id] = matchedProvider.position || '';
            }
        }
        // --------------------------------

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

        const renderField = (field) => {
        const answerVal = data.answers[field.field_id] || '';

        const normalizedLabel = field.field_label.trim().replace(/:$/, '');
        const isDeptField = normalizedLabel === 'Name of Office/Department';
        const isProviderField = normalizedLabel === 'Name of Service Provider';
        const isPositionField = normalizedLabel === 'Position of Service Provider';
        const isRegionField = normalizedLabel.toLowerCase() === 'region of residence';
        const isAgeField = normalizedLabel.toLowerCase() === 'age';

        const cc1Field = steps[2]?.find(f => f.field_label.toUpperCase().includes('CC1'));
        const cc1Answer = cc1Field ? data.answers[cc1Field.field_id] : '';
        const isCC1Option4 = cc1Answer && (cc1Answer.startsWith('4') || cc1Answer.includes('I do not know'));
        const isCC2orCC3 = field.field_label.toUpperCase().includes('CC2') || field.field_label.toUpperCase().includes('CC3');

        // 1. Region Field
        if (isRegionField && ph_regions && ph_regions.length > 0) {
            return (
                <div className="relative">
                    <select 
                        className="w-full border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-3 px-3.5 bg-white shadow-sm appearance-none cursor-pointer text-base text-gray-800"
                        value={answerVal} 
                        onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} 
                        required={field.is_required}
                    >
                        <option value="" disabled>-- Select your region --</option>
                        {ph_regions.map((region, idx) => (
                            <option key={idx} value={region.name}>
                                {region.name} ({region.regionName})
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <i className="fa-solid fa-chevron-down text-sm"></i>
                    </div>
                </div>
            );
        }

        // 2. Service Provider Field
        if (isProviderField && serviceProviders && serviceProviders.length > 0) {
            return (
                <div className="relative">
                    <select 
                        className="w-full border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-3 px-3.5 bg-white shadow-sm appearance-none cursor-pointer text-base text-gray-800"
                        value={answerVal} 
                        onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} 
                        required={field.is_required}
                    >
                        <option value="" disabled>-- Select a Provider --</option>
                        {serviceProviders.map((prov, idx) => (
                            <option key={idx} value={prov.name}>
                                {prov.position ? `${prov.name} (${prov.position})` : prov.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <i className="fa-solid fa-chevron-down text-sm"></i>
                    </div>
                </div>
            );
        }

        switch (field.input_type) {
            case 'radio':
                let radioOptions = [...field.options];
                if (radioOptions.length === 2 && radioOptions.includes('Yes') && radioOptions.includes('No')) {
                    radioOptions = ['No', 'Yes'];
                }

                return (
                    <div className="flex flex-wrap gap-6 mt-2">
                        {radioOptions.map((opt, idx) => {
                            const isNAOption = opt === 'N/A' || opt.includes('N/A') || opt.includes('Not Applicable');
                            const isDisabled = isCC2orCC3 && isCC1Option4 && !isNAOption;

                            return (
                                <label key={idx} className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-green-50'}`}>
                                    <input type="radio" name={`field_${field.field_id}`} value={opt} 
                                        checked={answerVal === opt}
                                        onChange={(e) => handleAnswerChange(field.field_id, e.target.value)}
                                        disabled={isDisabled}
                                        className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-400 disabled:opacity-50 disabled:bg-gray-200 cursor-pointer" 
                                        required={field.is_required && !isDisabled} />
                                    <span className="text-gray-800 font-medium text-base sm:text-lg">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'dropdown':
                return (
                    <div className="relative">
                        <select className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-3 px-3.5 bg-white shadow-sm appearance-none cursor-pointer text-base text-gray-800"
                            value={answerVal} onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={field.is_required}>
                            <option value="">Select...</option>
                            {field.options.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <i className="fa-solid fa-chevron-down text-sm"></i>
                        </div>
                    </div>
                );
            case 'multiselect':
                return <MultiSelectDropdown field={field} answerVal={answerVal} handleAnswerChange={handleAnswerChange} />;
            case 'number':
                return (
                    <input 
                        type="number" 
                        className="w-full border-gray-300 rounded-md focus:ring-green-500 py-3 px-3.5 shadow-sm text-base text-gray-800 placeholder:text-gray-400" 
                        value={answerVal} 
                        placeholder={isAgeField ? "e.g., 21" : "Enter number..."}
                        onChange={(e) => {
                            let val = e.target.value;
                            if (isAgeField && val.length > 2) {
                                val = val.slice(0, 2);
                            }
                            handleAnswerChange(field.field_id, val);
                        }} 
                        min={isAgeField ? "1" : undefined}
                        max={isAgeField ? "99" : undefined}
                        required={field.is_required} 
                    />
                );
            default:
                return (
                    <div className="relative w-full">
                        <input 
                            type="text" 
                            value={isDeptField ? departmentName : answerVal} 
                            readOnly={isDeptField}
                            placeholder={isPositionField ? "Position will auto-fill from provider" : `Enter ${field.field_label.toLowerCase()}...`}
                            className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 py-3 px-3.5 text-base placeholder:text-gray-400 ${
                                isDeptField ? 'bg-gray-200 cursor-not-allowed text-gray-600 font-medium' : 'bg-white text-gray-800'
                            }`}
                            onChange={(e) => {
                                if (!isDeptField) {
                                    handleAnswerChange(field.field_id, e.target.value);
                                }
                            }} 
                            required={field.is_required && !isDeptField} 
                        />
                    </div>
                );
        }
    };

    // --- MAIN RENDER ---
   return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-2 sm:p-4 lg:p-6 font-sans">
            <Head title="Client Satisfaction Measurement - CLSU" />

    {/* --- Full-Screen Responsive Landing Page View --- */}
            {!hasStarted && status === 'active' && (
                <div className="fixed inset-0 z-50 bg-white lg:bg-[#0c2e17] flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden select-none">
                    
                    {/* Left/Top Institutional Brand Stage */}
                    <div className="w-full lg:w-7/12 xl:w-2/3 p-6 sm:p-10 lg:p-16 xl:p-20 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#1E6031] via-[#144823] to-[#0a2713] text-white border-b-4 lg:border-b-0 lg:border-r-4 border-[#FFD700] shrink-0">
                        {/* Background Ambient Radiance */}
                        <div className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-[28rem] sm:h-[28rem] rounded-full bg-[#FFD700]/10 blur-3xl pointer-events-none"></div>

                        {/* Top Header Identity */}
                        <div className="flex items-center space-x-3.5 sm:space-x-4 relative z-10">
                            <img 
                                src="/images/clsu-logo-white.png" 
                                alt="CLSU Seal" 
                                className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 object-contain drop-shadow-xl shrink-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <div>
                                <p className="text-white/80 font-bold tracking-widest uppercase text-[10px] sm:text-xs">
                                    {form.header_1 || 'Republic of the Philippines'}
                                </p>
                                <h1 className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-black tracking-wide text-white leading-tight">
                                    {form.header_2 || 'CENTRAL LUZON STATE UNIVERSITY'}
                                </h1>
                                <p className="text-white/60 text-[11px] sm:text-xs font-medium mt-0.5">
                                    {form.header_3 || 'Science City of Muñoz, Nueva Ecija'}
                                </p>
                            </div>
                        </div>

                        {/* Display Information Area */}
                        <div className="my-8 sm:my-12 lg:my-14 space-y-4 sm:space-y-6 relative z-10 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 backdrop-blur-md">
                                <i className="fa-solid fa-building-columns text-[#FFD700] text-xs"></i>
                                <span className="text-xs sm:text-sm font-bold text-[#FFD700] tracking-wide uppercase">
                                    Evaluating: {departmentName}
                                </span>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
                                    {form.title}
                                </h2>
                                <p className="text-xs sm:text-base text-emerald-200/90 font-bold tracking-wider uppercase">
                                    {form.tagline || 'Help Us Serve You Better!'}
                                </p>
                            </div>

                            <p className="text-xs sm:text-sm lg:text-base text-white/70 leading-relaxed font-normal">
                                Your objective feedback drives continuous modernization across university facilities, personnel workflows, and public administrative service delivery.
                            </p>
                        </div>

                        {/* Bottom Compliance Metadata */}
                        <div className="relative z-10 pt-4 sm:pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] sm:text-xs text-white/60">
                            <span className="flex items-center gap-1.5 sm:gap-2">
                                <i className="fa-solid fa-shield-halved text-[#FFD700]"></i>
                                ARTA Standardized Client Satisfaction Measurement (CSM)
                            </span>
                            <span>RA 11032 • Ease of Doing Business</span>
                        </div>
                    </div>

                    {/* Right/Bottom Interactive Action Stage: flex-1 ensures it fills all vertical space down to the screen edge */}
                    <div className="w-full lg:w-5/12 xl:w-1/3 bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between items-center text-center relative z-10 flex-1">
                        <div className="w-full hidden lg:flex justify-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Official Feedback Portal
                            </span>
                        </div>

                        {/* Action Content Card */}
                        <div className="w-full max-w-sm my-auto space-y-5 sm:space-y-6 py-4 sm:py-6">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#1E6031]/10 text-[#1E6031] flex items-center justify-center text-2xl sm:text-3xl mx-auto shadow-inner border border-[#1E6031]/20">
                                <i className="fa-solid fa-clipboard-check"></i>
                            </div>

                            <div className="space-y-1.5 sm:space-y-2">
                                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                                    Ready to Begin?
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed px-2">
                                    All information provided is held under strict institutional confidentiality.
                                </p>
                            </div>

                            <div className="space-y-3 pt-1">
                                <button 
                                    type="button"
                                    onClick={() => setShowPrivacyPolicy(true)}
                                    className="w-full py-3.5 sm:py-4 px-6 bg-[#1E6031] hover:bg-[#144823] active:scale-[0.98] text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-[#1E6031]/20 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                                >
                                    <span>Get Started</span>
                                    <i className="fa-solid fa-arrow-right text-[#FFD700] transition-transform group-hover:translate-x-1"></i>
                                </button>

                                {/* <button 
                                    type="button"
                                    onClick={() => setShowPrivacyPolicy(true)}
                                    className="w-full py-2 px-3 text-xs font-semibold text-gray-500 hover:text-gray-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <i className="fa-solid fa-lock text-gray-400 text-[11px]"></i>
                                    <span>View Data Privacy Statement</span>
                                </button> */}
                            </div>
                        </div>

                        {/* Bottom Footer */}
                        <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium tracking-wide mt-4 lg:mt-0 pb-safe">
                            &copy; 2026 Central Luzon State University
                        </div>
                    </div>

                    {/* Responsive Single-Page Terms & Privacy Policy Modal */}
                    {showPrivacyPolicy && (
                        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
                            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-gray-100">
                                
                                {/* Modal Institutional Header */}
                                <div className="bg-[#1E6031] p-5 sm:p-6 border-b-4 border-[#FFD700] flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FFD700] text-lg shrink-0">
                                            <i className="fa-solid fa-shield-halved"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white tracking-wide leading-tight">
                                                Terms of Use & Privacy Consent
                                            </h3>
                                            <p className="text-[10px] sm:text-[11px] text-white/70 uppercase tracking-widest mt-0.5">
                                                CLSU Client Satisfaction Measurement
                                            </p>
                                        </div>
                                    </div>

                                    <button 
                                        type="button" 
                                        onClick={() => setShowPrivacyPolicy(false)}
                                        className="text-white/60 hover:text-white p-1 transition"
                                    >
                                        <i className="fa-solid fa-xmark text-lg"></i>
                                    </button>
                                </div>

                                {/* Scrollable Legal Content Area */}
                                <div className="p-5 sm:p-7 text-xs sm:text-sm text-gray-600 leading-relaxed text-left overflow-y-auto flex-1 space-y-6">
                                    
                                    {/* Section 1: Data Privacy */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                                            <i className="fa-solid fa-lock text-[#1E6031]"></i>
                                            <h4>Data Privacy Statement (RA 10173)</h4>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed">
                                            In compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, all personal demographic details, transaction records, and qualitative answers gathered through this platform will remain strictly confidential.
                                        </p>
                                        <p className="text-gray-600 leading-relaxed">
                                            Your responses are anonymized and aggregated exclusively for university benchmarking, administrative performance improvements, and official ARTA compliance reporting. Personal identifiers will not be disclosed to third parties without prior written consent.
                                        </p>
                                    </div>

                                    {/* Section 2: Terms and Conditions */}
                                    <div className="space-y-2 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                                            <i className="fa-solid fa-file-contract text-[#1E6031]"></i>
                                            <h4>ARTA Terms & Evaluation Guidelines (RA 11032)</h4>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed text-xs">
                                            Pursuant to <strong>Republic Act No. 11032</strong> (Ease of Doing Business and Efficient Government Service Delivery Act of 2018) and the standard mandates of the <strong>Anti-Red Tape Authority (ARTA)</strong>, this evaluation establishes institutional transparency and quality assurance across public transactions.
                                        </p>
                                        <ul className="list-disc pl-5 space-y-1.5 text-gray-600 marker:text-[#1E6031]">
                                            <li>
                                                <strong>ARTA CSM Mandate:</strong> Feedback provided serves as official Client Satisfaction Measurement (CSM) data to assess processing turnaround, procedural transparency, and service quality under the university’s active Citizen’s Charter.
                                            </li>
                                            <li>
                                                <strong>Authentic Transactions:</strong> Responses must reflect genuine, concluded interactions with the designated Central Luzon State University office.
                                            </li>
                                            <li>
                                                <strong>Code of Conduct:</strong> Submissions containing malicious claims, profane language, or knowingly false accusations are subject to administrative review.
                                            </li>
                                            <li>
                                                <strong>Session Integrity:</strong> Single-use session tokens and kiosk submissions are logged to preserve scientific validity and prevent duplicate entries.
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Checkboxes Section */}
                                    <div className="pt-4 border-t border-gray-200 space-y-3 bg-gray-50/80 p-4 rounded-xl border">
                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input 
                                                type="checkbox"
                                                checked={agreedPrivacy}
                                                onChange={(e) => setAgreedPrivacy(e.target.checked)}
                                                className="mt-0.5 w-4 h-4 text-[#1E6031] focus:ring-[#1E6031] rounded border-gray-300 cursor-pointer"
                                            />
                                            <span className="text-xs sm:text-sm font-semibold text-gray-800 leading-snug">
                                                I have read, understood, and accept the <span className="text-[#1E6031]">Data Privacy Policy</span>.
                                            </span>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input 
                                                type="checkbox"
                                                checked={agreedTerms}
                                                onChange={(e) => setAgreedTerms(e.target.checked)}
                                                className="mt-0.5 w-4 h-4 text-[#1E6031] focus:ring-[#1E6031] rounded border-gray-300 cursor-pointer"
                                            />
                                            <span className="text-xs sm:text-sm font-semibold text-gray-800 leading-snug">
                                                I have read, understood, and agree to the <span className="text-[#1E6031]">Terms and Conditions</span>.
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Modal Action Footer */}
                                <div className="bg-gray-50 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-gray-100 flex items-center justify-between gap-2.5 shrink-0">
                                    <button 
                                        type="button"
                                        onClick={() => setShowPrivacyPolicy(false)}
                                        className="px-4 py-2 sm:px-5 sm:py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition uppercase text-[11px] sm:text-xs tracking-wider cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={!agreedPrivacy || !agreedTerms}
                                        onClick={() => {
                                            setShowPrivacyPolicy(false);
                                            setHasStarted(true);
                                        }}
                                        className="px-5 py-2.5 sm:px-6 sm:py-2.5 bg-[#1E6031] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl hover:bg-[#144823] shadow-md transition uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>Accept & Proceed</span>
                                        <i className="fa-solid fa-arrow-right text-[#FFD700]"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Viewport Locked Landscape Container */}
            <div className="w-full max-w-7xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col lg:h-[94vh]">
                
                {/* 1. TOP HEADER */}
                <div className="bg-[#1E6031] text-white px-6 py-4 sm:px-8 border-b-4 border-[#FFD700] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                    <div className="flex items-center space-x-3">
                        <img 
                            src="/images/clsu-logo-white.png" 
                            alt="CLSU Logo" 
                            className="h-10 w-10 object-contain drop-shadow"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div>
                            <span className="text-lg sm:text-xl font-black tracking-wide text-white">
                                CLSU <span className="text-[#FFD700]">FMS</span>
                            </span>
                            <span className="hidden sm:inline-block text-white/50 mx-2.5 text-sm">|</span>
                            <span className="text-sm sm:text-base text-white/90 font-medium">
                                Client Satisfaction Measurement
                            </span>
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
                        <span className="text-base font-extrabold text-[#1E6031]">
                            Step {currentStep} of {totalSteps}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {[...Array(totalSteps)].map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-2.5 rounded-full transition-all duration-300 ${
                                    currentStep === i + 1 
                                        ? 'w-10 bg-[#1E6031]' 
                                        : currentStep > i + 1 
                                        ? 'w-5 bg-emerald-500' 
                                        : 'w-4 bg-gray-200'
                                }`}
                            ></div>
                        ))}
                    </div>
                </div>

                {/* 3. MAIN FORM BODY */}
                <form onSubmit={submitFeedback} className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8">
                        <div className="max-w-6xl mx-auto space-y-6">

                            {/* STEP 1 */}
                            {currentStep === getDisplayStep(1) && (() => {
                                const stepFields = steps[1] || [];
                                const demographicKeys = ['client type', 'sex', 'gender', 'age', 'region of residence'];
                                
                                const transactionFields = stepFields.filter(f => 
                                    !demographicKeys.some(key => f.field_label.toLowerCase().includes(key))
                                );
                                const demographicFields = stepFields.filter(f => 
                                    demographicKeys.some(key => f.field_label.toLowerCase().includes(key))
                                );

                                return (
                                    <div className="space-y-6 animate-fade-in-up">
                                        <div className="border-b border-gray-200 pb-2.5">
                                            <h3 className="text-2xl font-black text-gray-900">General Transaction Profile</h3>
                                            <p className="text-sm text-gray-500 mt-1">Please confirm transaction specifics and respondent demographic details.</p>
                                        </div>
                                        
                                        <div className="bg-emerald-50/80 border-l-4 border-[#1E6031] p-4 rounded-r-lg">
                                            <p className="text-sm sm:text-base text-emerald-900 leading-relaxed font-medium">
                                                {form.step_1_instruction || 'This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices. Your feedback on your recently concluded transaction will help this office provide a better service. Personal information shared will be kept confidential and you always have the option to not answer this form.'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Office Details */}
                                            {transactionFields.length > 0 && (
                                                <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200/80 space-y-4">
                                                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#1E6031] border-b border-gray-200 pb-2">
                                                        Office & Transaction Details
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {transactionFields.map(field => (
                                                            <div key={field.field_id}>
                                                                <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">
                                                                    {field.field_label} {field.is_required ? <span className="text-red-500">*</span> : null}
                                                                </label>
                                                                {renderField(field)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Demographics */}
                                            {demographicFields.length > 0 && (
                                                <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200/80 space-y-4">
                                                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#1E6031] border-b border-gray-200 pb-2">
                                                        Respondent Demographics
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {demographicFields.map(field => (
                                                            <div key={field.field_id}>
                                                                <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">
                                                                    {field.field_label} {field.is_required ? <span className="text-red-500">*</span> : null}
                                                                </label>
                                                                {renderField(field)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* STEP 2 */}
                            {isCC && currentStep === getDisplayStep(2) && (
                                <div className="space-y-6 animate-fade-in-up pr-1">
                                    <div className="border-b border-gray-200 pb-2.5">
                                        <h3 className="text-2xl font-black text-gray-900">Citizen's Charter (CC) Questions</h3>
                                        <p className="text-sm text-gray-500 mt-1">Assess the awareness and clarity of official administrative guidelines.</p>
                                    </div>

                                    <div className="bg-emerald-50/80 border-l-4 border-[#1E6031] p-4 rounded-r-lg">
                                        <p className="text-sm sm:text-base text-emerald-900 leading-relaxed font-medium">
                                            {form.step_2_instruction || 'The Citizen’s Charter is an official document that reflects the services of a government agency/office including its requirements, fees and processing times.'}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {steps[2].map(field => (
                                            <div key={field.field_id} className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-xs">
                                                <p className="text-base sm:text-lg font-bold text-gray-800 mb-3">{field.field_label}</p>
                                                {renderField(field)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3 */}
                            {currentStep === getDisplayStep(3) && (
                                <div className="space-y-5 animate-fade-in-up pr-1">
                                    <div className="border-b border-gray-200 pb-2.5">
                                        <h3 className="text-2xl font-black text-gray-900">Service Quality Dimensions (SQD)</h3>
                                        <p className="text-sm text-gray-500 mt-1">Rate each statement from Strongly Disagree (1) to Strongly Agree (5).</p>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider w-2/5">
                                                        Evaluation Statements
                                                    </th>
                                                    <th className="px-2 py-3.5 text-center text-xs sm:text-sm font-bold text-gray-700 uppercase">
                                                        Strongly Disagree<br/><span className="text-gray-400 font-normal">(1)</span>
                                                    </th>
                                                    <th className="px-2 py-3.5 text-center text-xs sm:text-sm font-bold text-gray-700 uppercase">
                                                        Disagree<br/><span className="text-gray-400 font-normal">(2)</span>
                                                    </th>
                                                    <th className="px-2 py-3.5 text-center text-xs sm:text-sm font-bold text-gray-700 uppercase">
                                                        Neutral<br/><span className="text-gray-400 font-normal">(3)</span>
                                                    </th>
                                                    <th className="px-2 py-3.5 text-center text-xs sm:text-sm font-bold text-gray-700 uppercase">
                                                        Agree<br/><span className="text-gray-400 font-normal">(4)</span>
                                                    </th>
                                                    <th className="px-2 py-3.5 text-center text-xs sm:text-sm font-bold text-gray-700 uppercase">
                                                        Strongly Agree<br/><span className="text-gray-400 font-normal">(5)</span>
                                                    </th>
                                                    <th className="px-2 py-3.5 text-center text-xs sm:text-sm font-bold text-gray-700 uppercase">
                                                        N/A
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {steps[3].map(field => (
                                                    <tr key={field.field_id} className="hover:bg-emerald-50/40 transition-colors">
                                                        <td className="px-5 py-4 text-sm sm:text-base font-medium text-gray-900 border-r border-gray-100">
                                                            {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                                                        </td>
                                                        {field.options.map((opt, idx) => (
                                                            <td key={idx} className="px-2 py-4 text-center border-r border-gray-100 last:border-0 hover:bg-emerald-100/40 transition">
                                                                <input 
                                                                    type="radio" 
                                                                    name={`field_${field.field_id}`} 
                                                                    value={opt} 
                                                                    checked={data.answers[field.field_id] === opt}
                                                                    onChange={(e) => handleAnswerChange(field.field_id, e.target.value)}
                                                                  className="w-4 h-4 text-[#1E6031] focus:ring-[#1E6031] border-gray-600 cursor-pointer"
                                                                    required={field.is_required} 
                                                                />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4 */}
                            {currentStep === getDisplayStep(4) && (
                                <div className="space-y-5 animate-fade-in-up">
                                    <div className="border-b border-gray-200 pb-2.5">
                                        <h3 className="text-2xl font-black text-gray-900">Overall Institutional Experience</h3>
                                        <p className="text-sm text-gray-500 mt-1">Provide qualitative remarks or report transaction anomalies.</p>
                                    </div>
                                    
                                    <div className="space-y-5">
                                        {steps[4].map(field => {
                                            const isHarassmentDetails = field.field_label.toLowerCase().includes('if yes') || field.field_label.toLowerCase().includes('detail');
                                            const harassmentField = steps[4].find(f => f.field_label.toLowerCase().includes('harassment') && !f.field_label.toLowerCase().includes('detail'));
                                            const showDetails = harassmentField && data.answers[harassmentField.field_id]?.toUpperCase() === 'YES';

                                            if (isHarassmentDetails && !showDetails) return null; 

                                            return (
                                                <div key={field.field_id} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">
                                                        {field.field_label} {(field.is_required && !isHarassmentDetails) ? <span className="text-red-500">*</span> : null}
                                                    </label>
                                                    {field.input_type === 'text' && (field.field_label.toLowerCase().includes('suggestion') || isHarassmentDetails) ? (
                                                        <textarea 
                                                            className="w-full border-gray-300 rounded-xl focus:ring-[#1E6031] focus:border-[#1E6031] p-3.5 text-base shadow-sm" 
                                                            rows="3"
                                                            placeholder="Enter constructive observations, compliments, or details..."
                                                            value={data.answers[field.field_id] || ''} 
                                                            onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} 
                                                            required={!!(field.is_required && showDetails)} 
                                                        />
                                                    ) : (
                                                        renderField(field)
                                                    )}
                                                </div>
                                            );
                                        })}

                                        <div className="bg-emerald-50/40 p-5 rounded-xl border border-emerald-200/60">
                                            <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">
                                                Respondent Institutional Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                type="email" 
                                                className="w-full border-gray-300 rounded-xl focus:ring-[#1E6031] focus:border-[#1E6031] py-3 px-3.5 text-base shadow-sm placeholder:text-gray-400 bg-white" 
                                                value={data.email_address} 
                                                onChange={e => setData('email_address', e.target.value)} 
                                                required 
                                                placeholder="e.g., student@clsu.edu.ph" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. BOTTOM ACTION BAR */}
                    <div className="h-16 px-6 sm:px-8 border-t border-gray-200 bg-white flex justify-between items-center shrink-0 z-20 shadow-xs">
                        {currentStep > 1 ? (
                            <button 
                                type="button" 
                                onClick={handlePrev} 
                                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2"
                            >
                                <i className="fa-solid fa-arrow-left"></i>
                                <span>Previous</span>
                            </button>
                        ) : <div></div>}

                        {currentStep < totalSteps ? (
                            <button 
                                type="button" 
                                onClick={handleNext} 
                                className="px-6 py-2.5 bg-[#1E6031] hover:bg-[#144823] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-98 transition flex items-center gap-2"
                            >
                                <span>Next Step</span>
                                <i className="fa-solid fa-arrow-right text-[#FFD700]"></i>
                            </button>
                        ) : (
                            <button 
                                type="submit" 
                                disabled={processing} 
                                className="px-7 py-2.5 bg-[#FFD700] hover:bg-[#e6c200] text-[#1E6031] rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-98 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                <i className="fa-solid fa-paper-plane"></i>
                                <span>Submit Feedback</span>
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}