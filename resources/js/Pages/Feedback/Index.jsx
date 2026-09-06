import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';

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
// ----------------------------------------------

export default function FeedbackIndex({ form, departmentName, serviceProviders, isCC, steps, qr_id, ph_regions }) {
    // --- Session & Timer States ---
    const [status, setStatus] = useState('active'); // 'active', 'submitted', or 'expired'
    const [timeLeft, setTimeLeft] = useState(600); 

    const [currentStep, setCurrentStep] = useState(1);
    
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

    // --- Timer & Lockout Logic ---
    useEffect(() => {
        if (!isQR) return; 

        const hasSubmitted = sessionStorage.getItem(`submitted_dept_${form.department_id}`);
        if (hasSubmitted) {
            setStatus('submitted');
        }
    }, [form.department_id, isQR]);

    useEffect(() => {
        if (!isQR || status !== 'active') return; 

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
    }, [status, isQR]);

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

        post(route('feedback.store'), {
            onSuccess: () => {
                if (isQR) {
                    sessionStorage.setItem(`submitted_dept_${form.department_id}`, 'true');
                    setStatus('submitted');
                } else {
                    alert("Thank you! Your feedback has been successfully recorded.");
                    window.location.reload(); 
                }
            },
            onError: (errors) => {
                console.error("Submission Errors:", errors);
                alert("There was an issue saving your form. Please check the required fields.");
            }
        }); 
    };

    const renderField = (field) => {
        const answerVal = data.answers[field.field_id] || '';

        // Robust label matching (removes trailing spaces and colons)
        const normalizedLabel = field.field_label.trim().replace(/:$/, '');
        const isDeptField = normalizedLabel === 'Name of Office/Department';
        const isProviderField = normalizedLabel === 'Name of Service Provider';
        const isPositionField = normalizedLabel === 'Position of Service Provider';
        const isRegionField = normalizedLabel.toLowerCase() === 'region of residence';
        const isAgeField = normalizedLabel.toLowerCase() === 'age'; // <-- IDENTIFY AGE FIELD

        const cc1Field = steps[2]?.find(f => f.field_label.toUpperCase().includes('CC1'));
        const cc1Answer = cc1Field ? data.answers[cc1Field.field_id] : '';
        const isCC1Option4 = cc1Answer && (cc1Answer.startsWith('4') || cc1Answer.includes('I do not know'));
        const isCC2orCC3 = field.field_label.toUpperCase().includes('CC2') || field.field_label.toUpperCase().includes('CC3');

        // 1. Intercept Region Field
        if (isRegionField && ph_regions && ph_regions.length > 0) {
            return (
                <div className="relative">
                    <select 
                        className="w-full border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-2.5 px-3 bg-white shadow-sm appearance-none cursor-pointer"
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

        // 2. Intercept Service Provider Field
        if (isProviderField && serviceProviders && serviceProviders.length > 0) {
            return (
                <div className="relative">
                    <select 
                        className="w-full border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-2.5 px-3 bg-white shadow-sm appearance-none cursor-pointer"
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
                    <div className="flex flex-wrap gap-5 mt-2">
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
                                    <span className="text-gray-800 font-medium text-[15px]">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'dropdown':
                return (
                    <div className="relative">
                        <select className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-2.5 px-3 bg-white shadow-sm appearance-none cursor-pointer"
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
                // <-- UPDATED NUMBER LOGIC HERE -->
                return (
                    <input 
                        type="number" 
                        className="w-full border-gray-300 rounded-md focus:ring-green-500 py-2.5 px-3 shadow-sm" 
                        value={answerVal} 
                        onChange={(e) => {
                            let val = e.target.value;
                            // Strictly slice the string to 2 characters if it's the Age field
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
                            className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 py-2.5 px-3 ${isDeptField ? 'bg-gray-200 cursor-not-allowed text-gray-600 font-medium' : 'bg-white'}`}
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

    // --- Expired UI State ---
    if (status === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
                <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
                    <i className="fa-solid fa-clock text-5xl text-red-500 mb-4"></i>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        You have exceeded the time limit to complete this form. Redirecting...
                    </p>
                </div>
            </div>
        );
    }

    // --- Submitted UI State ---
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

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
            <Head title="Client Satisfaction Measurement" />

            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                
                {/* --- Hide timer if it is a Kiosk --- */}
                {isQR && (
                    <div className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center">
                        <span className="text-sm font-semibold tracking-wide">Time Remaining</span>
                        <span className={`text-lg font-mono font-bold ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-[#FFD700]'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                )}

                <div className="bg-green-800 text-white p-8 text-center border-b-4 border-yellow-500">
                    <p className="text-sm font-semibold uppercase tracking-wider text-green-200">{form.header_1 || 'Republic of the Philippines'}</p>
                    <h1 className="text-3xl font-bold mt-1">{form.header_2 || 'Central Luzon State University'}</h1>
                    <p className="text-sm mt-1 text-green-100">{form.header_3 || 'Science City of Muñoz, Nueva Ecija'}</p>
                    <h2 className="text-xl font-bold mt-6 text-yellow-400">{form.title}</h2>
                    <p className="text-sm mt-2 opacity-90">{form.tagline}</p>
                    <div className="mt-4 inline-block bg-white text-green-900 px-4 py-2 rounded-full font-bold text-sm shadow-sm">
                        Evaluating: {departmentName}
                    </div>
                </div>

                <form onSubmit={submitFeedback} className="p-8">
                    <div className="flex justify-between items-center mb-8 border-b pb-4">
                        <span className="font-bold text-gray-700 text-lg">Step {currentStep} of {totalSteps}</span>
                        <div className="flex space-x-2">
                            {[...Array(totalSteps)].map((_, i) => (
                                <div key={i} className={`h-2.5 w-12 rounded-full transition-colors duration-300 ${currentStep >= i + 1 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                            ))}
                        </div>
                    </div>

                    {currentStep === getDisplayStep(1) && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h3 className="text-2xl font-bold text-gray-800 border-b pb-2">General Transaction Profile</h3>
                            
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md">
                                <p className="text-sm text-blue-900 leading-relaxed">
                                    {form.step_1_instruction || 'This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices. Your feedback on your recently concluded transaction will help this office provide a better service. Personal information shared will be kept confidential and you always have the option to not answer this form.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {steps[1].map(field => (
                                    <div key={field.field_id}>
                                        <label className="block text-base font-bold text-gray-800 mb-2">
                                            {field.field_label} {field.is_required ? <span className="text-red-500">*</span> : null}
                                        </label>
                                        {renderField(field)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isCC && currentStep === getDisplayStep(2) && (
                        <div className="space-y-8 animate-fade-in-up">
                            <h3 className="text-2xl font-bold text-gray-800 border-b pb-2">Citizen's Charter (CC) Questions</h3>
                            
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md">
                                <p className="text-sm text-blue-900 leading-relaxed">
                                    {form.step_2_instruction || 'The Citizen’s Charter is an official document that reflects the services of a government agency/office including its requirements, fees and processing times among others.'}
                                </p>
                            </div>

                            {steps[2].map(field => (
                                <div key={field.field_id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-lg font-bold text-gray-800 mb-4">{field.field_label}</p>
                                    {renderField(field)}
                                </div>
                            ))}
                        </div>
                    )}

                    {currentStep === getDisplayStep(3) && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h3 className="text-2xl font-bold text-gray-800 border-b pb-2">Service Quality Dimensions (SQD)</h3>
                            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider w-2/5">
                                                Evaluation Statements
                                            </th>
                                            <th className="px-2 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Strongly Disagree<br/><span className="text-gray-500 font-normal mt-1 block">(1)</span>
                                            </th>
                                            <th className="px-2 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Disagree<br/><span className="text-gray-500 font-normal mt-1 block">(2)</span>
                                            </th>
                                            <th className="px-2 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Neither Agree nor Disagree<br/><span className="text-gray-500 font-normal mt-1 block">(3)</span>
                                            </th>
                                            <th className="px-2 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Agree<br/><span className="text-gray-500 font-normal mt-1 block">(4)</span>
                                            </th>
                                            <th className="px-2 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Strongly Agree<br/><span className="text-gray-500 font-normal mt-1 block">(5)</span>
                                            </th>
                                            <th className="px-2 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Not Applicable<br/><span className="text-gray-500 font-normal mt-1 block">(N/A)</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {steps[3].map(field => (
                                            <tr key={field.field_id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-5 text-sm font-medium text-gray-900 border-r border-gray-100">
                                                    {field.field_label} {field.is_required && <span className="text-red-500 ml-1">*</span>}
                                                </td>
                                                {field.options.map((opt, idx) => (
                                                    <td key={idx} className="px-2 py-5 text-center border-r border-gray-100 last:border-0 hover:bg-green-100 transition-colors">
                                                        <input 
                                                            type="radio" 
                                                            name={`field_${field.field_id}`} 
                                                            value={opt} 
                                                            checked={data.answers[field.field_id] === opt}
                                                            onChange={(e) => handleAnswerChange(field.field_id, e.target.value)}
                                                            className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-400 cursor-pointer bg-white" 
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

                    {currentStep === getDisplayStep(4) && (
                        <div className="space-y-8 animate-fade-in-up">
                            <h3 className="text-2xl font-bold text-gray-800 border-b pb-2">Overall Institutional Experience</h3>
                            
                            {steps[4].map(field => {
                                const isHarassmentDetails = field.field_label.toLowerCase().includes('if yes') || field.field_label.toLowerCase().includes('detail');
                                const harassmentField = steps[4].find(f => f.field_label.toLowerCase().includes('harassment') && !f.field_label.toLowerCase().includes('detail'));
                                const showDetails = harassmentField && data.answers[harassmentField.field_id]?.toUpperCase() === 'YES';

                                if (isHarassmentDetails && !showDetails) return null; 

                                return (
                                    <div key={field.field_id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                        <label className="block text-lg font-bold text-gray-800 mb-3">
                                            {field.field_label} {(field.is_required && !isHarassmentDetails) ? <span className="text-red-500">*</span> : null}
                                        </label>
                                        {field.input_type === 'text' && (field.field_label.toLowerCase().includes('suggestion') || isHarassmentDetails) ? (
                                            <textarea className="w-full border-gray-300 rounded focus:ring-green-500 p-3 shadow-sm" rows="4"
                                                value={data.answers[field.field_id] || ''} 
                                                onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} 
                                                required={!!(field.is_required && showDetails)} />
                                        ) : (
                                            renderField(field)
                                        )}
                                    </div>
                                );
                            })}

                            <div className="pt-8 border-t-2 mt-8">
                                <label className="block text-lg font-bold text-gray-800 mb-3">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input type="email" className="w-full border-gray-300 rounded-md focus:ring-green-500 py-3 px-4 text-base shadow-sm" 
                                    value={data.email_address} onChange={e => setData('email_address', e.target.value)} required placeholder="Enter your email" />
                            </div>
                        </div>
                    )}

                    <div className="mt-10 flex justify-between pt-8 border-t-2">
                        {currentStep > 1 ? (
                            <button type="button" onClick={handlePrev} className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition shadow">
                                Previous
                            </button>
                        ) : <div></div>}

                        {currentStep < totalSteps ? (
                            <button type="button" onClick={handleNext} className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition shadow-lg">
                                Next Step
                            </button>
                        ) : (
                            <button type="submit" disabled={processing} className="px-10 py-3 bg-yellow-500 text-white rounded-lg font-bold text-xl hover:bg-yellow-600 transition shadow-xl">
                                Submit Feedback
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}