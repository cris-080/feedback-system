import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen flex bg-gray-50 font-sans">
            <Head title="Set New Password - CLSU FMS" />

            {/* Left Decorative Institutional Panel */}
            <div className="w-full lg:w-1/2 min-h-[360px] lg:min-h-screen bg-gradient-to-br from-[#1E6031] via-[#1b552c] to-[#0f381c] p-8 sm:p-12 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#FFD700]/10 blur-2xl pointer-events-none"></div>

                 {/* Brand Header */}
                <div className="relative z-10 flex items-center space-x-3.5">
                    <img 
                        src="/images/clsu-logo-white.png" 
                        alt="CLSU Logo" 
                        className="h-14 w-14 object-contain drop-shadow-md"
                    />
                    <div>
                     
                        <h1 className="text-2xl font-black tracking-tight leading-none text-white">
                            CLSU <span className="text-[#FFD700]">FMS</span>
                        </h1>
                        <p className="text-[11px] text-white/70 uppercase tracking-widest font-medium">
                            Feedback Management System
                        </p>
                    </div>
                </div>

                {/* Center Content */}
                <div className="my-auto max-w-md z-10 space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#FFD700] text-2xl shadow-inner">
                        <i className="fa-solid fa-lock-open"></i>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                            Secure Password Reconfiguration
                        </h2>
                        <p className="text-sm text-white/80 leading-relaxed">
                            Create a strong, unique password to safeguard your administrative session and associated departmental data.
                        </p>
                    </div>

                    <div className="space-y-2 pt-2 text-xs text-white/70">
                        <div className="flex items-center space-x-2">
                            <i className="fa-solid fa-check text-[#FFD700]"></i>
                            <span>Must contain at least 8 characters</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <i className="fa-solid fa-check text-[#FFD700]"></i>
                            <span>Include numbers, uppercase letters, and symbols</span>
                        </div>
                    </div>
                </div>

                {/* Footer Metadata */}
                <div className="text-xs text-white/50 z-10">
                    &copy; {new Date().getFullYear()} Central Luzon State University. All rights reserved.
                </div>
            </div>

            {/* Right Interactive Form Area */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
                <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100">
                    
                    {/* Form Header */}
                    <div className="text-left mb-8">
                        <div className="w-12 h-12 rounded-xl bg-[#1E6031]/10 text-[#1E6031] flex items-center justify-center text-xl mb-4">
                            <i className="fa-solid fa-key"></i>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            Create New Password
                        </h1>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Your identity token has been verified. Enter and confirm your updated credentials below.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        {/* Email Address (Read-only reference) */}
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                                Account Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-regular fa-envelope"></i>
                                </div>
                                <TextInput
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="block w-full pl-10 pr-4 py-2.5 rounded-xl border-gray-300 bg-gray-50 text-gray-600 text-sm focus:border-[#1E6031] focus:ring-[#1E6031] shadow-sm transition-colors"
                                    autoComplete="username"
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                            </div>
                            <InputError message={errors.email} className="mt-2 text-xs text-red-600" />
                        </div>

                        {/* New Password */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-lock"></i>
                                </div>
                                <TextInput
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    placeholder="••••••••"
                                    className="block w-full pl-10 pr-10 py-2.5 rounded-xl border-gray-300 text-sm focus:border-[#1E6031] focus:ring-[#1E6031] shadow-sm transition-colors"
                                    autoComplete="new-password"
                                    isFocused={true}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            <InputError message={errors.password} className="mt-2 text-xs text-red-600" />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="password_confirmation" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-shield-halved"></i>
                                </div>
                                <TextInput
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    placeholder="••••••••"
                                    className="block w-full pl-10 pr-10 py-2.5 rounded-xl border-gray-300 text-sm focus:border-[#1E6031] focus:ring-[#1E6031] shadow-sm transition-colors"
                                    autoComplete="new-password"
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            <InputError message={errors.password_confirmation} className="mt-2 text-xs text-red-600" />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wide text-white transition-all duration-200 shadow-md flex items-center justify-center space-x-2 mt-6 ${
                                processing 
                                    ? 'bg-gray-400 cursor-not-allowed opacity-80' 
                                    : 'bg-[#1E6031] hover:bg-[#144823] active:scale-[0.99] hover:shadow-lg shadow-[#1E6031]/20'
                            }`}
                        >
                            {processing ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin text-sm mr-2"></i>
                                    <span>Updating Credentials...</span>
                                </>
                            ) : (
                                <>
                                    <span>Reset Password</span>
                                    <i className="fa-solid fa-check text-xs ml-1 text-[#FFD700]"></i>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Navigation Link */}
                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <Link
                            href={route('login')}
                            className="inline-flex items-center text-xs font-bold text-[#1E6031] hover:text-[#009639] transition-colors group"
                        >
                            <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i>
                            Cancel and Return to Log In
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}