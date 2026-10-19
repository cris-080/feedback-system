import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import SearchFilter from '@/Components/SearchFilter';
import Pagination from '@/Components/Pagination';

export default function Feedback({ feedbacks, isSuperAdmin }) {
    // --- MODAL STATE ---
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [animateModal, setAnimateModal] = useState(false);

    // --- SEARCH & FILTER STATE ---
    const queryParams = new URLSearchParams(window.location.search);
    const [searchQuery, setSearchQuery] = useState(queryParams.get('search') || '');
    const [sentimentFilter, setSentimentFilter] = useState(queryParams.get('sentiment') || '');
    const isInitialRender = useRef(true);
    const hasActiveFilters = !!sentimentFilter;

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        const timeout = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (sentimentFilter) params.sentiment = sentimentFilter;

            router.get(window.location.pathname, params, { 
                preserveState: true, preserveScroll: true, replace: true 
            });
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, sentimentFilter]);

    const openModal = (feedback) => {
        setSelectedFeedback(feedback);
        requestAnimationFrame(() => {
            setAnimateModal(true);
        });
    };

    const closeModal = () => {
        setAnimateModal(false);
        setTimeout(() => {
            setSelectedFeedback(null);
        }, 300);
    };

    // --- HELPER FUNCTIONS ---
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        
        // Laravel sends raw strings like "2026-09-17 06:51:00". 
        // Appending ' UTC' forces the browser to convert it to the user's local timezone (+8 PHT).
        const safeDate = dateString.includes('T') ? dateString : `${dateString} UTC`;
        
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(safeDate).toLocaleDateString('en-US', options);
    };

    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
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

        let answers = selectedFeedback.answers;
        if (typeof answers === 'string') {
            try { answers = JSON.parse(answers); } catch (e) { return null; }
        }

        for (const key of possibleKeys) {
            const lowerKey = key.toLowerCase();
            const matchingKey = Object.keys(answers).find(k => k.toLowerCase().includes(lowerKey));
            
            if (matchingKey && answers[matchingKey] !== null && answers[matchingKey] !== '') {
                return answers[matchingKey];
            }
        }
        
        return null;
    };

    // --- HARASSMENT CHECKER ---
    const hasHarassmentReported = (answers) => {
        if (!answers) return false;
        let parsedAnswers = answers;
        if (typeof answers === 'string') {
            try { parsedAnswers = JSON.parse(answers); } catch (e) { return false; }
        }
        
        for (const key of Object.keys(parsedAnswers)) {
            const lowerKey = key.toLowerCase();
            // Check if it's the root Harassment question (not the details question)
            if (lowerKey.includes('harassment') && !lowerKey.includes('detail') && !lowerKey.includes('if yes')) {
                const val = String(parsedAnswers[key]).trim().toLowerCase();
                if (val === 'yes') {
                    return true;
                }
            }
        }
        return false;
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
            
            <div className="p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6 pb-10">
                    
                    {/* --- TOOLBAR WITH SEARCH & FILTER --- */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
                     <SearchFilter 
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder="Search date, requester, category, details, or status..."
                            hasActiveFilters={hasActiveFilters}
                            onFilterReset={() => setStatusFilter('')}
                            filterTitle="Filter Requests"
                        >
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">By Sentiment</label>
                                <select 
                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:ring-[#009639] focus:border-[#009639] bg-gray-50 hover:bg-white transition-colors cursor-pointer"
                                    value={sentimentFilter}
                                    onChange={(e) => setSentimentFilter(e.target.value)}
                                >
                                    <option value="">All Sentiments</option>
                                    <option value="Positive">Positive</option>
                                    <option value="Neutral">Neutral</option>
                                    <option value="Mixed">Mixed</option>
                                    <option value="Negative">Negative</option>
                                </select>
                            </div>
                        </SearchFilter>

                        {(searchQuery || sentimentFilter) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSentimentFilter('');
                                }}
                                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                            >
                                <i className="fa-solid fa-filter-circle-xmark mr-1.5"></i>
                                Clear Feedback Filter
                            </button>
                        )}
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
                                        <th className="px-6 py-4 text-center">Harassment</th>
                                        <th className="px-6 py-4 text-center">Sentiment Analysis</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {feedbacks?.data?.length > 0 ? (
                                        feedbacks.data.map((item) => {
                                            const hasHarassment = hasHarassmentReported(item.answers);
                                            const rowClasses = hasHarassment 
                                                ? "bg-red-50 hover:bg-red-100 transition" 
                                                : "hover:bg-gray-50/50 transition";

                                            return (
                                                <tr key={item.response_id} className={rowClasses}>
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
                                                        {hasHarassment ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-800 font-bold text-xs border border-red-200">
                                                                <i className="fa-solid fa-triangle-exclamation"></i> Reported
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-gray-400 font-medium text-xs">
                                                                None
                                                            </span>
                                                        )}
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
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
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
                        <Pagination dataObject={feedbacks} />
                    </div>
                </div>

               {/* --- VERTICAL SCROLL FEEDBACK VIEWER MODAL --- */}
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
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Feedback Details</h3>
                                    <p className="text-sm text-gray-500">Control No: {selectedFeedback.control_number}</p>
                                </div>
                                <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <i className="fa-solid fa-xmark text-2xl"></i>
                                </button>
                            </div>

                            {/* Modal Body (Scrollable Content Area) */}
                            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-10">
                                
                                {/* SECTION 1: General Profile */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">1. General Transaction Profile</h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <DataField label="Department / Office" value={selectedFeedback.department_name} />
                                            <DataField 
                                                label="Date of Transaction" 
                                                value={selectedFeedback.transaction_date 
                                                    ? formatDateOnly(selectedFeedback.transaction_date) 
                                                    : formatDateOnly(selectedFeedback.submitted_at)} 
                                            />
                                            <DataField label="Client Classification" value={getFieldValue(['client classification', 'client type', 'client'])} />
                                            <DataField label="Transaction Type" value={getFieldValue(['transaction type'])} />
                                            <DataField label="Sex" value={getFieldValue(['sex', 'gender'])} />
                                            <DataField label="Age" value={getFieldValue(['age'])} />
                                            <DataField label="Region of Residence" value={getFieldValue(['region of residence', 'region', 'residence'])} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                            <div className="sm:col-span-2">
                                                <DataField label="Specific Service Availed" value={getFieldValue(['service availed', 'specific service', 'service name'])} />
                                            </div>
                                            <DataField label="Service Provider" value={getFieldValue(['name of service provider', 'service provider'])} />
                                            <DataField label="Provider Position" value={getFieldValue(['position of service provider', 'provider position'])} />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 2: Citizen's Charter */}
                                {getFieldValue(['cc1', 'cc 1']) && (
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">2. Citizen's Charter</h4>
                                        <div className="space-y-2">
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
                                    </div>
                                )}

                                {/* SECTION 3: SQD */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">3. Service Quality Dimensions</h4>
                                    <div className="mb-8">
                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dimension</span>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client Rating</span>
                                            </div>
                                            <div className="divide-y divide-gray-100">
                                                {Object.entries(selectedFeedback?.answers || {})
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
                                    
                                    {/* Overall Educational Experience Star Rating */}
                                    {getFieldValue(['educational experience', 'overall, how would you rate']) && (() => {
                                        const ratingVal = parseInt(getFieldValue(['educational experience', 'overall, how would you rate']), 10) || 0;
                                        return (
                                            <div className="bg-gradient-to-br from-emerald-50/50 to-amber-50/30 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900">Overall Educational Experience</h4>
                                                    <p className="text-xs text-gray-500">Client's institutional rating.</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <i key={star} className={`text-2xl ${ratingVal >= star ? 'fa-solid fa-star text-amber-400 drop-shadow-sm' : 'fa-regular fa-star text-gray-300'}`}></i>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* SECTION 4: Remarks & AI Sentiment */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">4. Overall Institutional Experience</h4>
                                    <div className="space-y-6">
                                        
                                        <div className="grid grid-cols-1 gap-4">
                                            <DataField 
                                                label="Overall, I would recommend CLSU to my peers." 
                                                value={getFieldValue(['recommend clsu', 'recommend', 'overall, i would recommend'])} 
                                            />
                                            
                                            {hasHarassmentReported(selectedFeedback.answers) && (
                                                <div className="bg-red-50 border border-red-200 p-4 rounded-lg shadow-sm">
                                                    <span className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-2">
                                                        <i className="fa-solid fa-triangle-exclamation mr-1.5"></i> Harassment Details
                                                    </span>
                                                    <span className="block text-sm font-semibold text-red-900 whitespace-pre-wrap">
                                                        {getFieldValue(['detail the harassment', 'if yes', 'experienced']) || <span className="text-red-400 italic">No details provided.</span>}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

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

                                        <div>
                                            <DataField 
                                                label="Respondent Email Address" 
                                                value={selectedFeedback.email_address || getFieldValue(['email', 'email address'])} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
                                <button 
                                    onClick={closeModal}
                                    className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold text-sm hover:bg-gray-900 transition shadow-sm"
                                >
                                    Close <i className="fa-solid fa-check ml-1.5"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}