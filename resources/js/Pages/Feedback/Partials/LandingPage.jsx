import React, { useState } from 'react';
import { Head } from '@inertiajs/react';

export default function LandingPage({ form, departmentName, onStart }) {
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);

    return (
        <div className="fixed inset-0 z-50 bg-white lg:bg-[#0c2e17] flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden select-none">
            <Head title={`Welcome - ${form.title}`} />
            
            {/* Left Institutional Stage */}
            <div className="w-full lg:w-7/12 xl:w-2/3 p-6 sm:p-10 lg:p-16 xl:p-20 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#1E6031] via-[#144823] to-[#0a2713] text-white border-b-4 lg:border-b-0 lg:border-r-4 border-[#FFD700] shrink-0">
                <div className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-[28rem] sm:h-[28rem] rounded-full bg-[#FFD700]/10 blur-3xl pointer-events-none"></div>

                <div className="flex items-center space-x-3.5 sm:space-x-4 relative z-10">
                    <img src="/images/clsu-logo-white.png" alt="CLSU Seal" className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 object-contain drop-shadow-xl shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div>
                        <p className="text-white/80 font-bold tracking-widest uppercase text-[10px] sm:text-xs">{form.header_1 || 'Republic of the Philippines'}</p>
                        <h1 className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-black tracking-wide text-white leading-tight">{form.header_2 || 'CENTRAL LUZON STATE UNIVERSITY'}</h1>
                        <p className="text-white/60 text-[11px] sm:text-xs font-medium mt-0.5">{form.header_3 || 'Science City of Muñoz, Nueva Ecija'}</p>
                    </div>
                </div>

                <div className="my-8 sm:my-12 lg:my-14 space-y-4 sm:space-y-6 relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 backdrop-blur-md">
                        <i className="fa-solid fa-building-columns text-[#FFD700] text-xs"></i>
                        <span className="text-xs sm:text-sm font-bold text-[#FFD700] tracking-wide uppercase">Evaluating: {departmentName}</span>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">{form.title}</h2>
                        <p className="text-xs sm:text-base text-emerald-200/90 font-bold tracking-wider uppercase">{form.tagline || 'Help Us Serve You Better!'}</p>
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base text-white/70 leading-relaxed font-normal">
                        Your objective feedback drives continuous modernization across university facilities, personnel workflows, and public administrative service delivery.
                    </p>
                </div>

                <div className="relative z-10 pt-4 sm:pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] sm:text-xs text-white/60">
                    <span className="flex items-center gap-1.5 sm:gap-2"><i className="fa-solid fa-shield-halved text-[#FFD700]"></i> ARTA Standardized Client Satisfaction Measurement (CSM)</span>
                    <span>RA 11032 • Ease of Doing Business</span>
                </div>
            </div>

            {/* Right Action Stage */}
            <div className="w-full lg:w-5/12 xl:w-1/3 bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between items-center text-center relative z-10 flex-1">
                <div className="w-full hidden lg:flex justify-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Official Feedback Portal</span>
                </div>

                <div className="w-full max-w-sm my-auto space-y-5 sm:space-y-6 py-4 sm:py-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#1E6031]/10 text-[#1E6031] flex items-center justify-center text-2xl sm:text-3xl mx-auto shadow-inner border border-[#1E6031]/20">
                        <i className="fa-solid fa-clipboard-check"></i>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Ready to Begin?</h3>
                        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed px-2">All information provided is held under strict institutional confidentiality.</p>
                    </div>
                    <div className="space-y-3 pt-1">
                        <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="w-full py-3.5 sm:py-4 px-6 bg-[#1E6031] hover:bg-[#144823] active:scale-[0.98] text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-[#1E6031]/20 transition-all flex items-center justify-center gap-2.5 group cursor-pointer">
                            <span>Get Started</span>
                            <i className="fa-solid fa-arrow-right text-[#FFD700] transition-transform group-hover:translate-x-1"></i>
                        </button>
                    </div>
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium tracking-wide mt-4 lg:mt-0 pb-safe">
                    &copy; {new Date().getFullYear()} Central Luzon State University
                </div>
            </div>

            {/* Privacy & Terms Modal */}
            {showPrivacyPolicy && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-gray-100">
                        <div className="bg-[#1E6031] p-5 sm:p-6 border-b-4 border-[#FFD700] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FFD700] text-lg shrink-0">
                                    <i className="fa-solid fa-shield-halved"></i>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-wide leading-tight">Terms of Use & Privacy Consent</h3>
                                    <p className="text-[10px] sm:text-[11px] text-white/70 uppercase tracking-widest mt-0.5">CLSU Client Satisfaction Measurement</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setShowPrivacyPolicy(false)} className="text-white/60 hover:text-white p-1 transition">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-5 sm:p-7 text-xs sm:text-sm text-gray-600 leading-relaxed text-left overflow-y-auto flex-1 space-y-6">
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
                            <div className="space-y-2 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                                    <i className="fa-solid fa-file-contract text-[#1E6031]"></i>
                                    <h4>ARTA Terms & Evaluation Guidelines (RA 11032)</h4>
                                </div>
                                <p className="text-gray-600 leading-relaxed text-xs">
                                    Pursuant to <strong>Republic Act No. 11032</strong> (Ease of Doing Business Act) and the mandates of the <strong>Anti-Red Tape Authority (ARTA)</strong>, this evaluation establishes institutional transparency.
                                </p>
                                <ul className="list-disc pl-5 space-y-1.5 text-gray-600 marker:text-[#1E6031]">
                                    <li><strong>ARTA CSM Mandate:</strong> Feedback provided serves as official Client Satisfaction Measurement (CSM) data.</li>
                                    <li><strong>Authentic Transactions:</strong> Responses must reflect genuine, concluded interactions with CLSU.</li>
                                    <li><strong>Code of Conduct:</strong> Submissions containing malicious claims or profane language are subject to administrative review.</li>
                                    <li><strong>Session Integrity:</strong> Single-use session tokens and kiosk submissions are logged to preserve scientific validity.</li>
                                </ul>
                            </div>
                            <div className="pt-4 border-t border-gray-200 space-y-3 bg-gray-50/80 p-4 rounded-xl border">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input type="checkbox" checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 text-[#1E6031] focus:ring-[#1E6031] rounded border-gray-300 cursor-pointer" />
                                    <span className="text-xs sm:text-sm font-semibold text-gray-800 leading-snug">I have read, understood, and accept the <span className="text-[#1E6031]">Data Privacy Policy</span>.</span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="mt-0.5 w-4 h-4 text-[#1E6031] focus:ring-[#1E6031] rounded border-gray-300 cursor-pointer" />
                                    <span className="text-xs sm:text-sm font-semibold text-gray-800 leading-snug">I have read, understood, and agree to the <span className="text-[#1E6031]">Terms and Conditions</span>.</span>
                                </label>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-gray-100 flex items-center justify-between gap-2.5 shrink-0">
                            <button type="button" onClick={() => setShowPrivacyPolicy(false)} className="px-4 py-2 sm:px-5 sm:py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition uppercase text-[11px] sm:text-xs tracking-wider cursor-pointer">
                                Cancel
                            </button>
                            <button type="button" disabled={!agreedPrivacy || !agreedTerms} onClick={() => { setShowPrivacyPolicy(false); onStart(); }} className="px-5 py-2.5 sm:px-6 sm:py-2.5 bg-[#1E6031] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl hover:bg-[#144823] shadow-md transition uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1.5 cursor-pointer">
                                <span>Accept & Proceed</span>
                                <i className="fa-solid fa-arrow-right text-[#FFD700]"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}