import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function FeedbackIndex({ form, departmentName, isCC, steps,qr_id }) {

    const [currentStep, setCurrentStep] = useState(1);
    
    const { data, setData, post, processing } = useForm({
        form_id: form.form_id,
        department_id: form.department_id,
        qr_id: qr_id,
        answers: {},
        email_address: ''
    });

    const totalSteps = isCC ? 4 : 3;

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
                if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '')) {
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

        // 1. Citizen's Charter Interactive Logic
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

        // 2. Harassment Clear Logic
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
                alert("Thank you! Your feedback has been successfully recorded.");
                window.location.reload(); 
            },
            onError: (errors) => {
                console.error("Submission Errors:", errors);
                alert("There was an issue saving your form. Please check the required fields.");
            }
        }); 
    };

   const renderField = (field) => {
        const answerVal = data.answers[field.field_id] || '';

        const cc1Field = steps[2]?.find(f => f.field_label.toUpperCase().includes('CC1'));
        const cc1Answer = cc1Field ? data.answers[cc1Field.field_id] : '';
        const isCC1Option4 = cc1Answer && (cc1Answer.startsWith('4') || cc1Answer.includes('I do not know'));
        const isCC2orCC3 = field.field_label.toUpperCase().includes('CC2') || field.field_label.toUpperCase().includes('CC3');

        switch (field.input_type) {
            case 'radio':
                return (
                    <div className="flex flex-wrap gap-5 mt-2">
                        {field.options.map((opt, idx) => {
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
            case 'multiselect':
                return (
                    <select className="w-full border-gray-300 rounded focus:ring-green-500 focus:border-green-500 py-2.5"
                        value={answerVal} onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={field.is_required}>
                        <option value="">Select...</option>
                        {field.options.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'number':
                return <input type="number" className="w-full border-gray-300 rounded focus:ring-green-500 py-2.5" 
                    value={answerVal} onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={field.is_required} />;
            default:
                const isDeptField = field.field_label === 'Name of Office/Department';

                return (
                    <input 
                        type="text" 
                        value={isDeptField ? departmentName : answerVal} 
                        readOnly={isDeptField}
                        className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 py-2.5 ${isDeptField ? 'bg-gray-200 cursor-not-allowed text-gray-600 font-medium' : 'bg-white'}`}
                        onChange={(e) => {
                            if (!isDeptField) {
                                handleAnswerChange(field.field_id, e.target.value);
                            }
                        }} 
                        required={field.is_required && !isDeptField} 
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
            <Head title="Client Satisfaction Measurement" />

            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="bg-green-800 text-white p-8 text-center border-b-4 border-yellow-500">
                    <p className="text-sm font-semibold uppercase tracking-wider text-green-200">{form.header_1 || 'Republic of the Philippines'}</p>
                    <h1 className="text-3xl font-bold mt-1">{form.header_2 || 'Central Luzon State University'}</h1>
                    <p className="text-sm mt-1 text-green-100">{form.header_3 || 'Science City of Muñoz, Nueva Ecija'}</p>
                    <h2 className="text-xl font-bold mt-6 text-yellow-400">{form.title}</h2>
                    <p className="text-sm mt-2 opacity-90">{form.tagline}</p>
                    <div className="mt-4 inline-block bg-white text-green-900 px-4 py-2 rounded-full font-bold text-sm">
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
                                                {/* Map through the options array to create a standalone radio button in each column */}
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
                                            <textarea className="w-full border-gray-300 rounded focus:ring-green-500 p-3" rows="4"
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