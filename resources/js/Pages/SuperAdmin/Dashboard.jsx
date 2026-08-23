import { Head, Link, router } from '@inertiajs/react';
import SuperAdminLayout from '../../Layouts/SuperAdminLayout';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useState, useRef, useEffect } from 'react';

export default function Dashboard({ metrics, recentAccounts, recentForms }) {
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);

    // Current Filter States
    const currentRange = metrics?.current_range || 'month';
    const currentDept = metrics?.current_department || 'overall';
    const specificDate = metrics?.specific_date || '';
    const specificMonth = metrics?.specific_month || '';

    // Live Chart Data from Backend Metrics
    const trendData = metrics?.trendData || [];
    const sqdData = metrics?.sqd_data || [];
    const clientTypeData = metrics?.client_types || [];
    const sexData = metrics?.sex_demographics || [];
    const transactionTypeData = metrics?.transaction_types || [];
    const ccMetrics = metrics?.cc_metrics || { awareness_rate: 0, visibility_rate: 0, helpfulness_rate: 0, total_responses: 0 };
    const topWords = metrics?.top_words || [];

    const departmentData = metrics?.department_scores && metrics.department_scores.length > 0 
        ? metrics.department_scores 
        : [
            { name: 'Admission', score: 88 },
            { name: 'Info Tech', score: 72 },
            { name: 'Infirmary', score: 95 },
        ];

    const harassmentCount = metrics?.harassment_reports || 0;

    // Count active custom filters
    const activeFilterCount = (currentDept !== 'overall' ? 1 : 0) + (currentRange !== 'month' ? 1 : 0);

    const handleFilterChange = (key, value) => {
        router.get(
            route('superadmin.dashboard'), 
            { ...route().params, [key]: value }, 
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleResetFilters = () => {
        router.get(
            route('superadmin.dashboard'),
            { range: 'month', department: 'overall' },
            { preserveState: true, preserveScroll: true }
        );
        setFilterOpen(false);
    };

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <SuperAdminLayout headerTitle="System Command Center">
            <Head title="SuperAdmin Dashboard" />

            <div className="max-w-7xl mx-auto space-y-6 pb-10">
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
    
    {/* Left Side: Title & Single Filter Button */}
    <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-4">
        <h2 className="text-lg font-bold text-gray-800 hidden sm:block">
            <i className="fa-solid fa-chart-pie mr-2 text-blue-600"></i> Analytics Overview
        </h2>
                    {/* Left: Single Filter Dropdown Button */}
                    <div className="relative w-full sm:w-auto" ref={filterRef}>
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm border ${
                                filterOpen || activeFilterCount > 0
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <i className="fa-solid fa-filter text-xs"></i>
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                            <i className={`fa-solid fa-chevron-${filterOpen ? 'up' : 'down'} text-[10px] ml-1 text-gray-400`}></i>
                        </button>

                        {/* Popover Filter Menu */}
                        {filterOpen && (
                            <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter Analytics</span>
                                    {activeFilterCount > 0 && (
                                        <button 
                                            onClick={handleResetFilters}
                                            className="text-xs text-red-600 hover:underline font-semibold"
                                        >
                                            Reset All
                                        </button>
                                    )}
                                </div>

                                {/* 1. Department Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Department</label>
                                    <select 
                                        value={currentDept}
                                        onChange={(e) => handleFilterChange('department', e.target.value)}
                                        className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 cursor-pointer"
                                    >
                                        <option value="overall">All Departments</option>
                                        {metrics?.departments?.map((dept) => (
                                            <option key={dept.department_id} value={dept.department_id}>
                                                {dept.department_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. Date Range Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Date Range</label>
                                    <select 
                                        value={currentRange}
                                        onChange={(e) => handleFilterChange('range', e.target.value)}
                                        className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 cursor-pointer"
                                    >
                                        <option value="today">Today</option>
                                        <option value="week">This Week</option>
                                        <option value="month">This Month</option>
                                        <option value="year">This Year</option>
                                        <option value="custom_date">Specific Date...</option>
                                        <option value="custom_month">Specific Month...</option>
                                        <option value="all">All Time</option>
                                    </select>
                                </div>

                                {/* 3. Conditional Specific Date Input */}
                                {currentRange === 'custom_date' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="text-xs font-semibold text-blue-700">Pick Date</label>
                                        <input 
                                            type="date" 
                                            value={specificDate}
                                            onChange={(e) => handleFilterChange('specific_date', e.target.value)}
                                            className="bg-white border border-blue-400 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 shadow-sm cursor-pointer"
                                        />
                                    </div>
                                )}

                                {/* 4. Conditional Specific Month Input */}
                                {currentRange === 'custom_month' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="text-xs font-semibold text-blue-700">Pick Month</label>
                                        <input 
                                            type="month" 
                                            value={specificMonth}
                                            onChange={(e) => handleFilterChange('specific_month', e.target.value)}
                                            className="bg-white border border-blue-400 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 shadow-sm cursor-pointer"
                                        />
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={() => setFilterOpen(false)}
                                        className="w-full bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                    {/* Right: Quick Actions */}
                    <div className="flex space-x-3 w-full sm:w-auto">
                        <Link href={route('superadmin.users.index')} className="flex-1 sm:flex-none text-center bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm text-sm">
                            <i className="fa-solid fa-user-plus mr-2"></i>Provision Account
                        </Link>
                        <Link href={route('superadmin.forms.builder')} className="flex-1 sm:flex-none text-center bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition shadow-sm text-sm">
                            <i className="fa-solid fa-file-circle-plus mr-2"></i>Build Form
                        </Link>
                    </div>
                </div>

                {/* Primary KPI Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Total Feedback KPI */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Feedback</p>
                                <p className="text-2xl font-bold text-gray-900 mt-0.5">{metrics?.total_feedback || 0}</p>
                            </div>
                            <div className="bg-orange-100 p-2 rounded-lg text-orange-600 text-base">
                                <i className="fa-solid fa-comments"></i>
                            </div>
                        </div>
                        
                        <div className="mt-2 text-xs font-medium">
                            {currentRange === 'all' ? (
                                <span className="text-gray-400">All-time cumulative total</span>
                            ) : metrics?.trends ? (
                                <span>
                                    {metrics.trends.feedback > 0 ? (
                                        <span className="text-green-600 font-semibold"><i className="fa-solid fa-arrow-up mr-1"></i>+{metrics.trends.feedback}</span>
                                    ) : metrics.trends.feedback < 0 ? (
                                        <span className="text-red-600 font-semibold"><i className="fa-solid fa-arrow-down mr-1"></i>{metrics.trends.feedback}</span>
                                    ) : (
                                        <span className="text-gray-400">0</span>
                                    )}
                                    <span className="text-gray-400 ml-1">vs last period</span>
                                </span>
                            ) : (
                                <span className="text-gray-400">0 vs last period</span>
                            )}
                        </div>
                    </div>

                    {/* Active Forms KPI */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Forms</p>
                                <p className="text-2xl font-bold text-gray-900 mt-0.5">{metrics?.active_forms || 0}</p>
                            </div>
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600 text-base">
                                <i className="fa-solid fa-file-signature"></i>
                            </div>
                        </div>
                        <div className="mt-2 text-xs font-medium">
                            {metrics?.trends?.forms > 0 ? (
                                <span className="text-green-600 font-semibold"><i className="fa-solid fa-arrow-up mr-1"></i>+{metrics.trends.forms}</span>
                            ) : metrics?.trends?.forms < 0 ? (
                                <span className="text-red-600 font-semibold"><i className="fa-solid fa-arrow-down mr-1"></i>{metrics.trends.forms}</span>
                            ) : (
                                <span className="text-gray-400">0</span>
                            )}
                        </div>
                    </div>

                    {/* Departments KPI */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Departments</p>
                                <p className="text-2xl font-bold text-gray-900 mt-0.5">{metrics?.total_departments || 0}</p>
                            </div>
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 text-base">
                                <i className="fa-solid fa-building"></i>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 font-medium">
                            Total integrated
                        </div>
                    </div>

                    {/* Harassment Alert KPI Box */}
                    <div className={`bg-white p-4 rounded-lg shadow-sm border-2 flex flex-col justify-between hover:shadow-md transition ${harassmentCount > 0 ? 'border-red-500' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className={`text-xs font-semibold uppercase tracking-wide ${harassmentCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Harassment Alerts</p>
                                <p className="text-2xl font-bold text-gray-900 mt-0.5">{harassmentCount}</p>
                            </div>
                            <div className={`p-2 rounded-lg text-base ${harassmentCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                                <i className="fa-solid fa-triangle-exclamation"></i>
                            </div>
                        </div>
                        <div className="mt-2 flex justify-between items-center text-xs font-medium">
                            {metrics?.trends?.harassment > 0 ? (
                                <span className="text-red-600 font-semibold"><i className="fa-solid fa-arrow-up mr-1"></i>+{metrics.trends.harassment}</span>
                            ) : metrics?.trends?.harassment < 0 ? (
                                <span className="text-green-600 font-semibold"><i className="fa-solid fa-arrow-down mr-1"></i>{metrics.trends.harassment}</span>
                            ) : (
                                <span className="text-gray-400">0</span>
                            )}
                            
                            {harassmentCount > 0 && (
                                <span className="text-red-600 font-semibold animate-pulse ml-2">Needs review</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Data Visualization Section --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Line Chart */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-3">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Departmental Sentiment Trends</h2>
                        </div>

                        <div className="w-full h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="month" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                    <YAxis 
                                        tick={{fontSize: 12, fill: '#6b7280'}} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        allowDecimals={false} 
                                        domain={[0, (dataMax) => (dataMax === 0 ? 5 : dataMax + 2)]} 
                                    />
                                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}}/>
                                    <Line type="monotone" dataKey="Positive" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                    <Line type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                    <Line type="monotone" dataKey="Neutral" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-3">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Sentiment Score by Department</h2>
                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                    <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Likert Scale (SQD) */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2 flex flex-col">
                        <h2 className="text-lg font-bold text-gray-800 mb-1">Service Quality Dimensions (SQD)</h2>
                        <p className="text-sm text-gray-500 mb-4">Proportional breakdown of client ratings per dimension (1 = Lowest, 5 = Highest)</p>
                        <div className="w-full flex-1 min-h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sqdData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#4b5563'}} axisLine={false} tickLine={false} width={120} />
                                    <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend wrapperStyle={{paddingTop: '10px'}} />
                                    <Bar dataKey="5" stackId="a" fill="#10b981" name="5 (Strongly Agree)" radius={[0, 0, 0, 0]} barSize={20} />
                                    <Bar dataKey="4" stackId="a" fill="#34d399" name="4 (Agree)" />
                                    <Bar dataKey="3" stackId="a" fill="#fcd34d" name="3 (Neutral)" />
                                    <Bar dataKey="2" stackId="a" fill="#fb923c" name="2 (Disagree)" />
                                    <Bar dataKey="1" stackId="a" fill="#ef4444" name="1 (Strongly Disagree)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                        
                    {/* Demographic Profile Segmentation */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 mb-1">General Transaction Profile</h2>
                            <p className="text-sm text-gray-500 mb-6">Respondent demographic segmentation</p>

                            {/* 1. Client Classification Donut */}
                            <div className="mb-6">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">Client Classification</span>
                                {clientTypeData.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-2">No data recorded</p>
                                ) : (
                                    (() => {
                                        const clientColorMap = { student: '#eab308', citizen: '#3b82f6', business: '#10b981', government: '#8b5cf6' };
                                        const clientColorClasses = { student: 'bg-yellow-500', citizen: 'bg-blue-500', business: 'bg-emerald-500', government: 'bg-purple-500' };
                                        const totalClients = clientTypeData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 1;

                                        return (
                                            <div className="flex items-center space-x-4">
                                                <div className="w-20 h-20 relative flex-shrink-0">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={clientTypeData} cx="50%" cy="50%" innerRadius={24} outerRadius={35} paddingAngle={3} dataKey="value" stroke="none">
                                                                {clientTypeData.map((entry, index) => <Cell key={`client-cell-${index}`} fill={clientColorMap[String(entry.name).toLowerCase()] || '#6b7280'} />)}
                                                            </Pie>
                                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                        <span className="text-xs font-bold text-gray-800">{totalClients}</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-1">
                                                    {clientTypeData.map((item, index) => {
                                                        const percent = Math.round(((Number(item.value) || 0) / totalClients) * 100);
                                                        return (
                                                            <div key={index} className="flex items-center justify-between text-xs">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className={`w-2.5 h-2.5 rounded-full ${clientColorClasses[String(item.name).toLowerCase()] || 'bg-gray-500'} inline-block`}></span>
                                                                    <span className="text-gray-700 font-medium">{item.name}</span>
                                                                </div>
                                                                <span className="text-gray-500 font-semibold">{item.value} ({percent}%)</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            {/* 2. Transaction Type Donut */}
                            <div className="mb-6">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">Transaction Type</span>
                                {transactionTypeData.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-2">No data recorded</p>
                                ) : (
                                    (() => {
                                        const transColorMap = { internal: '#06b6d4', external: '#f97316' };
                                        const transColorClasses = { internal: 'bg-cyan-500', external: 'bg-orange-500' };
                                        const totalTrans = transactionTypeData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 1;

                                        return (
                                            <div className="flex items-center space-x-4">
                                                <div className="w-20 h-20 relative flex-shrink-0">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={transactionTypeData} cx="50%" cy="50%" innerRadius={24} outerRadius={35} paddingAngle={3} dataKey="value" stroke="none">
                                                                {transactionTypeData.map((entry, index) => <Cell key={`trans-cell-${index}`} fill={transColorMap[String(entry.name).toLowerCase()] || '#6b7280'} />)}
                                                            </Pie>
                                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                        <span className="text-xs font-bold text-gray-800">{totalTrans}</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-1">
                                                    {transactionTypeData.map((item, index) => {
                                                        const percent = Math.round(((Number(item.value) || 0) / totalTrans) * 100);
                                                        return (
                                                            <div key={index} className="flex items-center justify-between text-xs">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className={`w-2.5 h-2.5 rounded-full ${transColorClasses[String(item.name).toLowerCase()] || 'bg-gray-500'} inline-block`}></span>
                                                                    <span className="text-gray-700 font-medium">{item.name}</span>
                                                                </div>
                                                                <span className="text-gray-500 font-semibold">{item.value} ({percent}%)</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            {/* 3. Sex Breakdown Donut */}
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">Sex Breakdown</span>
                                {sexData.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-2">No data recorded</p>
                                ) : (
                                    (() => {
                                        const sexColorMap = { male: '#ef4444', female: '#ec4899' };
                                        const sexColorClasses = { male: 'bg-red-500', female: 'bg-pink-500' };
                                        const totalSex = sexData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 1;

                                        return (
                                            <div className="flex items-center space-x-4">
                                                <div className="w-20 h-20 relative flex-shrink-0">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={sexData} cx="50%" cy="50%" innerRadius={24} outerRadius={35} paddingAngle={3} dataKey="value" stroke="none">
                                                                {sexData.map((entry, index) => <Cell key={`sex-cell-${index}`} fill={sexColorMap[String(entry.name).toLowerCase()] || '#6b7280'} />)}
                                                            </Pie>
                                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                        <span className="text-xs font-bold text-gray-800">{totalSex}</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-1">
                                                    {sexData.map((item, index) => {
                                                        const percent = Math.round(((Number(item.value) || 0) / totalSex) * 100);
                                                        return (
                                                            <div key={index} className="flex items-center justify-between text-xs">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className={`w-2.5 h-2.5 rounded-full ${sexColorClasses[String(item.name).toLowerCase()] || 'bg-gray-500'} inline-block`}></span>
                                                                    <span className="text-gray-700 font-medium">{item.name}</span>
                                                                </div>
                                                                <span className="text-gray-500 font-semibold">{item.value} ({percent}%)</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* --- Citizen's Charter Compliance & Qualitative Keyword Trends --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Citizen's Charter Compliance & Visibility Progress Bars */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <h2 className="text-lg font-bold text-gray-800">Citizen's Charter (CC) Compliance & Visibility</h2>
                                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold border border-blue-200">
                                    ARTA Standard
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-6">Client awareness, visibility, and helpfulness metrics</p>

                            <div className="space-y-5">
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                                        <span className="text-gray-700">CC Awareness Rate (Saw or Knew CC)</span>
                                        <span className="text-blue-600 font-bold">{ccMetrics.awareness_rate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${ccMetrics.awareness_rate}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                                        <span className="text-gray-700">CC Visibility Rate (Easy to See in Office)</span>
                                        <span className="text-emerald-600 font-bold">{ccMetrics.visibility_rate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${ccMetrics.visibility_rate}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                                        <span className="text-gray-700">CC Helpfulness Rate (Aided Transaction)</span>
                                        <span className="text-indigo-600 font-bold">{ccMetrics.helpfulness_rate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${ccMetrics.helpfulness_rate}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <span>Evaluated against active Citizen's Charter guidelines</span>
                            <span className="font-semibold text-gray-700">{ccMetrics.total_responses || 0} Total CC Responses</span>
                        </div>
                    </div>

                    {/* Top Recurring Feedback Words */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 mb-1">Top Recurring Words</h2>
                            <p className="text-sm text-gray-500 mb-4">Most frequent terms in comments & suggestions</p>

                            {topWords.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <i className="fa-regular fa-comment-dots text-3xl mb-2 text-gray-300"></i>
                                    <p className="text-xs italic">No qualitative feedback recorded</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {topWords.map((item, idx) => {
                                        const bgClasses = [
                                            'bg-blue-50 text-blue-700 border-blue-200',
                                            'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            'bg-amber-50 text-amber-700 border-amber-200',
                                            'bg-purple-50 text-purple-700 border-purple-200'
                                        ];
                                        return (
                                            <span key={idx} className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-sm ${bgClasses[idx % bgClasses.length]}`}>
                                                {item.word}
                                                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-white bg-opacity-80 rounded-full font-bold">
                                                    {item.count}
                                                </span>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <p className="text-[11px] text-gray-400 mt-4 border-t border-gray-100 pt-3">
                            Stopwords filtered automatically from feedback comments.
                        </p>
                    </div>

                </div>
            </div>
        </SuperAdminLayout>
    );
}