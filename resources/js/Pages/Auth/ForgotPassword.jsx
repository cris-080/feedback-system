import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <div className="min-h-screen flex bg-gray-50 font-sans">
            <Head title="Reset Password - CLSU FMS" />

            {/* Left Decorative Branding Panel (Visible on Desktop) */}
           <div className="w-full lg:w-1/2 min-h-[360px] lg:min-h-screen bg-gradient-to-br from-[#1E6031] via-[#1b552c] to-[#0f381c] p-8 sm:p-12 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
                {/* Background Pattern Elements */}
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

                {/* Center Informational Graphic */}
                <div className="my-auto max-w-md z-10 space-y-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#FFD700] text-2xl shadow-inner">
                            <i className="fa-solid fa-shield-halved"></i>
                        </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                            Identity Recovery & Account Protection
                        </h2>
                        <p className="text-sm text-white/80 leading-relaxed">
                            Password reset tokens are time-sensitive and tied strictly to your registered institutional personnel account.
                        </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center space-x-3 text-xs text-white/60">
                        <i className="fa-solid fa-lock text-[#FFD700]"></i>
                        <span>Central Luzon State University • Administrative Security</span>
                    </div>
                </div>

            
            </div>

            {/* Right Interactive Form Area */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
                <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100">
                    
                    {/* Header Details */}
                    <div className="text-left mb-8">
                        <div className="w-12 h-12 rounded-xl bg-[#1E6031]/10 text-[#1E6031] flex items-center justify-center text-xl mb-4">
                            <i className="fa-solid fa-key"></i>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            Forgot your password?
                        </h1>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Provide your account's registered email address, and an authentication reset token link will be dispatched immediately.
                        </p>
                    </div>

                    {/* Status Alert */}
                    {status && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3">
                            <i className="fa-solid fa-circle-check text-emerald-600 mt-0.5 text-base"></i>
                            <div className="text-xs font-medium text-emerald-800 leading-relaxed">
                                {status}
                            </div>
                        </div>
                    )}

                    {/* Action Form */}
                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                                Email Address
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
                                    placeholder="example@gmail.com"
                                    className="block w-full pl-10 pr-4 py-2.5 rounded-xl border-gray-300 text-sm focus:border-[#1E6031] focus:ring-[#1E6031] shadow-sm transition-colors"
                                    isFocused={true}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                            </div>
                            <InputError message={errors.email} className="mt-2 text-xs text-red-600" />
                        </div>

                        {/* Submission Button */}
                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wide text-white transition-all duration-200 shadow-md flex items-center justify-center space-x-2 ${
                                processing 
                                    ? 'bg-gray-400 cursor-not-allowed opacity-80' 
                                    : 'bg-[#1E6031] hover:bg-[#144823] active:scale-[0.99] hover:shadow-lg shadow-[#1E6031]/20'
                            }`}
                        >
                            {processing ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin text-sm mr-2"></i>
                                    <span>Transmitting Request...</span>
                                </>
                            ) : (
                                <>
                                    <span>Send Reset Link</span>
                                    <i className="fa-solid fa-arrow-right text-xs ml-1 text-[#FFD700]"></i>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Navigation Back Link */}
                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <Link
                            href={route('login')}
                            className="inline-flex items-center text-xs font-bold text-[#1E6031] hover:text-[#009639] transition-colors group"
                        >
                            <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i>
                            Back to Log In
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}