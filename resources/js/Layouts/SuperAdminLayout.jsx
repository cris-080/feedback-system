import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

export default function SuperAdminLayout({ children, headerTitle }) {
    // 1. ADDED: Extracted 'flash' from usePage().props
    // ADDED recentNotifications
    const { auth, pendingRequestsCount, recentNotifications, flash } = usePage().props;
    const { url } = usePage();
    
    const rawRole = auth?.user?.role || '';
    const normalizedRole = rawRole.toLowerCase().trim();
    
    const isSuperAdmin = normalizedRole === 'superadmin';
    const isFeedbackCommittee = normalizedRole.includes('feedback');
    
    const isSuperGroup = isSuperAdmin || isFeedbackCommittee;
    
    const rolePrefix = isSuperGroup ? 'superadmin' : 'focalperson';

   const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        setMobileOpen(false);
    }, [url]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowDropdown(false);
                setShowNotifications(false);
                setMobileOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);


 // --- 2. GLOBAL FLASH MESSAGE HANDLER ---
    useEffect(() => {
        if (flash?.login_success) {
            // Baseline current notifications for this specific user on login so the watcher doesn't overwrite the login toast
            const userKey = auth?.user?.id || 'guest';
            if (recentNotifications && recentNotifications.length > 0) {
                const currentLatest = recentNotifications[0];
                sessionStorage.setItem(`latest_notif_id_${userKey}`, `${currentLatest.request_id}_${currentLatest.status}`);
            } else {
                sessionStorage.removeItem(`latest_notif_id_${userKey}`);
            }
            sessionStorage.setItem(`notifs_initialized_${userKey}`, 'true');

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: 'success',
                title: 'Successfully logged in'
            });
            flash.login_success = null; 
        }

        if (flash?.success) {
            Swal.fire({
                title: 'Success!',
                text: flash.success,
                icon: 'success',
                confirmButtonColor: '#1E6031',
                confirmButtonText: 'Okay'
            });
            flash.success = null; 
        }

        if (flash?.error) {
            Swal.fire({
                title: 'Error',
                text: flash.error,
                icon: 'error',
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Okay'
            });
            flash.error = null;
        }
    }, [flash]);

    // --- REAL-TIME WEBSOCKET LISTENER (LARAVEL REVERB) ---
    useEffect(() => {
        if (window.Echo) {
            window.Echo.private('fms-updates')
                .listen('SystemDataUpdated', (e) => {
                    
                    const userRole = rawRole.toLowerCase().replace(' ', '');
                    const isTargetRole = e.targetRole === 'all' || e.targetRole === userRole || (e.targetRole === 'superadmin' && isSuperAdmin);
                    
                    // CRITICAL FIX: SuperGroup bypasses department locks. 
                    // Focal Persons ONLY bypass if the feedback belongs to their specific department!
                    const isTargetDept = isSuperGroup || !e.departmentId || String(e.departmentId) === String(auth?.user?.department_id);

                    // If the event is meant for this user, instantly reload metrics and notifications behind the scenes!
                    if (isTargetRole && isTargetDept) {
                        router.reload({
                            only: ['metrics', 'pendingRequestsCount', 'recentNotifications', 'recentAccounts', 'recentForms'],
                            preserveState: true,
                            preserveScroll: true
                        });
                    }
                });
        }

        return () => {
            if (window.Echo) {
                window.Echo.leave('fms-updates');
            }
        };
    }, [rawRole, auth?.user?.department_id, isSuperAdmin, isSuperGroup]);

    // --- NEW NOTIFICATION TOAST WATCHER (Scoped per User ID) ---
    useEffect(() => {
        const userKey = auth?.user?.id || 'guest';
        const storageKeyId = `latest_notif_id_${userKey}`;
        const storageKeyInit = `notifs_initialized_${userKey}`;

        if (recentNotifications && recentNotifications.length > 0) {
            const currentLatest = recentNotifications[0];
            const currentId = `${currentLatest.request_id}_${currentLatest.status}`;
            const storedLatestId = sessionStorage.getItem(storageKeyId);
            const isInitialized = sessionStorage.getItem(storageKeyInit);

            if (isInitialized && storedLatestId !== currentId && !flash?.login_success) {
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 5000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.onmouseenter = Swal.stopTimer;
                        toast.onmouseleave = Swal.resumeTimer;
                    }
                });

                Toast.fire({
                    icon: currentLatest.is_harassment ? 'warning' : 'info',
                    title: currentLatest.is_harassment ? 'Urgent Alert!' : 'New Notification',
                    text: currentLatest.is_harassment 
                        ? 'A new harassment report requires your attention.' 
                        : 'You have a new pending request or update.'
                });

                // --- REAL-TIME AUDIO ALERT FOR HARASSMENT ---
                if (currentLatest.is_harassment) {
                    try {
                        // Generate a professional zero-dependency double-chime using AudioContext
                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        const oscillator = audioCtx.createOscillator();
                        const gainNode = audioCtx.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioCtx.destination);
                        
                        // Frequencies for a clean alert (C5 to E5)
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
                        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); 
                        
                        // Volume envelope (smooth fade in and out to prevent clicking)
                        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                        gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
                        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
                        gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.2);
                        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
                        
                        oscillator.start(audioCtx.currentTime);
                        oscillator.stop(audioCtx.currentTime + 0.6);
                    } catch (e) {
                        console.error('Audio alert failed:', e);
                    }
                }
            }
            
            sessionStorage.setItem(storageKeyId, currentId);
            sessionStorage.setItem(storageKeyInit, 'true');
        } else {
            sessionStorage.removeItem(storageKeyId);
            sessionStorage.setItem(storageKeyInit, 'true'); 
        }
    }, [recentNotifications, auth?.user?.id]);

   // --- BLAZING FAST NOTIFICATION CLEARING (Partial Reload) ---
    const handleClearNotification = (e, targetId) => {
        e.preventDefault();
        e.stopPropagation();

        const isClearAll = targetId === 'all';
        const routeId = isClearAll ? 0 : targetId;

        let destroyRoute;
        if (isSuperAdmin) {
            destroyRoute = route('superadmin.requests.destroy', routeId);
        } else if (isFeedbackCommittee) {
            destroyRoute = route('feedback_committee.requests.destroy', routeId);
        } else {
            destroyRoute = route('focalperson.requests.destroy', routeId);
        }

        router.delete(destroyRoute, {
            data: { 
                clear_all: isClearAll,
                from_notification: true
            },
            preserveScroll: true,
            preserveState: true,
            only: ['pendingRequestsCount', 'recentNotifications']
        });
    };
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

    const NavLink = ({ href, icon, text, active }) => {
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
        <div className="min-h-screen bg-gray-50 flex font-sans relative overflow-x-hidden">
            {mobileOpen && (
                <div 
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden transition-opacity duration-200"
                />
            )}

            <aside 
                className={`fixed inset-y-0 left-0 z-40 md:static md:z-20 flex flex-col bg-[#1E6031] shadow-xl transition-all duration-300 ease-in-out select-none ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                } ${
                    isCollapsed ? 'md:w-20 w-72' : 'w-72'
                }`}
            >
                <div className={`h-20 flex items-center border-b border-white/10 transition-all duration-300 ${
                    isCollapsed ? 'md:justify-center md:px-0 justify-between px-6' : 'justify-between px-6'
                }`}>
                    <div className={`flex items-center ${isCollapsed ? 'md:hidden' : 'flex'}`}>
                        <img 
                            src="/images/clsu-logo-white.png" 
                            alt="CLSU Logo" 
                            className="h-10 w-10 object-contain mr-3 drop-shadow-md"
                        />
                        <h2 className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
                            CLSU <span className="text-[#FFD700]">FMS</span>
                        </h2>
                    </div>
                    
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        className="w-10 h-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition flex items-center justify-center focus:outline-none md:hidden"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        className="w-10 h-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition hidden md:flex items-center justify-center focus:outline-none"
                    >
                        <i className="fa-solid fa-bars text-lg"></i>
                    </button>
                </div>
                
                <nav className="flex-1 space-y-4 overflow-y-auto py-4 overflow-x-hidden">
                    
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
                            active={route().current(`${rolePrefix}.dashboard`)} 
                        />

                        <NavLink 
                            href={isFeedbackCommittee ? route('feedback_committee.reports.index') : route(`${rolePrefix}.reports.index`)} 
                            icon="fa-solid fa-chart-pie" 
                            text="Reports" 
                            active={route().current('*.reports.*')} 
                        />

                        <NavLink 
                            href={route(`${rolePrefix}.feedbacks.index`)} 
                            icon="fa-solid fa-database" 
                            text="Feedback Datastore" 
                            active={route().current(`${rolePrefix}.feedbacks.*`)} 
                        />
                        
                        {isSuperGroup && (
                            <NavLink 
                                href={isSuperAdmin ? route('superadmin.requests.index') : route('feedback_committee.requests.index')} 
                                icon="fa-solid fa-bell" 
                                text="Requests" 
                                active={route().current('superadmin.requests.*') || route().current('feedback_committee.requests.*')} 
                            />
                        )}
                    </div>

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
                                active={route().current('focalperson.forms.*')} 
                            />
                            <NavLink 
                                href={route('focalperson.department.index')} 
                                icon="fa-solid fa-building" 
                                text="My Department" 
                                active={route().current('focalperson.department.*')} 
                            />
                            <NavLink 
                                href={route('focalperson.requests.index')} 
                                icon="fa-solid fa-paper-plane" 
                                text="Support & Requests" 
                                active={route().current('focalperson.requests.*')} 
                            />
                        </div>
                    )}

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
                                active={route().current('superadmin.departments.*')} 
                            />
                            <NavLink 
                                href={route('superadmin.forms.index')} 
                                icon="fa-solid fa-file-signature" 
                                text={"Forms"} 
                                active={route().current('superadmin.forms.*')} 
                            />
                            
                            {isSuperAdmin && (
                                <NavLink 
                                    href={route('superadmin.users.index')} 
                                    icon="fa-solid fa-users-gear" 
                                    text="Accounts" 
                                    active={route().current('superadmin.users.*')} 
                                />
                            )}
                        </div>
                    )}

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
                                active={route().current('superadmin.archives.*')} 
                            />
                            <NavLink 
                                href={route('superadmin.audit-logs.index')} 
                                icon="fa-solid fa-clipboard-list" 
                                text="Audit Logs" 
                                active={route().current('superadmin.audit-logs.*')} 
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
                <header className="h-16 bg-[#009639] shadow-md flex justify-between items-center px-4 md:px-8 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden text-white/90 hover:text-white p-2 rounded-lg hover:bg-white/10 focus:outline-none transition"
                        >
                            <i className="fa-solid fa-bars text-lg"></i>
                        </button>
                        <h1 className="font-bold text-lg md:text-xl text-white tracking-tight truncate">{headerTitle}</h1>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                        
                        {/* Notification Bell Dropdown */}
                        <div className="relative" ref={notifRef}>
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="text-white/80 hover:text-[#FFD700] transition-colors relative flex items-center group h-10 w-10 justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                title="Notifications"
                            >
                                <i className="fa-regular fa-bell text-xl group-hover:scale-110 transition-transform"></i>
                                
                                {/* Notification Badge */}
                                {pendingRequestsCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-[#FFD700] border-2 border-[#009639] text-[9px] font-extrabold text-[#1E6031] items-center justify-center shadow-sm">
                                            {pendingRequestsCount}
                                        </span>
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown Content */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden transform origin-top-right transition-all animate-fade-in-down">
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-800">Notifications</span>
                                        <div className="flex items-center gap-3">
                                            {recentNotifications?.length > 0 && (
                                                <button 
                                                    onClick={(e) => handleClearNotification(e, 'all')}
                                                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold transition"
                                                >
                                                    Mark all as done
                                                </button>
                                            )}
                                            {pendingRequestsCount > 0 && (
                                                <span className="text-[10px] bg-[#1E6031] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{pendingRequestsCount} New</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                   <div className="max-h-80 overflow-y-auto">
                                        {recentNotifications && recentNotifications.length > 0 ? (
                                            recentNotifications.map((notif, index) => {
                                                // Highly robust fallback to guarantee single-clicks work
                                                const currentId = notif.id || notif.request_id || notif.admin_request_id || index + 1000;
                                                return (
                                                <div key={`notif-${currentId}`} className="group relative flex items-start px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition">
                                                    
                                                   {/* Clickable Area (Goes to Requests Page) */}
                                                    <Link 
                                                        href={notif.is_harassment 
                                                            ? (isSuperAdmin 
                                                                ? route('superadmin.feedbacks.index') 
                                                                : (auth.user.role.toLowerCase().includes('focal') 
                                                                    ? route('focalperson.feedbacks.index') 
                                                                    : route('feedback_committee.requests.index'))
                                                              ) 
                                                            : (isSuperAdmin 
                                                                ? route('superadmin.requests.index') 
                                                                : (isFeedbackCommittee 
                                                                    ? route('feedback_committee.requests.index') 
                                                                    : route('focalperson.requests.index'))
                                                              )
                                                        }
                                                        className="flex items-start flex-1"
                                                        onClick={() => setShowNotifications(false)}
                                                    >
                                                        {/* 1. DYNAMIC ICON */}
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                                            notif.status === 'Pending' ? 'bg-blue-100 text-blue-600' : 
                                                            notif.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 
                                                            notif.status === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-red-100 text-red-600'
                                                        }`}>
                                                            <i className={`fa-solid ${
                                                                notif.status === 'Pending' ? 'fa-file-signature' : 
                                                                notif.status === 'Approved' ? 'fa-check-double' : 
                                                                notif.status === 'Urgent' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'
                                                            } text-sm`}></i>
                                                        </div>

                                                        {/* 2. DYNAMIC TEXT */}
                                                        <div className="ml-3 pr-8 flex-1">
                                                            {/* DYNAMIC TITLE */}
                                                            <p className="text-sm font-semibold text-gray-800 leading-tight">
                                                                {notif.is_harassment 
                                                                    ? 'Urgent: Harassment Alert' 
                                                                    : (isSuperAdmin ? 'New Approval Request' : `Request ${notif.status}`)
                                                                }
                                                            </p>
                                                            
                                                            {/* DYNAMIC DESCRIPTION */}
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                                {notif.is_harassment
                                                                    ? notif.remarks
                                                                    : (isSuperAdmin 
                                                                        ? `A new request (${notif.request_type || 'Form Publication'}) is pending your review.`
                                                                        : `Your request was ${notif.status.toLowerCase()}. ${notif.remarks ? `Remarks: ${notif.remarks}` : ''}`
                                                                    )
                                                                }
                                                            </p>
                                                            
                                                            <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                                                {new Date(notif.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </Link>

                                                    {/* Fast Mark as Done / Clear Button */}
                                                    <button
                                                        onClick={(e) => handleClearNotification(e, currentId)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm"
                                                        title="Mark as done & clear"
                                                    >
                                                        <i className="fa-solid fa-check text-sm"></i>
                                                    </button>
                                                </div>
                                            )})
                                        ) : (
                                            <div className="px-4 py-8 text-center">
                                                <i className="fa-regular fa-bell-slash text-gray-300 text-3xl mb-3"></i>
                                                <p className="text-sm text-gray-500 font-medium">You're all caught up!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                     <div className="h-8 w-px bg-white/20"></div>

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