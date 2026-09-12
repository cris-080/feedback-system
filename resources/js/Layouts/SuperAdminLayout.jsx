import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

export default function SuperAdminLayout({ children, headerTitle }) {
    const { auth, pendingRequestsCount } = usePage().props; 
    const { url } = usePage();
    
    const rawRole = auth?.user?.role || '';
    const normalizedRole = rawRole.toLowerCase().trim();
    
    const isSuperAdmin = normalizedRole === 'superadmin';
    const isFeedbackCommittee = normalizedRole.includes('feedback');
    
    const isSuperGroup = isSuperAdmin || isFeedbackCommittee;
    
    const rolePrefix = isSuperGroup ? 'superadmin' : 'focalperson';
    const pathPrefix = isSuperGroup ? '/superAdmin' : '/focalPerson';
    
    const isActive = (path) => url.toLowerCase().startsWith(path.toLowerCase());

    // --- STATES ---
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    
    // --- REFS ---
    const dropdownRef = useRef(null);

    // --- CLICK OUTSIDE LISTENER (Closes dropdown when clicking away) ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- SWEETALERT2 ACTION HANDLERS ---
    const handleLogout = () => {
        Swal.fire({
            title: 'Log Out?',
            text: `Are you sure you want to securely log out?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fa-solid fa-arrow-right-from-bracket"></i> Yes, Log Out!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('logout'));
            }
        });
    };

    // Reusable Navigation Link
    const NavLink = ({ href, icon, text, activePath }) => {
        const active = isActive(activePath);
        return (
            <Link
                href={href}
                title={isCollapsed ? text : undefined}
                className={`flex items-center transition-all duration-200 group ${
                    isCollapsed 
                        ? 'justify-center px-0 py-3 mx-2 rounded-xl' 
                        : 'px-4 py-2.5 mx-4 rounded-lg'
                } ${
                    active 
                        ? 'bg-[#FFD700] text-[#1E6031] shadow-md font-bold' 
                        : 'text-white hover:bg-[#009639] hover:text-white'
                }`}
            >
                <i className={`${icon} text-base text-center transition-colors duration-200 ${
                    isCollapsed ? 'w-full' : 'w-7 mr-2.5'
                } ${
                    active 
                        ? 'text-[#1E6031]' 
                        : 'text-white group-hover:text-white'
                }`}></i>
                {!isCollapsed && <span className="text-sm tracking-wide truncate">{text}</span>}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            
            {/* --- 1. The Retractable Sidebar --- */}
            <aside 
                className={`${
                    isCollapsed ? 'w-20' : 'w-72'
                } bg-[#1E6031] flex flex-col shadow-xl z-20 transition-all duration-300 ease-in-out select-none`}
            >
                {/* Brand Header & Toggle */}
                <div className={`h-20 flex items-center border-b border-white/10 transition-all duration-300 ${
                    isCollapsed ? 'justify-center px-0' : 'justify-between px-6'
                }`}>
                    {!isCollapsed && (
                        <div className="flex items-center">
                            <img 
                                src="/images/clsu-logo-white.png" 
                                alt="CLSU Logo" 
                                className="h-10 w-10 object-contain mr-3 drop-shadow-md"
                            />
                            <h2 className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
                                CLSU <span className="text-[#FFD700]">FMS</span>
                            </h2>
                        </div>
                    )}
                    
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        className="w-10 h-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition flex items-center justify-center focus:outline-none"
                    >
                        <i className="fa-solid fa-bars text-lg"></i>
                    </button>
                </div>
                
                {/* Navigation Links */}
                <nav className="flex-1 space-y-4 overflow-y-auto py-4 overflow-x-hidden">
                    
                    {/* Section 1: Main Menu (Shared) */}
                    <div className="space-y-1">
                        {!isCollapsed && (
                            <div className="px-6 pb-1 uppercase text-[11px] font-bold text-white/40 tracking-wider truncate">
                                Main Menu
                            </div>
                        )}

                        <NavLink 
                            href={route(`${rolePrefix}.dashboard`)} 
                            icon="fa-solid fa-gauge-high" 
                            text="Dashboard" 
                            activePath={`${pathPrefix}/dashboard`} 
                        />

                        <NavLink 
                            href={route(`${rolePrefix}.reports.index`)} 
                            icon="fa-solid fa-chart-pie" 
                            text="Reports" 
                            activePath={`${pathPrefix}/reports`} 
                        />

                        <NavLink 
                            href={route(`${rolePrefix}.feedbacks.index`)} 
                            icon="fa-solid fa-database" 
                            text="Feedback Datastore" 
                            activePath={`${pathPrefix}/feedbacks`} 
                        />
                        
                        {isSuperGroup && (
                            <NavLink 
                                href={isSuperAdmin ? route('superadmin.requests.index') : route('feedback_committee.requests.index')} 
                                icon="fa-solid fa-bell" 
                                text="Requests" 
                                activePath={isSuperAdmin ? '/superAdmin/requests' : '/feedback-committee/requests'} 
                            />
                        )}
                    </div>

                    {/* Section 2: Focal Person Operations */}
                    {!isSuperGroup && (
                        <div className={`space-y-1 pt-2 ${!isCollapsed ? 'border-t border-white/5' : ''}`}>
                            {!isCollapsed && (
                                <div className="px-6 pb-1 uppercase text-[11px] font-bold text-white/40 tracking-wider truncate">
                                    Office Operations
                                </div>
                            )}

                            <NavLink 
                                href={route('focalperson.forms.index')} 
                                icon="fa-solid fa-file-signature" 
                                text="Forms" 
                                activePath="/focalPerson/forms" 
                            />
                            <NavLink 
                                href={route('focalperson.department.index')} 
                                icon="fa-solid fa-building" 
                                text="My Department" 
                                activePath="/focalPerson/department" 
                            />
                        </div>
                    )}

                    {/* Section 3: System Management (SuperAdmin & Feedback Committee) */}
                    {isSuperGroup && (
                        <div className={`space-y-1 pt-2 ${!isCollapsed ? 'border-t border-white/5' : ''}`}>
                            {!isCollapsed && (
                                <div className="px-6 pb-1 uppercase text-[11px] font-bold text-white/40 tracking-wider truncate">
                                    System Management
                                </div>
                            )}

                            <NavLink 
                                href={route('superadmin.departments.index')} 
                                icon="fa-solid fa-building-flag" 
                                text={"Departments"} 
                                activePath="/superAdmin/departments" 
                            />
                            <NavLink 
                                href={route('superadmin.forms.index')} 
                                icon="fa-solid fa-file-signature" 
                                text={"Forms"} 
                                activePath="/superAdmin/forms" 
                            />
                            
                            {isSuperAdmin && (
                                <NavLink 
                                    href={route('superadmin.users.index')} 
                                    icon="fa-solid fa-users-gear" 
                                    text="Accounts" 
                                    activePath="/superAdmin/users" 
                                />
                            )}
                        </div>
                    )}

                    {/* Section 4: Administration (SuperAdmin ONLY) */}
                    {isSuperAdmin && (
                        <div className={`space-y-1 pt-2 ${!isCollapsed ? 'border-t border-white/5' : ''}`}>
                            {!isCollapsed && (
                                <div className="px-6 pb-1 uppercase text-[11px] font-bold text-white/40 tracking-wider truncate">
                                    Administration
                                </div>
                            )}

                            <NavLink 
                                href={route('superadmin.archives.index')} 
                                icon="fa-solid fa-box-archive" 
                                text="System Archives" 
                                activePath="/superAdmin/archives" 
                            />
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t border-white/10 text-xs font-semibold text-white/40 text-center truncate">
                    {isCollapsed ? 'v1.0' : 'FMS Version 1.0.0'}
                </div>
            </aside>

            {/* --- 2. The Main Content Area --- */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                
                {/* Navbar */}
                <header className="h-16 bg-[#009639] shadow-md flex justify-between items-center px-8 z-10">
                    <div className="flex items-center">
                        <h1 className="font-bold text-xl text-white tracking-tight">{headerTitle}</h1>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                        
                        {/* Only show pending requests bell to the SuperGroup */}
                        {isSuperGroup && (
                            <Link 
                                href={isSuperAdmin ? route('superadmin.requests.index') : route('feedback_committee.requests.index')}
                                className="text-white/80 hover:text-[#FFD700] transition-colors relative flex items-center group"
                                title="View Pending Requests"
                            >
                                <i className="fa-regular fa-bell text-xl group-hover:scale-110 transition-transform"></i>
                                {pendingRequestsCount > 0 && (
                                    <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-[#FFD700] border-2 border-[#009639] text-[9px] font-extrabold text-[#1E6031] items-center justify-center shadow-sm">
                                            {pendingRequestsCount}
                                        </span>
                                    </span>
                                )}
                            </Link>
                        )}

                        {isSuperGroup && <div className="h-8 w-px bg-white/20"></div>}

                        {/* Dropdown Gear Menu */}
                        <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={() => setShowDropdown(!showDropdown)}
                                className={`flex items-center justify-center h-10 w-10 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#FFD700] ${
                                    showDropdown ? 'bg-white/20 text-[#FFD700] rotate-90' : 'bg-white/10 text-white hover:bg-white/20 hover:text-white'
                                }`}
                                title="Account Settings & Logout"
                            >
                                <i className="fa-solid fa-gear text-lg transition-transform duration-300"></i>
                            </button>

                            {/* Dropdown Content */}
                            {showDropdown && (
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden transform origin-top-right transition-all animate-fade-in-down">
                                    
                                    {/* User Identity Header */}
                                    <div className="px-4 py-4 bg-gray-50 border-b border-gray-100 flex items-center space-x-3">
                                        <div className="h-11 w-11 rounded-full bg-[#1E6031] text-[#FFD700] flex items-center justify-center font-bold text-lg shadow-sm uppercase shrink-0">
                                            {auth?.user?.firstname?.charAt(0) || auth?.user?.first_name?.charAt(0) || rawRole?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex flex-col truncate">
                                            <span className="text-sm font-bold text-gray-900 truncate">
                                                {auth?.user?.firstname || auth?.user?.first_name || 'Authorized'} {auth?.user?.lastname || auth?.user?.last_name || 'Personnel'}
                                            </span>
                                            <span className="text-xs text-[#009639] uppercase font-bold tracking-wide mt-0.5 truncate">
                                                {rawRole || 'Staff'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Menu Actions */}
                                    <div className="py-2">
                                        <Link 
                                            href={route('profile.edit')}
                                            onClick={() => setShowDropdown(false)}
                                            className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-[#1E6031] transition-colors"
                                        >
                                            <i className="fa-solid fa-user-pen w-5 text-center text-gray-400 mr-2"></i>
                                            Edit Profile
                                        </Link>
                                        
                                        <div className="border-t border-gray-100 my-1"></div>
                                        
                                        <button 
                                            onClick={(e) => {
                                                setShowDropdown(false);
                                                handleLogout();
                                            }}
                                            className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                                        >
                                            <i className="fa-solid fa-arrow-right-from-bracket w-5 text-center text-red-400 mr-2"></i>
                                           Log Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                    </div>
                </header>

                {/* Dynamic Content */}
                <main className="flex-1 overflow-y-auto bg-gray-100 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}