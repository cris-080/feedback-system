import { useState, useRef, useEffect } from 'react';

export default function SearchFilter({ 
    // Search Props
    searchValue, 
    onSearchChange, 
    searchPlaceholder = "Search...",
    
    // Filter Props
    hasActiveFilters = false, 
    onFilterReset, 
    filterTitle = "Filters",
    children 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking anywhere outside of it
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            
            {/* --- SEARCH BAR --- */}
            <div className="relative w-full sm:w-64 md:w-72 flex-shrink-0">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
                </div>
                
                <input 
                    type="text" 
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#009639] focus:border-[#009639] text-sm" 
                    placeholder={searchPlaceholder} 
                    value={searchValue} 
                    onChange={(e) => onSearchChange(e.target.value)} 
                />
                
                {searchValue && (
                    <button 
                        type="button"
                        onClick={() => onSearchChange('')} 
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                )}
            </div>

            {/* --- FILTER DROPDOWN --- */}
            {children && (
                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className={`p-2.5 rounded-md border text-sm font-semibold transition flex items-center justify-center relative ${
                            hasActiveFilters 
                                ? 'bg-emerald-50 border-[#009639] text-[#1E6031]' 
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                        title={`Toggle ${filterTitle}`}
                    >
                        <i className="fa-solid fa-filter text-base"></i>
                        {hasActiveFilters && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009639] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#009639]"></span>
                            </span>
                        )}
                    </button>

                    {isOpen && (
                        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-30 p-4 space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{filterTitle}</span>
                                {hasActiveFilters && (
                                    <button 
                                        onClick={() => {
                                            if (onFilterReset) onFilterReset();
                                            setIsOpen(false);
                                        }}
                                        className="text-xs text-red-600 hover:underline font-semibold"
                                    >
                                        Reset All
                                    </button>
                                )}
                            </div>
                            
                            {/* Filter Fields Inject Here */}
                            {children}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}