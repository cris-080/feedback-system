import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';

export default function Feedback({ feedbacks, isSuperAdmin }) {
    // --- MODAL STATE ---
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [animateModal, setAnimateModal] = useState(false);

    const openModal = (feedback) => {
        setSelectedFeedback(feedback);
        setCurrentStep(1);
        requestAnimationFrame(() => {
            setAnimateModal(true);
        });
    };

    const closeModal = () => {
        setAnimateModal(false);
        setTimeout(() => {
            setSelectedFeedback(null);
            setCurrentStep(1);
        }, 300);
    };

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    // --- HELPER FUNCTIONS ---
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    const renderSentimentBadge = (sentiment, score) => {
        if (!sentiment) {
            return <span className="text-gray-400 text-xs italic">Pending Analysis</span>;
        }

        const normalizedSentiment = sentiment.toLowerCase();
        let colors = 'bg-gray-100 text-gray-800 border-gray-200';
        let icon = 'fa-face-meh';

        if (normalizedSentiment === 'positive') {
            colors = 'bg-green-50 text-green-700 border-green-200';
            icon = 'fa-face-smile';
        } else if (normalizedSentiment === 'negative') {
            colors = 'bg-red-50 text-red-700 border-red-200';
            icon = 'fa-face-frown';
        }

        return (
            <div className="flex flex-col items-center justify-center space-y-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs border ${colors}`}>
                    <i className={`fa-regular ${icon}`}></i>
                    <span className="capitalize">{sentiment}</span>
                </span>
                {score && (
                    <span className="text-[10px] text-gray-500 font-medium">
                        {Number(score).toFixed(1)}% Confidence
                    </span>
                )}
            </div>
        );
    };

    // --- ROBUST DATA FETCHER ---
    const getFieldValue = (possibleKeys) => {
        if (!selectedFeedback || !selectedFeedback.answers) return null;

        const answers = selectedFeedback.answers;

        for (const key of possibleKeys) {
            const lowerKey = key.toLowerCase();
            const matchingKey = Object.keys(answers).find(k => k.toLowerCase().includes(lowerKey));
            
            if (matchingKey && answers[matchingKey] !== null && answers[matchingKey] !== '') {
                return answers[matchingKey];
            }
        }
        
        return null;
    };

    // --- MODAL SUB-COMPONENTS ---
    const DataField = ({ label, value }) => (
        <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg">
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</span>
            <span className="block text-sm font-semibold text-gray-900 whitespace-pre-wrap">
                {value || <span className="text-gray-400 italic">Not specified</span>}
            </span>
        </div>
    );

    const QABox = ({ question, answer }) => (
        <div className="mb-5">
            <h4 className="text-sm font-bold text-gray-800 mb-2">{question}</h4>
            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-sm text-gray-700 font-medium whitespace-pre-wrap">
                {answer || <span className="text-gray-400 italic">No answer provided</span>}
            </div>
        </div>
    );

    return (
        <SuperAdminLayout headerTitle="Feedback Datastore">
            <Head title={isSuperAdmin ? "Feedback Datastore" : "Department Feedback Datastore"} />
            
            <div className="max-w-7xl mx-auto space-y-6 pb-10">
                
                {/* Header Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <i className="fa-solid fa-database text-blue-600"></i>
                            Centralized Feedback Repository
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            A read-only log of all raw feedback submissions collected across the university.
                        </p>
                    </div>
                </div>

                {/* Data Table Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-[#009639] border-b border-gray-200 text-xs uppercase font-bold text-white tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Control Number</th>
                                    <th className="px-6 py-4">Department / Office</th>
                                    <th className="px-6 py-4">Date & Time Submitted</th>
                                    <th className='px-6 py-4 text-center'>Sentiment Analysis</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {feedbacks?.data?.length > 0 ? (
                                    feedbacks.data.map((item) => (
                                        <tr key={item.response_id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                                {item.control_number}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs border border-blue-100">
                                                    <i className="fa-regular fa-building text-[10px]"></i>
                                                    {item.department_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {formatDateTime(item.submitted_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {renderSentimentBadge(item.sentiment, item.sentiment_score)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    type="button"
                                                    title="View Full Feedback"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition active:scale-95"
                                                    onClick={() => openModal(item)}
                                                >
                                                    <i className="fa-solid fa-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-regular fa-folder-open text-4xl mb-3 text-gray-300"></i>
                                                <p className="text-sm font-medium">No feedback submissions found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                   {/* Server-Side Pagination */}
{feedbacks?.links && (
    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
            
            {/* 1. This ALWAYS shows as long as pagination data exists */}
            <div>
                <p className="text-sm text-gray-700">
                    Showing <span className="font-bold">{feedbacks.from || 0}</span> to <span className="font-bold">{feedbacks.to || 0}</span> of <span className="font-bold">{feedbacks.total || 0}</span> results
                </p>
            </div>
            
            {/* 2. This ONLY shows the buttons if there is more than 1 page (> 3 links) */}
            <div>
                {feedbacks.links.length > 3 && (
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        {feedbacks.links.map((link, index) => {
                            let className = "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ";
                            
                            if (link.active) {
                                className += "z-10 bg-[#009639] border-[#009639] text-white";
                            } else if (!link.url) {
                                className += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
                            } else {
                                className += "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                            }
                            
                            if (index === 0) className += " rounded-l-md";
                            if (index === feedbacks.links.length - 1) className += " rounded-r-md";

                            return link.url ? (
                                <Link key={index} href={link.url} preserveScroll preserveState className={className} dangerouslySetInnerHTML={{ __html: link.label }} />
                            ) : (
                                <span key={index} className={className} dangerouslySetInnerHTML={{ __html: link.label }} />
                            );
                        })}
                    </nav>
                )}
            </div>
            
        </div>
    </div>
)}
                </div>
            </div>

            {/* --- MULTI-STEP FEEDBACK VIEWER MODAL --- */}
            {selectedFeedback && (
                <div 
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm transition-opacity duration-300 ease-out p-4 ${
                        animateModal ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0'
                    }`}
                    onClick={closeModal}
                >
                    <div 
                        className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all duration-300 ease-out ${
                            animateModal ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">
                                {currentStep === 1 && "Step 1: General Transaction Profile"}
                                {currentStep === 2 && "Step 2: Citizen's Charter (CC) Questions"}
                                {currentStep === 3 && "Step 3: Service Quality Dimensions (SQD)"}
                                {currentStep === 4 && "Step 4: Overall Institutional Experience"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>

                        {/* Modal Body (Scrollable Content Area) */}
                        <div className="p-6 overflow-y-auto flex-1 bg-white">
                            {/* STEP 1: General Profile */}
                            {currentStep === 1 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <DataField label="Control Number" value={selectedFeedback.control_number} />
                                        <DataField label="Department / Office" value={selectedFeedback.department_name} />
                                        <DataField label="Date & Time" value={formatDateTime(selectedFeedback.submitted_at)} />
                                        
                                        <DataField label="Client Classification" value={getFieldValue(['client classification', 'client type', 'client'])} />
                                        <DataField label="Transaction Type" value={getFieldValue(['transaction type'])} />
                                        <DataField label="Sex" value={getFieldValue(['sex', 'gender'])} />
                                        <DataField label="Age" value={getFieldValue(['age'])} />
                                        <DataField label="Region of Residence" value={getFieldValue(['region of residence', 'region', 'residence'])} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                        <div className="sm:col-span-2">
                                            {/* Corrected key mapping for Service Availed */}
                                            <DataField label="Specific Service Availed" value={getFieldValue(['service availed', 'specific service', 'service name'])} />
                                        </div>
                                        {/* Added Service Provider Fields */}
                                        <DataField label="Service Provider" value={getFieldValue(['name of service provider', 'service provider'])} />
                                        <DataField label="Provider Position" value={getFieldValue(['position of service provider', 'provider position'])} />
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Citizen's Charter */}
                            {currentStep === 2 && (
                                <div className="space-y-2 animate-fade-in">
                                    <QABox 
                                        question="CC1: Which of the following best describes your awareness of a CC?" 
                                        answer={getFieldValue(['cc1', 'cc 1'])} 
                                    />
                                    <QABox 
                                        question="CC2: If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was...?" 
                                        answer={getFieldValue(['cc2', 'cc 2'])} 
                                    />
                                    <QABox 
                                        question="CC3: If aware of CC (answered 1-3 in CC1), how much did the CC help you in your transaction?" 
                                        answer={getFieldValue(['cc3', 'cc 3'])} 
                                    />
                                </div>
                            )}

                            {/* STEP 3: SQD */}
                            {currentStep === 3 && (
                                <div className="mb-8 animate-fade-in">
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dimension</span>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client Rating</span>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {Object.entries(selectedFeedback.answers)
                                                .filter(([key]) => key.toUpperCase().includes('SQD'))
                                                .map(([key, val], idx) => {
                                                    const formatSqdBadge = (answer) => {
                                                        if (!answer) return { text: 'No Answer', color: 'bg-gray-100 text-gray-500 border-gray-200' };
                                                        
                                                        const ans = answer.toString().toLowerCase();
                                                        if (ans.includes('strongly agree') || ans === '5') return { text: 'Strongly Agree (5)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
                                                        if (ans.includes('neither') || ans === '3') return { text: 'Neither Agree nor Disagree (3)', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
                                                        if (ans.includes('strongly disagree') || ans === '1') return { text: 'Strongly Disagree (1)', color: 'bg-red-100 text-red-800 border-red-300' };
                                                        if (ans.includes('disagree') || ans === '2') return { text: 'Disagree (2)', color: 'bg-orange-100 text-orange-800 border-orange-300' };
                                                        if (ans.includes('agree') || ans === '4') return { text: 'Agree (4)', color: 'bg-green-100 text-green-800 border-green-300' };
                                                        if (ans.includes('n/a') || ans.includes('applicable')) return { text: 'Not Applicable (N/A)', color: 'bg-gray-100 text-gray-600 border-gray-300' };
                                                        
                                                        return { text: answer, color: 'bg-blue-50 text-blue-700 border-blue-200' };
                                                    };

                                                    const badge = formatSqdBadge(val);

                                                    return (
                                                        <div key={idx} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                                                            <span className="text-sm font-semibold text-gray-800 w-2/3 pr-4">{key}</span>
                                                            <div className="w-1/3 flex justify-end">
                                                                <span className={`px-3 py-1.5 rounded-md text-xs font-bold border shadow-sm text-center ${badge.color}`}>
                                                                    {badge.text}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Remarks & AI Sentiment */}
                            {currentStep === 4 && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="mb-2">
                                        <h4 className="text-sm font-bold text-gray-800 mb-2">
                                            <i className="fa-regular fa-comment-dots mr-2"></i>
                                            Comments, Suggestions, or Remarks
                                        </h4>
                                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-sm text-gray-800 min-h-[120px] whitespace-pre-wrap">
                                            {getFieldValue(['remarks', 'comments', 'suggestions', 'message', 'comment']) || <span className="text-gray-400 italic">No additional remarks provided by the client.</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">AI Sentiment Result</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Calculated based on the remarks provided above.</p>
                                        </div>
                                        <div>
                                            {renderSentimentBadge(selectedFeedback.sentiment, selectedFeedback.sentiment_score)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer / Navigation Controls */}
                        <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3 items-center">
                            {/* Step Indicator */}
                            <div className="mr-auto flex gap-1.5">
                                {[1, 2, 3, 4].map((step) => (
                                    <span 
                                        key={step} 
                                        className={`block w-2.5 h-2.5 rounded-full transition-colors ${currentStep === step ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    ></span>
                                ))}
                            </div>

                            <button 
                                onClick={prevStep}
                                disabled={currentStep === 1}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                    currentStep === 1 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm'
                                }`}
                            >
                                <i className="fa-solid fa-chevron-left mr-1.5"></i> Previous
                            </button>
                            
                            {currentStep < 4 ? (
                                <button 
                                    onClick={nextStep}
                                    className="px-5 py-2 bg-gray-800 text-white rounded-lg font-semibold text-sm hover:bg-gray-900 transition shadow-sm"
                                >
                                    Next <i className="fa-solid fa-chevron-right ml-1.5"></i>
                                </button>
                            ) : (
                                <button 
                                    onClick={closeModal}
                                    className="px-5 py-2 bg-[#009639] text-white rounded-lg font-semibold text-sm hover:bg-[#1E6031] transition shadow-sm"
                                >
                                    Finish <i className="fa-solid fa-check ml-1.5"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}