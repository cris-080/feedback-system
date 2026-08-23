import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function SuperAdminLayout({ children, headerTitle }) {
    // Grab auth from props, and url directly from the page object
   const { auth, pendingRequestsCount } = usePage().props; 
    const { url } = usePage();
    const isActive = (path) => url.startsWith(path);
    
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

    // Reusable Navigation Link using official CLSU colors (Green Theme)
    const NavLink = ({ href, icon, text, activePath }) => {
        const active = isActive(activePath);
        return (
            <Link
                href={href}
                className={`flex items-center px-4 py-3 mx-4 rounded-lg transition-all duration-200 group ${
                    active 
                        ? 'bg-[#FFD700] text-[#1E6031] shadow-md font-bold' // CLSU Yellow background, dark green text
                        : 'text-white hover:bg-[#009639] hover:text-white' // Solid white text, CLSU Green hover
                }`}
            >
                <i className={`${icon} text-lg w-7 text-center mr-3 ${
                    active ? 'text-[#1E6031]' : 'text-white group-hover:text-white' // Solid white icon
                } transition-colors duration-200`}></i>
                <span className="text-sm tracking-wide">{text}</span>
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            
            {/* --- 1. The Green Cobra Sidebar --- */}
            {/* Using #1E6031 (Green Cobra) for a rich, dark sidebar */}
            <aside className="w-72 bg-[#1E6031] flex flex-col shadow-xl z-20 transition-all duration-300">
                
                {/* Brand Header with CLSU Logo */}
                <div className="h-20 flex items-center px-6 border-b border-white/10">
                    <img 
                        src="/images/clsu-logo-white.png" 
                        alt="CLSU Logo" 
                        className="h-11 w-11 object-contain mr-3 drop-shadow-md"
                    />
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold tracking-tight text-white">
                            CLSU <span className="text-[#FFD700]">FMS</span>
                        </h2>
                    </div>
                </div>
                
                <div className="p-4 uppercase text-xs font-bold text-white/40 tracking-wider mt-2">
                    Main Menu
                </div>
                
                {/* Navigation Links */}
                <nav className="flex-1 space-y-1.5 overflow-y-auto">
                    <NavLink 
                        href={route('superadmin.dashboard')} 
                        icon="fa-solid fa-gauge-high" 
                        text="Dashboard" 
                        activePath="/superAdmin/dashboard" 
                    />

                    <NavLink 
                        href={route('superadmin.users.index')} 
                        icon="fa-solid fa-users-gear" 
                        text="Accounts" 
                        activePath="/superAdmin/users" 
                    />
                    <NavLink 
                        href={route('superadmin.forms.index')} 
                        icon="fa-solid fa-file-signature" 
                        text="Forms" 
                        activePath="/superAdmin/forms" 
                    />
                    
                    <NavLink 
                        href={route('superadmin.departments.index')} 
                        icon="fa-solid fa-building-flag" 
                        text="Departments" 
                        activePath="/superAdmin/departments" 
                    />

                    {/* <NavLink 
                        href={route('superadmin.qrcodes.index')} 
                        icon="fa-solid fa-qrcode" 
                        text="QR Codes" 
                        activePath="/superAdmin/qrcodes" 
                    /> */}

                    {/* <NavLink
                        href={route('superadmin.requests.index')}
                        icon="fa-solid fa-headset"
                        text="Admin Requests"
                        activePath="/superAdmin/requests"
                    />   */}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-white/10 text-xs font-semibold text-white/40 text-center">
                    FMS Version 1.0.0
                </div>
            </aside>

            {/* --- 2. The Main Content Area --- */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                
                {/* --- The CLSU Green Navbar --- */}
                {/* Using #009639 (CLSU Green) for a vibrant header */}
                <header className="h-16 bg-[#009639] shadow-md flex justify-between items-center px-8 z-10">
                    
                    {/* Page Title */}
                    <div className="flex items-center">
                        <h1 className="font-bold text-xl text-white tracking-tight">{headerTitle}</h1>
                    </div>
                    
                    {/* Right Side: Profile & Actions */}
                    <div className="flex items-center space-x-6">
                        
                        {/* Dynamic Notification Bell */}
                        <Link 
                            href={route('superadmin.requests.index')}
                            className="text-white/80 hover:text-[#FFD700] transition-colors relative flex items-center group"
                            title="View Pending Requests"
                        >
                            <i className="fa-regular fa-bell text-xl group-hover:scale-110 transition-transform"></i>
                            
                            {/* Only show the pulsing badge if there are pending requests */}
                            {pendingRequestsCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-[#FFD700] border-2 border-[#009639] text-[9px] font-extrabold text-[#1E6031] items-center justify-center shadow-sm">
                                        {pendingRequestsCount}
                                    </span>
                                </span>
                            )}
                        </Link>

                        <div className="h-8 w-px bg-white/20"></div>

                        {/* Profile Identity */}
                        <div className="flex items-center space-x-3">
                            <div className="flex flex-col text-right">
                                <span className="text-sm font-bold text-white leading-none">
                                    {auth?.user?.firstname || 'System'} {auth?.user?.lastname || 'Administrator'}
                                </span>
                                <span className="text-xs text-[#FFD700] mt-1 capitalize font-bold">
                                    {auth?.user?.role || 'SuperAdmin'}
                                </span>
                            </div>
                            
                            {/* Avatar Circle (Yellow with Green text) */}
                            <div className="h-10 w-10 rounded-full bg-[#FFD700] text-[#1E6031] flex items-center justify-center font-bold text-lg shadow-inner">
                                {auth?.user?.firstname?.charAt(0) || 'S'}
                            </div>
                        </div>
                        
                        {/* Logout Button */}
                        <button 
                            onClick={handleLogout}
                            className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 hover:border-red-500 transition-all shadow-sm flex items-center group"
                        >
                            <i className="fa-solid fa-arrow-right-from-bracket mr-2 text-white/70 group-hover:text-white transition-colors"></i> 
                            Log Out
                        </button>

                    </div>
                </header>

                {/* --- 3. The Dynamic Page Content --- */}
                <main className="flex-1 overflow-y-auto bg-gray-100 p-8">
                    {children}
                </main>
                
            </div>
        </div>
    );
}