import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function ReportPreview({ reportData }) {
    const { metadata, demographics, cc_metrics, sqd_metrics, recommendations, comments } = reportData;

    // SQD Question Mapping
    const sqdTexts = {
        sqd0: "SQD0. I am satisfied with the service that I availed.",
        sqd1: "SQD1. I spent a reasonable amount of time for my transaction.",
        sqd2: "SQD2. The office followed the transaction's requirement from the office or its website.",
        sqd3: "SQD3. The steps (including payment) needed to do for my transaction were easy and simple.",
        sqd4: "SQD4. I easily found information about my transaction from the office or its website.",
        sqd5: "SQD5. I paid a reasonable amount of fees for my transaction.",
        sqd6: "SQD6. I feel the office was fair to everyone, or \"walang palakasan\" during my transaction.",
        sqd7: "SQD7. I was treated courteously by the staff, and (if I asked for help) the staff was helpful.",
        sqd8: "SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.",
        overall_satisfaction: "Overall, how would you rate your entire educational experience at CLSU?"
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-200 py-10 print:py-0 print:bg-white text-black font-sans">
            <Head title={`Report - ${metadata.department}`} />

            {/* Non-Printable Action Bar */}
            <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center print:hidden">
                <Link 
                    href={route('superadmin.reports.index')} 
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow hover:bg-gray-50 transition"
                >
                    <i className="fa-solid fa-arrow-left mr-2"></i> Back to Archive
                </Link>
                <button 
                    onClick={handlePrint}
                    className="bg-[#009639] text-white px-5 py-2 rounded shadow hover:bg-[#007a2e] transition font-bold"
                >
                    <i className="fa-solid fa-print mr-2"></i> Print / Save as PDF
                </button>
            </div>

            {/* A4 Paper Container */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:max-w-none print:w-full p-12 print:p-0 box-border text-[11px] leading-relaxed">
                
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="font-bold text-lg uppercase tracking-wide">Central Luzon State University</h1>
                    <p className="text-sm">Science City of Muñoz, Nueva Ecija</p>
                    <p className="font-bold mt-2">OFFICE OF THE UNIVERSITY PRESIDENT</p>
                    <h2 className="font-bold text-md mt-4 uppercase border-b-2 border-black inline-block pb-1">Office Feedback Report</h2>
                </div>

                {/* Metadata */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                    <div>
                        <p><span className="font-bold">Office Rated:</span> {metadata.department}</p>
                        <p><span className="font-bold">Evaluation Period:</span> {metadata.period}</p>
                    </div>
                    <div className="text-right">
                        <p>This is the summary report on the feedback given by:</p>
                        <p className="font-bold text-lg">{metadata.total_respondents} <span className="font-normal text-sm">(Student-rate/evaluators)</span></p>
                    </div>
                </div>

                {/* Demographics Tables */}
                <div className="mb-6 grid grid-cols-2 gap-6">
                    <div>
                        {/* Client Type */}
                        <table className="w-full border-collapse border border-black mb-4">
                            <thead>
                                <tr>
                                    <th className="border border-black p-1 text-left bg-gray-100">Client Type</th>
                                    <th className="border border-black p-1 text-center bg-gray-100">Frequency</th>
                                    <th className="border border-black p-1 text-center bg-gray-100">Percent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(demographics.client_type).map(([key, data]) => (
                                    <tr key={key}>
                                        <td className="border border-black p-1">{key}</td>
                                        <td className="border border-black p-1 text-center">{data.count}</td>
                                        <td className="border border-black p-1 text-center">{data.percent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Sex */}
                        <table className="w-full border-collapse border border-black">
                            <thead>
                                <tr>
                                    <th className="border border-black p-1 text-left bg-gray-100">Sex</th>
                                    <th className="border border-black p-1 text-center bg-gray-100">Frequency</th>
                                    <th className="border border-black p-1 text-center bg-gray-100">Percent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(demographics.sex).map(([key, data]) => (
                                    <tr key={key}>
                                        <td className="border border-black p-1">{key}</td>
                                        <td className="border border-black p-1 text-center">{data.count}</td>
                                        <td className="border border-black p-1 text-center">{data.percent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Services Availed */}
                    <div>
                        <table className="w-full border-collapse border border-black h-full">
                            <thead>
                                <tr>
                                    <th className="border border-black p-1 text-left bg-gray-100">Service Availed</th>
                                    <th className="border border-black p-1 text-center bg-gray-100">Frequency</th>
                                    <th className="border border-black p-1 text-center bg-gray-100">Percent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(demographics.services).map(([key, data]) => (
                                    <tr key={key}>
                                        <td className="border border-black p-1">{key}</td>
                                        <td className="border border-black p-1 text-center">{data.count}</td>
                                        <td className="border border-black p-1 text-center">{data.percent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* CC Metrics (Only if CC type) */}
                {metadata.type === 'cc' && (
                    <div className="mb-6 page-break-inside-avoid">
                        <table className="w-full border-collapse border border-black">
                            <thead>
                                <tr>
                                    <th className="border border-black p-1 text-left bg-gray-100">Citizen's Charter (CC)</th>
                                    <th className="border border-black p-1 text-center bg-gray-100 w-24">Frequency</th>
                                    <th className="border border-black p-1 text-center bg-gray-100 w-24">Percent</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colSpan="3" className="border border-black p-1 font-bold bg-gray-50">CC1</td></tr>
                                {Object.entries(cc_metrics.cc1).map(([key, data]) => (
                                    <tr key={key}>
                                        <td className="border border-black p-1 pl-4">{key}</td>
                                        <td className="border border-black p-1 text-center">{data.count}</td>
                                        <td className="border border-black p-1 text-center">{data.percent}%</td>
                                    </tr>
                                ))}
                                
                                <tr><td colSpan="3" className="border border-black p-1 font-bold bg-gray-50">CC2</td></tr>
                                {Object.entries(cc_metrics.cc2).map(([key, data]) => (
                                    <tr key={`cc2-${key}`}>
                                        <td className="border border-black p-1 pl-4">{key}</td>
                                        <td className="border border-black p-1 text-center">{data.count}</td>
                                        <td className="border border-black p-1 text-center">{data.percent}%</td>
                                    </tr>
                                ))}

                                <tr><td colSpan="3" className="border border-black p-1 font-bold bg-gray-50">CC3</td></tr>
                                {Object.entries(cc_metrics.cc3).map(([key, data]) => (
                                    <tr key={`cc3-${key}`}>
                                        <td className="border border-black p-1 pl-4">{key}</td>
                                        <td className="border border-black p-1 text-center">{data.count}</td>
                                        <td className="border border-black p-1 text-center">{data.percent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Page Break for printing if needed */}
                <div className="print:break-before-page"></div>

                {/* SQD Metrics Matrix */}
                <div className="mb-6">
                    <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                            <tr className="bg-gray-100">
                                <th rowSpan="2" className="border border-black p-2 text-left w-1/2">Service Quality Dimensions (SQD)</th>
                                <th colSpan="6" className="border border-black p-1 text-center">Frequency Ratings</th>
                                <th rowSpan="2" className="border border-black p-1 text-center">MEAN RATING</th>
                                <th rowSpan="2" className="border border-black p-1 text-center">ADJECTIVAL RATING</th>
                            </tr>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1 w-8">SD(1)</th>
                                <th className="border border-black p-1 w-8">D(2)</th>
                                <th className="border border-black p-1 w-8">N(3)</th>
                                <th className="border border-black p-1 w-8">A(4)</th>
                                <th className="border border-black p-1 w-8">SA(5)</th>
                                <th className="border border-black p-1 w-8">N/A</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(sqd_metrics).map(([key, data]) => (
                                <tr key={key}>
                                    <td className="border border-black p-1.5">{sqdTexts[key]}</td>
                                    <td className="border border-black p-1 text-center">{data.counts['1']}</td>
                                    <td className="border border-black p-1 text-center">{data.counts['2']}</td>
                                    <td className="border border-black p-1 text-center">{data.counts['3']}</td>
                                    <td className="border border-black p-1 text-center">{data.counts['4']}</td>
                                    <td className="border border-black p-1 text-center">{data.counts['5']}</td>
                                    <td className="border border-black p-1 text-center">{data.counts['na']}</td>
                                    <td className="border border-black p-1 text-center font-bold">{data.mean}</td>
                                    <td className="border border-black p-1 text-center">{data.adjectival}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Recommendations & Comments */}
                <div className="grid grid-cols-2 gap-6 mb-8 page-break-inside-avoid">
                    <div>
                        <table className="w-full border-collapse border border-black mb-4">
                            <thead>
                                <tr>
                                    <th className="border border-black p-1 text-left bg-gray-100">Overall, I would recommend CLSU to my peers</th>
                                    <th className="border border-black p-1 text-center bg-gray-100">Frequency</th>
                                    <th className="border border-black p-1 text-center bg-gray-100">Percent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(recommendations).map(([key, data]) => (
                                    <tr key={`rec-${key}`}>
                                        <td className="border border-black p-1">{key}</td>
                                        <td className="border border-black p-1 text-center">{data.count}</td>
                                        <td className="border border-black p-1 text-center">{data.percent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div className="border border-black p-2 bg-gray-50 text-[10px]">
                            <p className="font-bold mb-1">Rating Scale:</p>
                            <ul className="grid grid-cols-2 gap-x-4">
                                <li>4.21 - 5.00: Excellent</li>
                                <li>3.41 - 4.20: Very Good</li>
                                <li>2.61 - 3.40: Good</li>
                                <li>1.81 - 2.50: Fair</li>
                                <li>1.00 - 1.80: Needs Improvement</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="border border-black p-2 flex flex-col h-full">
                        <p className="font-bold mb-2 border-b border-gray-300 pb-1">Rater's comments/Suggestions:</p>
                        <div className="flex-1 overflow-y-auto pr-2 text-gray-800">
                            {comments.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1">
                                    {comments.map((comment, index) => (
                                        <li key={index}>{comment}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="italic text-gray-500">No comments provided.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Signatories Footer */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-10 pt-8 mt-4 border-t-2 border-gray-200 page-break-inside-avoid">
                    <div className="text-center">
                        <p className="text-left mb-6">Prepared by:</p>
                        <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <p className="font-bold uppercase tracking-wider">Department Chair</p>
                    </div>
                    <div className="text-center">
                        <p className="text-left mb-6">Reviewed by:</p>
                        <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <p className="font-bold uppercase tracking-wider">College Dean</p>
                    </div>
                    <div className="text-center">
                        <p className="text-left mb-6">Attested by:</p>
                        <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <p className="font-bold uppercase tracking-wider">Vice President for Academic Affairs</p>
                    </div>
                    <div className="text-center">
                        <p className="text-left mb-6">Approved by:</p>
                        <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <p className="font-bold uppercase tracking-wider">University President</p>
                    </div>
                </div>

            </div>
        </div>
    );
}