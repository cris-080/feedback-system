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

export default function FieldRenderer({ field, data, handleAnswerChange, departmentName = '', serviceProviders = [], ph_regions = [], steps = {} }) {
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);

    const answerVal = data.answers[field.field_id] || '';
    const normalizedLabel = field.field_label.trim().replace(/:$/, '');
    const isDeptField = normalizedLabel === 'Name of Office/Department';
    const isProviderField = normalizedLabel === 'Name of Service Provider';
    const isPositionField = normalizedLabel === 'Position of Service Provider';
    const isRegionField = normalizedLabel.toLowerCase() === 'region of residence';
    const isAgeField = normalizedLabel.toLowerCase() === 'age';

    const cc1Field = steps?.[2]?.find(f => f.field_label.toUpperCase().includes('CC1'));
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

   if (isProviderField) {
        const hasProviders = serviceProviders && serviceProviders.length > 0;
        const isUnknown = answerVal === 'I do not know';

        return (
            <div className="flex flex-col space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none mb-1">
                    <input 
                        type="checkbox" 
                        checked={isUnknown} 
                        onChange={(e) => handleAnswerChange(field.field_id, e.target.checked ? 'I do not know' : '')}
                        className="w-4.5 h-4.5 text-[#1E6031] focus:ring-[#1E6031] border-gray-300 rounded cursor-pointer" 
                    />
                    <span className="text-sm font-semibold text-gray-700">I don't know the name of the service provider</span>
                </label>

                {hasProviders && showProviderDropdown ? (
                    <div className="relative">
                        <select className={`w-full border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-3 px-3.5 shadow-sm appearance-none text-base ${isUnknown ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-800 cursor-pointer'}`}
                            value={isUnknown ? '' : answerVal} onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={field.is_required && !isUnknown} disabled={isUnknown}>
                            <option value="" disabled>-- Select a Provider --</option>
                            {serviceProviders.map((prov, idx) => <option key={idx} value={prov.name}>{prov.position ? `${prov.name} (${prov.position})` : prov.name}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <i className="fa-solid fa-chevron-down text-sm"></i>
                        </div>
                    </div>
                ) : (
                    <div className="relative w-full">
                        <input type="text" value={isUnknown ? '' : answerVal} placeholder={isUnknown ? "Name disabled" : "Type service provider name..."}
                            className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 py-3 px-3.5 text-base placeholder:text-gray-400 ${isUnknown ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-800'}`}
                            onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={field.is_required && !isUnknown} disabled={isUnknown} />
                    </div>
                )}
                
                {hasProviders && !isUnknown && (
                    <button 
                        type="button" 
                        onClick={() => setShowProviderDropdown(!showProviderDropdown)} 
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#1E6031] bg-emerald-50 hover:bg-[#1E6031] hover:text-white border border-emerald-300 shadow-xs transition-all active:scale-95 self-start cursor-pointer"
                    >
                        <i className={`fa-solid ${showProviderDropdown ? 'fa-pen-to-square' : 'fa-list-check'} text-sm`}></i>
                        <span>{showProviderDropdown ? 'Type name manually instead' : 'Choose from existing providers'}</span>
                    </button>
                )}
            </div>
        );
    }

   if (isPositionField) {
        const isUnknown = answerVal === 'I do not know';

        return (
            <div className="flex flex-col space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none mb-1">
                    <input 
                        type="checkbox" 
                        checked={isUnknown} 
                        onChange={(e) => handleAnswerChange(field.field_id, e.target.checked ? 'I do not know' : '')}
                        className="w-4.5 h-4.5 text-[#1E6031] focus:ring-[#1E6031] border-gray-300 rounded cursor-pointer" 
                    />
                    <span className="text-sm font-semibold text-gray-700">I don't know the position of the service provider</span>
                </label>
                <div className="relative w-full">
                    <input type="text" value={isUnknown ? '' : answerVal} placeholder={isUnknown ? "Position disabled" : "Position will auto-fill from provider or type manually..."}
                        className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 py-3 px-3.5 text-base placeholder:text-gray-400 ${isUnknown ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-800'}`}
                        onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} required={field.is_required && !isUnknown} disabled={isUnknown} />
                </div>
            </div>
        );
    }

   switch (field.input_type) {
        case 'star_rating':
            const currentStars = parseInt(answerVal, 10) || 0;
            const ratingLabels = { 1: '1 - Poor', 2: '2 - Fair', 3: '3 - Satisfactory', 4: '4 - Very Good', 5: '5 - Excellent' };
            
            return (
                <div className="flex flex-col items-start gap-3 mt-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = currentStars >= star;
                            return (
                                <button
                                    type="button"
                                    key={star}
                                    onClick={() => handleAnswerChange(field.field_id, currentStars === star ? '' : String(star))}
                                    className="p-1 sm:p-2 text-3xl sm:text-4xl transition-transform hover:scale-125 active:scale-95 focus:outline-hidden cursor-pointer"
                                >
                                    <i className={`fa-star ${isFilled ? 'fa-solid text-amber-400 drop-shadow-sm' : 'fa-regular text-gray-300 hover:text-amber-200'}`}></i>
                                </button>
                            );
                        })}
                    </div>
                    
                    {currentStars > 0 ? (
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 bg-white px-4 py-1.5 rounded-full border border-emerald-300 shadow-xs">
                            <i className="fa-solid fa-circle-check text-emerald-600"></i>
                            {ratingLabels[currentStars]}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-white/70 px-3 py-1 rounded-full border border-gray-200">
                            <i className="fa-solid fa-circle-minus text-gray-300"></i>
                            No rating selected
                        </span>
                    )}
                </div>
            );
        case 'radio_card':
            const sqdOptionLabels = {
                '1': 'Strongly Disagree', '2': 'Disagree', '3': 'Neutral', '4': 'Agree', '5': 'Strongly Agree', 'N/A': 'Not Applicable'
            };
            return (
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 w-full">
                    {field.options.map((opt, idx) => {
                        const isSelected = answerVal === opt;
                        const labelDesc = sqdOptionLabels[opt] || opt;
                        return (
                            <label key={idx} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer select-none text-center ${isSelected ? 'bg-[#1E6031] text-white border-[#1E6031] shadow-md scale-[1.02]' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-sm'}`}>
                                <input type="radio" name={`field_${field.field_id}`} value={opt} checked={isSelected} onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} className="sr-only" required={field.is_required} />
                                <span className={`text-base sm:text-lg font-black leading-none mb-1 ${isSelected ? 'text-[#FFD700]' : 'text-gray-900'}`}>{opt}</span>
                                <span className={`text-[11px] sm:text-xs font-semibold leading-tight line-clamp-1 ${isSelected ? 'text-white/95' : 'text-gray-500'}`}>{labelDesc}</span>
                            </label>
                        );
                    })}
                </div>
            );
        case 'radio':
            let radioOptions = [...field.options];
            
            // Check if this is a simple Yes/No question
            const isYesNo = radioOptions.length === 2 && radioOptions.includes('Yes') && radioOptions.includes('No');
            if (isYesNo) radioOptions = ['Yes', 'No'];

            // Check if the field belongs to Step 1 (Respondent Demographics or Office & Transaction Details)
            const isStepOne = field.step_number === 1 || field.step_number === '1' || steps?.[1]?.some(f => f.field_id === field.field_id);
            const isHorizontalDesktop = isStepOne || isYesNo;

            return (
                <div className={`mt-2.5 ${isHorizontalDesktop ? 'flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-6' : 'flex flex-col space-y-3 w-full'}`}>
                    {radioOptions.map((opt, idx) => {
                        const isNAOption = opt === 'N/A' || opt.includes('N/A') || opt.includes('Not Applicable');
                        const isDisabled = isCC2orCC3 && isCC1Option4 && !isNAOption;
                        
                        return (
                            <label 
                                key={idx} 
                                className={`flex ${isHorizontalDesktop ? 'items-center' : 'items-start'} space-x-2.5 p-2 rounded-md transition-colors ${
                                    isHorizontalDesktop ? 'w-full sm:w-auto' : 'w-full'
                                } border border-transparent ${
                                    isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-green-50 hover:border-green-200'
                                }`}
                            >
                                <input 
                                    type="radio" 
                                    name={`field_${field.field_id}`} 
                                    value={opt} 
                                    checked={answerVal === opt} 
                                    onChange={(e) => handleAnswerChange(field.field_id, e.target.value)} 
                                    disabled={isDisabled} 
                                    className="shrink-0 w-4.5 h-4.5 text-green-600 focus:ring-green-500 border-gray-400 disabled:opacity-50 disabled:bg-gray-200 cursor-pointer" 
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