import React from 'react';
import FieldRenderer from './FieldRenderer';

export const StepOne = ({ form, stepFields, data, setData, handleAnswerChange, departmentName, serviceProviders, ph_regions, steps }) => {
    const demographicKeys = ['client type', 'sex', 'gender', 'age', 'region of residence'];
    const transactionFields = stepFields.filter(f => !demographicKeys.some(key => f.field_label.toLowerCase().includes(key)));
    const demographicFields = stepFields.filter(f => demographicKeys.some(key => f.field_label.toLowerCase().includes(key)));

    return (
        <div className="space-y-4 animate-fade-in-up">
            <div className="border-b border-gray-200 pb-2 flex flex-col md:flex-row md:items-end justify-between">
                <div>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900">General Transaction Profile</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Please confirm transaction specifics and respondent demographic details.</p>
                </div>
            </div>
            
            {/* Reduced description size to save vertical space */}
            <div className="bg-emerald-50/80 border-l-4 border-[#1E6031] p-3 rounded-r-lg hidden sm:block">
                <p className="text-s text-emerald-900 leading-relaxed font-large">
                    {form.step_1_instruction || 'This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices. Your feedback on your recently concluded transaction will help this office provide a better service. Personal information shared will be kept confidential and you always have the option to not answer this form.'}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6">
                
                {/* TOP SECTION: Respondent Demographics & Email */}
                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/80 space-y-3">
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1E6031] border-b border-gray-200 pb-2">Respondent Demographics</h4>
                    <div className="grid grid-cols-1 gap-3">
                        
                        {/* MOVED FROM STEP 4: Email Address */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="email" 
                                className="w-full border-gray-300 rounded-md focus:ring-[#1E6031] focus:border-[#1E6031] py-2 px-3 shadow-sm text-sm placeholder:text-gray-400 bg-white" 
                                value={data.email_address || ''} 
                                onChange={e => setData('email_address', e.target.value)} 
                                required 
                                placeholder="e.g., student@clsu.edu.ph"
                            />
                        </div>

                        {demographicFields.map(field => (
                            <div key={field.field_id}>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 mb-1">{field.field_label} {field.is_required ? <span className="text-red-500">*</span> : null}</label>
                                <FieldRenderer field={field} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTTOM SECTION: Office & Transaction Details */}
                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/80 space-y-3">
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1E6031] border-b border-gray-200 pb-2">Office & Transaction Details</h4>
                    <div className="grid grid-cols-1 gap-3">
                        
                        {/* THE TRANSACTION DATE FIELD */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 mb-1">
                                Date of Transaction <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="date" 
                                className="w-full border-gray-300 rounded-md focus:ring-[#1E6031] focus:border-[#1E6031] py-2 px-3 shadow-sm text-sm text-gray-800 bg-white" 
                                value={data.transaction_date || ''} 
                                max={new Date().toISOString().split("T")[0]} 
                                onChange={e => setData('transaction_date', e.target.value)} 
                                required 
                            />
                        </div>

                        {transactionFields.map(field => (
                            <div key={field.field_id}>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 mb-1">{field.field_label} {field.is_required ? <span className="text-red-500">*</span> : null}</label>
                                <FieldRenderer field={field} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                            </div>
                        ))}
                    </div>
                </div>
                
            </div>
        </div>
    );
};

    export const StepTwo = ({ form, stepFields, data, handleAnswerChange, departmentName, serviceProviders, ph_regions, steps }) => (
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
                {stepFields.map(field => (
                    <div key={field.field_id} className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-xs">
                        <p className="text-base sm:text-lg font-bold text-gray-800 mb-3">{field.field_label}</p>
                        <FieldRenderer field={field} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                    </div>
                ))}
            </div>
        </div>
    );

export const StepThree = ({ stepFields, data, handleAnswerChange }) => {
        const sqdOptionLabels = {
            '1': 'Strongly Disagree',
            '2': 'Disagree',
            '3': 'Neutral',
            '4': 'Agree',
            '5': 'Strongly Agree',
            'N/A': 'Not Applicable'
        };

        return (
            <div className="animate-fade-in-up pr-1 space-y-8">
                <div>
                    <div className="border-b border-gray-200 pb-2.5 mb-5">
                        <h3 className="text-2xl font-black text-gray-900">Service Quality Dimensions (SQD)</h3>
                        <p className="text-sm text-gray-500 mt-1">Rate each statement from Strongly Disagree (1) to Strongly Agree (5).</p>
                    </div>

                    <div className="space-y-4">
                        {stepFields.map((field) => {
                            const currentAnswer = data.answers[field.field_id] || '';
                            const optionsList = field.options && field.options.length > 0 ? field.options : ['1', '2', '3', '4', '5', 'N/A'];

                            return (
                                <div key={field.field_id} className="bg-gray-50/80 p-5 sm:p-6 rounded-2xl border border-gray-200/90 shadow-2xs transition-all hover:border-emerald-300">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <p className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                                            {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                                        </p>
                                        {currentAnswer ? (
                                            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-100 text-[#1E6031] border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                                                <i className="fa-solid fa-check text-xs"></i> Answered
                                            </span>
                                        ) : (
                                            <span className="shrink-0 text-[11px] font-semibold text-gray-400 hidden sm:inline-block">
                                                Required
                                            </span>
                                        )}
                                    </div>

                                  {/* Respect the Builder's choice: Card vs Normal Radio */}
                                    {field.input_type === 'radio_card' ? (
                                        <>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
                                                {optionsList.map((opt, idx) => {
                                                    const isSelected = currentAnswer === opt;
                                                    const labelDesc = sqdOptionLabels[opt] || opt;

                                                    return (
                                                        <label key={idx} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer select-none text-center ${isSelected ? 'bg-[#1E6031] text-white border-[#1E6031] shadow-md scale-[1.02]' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-2xs'}`}>
                                                            <input type="radio" name={`field_${field.field_id}`} value={opt} checked={isSelected} onChange={() => handleAnswerChange(field.field_id, opt)} className="sr-only" required={field.is_required} />
                                                            <span className={`text-base sm:text-lg font-black leading-none mb-1 ${isSelected ? 'text-[#FFD700]' : 'text-gray-900'}`}>{opt}</span>
                                                            <span className={`text-[11px] sm:text-xs font-semibold leading-tight line-clamp-1 ${isSelected ? 'text-white/95' : 'text-gray-500'}`}>{labelDesc}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>

                                            {currentAnswer && (
                                                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                                    <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                                    <span>Selected: {sqdOptionLabels[currentAnswer] || currentAnswer} ({currentAnswer})</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="mt-2">
                                            <FieldRenderer field={field} data={data} handleAnswerChange={handleAnswerChange} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

   export const StepFour = ({ stepFields, data, setData, handleAnswerChange, departmentName, serviceProviders, ph_regions, steps }) => (
        <div className="space-y-5 animate-fade-in-up">
            <div className="border-b border-gray-200 pb-2.5">
                <h3 className="text-2xl font-black text-gray-900">Overall Institutional Experience</h3>
                <p className="text-sm text-gray-500 mt-1">Provide qualitative remarks or report transaction anomalies.</p>
            </div>
            <div className="space-y-5">
                {stepFields.map(field => {
                    const isHarassmentDetails = field.field_label.toLowerCase().includes('if yes') || field.field_label.toLowerCase().includes('detail');
                    const harassmentField = stepFields.find(f => f.field_label.toLowerCase().includes('harassment') && !f.field_label.toLowerCase().includes('detail'));
                    const showDetails = harassmentField && data.answers[harassmentField.field_id]?.toUpperCase() === 'YES';

                    if (isHarassmentDetails && !showDetails) return null; 

                    // --- NEW: Dynamic Styling based on whether it is the Harassment field ---
                    const containerClass = isHarassmentDetails 
                        ? "bg-red-50 p-5 rounded-xl border border-red-200 shadow-sm" 
                        : "bg-gray-50 p-5 rounded-xl border border-gray-200";
                        
                    const labelClass = isHarassmentDetails
                        ? "flex items-center text-sm font-bold uppercase tracking-wider text-red-700 mb-2"
                        : "block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2";

                    const textareaClass = isHarassmentDetails
                        ? "w-full border-red-300 rounded-xl focus:ring-red-600 focus:border-red-600 p-3.5 text-base shadow-sm bg-white placeholder:text-red-300"
                        : "w-full border-gray-300 rounded-xl focus:ring-[#1E6031] focus:border-[#1E6031] p-3.5 text-base shadow-sm";

                    const placeholderText = isHarassmentDetails
                        ? "Please provide specific details regarding the incident..."
                        : "Enter constructive observations, compliments, or details...";

                    return (
                        <div key={field.field_id} className={containerClass}>
                            
                            <label className={labelClass}>
                                {isHarassmentDetails && <i className="fa-solid fa-triangle-exclamation mr-2 text-red-500 text-base"></i>}
                                <span>
                                    {field.field_label} {(field.is_required || isHarassmentDetails) && <span className="text-red-500 ml-1">*</span>}
                                </span>
                            </label>

                            {field.input_type === 'text' && (field.field_label.toLowerCase().includes('suggestion') || isHarassmentDetails) ? (
                                <textarea 
                                    className={textareaClass} 
                                    rows="3" 
                                    placeholder={placeholderText} 
                                    value={data.answers[field.field_id] || ''} 
                                    onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} 
                                    required={!!(field.is_required && showDetails) || isHarassmentDetails} 
                                />
                            ) : (
                                <FieldRenderer field={field} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );