import React, { useState } from 'react';

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
            <div 
                className="w-full border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 py-2 px-3 bg-white cursor-pointer min-h-[46px] flex flex-wrap gap-1.5 items-center shadow-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                {currentSelection.length === 0 && <span className="text-gray-500 text-[15px]">Select services...</span>}
                {currentSelection.map(sel => (
                    <span key={sel} className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5 border border-green-200">
                        {sel}
                        <i className="fa-solid fa-xmark cursor-pointer hover:text-red-500 transition-colors" 
                            onClick={(e) => { e.stopPropagation(); toggleOption(sel); }}></i>
                    </span>
                ))}
                <div className="ml-auto pl-2">
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400 text-xs transition-transform`}></i>
                </div>
            </div>
            {isOpen && <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>}
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {field.options.map(opt => (
                        <div key={opt} className="px-4 py-2.5 flex items-center hover:bg-green-50 cursor-pointer border-b border-gray-50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}>
                            <input type="checkbox" checked={currentSelection.includes(opt)} readOnly className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500 rounded border-gray-300 cursor-pointer" />
                            <span className="text-[15px] text-gray-700 font-medium">{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function FieldRenderer({ field, data, handleAnswerChange, departmentName, serviceProviders, ph_regions, steps }) {
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

    if (isRegionField && ph_regions && ph_regions.length > 0) {
        return (
            <div className="relative">
                <select className="w-full border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-3 px-3.5 bg-white shadow-sm appearance-none cursor-pointer text-base text-gray-800"
                    value={answerVal} onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={field.is_required}>
                    <option value="" disabled>-- Select your region --</option>
                    {ph_regions.map((region, idx) => <option key={idx} value={region.name}>{region.name} ({region.regionName})</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <i className="fa-solid fa-chevron-down text-sm"></i>
                </div>
            </div>
        );
    }

    if (isProviderField && serviceProviders && serviceProviders.length > 0) {
        return (
            <div className="relative">
                <select className="w-full border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-3 px-3.5 bg-white shadow-sm appearance-none cursor-pointer text-base text-gray-800"
                    value={answerVal} onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={field.is_required}>
                    <option value="" disabled>-- Select a Provider --</option>
                    {serviceProviders.map((prov, idx) => <option key={idx} value={prov.name}>{prov.position ? `${prov.name} (${prov.position})` : prov.name}</option>)}
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
            
            // Check if this is a simple Yes/No question
            const isYesNo = radioOptions.length === 2 && radioOptions.includes('Yes') && radioOptions.includes('No');
            if (isYesNo) radioOptions = ['Yes', 'No'];

            return (
                // DYNAMIC CONTAINER: Horizontal row for Yes/No, Vertical column for everything else
                <div className={`mt-3 ${isYesNo ? 'flex flex-row flex-wrap gap-4 sm:gap-8' : 'flex flex-col space-y-3 w-full'}`}>
                    {radioOptions.map((opt, idx) => {
                        const isNAOption = opt === 'N/A' || opt.includes('N/A') || opt.includes('Not Applicable');
                        const isDisabled = isCC2orCC3 && isCC1Option4 && !isNAOption;
                        
                        return (
                            // DYNAMIC LABEL: Fixed width for Yes/No, Full width for long CC1 answers
                            <label key={idx} className={`flex items-start space-x-3 p-3 rounded-md transition-colors ${isYesNo ? 'min-w-[120px] pr-6 ' : 'w-full border border-transparent'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-green-50 hover:border-green-200'}`}>
                                <input 
                                    type="radio" 
                                    name={`field_${field.field_id}`} 
                                    value={opt} 
                                    checked={answerVal === opt} 
                                    onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} 
                                    disabled={isDisabled} 
                                    className="mt-0.5 shrink-0 w-5 h-5 text-green-600 focus:ring-green-500 border-gray-400 disabled:opacity-50 disabled:bg-gray-200 cursor-pointer" 
                                    required={field.is_required && !isDisabled} 
                                />
                                <span className="text-gray-800 font-medium text-sm sm:text-base leading-snug">{opt}</span>
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
                <input type="number" className="w-full border-gray-300 rounded-md focus:ring-green-500 py-3 px-3.5 shadow-sm text-base text-gray-800 placeholder:text-gray-400" 
                    value={answerVal} placeholder={isAgeField ? "e.g., 21" : "Enter number..."} min={isAgeField ? "1" : undefined} max={isAgeField ? "99" : undefined} required={field.is_required} 
                    onChange={(e) => {
                        let val = e.target.value;
                        if (isAgeField && val.length > 2) val = val.slice(0, 2);
                        handleAnswerChange(field.field_id, val);
                    }} 
                />
            );
        default:
            return (
                <div className="relative w-full">
                    <input type="text" value={isDeptField ? departmentName : answerVal} readOnly={isDeptField} placeholder={isPositionField ? "Position will auto-fill from provider" : `Enter ${field.field_label.toLowerCase()}...`}
                        className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 py-3 px-3.5 text-base placeholder:text-gray-400 ${isDeptField ? 'bg-gray-200 cursor-not-allowed text-gray-600 font-medium' : 'bg-white text-gray-800'}`}
                        onChange={(e) => { if (!isDeptField) handleAnswerChange(field.field_id, e.target.value); }} required={field.is_required && !isDeptField} />
                </div>
            );
    }
}