import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            replace: true, // Overwrites /login in browser history stack
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen w-screen flex flex-col lg:flex-row font-sans overflow-x-hidden bg-white">
            <Head title="Institutional Portal Log In" />

            {/* Left Panel: Full-height Institutional Brand & Showcase */}
            <div className="w-full lg:w-1/2 min-h-[360px] lg:min-h-screen bg-gradient-to-br from-[#1E6031] via-[#1b552c] to-[#0f381c] p-8 sm:p-12 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
                {/* Ambient Decorative Accents */}
                <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#009639]/30 blur-3xl pointer-events-none"></div>
                <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[#FFD700]/15 blur-3xl pointer-events-none"></div>

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
                    </div>
                </div>

                {/* Hero Editorial Copy */}
                <div className="relative z-10 my-auto py-10 max-w-xl">
                   
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-white tracking-tight">
                        Central Luzon State University <span className="text-[#FFD700]">Feedback Management System</span>
                    </h2>
                    <p className="mt-4 text-sm sm:text-base text-emerald-100/80 leading-relaxed font-normal">
                        Centralized platform for real-time service tracking, Citizen's Charter compliance evaluation, and automated feedback intelligence across university units.
                    </p>
                </div>

                {/* Left Panel Footer */}
                <div className="relative z-10 pt-6 border-t border-white/10 text-xs text-white/60 flex items-center justify-between">
                    <span>Central Luzon State University</span>
                    <span className="font-mono text-white/50">FMS System v1.0</span>
                </div>
            </div>

            {/* Right Panel: Full-height Clean Form */}
            <div className="w-full lg:w-1/2 min-h-[calc(100vh-360px)] lg:min-h-screen flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-gray-50/50">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Log in to your account</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Enter your official credentials to access your administrative workspace.
                        </p>
                    </div>

                    {status && (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-800 flex items-center gap-2.5">
                            <i className="fa-solid fa-circle-check text-emerald-600"></i>
                            <span>{status}</span>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative rounded-lg shadow-xs">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-envelope text-sm"></i>
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    autoComplete="username"
                                    placeholder="examplen@gmail.com"
                                    autoFocus
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`block w-full pl-10 pr-3.5 py-3 text-sm rounded-lg border bg-white transition ${
                                        errors.email 
                                            ? 'border-red-400 focus:ring-red-200 focus:border-red-500' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639]'
                                    }`}
                                    required
                                />
                            </div>
                            {errors.email && (
                                <p className="text-red-600 text-xs mt-1.5 font-semibold flex items-center gap-1">
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-xs font-semibold text-[#1E6031] hover:text-[#009639] hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                )}
                            </div>
                            <div className="relative rounded-lg shadow-xs">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-lock text-sm"></i>
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`block w-full pl-10 pr-11 py-3 text-sm rounded-lg border bg-white transition ${
                                        errors.password 
                                            ? 'border-red-400 focus:ring-red-200 focus:border-red-500' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-[#009639]/20 focus:border-[#009639]'
                                    }`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-600 text-xs mt-1.5 font-semibold flex items-center gap-1">
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-[#009639] focus:ring-[#009639] cursor-pointer"
                                />
                                <span className="ml-2.5 text-xs font-medium text-gray-600">Keep me logged in on this browser</span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3.5 px-4 bg-[#009639] hover:bg-[#1E6031] text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Log In to Workspace</span>
                                        <i className="fa-solid fa-arrow-right text-xs"></i>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Policy Notice */}
                    <div className="pt-8 border-t border-gray-200 flex items-start gap-3 text-xs text-gray-500 leading-relaxed">
                        <i className="fa-solid fa-shield-halved text-gray-400 mt-0.5 text-sm"></i>
                        <span>
                            Protected university system. All access attempts are logged for security and governance compliance. Unauthorized access is strictly prohibited.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}