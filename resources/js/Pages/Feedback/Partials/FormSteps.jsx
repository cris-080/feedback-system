import React from 'react';
import FieldRenderer from './FieldRenderer';

export const StepOne = ({ form, stepFields, data, setData, handleAnswerChange, departmentName, serviceProviders, ph_regions, steps }) => {
    const demographicKeys = ['client type', 'sex', 'gender', 'age', 'region of residence'];
    const transactionFields = stepFields.filter(f => !demographicKeys.some(key => f.field_label.toLowerCase().includes(key)));
    const demographicFields = stepFields.filter(f => demographicKeys.some(key => f.field_label.toLowerCase().includes(key)));

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
                
                {/* Office & Transaction Details */}
                <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200/80 space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#1E6031] border-b border-gray-200 pb-2">Office & Transaction Details</h4>
                    <div className="grid grid-cols-1 gap-4">
                        
                        {/* --- THE TRANSACTION DATE FIELD --- */}
                        <div>
                            <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">
                                Date of Transaction <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="date" 
                                className="w-full border-gray-300 rounded-md focus:ring-green-500 py-3 px-3.5 shadow-sm text-base text-gray-800 bg-white" 
                                value={data.transaction_date || ''} 
                                max={new Date().toISOString().split("T")[0]} 
                                onChange={e => setData('transaction_date', e.target.value)} 
                                required 
                            />
                        </div>

                        {transactionFields.map(field => (
                            <div key={field.field_id}>
                                <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">{field.field_label} {field.is_required ? <span className="text-red-500">*</span> : null}</label>
                                <FieldRenderer field={field} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Respondent Demographics */}
                {demographicFields.length > 0 && (
                    <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200/80 space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[#1E6031] border-b border-gray-200 pb-2">Respondent Demographics</h4>
                        <div className="grid grid-cols-1 gap-4">
                            {demographicFields.map(field => (
                                <div key={field.field_id}>
                                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">{field.field_label} {field.is_required ? <span className="text-red-500">*</span> : null}</label>
                                    <FieldRenderer field={field} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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

    export const StepThree = ({ stepFields, data, handleAnswerChange }) => (
        <div className="space-y-5 animate-fade-in-up pr-1">
            <div className="border-b border-gray-200 pb-2.5">
                <h3 className="text-2xl font-black text-gray-900 ">Service Quality Dimensions (SQD)</h3>
                <p className="text-sm text-gray-500 mt-1">Rate each statement from Strongly Disagree (1) to Strongly Agree (5).</p>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                {/* ADDED: table-fixed to force absolute column widths */}
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 sm:px-5 py-3.5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider w-2/5">
                                Evaluation Statements
                            </th>
                            
                            {/* ADDED: w-[10%] and break-words to ensure perfectly even columns */}
                            <th className="px-1 sm:px-2 py-3.5 text-center text-[10px] sm:text-xs font-bold text-gray-700 uppercase w-[10%] break-words">
                                Strongly Disagree<br/><span className="text-gray-400 font-normal">(1)</span>
                            </th>
                            <th className="px-1 sm:px-2 py-3.5 text-center text-[10px] sm:text-xs font-bold text-gray-700 uppercase w-[10%] break-words">
                                Disagree<br/><span className="text-gray-400 font-normal">(2)</span>
                            </th>
                            <th className="px-1 sm:px-2 py-3.5 text-center text-[10px] sm:text-xs font-bold text-gray-700 uppercase w-[10%] break-words">
                                Neutral<br/><span className="text-gray-400 font-normal">(3)</span>
                            </th>
                            <th className="px-1 sm:px-2 py-3.5 text-center text-[10px] sm:text-xs font-bold text-gray-700 uppercase w-[10%] break-words">
                                Agree<br/><span className="text-gray-400 font-normal">(4)</span>
                            </th>
                            <th className="px-1 sm:px-2 py-3.5 text-center text-[10px] sm:text-xs font-bold text-gray-700 uppercase w-[10%] break-words">
                                Strongly Agree<br/><span className="text-gray-400 font-normal">(5)</span>
                            </th>
                            <th className="px-1 sm:px-2 py-3.5 text-center text-[10px] sm:text-xs font-bold text-gray-700 uppercase w-[10%] break-words">
                                N/A
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {stepFields.map(field => (
                            <tr key={field.field_id} className="hover:bg-emerald-50/40 transition-colors">
                                {/* ADDED: break-words to prevent long questions from breaking the layout */}
                                <td className="px-3 sm:px-5 py-4 text-xs sm:text-sm font-medium text-gray-900 border-r border-gray-100 break-words">
                                    {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                                </td>
                                {field.options.map((opt, idx) => (
                                    <td key={idx} className="px-1 sm:px-2 py-4 text-center border-r border-gray-100 last:border-0 hover:bg-emerald-100/40 transition">
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
    );

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

                    return (
                        <div key={field.field_id} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">{field.field_label} {(field.is_required && !isHarassmentDetails) ? <span className="text-red-500">*</span> : null}</label>
                            {field.input_type === 'text' && (field.field_label.toLowerCase().includes('suggestion') || isHarassmentDetails) ? (
                                <textarea className="w-full border-gray-300 rounded-xl focus:ring-[#1E6031] focus:border-[#1E6031] p-3.5 text-base shadow-sm" rows="3" placeholder="Enter constructive observations, compliments, or details..." value={data.answers[field.field_id] || ''} onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={!!(field.is_required && showDetails)} />
                            ) : (
                                <FieldRenderer field={field} data={data} handleAnswerChange={handleAnswerChange} departmentName={departmentName} serviceProviders={serviceProviders} ph_regions={ph_regions} steps={steps} />
                            )}
                        </div>
                    );
                })}
                <div className="bg-emerald-50/40 p-5 rounded-xl border border-emerald-200/60">
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-800 mb-2">Respondent Institutional Email Address <span className="text-red-500">*</span></label>
                    <input type="email" className="w-full border-gray-300 rounded-xl focus:ring-[#1E6031] focus:border-[#1E6031] py-3 px-3.5 text-base shadow-sm placeholder:text-gray-400 bg-white" value={data.email_address} onChange={e => setData('email_address', e.target.value)} required placeholder="e.g., student@clsu.edu.ph" />
                </div>
            </div>
        </div>
    );