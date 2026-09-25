import { Link } from '@inertiajs/react';

export default function Pagination({ dataObject }) {
    if (!dataObject) return null;

    // Auto-detect standard pagination vs API Resource wrapper
    const paginationLinks = dataObject.meta?.links || dataObject.links;
    const from = dataObject.meta?.from || dataObject.from || 0;
    const to = dataObject.meta?.to || dataObject.to || 0;
    const total = dataObject.meta?.total || dataObject.total || 0;
    
    // Hide if no data at all
    if (total === 0) return null;

    return (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                
                {/* 1. Results Counter */}
                <div>
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-bold">{from}</span> to <span className="font-bold">{to}</span> of <span className="font-bold">{total}</span> results
                    </p>
                </div>
                
                {/* 2. Pagination Buttons (Only show if there are multiple pages) */}
                {paginationLinks && paginationLinks.length > 3 && (
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            {paginationLinks.map((link, index) => {
                                let className = "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ";
                                
                               if (link.active) {
                                    // Changed from bg-[#009639] to Tailwind's blue-600
                                    className += "z-10 bg-blue-600 border-blue-600 text-white";
                                } else if (!link.url) {
                                    className += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
                                } else {
                                    className += "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                                }
                                
                                if (index === 0) className += " rounded-l-md";
                                if (index === paginationLinks.length - 1) className += " rounded-r-md";

                                return link.url ? (
                                    <Link 
                                        key={index} 
                                        href={link.url} 
                                        preserveScroll 
                                        preserveState 
                                        className={className} 
                                        dangerouslySetInnerHTML={{ __html: link.label }} 
                                    />
                                ) : (
                                    <span 
                                        key={index} 
                                        className={className} 
                                        dangerouslySetInnerHTML={{ __html: link.label }} 
                                    />
                                );
                            })}
                        </nav>
                    </div>
                )}
            </div>
        </div>
    );
}