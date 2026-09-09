import { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import Swal from 'sweetalert2';

export default function EditForm({ currentForm, existingFields, departments, departmentServices, departmentProviders}) {
    
    const formDetails = currentForm?.data || currentForm || {};

    const formattedFields = (existingFields || []).map(f => ({
        field_id: f.field_id,
        step_number: f.step_number || 4,
        field_label: f.field_label,
        input_type: f.input_type,
        is_required: f.is_required === 1,
        options: f.options?.map(option => typeof option === 'object' ? option?.option_label : option).filter(Boolean) || []
    }));

    const { data, setData, post, processing } = useForm({
        header_1: formDetails?.header_1 || 'Republic of the Philippines',
        header_2: formDetails?.header_2 || 'CENTRAL LUZON STATE UNIVERSITY',
        header_3: formDetails?.header_3 || 'Science City of Muñoz, Nueva Ecija',
        title: formDetails?.title || "CITIZEN'S CHARTER FEEDBACK FORM", 
        tagline: formDetails?.tagline || 'HELP US SERVE YOU BETTER!',
        department_id: formDetails?.department_id || '',
        form_type: formDetails?.form_type || 'CC',
        description: formDetails?.description || '',
        fields: formattedFields,
        step_1_instruction: formDetails?.step_1_instruction || 'This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices. Your feedback on your recently concluded transaction will help this office provide a better service. Personal information shared will be kept confidential and you always have the option to not answer this form.',
        step_2_instruction: formDetails?.step_2_instruction || 'The Citizen’s Charter is an official document that reflects the services of a government agency/office including its requirements, fees and processing times among others.',
    });

    const [undoQueue, setUndoQueue] = useState(null);
    
    // --- NEW: Track Unlocked Fields ---
    const [unlockedFields, setUnlockedFields] = useState([]);

    useEffect(() => {
        if (data.form_type === 'CC' && data.title !== "CITIZEN'S CHARTER FEEDBACK FORM") {
            setData('title', "CITIZEN'S CHARTER FEEDBACK FORM");
        } else if (data.form_type === 'Non-CC' && data.title !== "FEEDBACK FORM") {
            setData('title', "FEEDBACK FORM");
        }
    }, [data.form_type]);

    const selectedDepartmentName = departments?.find(d => String(d.department_id) === String(data.department_id))?.department_name || '(Select a Department)';

    // --- UPDATED: Dynamic Sync now skips unlocked fields ---
    useEffect(() => {
        if (data.department_id) {
            const services = departmentServices[data.department_id] || [];
            const providers = departmentProviders ? (departmentProviders[data.department_id] || []) : [];
            
            setData(currentData => {
                const updatedFields = currentData.fields.map(field => {
                    
                    if (unlockedFields.includes(field.field_id)) {
                        return field;
                    }

                    const normalizedLabel = field.field_label.trim().replace(/:$/, '');
                    
                    if (normalizedLabel.toLowerCase().includes('service availed')) {
                        const newOptions = services.length > 0 ? services : ['General Transaction'];
                        return { ...field, input_type: 'dropdown', options: newOptions };
                    }
                    
                    if (normalizedLabel === 'Name of Office/Department') {
                        return { ...field, input_type: 'text', options: [selectedDepartmentName] };
                    }

                    if (normalizedLabel === 'Name of Service Provider') {
                        const providerNames = providers.length > 0 ? providers.map(p => p.name) : ['(No providers configured)'];
                        return { ...field, input_type: 'text', options: providerNames };
                    }

                    if (normalizedLabel === 'Position of Service Provider') {
                        return { ...field, input_type: 'text', options: ['(Auto-filled based on provider)'] };
                    }
                    
                    return field;
                });
                return { ...currentData, fields: updatedFields };
            });
        }
    }, [data.department_id, departmentServices, departmentProviders, departments, selectedDepartmentName, unlockedFields]);

    const getStepTitle = (step) => {
        const isCC = data.form_type === 'CC';
        switch(step) {
            case 1: return "Step 1: General Transaction Profile";
            case 2: return "Step 2: Citizen's Charter (CC) Questions";
            case 3: return isCC ? "Step 3: Service Quality Dimensions (SQD)" : "Step 2: Service Quality Dimensions (SQD)";
            case 4: return isCC ? "Step 4: Overall Institutional Experience" : "Step 3: Overall Institutional Experience";
            default: return `Step ${step}`;
        }
    };

    const addQuestion = (stepNumber) => {
        const newField = {
            field_id: Date.now(), 
            step_number: stepNumber,
            field_label: '',
            input_type: 'text',
            is_required: true,
            options: ['Option 1']
        };
        setData('fields', [...data.fields, newField]);
    };

    const removeQuestion = (fieldId) => {
        const fieldToDelete = data.fields.find(f => f.field_id === fieldId);
        setData('fields', data.fields.filter(f => f.field_id !== fieldId));
        setUndoQueue(fieldToDelete);
        setTimeout(() => setUndoQueue(null), 6000);
    };

    const undoRemove = () => {
        if (undoQueue) {
            setData('fields', [...data.fields, undoQueue].sort((a, b) => a.display_order - b.display_order));
            setUndoQueue(null);
        }
    };

    const updateField = (fieldId, key, value) => {
        setData('fields', data.fields.map(f => f.field_id === fieldId ? { ...f, [key]: value } : f));
    };

    const addOption = (fieldId) => {
        const field = data.fields.find(f => f.field_id === fieldId);
        const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
        updateField(fieldId, 'options', newOptions);
    };

    const removeOption = (fieldId, optionIndex) => {
        const field = data.fields.find(f => f.field_id === fieldId);
        const newOptions = field.options.filter((_, idx) => idx !== optionIndex);
        updateField(fieldId, 'options', newOptions);
    };

    const updateOption = (fieldId, optionIndex, value) => {
        const field = data.fields.find(f => f.field_id === fieldId);
        const newOptions = [...field.options];
        newOptions[optionIndex] = value;
        updateField(fieldId, 'options', newOptions);
    };

    // --- NEW: Toggle Lock Mechanism ---
    const toggleLock = (fieldId) => {
        if (unlockedFields.includes(fieldId)) {
            setUnlockedFields(unlockedFields.filter(id => id !== fieldId));
        } else {
            Swal.fire({
                title: 'Unlock Auto-Sync?',
                text: 'Unlocking allows you to manually edit this field and its options. If you change the question label, it will completely detach from the system and become a standard question.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f59e0b',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Yes, Unlock it'
            }).then((result) => {
                if (result.isConfirmed) {
                    setUnlockedFields([...unlockedFields, fieldId]);
                }
            });
        }
    };

    const submitForm = (e) => {
        e.preventDefault();
        const formId = currentForm?.data?.form_id || currentForm?.form_id || currentForm?.id;
        if (!formId) {
            alert("Error: formId is undefined!");
            return;
        }
        post(route('superadmin.forms.update', formId));
    };

    const { flash } = usePage().props;

    useEffect(() => {
        if (flash?.error) {
            Swal.fire({ title: 'Cannot Update Form', text: flash.error, icon: 'error', confirmButtonColor: '#dc2626' });
        }
    }, [flash]);

    return (
        <SuperAdminLayout headerTitle="Edit Form Builder">
            <Head title={`Edit Form - ${data.title}`} />
            
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-amber-800 text-sm mb-4 shadow-sm">
                    <strong><i className="fa-solid fa-circle-info mr-2"></i> Invisible Versioning Active:</strong> Saving changes will automatically archive the current version and generate a new active version to protect historical analytics.
                </div>

                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <form onSubmit={submitForm}>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Department</label>
                                <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                                    value={data.department_id || ''} onChange={e => setData('department_id', e.target.value)} required>
                                    <option value="" disabled>-- Select a Department --</option>
                                    {departments?.map(dept => (
                                        <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Form Description (Optional)</label>
                                <textarea className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" rows="1"
                                    value={data.description} onChange={e => setData('description', e.target.value)}></textarea>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-lg border-2 border-gray-300 mb-8 shadow-sm relative">
                            <div className="absolute top-0 left-0 bg-gray-200 text-gray-600 px-3 py-1 text-xs font-bold rounded-br-lg">
                                <i className="fa-solid fa-eye mr-1"></i> Live Header Preview
                            </div>
                            <div className="flex flex-col items-center text-center space-y-1 mt-4">
                                <input type="text" className="w-full max-w-md border-transparent hover:border-gray-300 focus:border-blue-500 rounded-md text-sm text-center focus:ring-0 p-1" value={data.header_1} onChange={e => setData('header_1', e.target.value)} />
                                <input type="text" className="w-full max-w-md border-transparent hover:border-gray-300 focus:border-blue-500 rounded-md font-bold text-base text-center focus:ring-0 p-1 uppercase" value={data.header_2} onChange={e => setData('header_2', e.target.value)} />
                                <input type="text" className="w-full max-w-md border-transparent hover:border-gray-300 focus:border-blue-500 rounded-md text-sm text-center focus:ring-0 p-1" value={data.header_3} onChange={e => setData('header_3', e.target.value)} />
                                <div className="pt-4 pb-2 font-semibold text-gray-800 uppercase tracking-wide">({selectedDepartmentName})</div>
                                <div className="pt-4 w-full max-w-lg">
                                    <select className="w-full border-2 border-blue-400 bg-blue-50 rounded-md shadow-sm focus:ring-blue-600 focus:border-blue-600 text-center font-bold text-xl uppercase py-2 cursor-pointer" 
                                        value={data.title} onChange={e => { setData('title', e.target.value); setData('form_type', e.target.value.includes('CHARTER') ? 'CC' : 'Non-CC'); }} required>
                                        <option value="CITIZEN'S CHARTER FEEDBACK FORM">CITIZEN'S CHARTER FEEDBACK FORM</option>
                                        <option value="FEEDBACK FORM">FEEDBACK FORM</option>
                                    </select>
                                </div>
                                <div className="pt-4 w-full max-w-md">
                                    <input type="text" className="w-full border-transparent hover:border-gray-300 focus:border-blue-500 rounded-md font-bold text-sm text-center text-gray-700 focus:ring-0 p-1 uppercase tracking-widest" value={data.tagline} onChange={e => setData('tagline', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <hr className="my-8 border-gray-200" />
                        <h4 className="text-xl font-bold text-center text-gray-800 mb-8">Construct Your Form Canvas</h4>
                        
                        {[1, 2, 3, 4].map(step => {
                            if (step === 2 && data.form_type === 'Non-CC') return null;

                            return (
                                <div key={`step-${step}`} className="bg-white p-6 rounded-lg border-2 border-blue-600 mb-8 shadow-sm">
                                    <h3 className="text-lg font-bold text-blue-700 border-b pb-3 mb-6">{getStepTitle(step)}</h3>
                                    
                                    {/* RESTORED: Step 1 Instruction Edit Field */}
                                    {step === 1 && (
                                        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-md">
                                            <label className="block text-sm font-bold text-blue-800 mb-2"><i className="fa-solid fa-circle-info mr-1"></i> Step 1 Instructions</label>
                                            <textarea className="w-full border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700" rows="3" value={data.step_1_instruction} onChange={e => setData('step_1_instruction', e.target.value)}></textarea>
                                        </div>
                                    )}

                                    {/* RESTORED: Step 2 Instruction Edit Field */}
                                    {step === 2 && data.form_type === 'CC' && (
                                        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-md">
                                            <label className="block text-sm font-bold text-blue-800 mb-2"><i className="fa-solid fa-circle-info mr-1"></i> Step 2 Instructions</label>
                                            <textarea className="w-full border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700" rows="2" value={data.step_2_instruction} onChange={e => setData('step_2_instruction', e.target.value)}></textarea>
                                        </div>
                                    )}
                                    
                                    {data.fields.filter(f => f.step_number === step).map((field, index) => {
                                        
                                        // --- UPDATED LOCK LOGIC ---
                                        const normalizedLabel = field.field_label.trim().replace(/:$/, '');
                                        const isSystemManaged = [
                                            'Name of Office/Department', 'Service Availed', 
                                            'Name of Service Provider', 'Position of Service Provider'
                                        ].includes(normalizedLabel) || normalizedLabel.toLowerCase().includes('service availed');
                                        
                                        const isLocked = isSystemManaged && !unlockedFields.includes(field.field_id); 
                                        const requiresOptions = ['dropdown', 'radio', 'multiselect'].includes(field.input_type);

                                        return (
                                            <div key={`field-${step}-${field.field_id}-${index}`} className={`p-5 mb-5 rounded-md border ${isLocked ? 'bg-gray-100 border-gray-300 border-l-4 border-l-gray-500' : 'bg-gray-50 border-gray-200 border-l-4 border-l-blue-500'} relative`}>
                                                
                                                {/* CONDITIONAL TOGGLE / REMOVE CONTROLS */}
                                                {isSystemManaged ? (
                                                    <div className="absolute top-4 right-4 flex items-center">
                                                        <button type="button" onClick={() => toggleLock(field.field_id)} 
                                                            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center ${isLocked ? 'bg-gray-200 text-gray-600 hover:bg-amber-100 hover:text-amber-700' : 'bg-amber-100 text-amber-700 hover:bg-gray-200 hover:text-gray-600'}`}>
                                                            <i className={`fa-solid ${isLocked ? 'fa-lock' : 'fa-unlock'} mr-1.5`}></i> 
                                                            {isLocked ? 'Auto-Synced' : 'Unlocked'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => removeQuestion(field.field_id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-sm font-bold">
                                                        <i className="fa-solid fa-xmark mr-1"></i> Remove
                                                    </button>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                    <div className="md:col-span-7">
                                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Question Label</label>
                                                        <input type="text" className={`w-full border-gray-300 rounded-md shadow-sm ${isLocked ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                                                            value={field.field_label} onChange={e => updateField(field.field_id, 'field_label', e.target.value)} 
                                                            disabled={isLocked} required />
                                                    </div>
                                                    
                                                    <div className="md:col-span-5">
                                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Input Type</label>
                                                        <select className={`w-full border-gray-300 rounded-md shadow-sm ${isLocked ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                                                            value={field.input_type} onChange={e => updateField(field.field_id, 'input_type', e.target.value)} 
                                                            disabled={isLocked}>
                                                            <option value="text">Short Text</option>
                                                            <option value="number">Number</option>
                                                            <option value="dropdown">Dropdown Menu</option>
                                                            <option value="radio">Radio Buttons</option>
                                                            <option value="multiselect">Multi-Select</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center">
                                                    <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                                        checked={field.is_required} onChange={e => updateField(field.field_id, 'is_required', e.target.checked)} 
                                                        disabled={isLocked} />
                                                    <label className="ml-2 block text-sm text-gray-900">Make this question required</label>
                                                </div>

                                                {requiresOptions && (
                                                    <div className="mt-6 pt-6 border-t border-dashed border-gray-300">
                                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Choices / Options</label>
                                                        
                                                        <div className="space-y-3">
                                                            {field.options && field.options.map((opt, idx) => (
                                                                <div key={idx} className="flex items-center space-x-2">
                                                                    <input type="text" className={`flex-1 border-gray-300 rounded-md shadow-sm ${isLocked ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                                                                        value={opt} onChange={e => updateOption(field.field_id, idx, e.target.value)} 
                                                                        disabled={isLocked} placeholder={`Option ${idx + 1}`} required />
                                                                    
                                                                    {!isLocked && (
                                                                        <button type="button" onClick={() => removeOption(field.field_id, idx)} className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md">
                                                                            <i className="fa-solid fa-trash"></i>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        
                                                        {!isLocked ? (
                                                            <button type="button" onClick={() => addOption(field.field_id)} className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md font-medium">
                                                                <i className="fa-solid fa-plus mr-2"></i> Add Option
                                                            </button>
                                                        ) : (
                                                            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded flex items-center">
                                                                <i className="fa-solid fa-lock mr-2"></i> Auto-synced options. Click "Auto-Synced" above to override.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <button type="button" onClick={() => addQuestion(step)} className="mt-2 px-4 py-2 border-2 border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 font-medium">
                                        <i className="fa-solid fa-plus mr-2"></i> Add Question to {getStepTitle(step).split(':')[0]}
                                    </button>
                                </div>
                            );
                        })}
                        
                        <hr className="my-8 border-gray-200" />
                        <div className="flex justify-end space-x-4">
                            <Link href={route('superadmin.forms.index')} className="px-6 py-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm font-bold transition">
                                Cancel
                            </Link>
                            <button type="submit" disabled={processing} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-75">
                                {processing ? 'Saving...' : 'Save New Version'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {undoQueue && (
                <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-6 z-50">
                    <span className="font-medium">Question removed.</span>
                    <button type="button" onClick={undoRemove} className="text-emerald-400 font-bold hover:text-emerald-300">
                        <i className="fa-solid fa-rotate-left mr-1"></i> Undo
                    </button>
                </div>
            )}
        </SuperAdminLayout>
    );
}