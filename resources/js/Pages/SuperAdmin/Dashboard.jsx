import { Head, Link, router } from '@inertiajs/react';
import SuperAdminLayout from '../../Layouts/SuperAdminLayout';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useState, useRef, useEffect,useMemo } from 'react';

export default function Dashboard({ metrics, recentAccounts, recentForms, isSuperAdmin, deploymentData }) {
        // Active server filter states from backend
        const currentRange = metrics?.current_range || 'month';
        const currentDept = metrics?.current_department || 'overall';
        const specificDate = metrics?.specific_date || '';
        const specificMonth = metrics?.specific_month || '';
        const activeFilterCount = (isSuperAdmin && currentDept !== 'overall' ? 1 : 0) + 
            (currentRange !== 'month' ? 1 : 0) +
            (specificDate ? 1 : 0) + 
            (specificMonth ? 1 : 0);

        // Local draft states
        const [filterOpen, setFilterOpen] = useState(false);
        const [tempDept, setTempDept] = useState(currentDept);
        const [tempRange, setTempRange] = useState(currentRange);
        const [tempDate, setTempDate] = useState(specificDate);
        const [tempMonth, setTempMonth] = useState(specificMonth);
        const filterRef = useRef(null);
        const [isRefreshing, setIsRefreshing] = useState(false);
        const [timeRange, setTimeRange] = useState('30d');

        useEffect(() => {
            setTempDept(currentDept);
            setTempRange(currentRange);
            setTempDate(specificDate);
            setTempMonth(specificMonth);
        }, [currentDept, currentRange, specificDate, specificMonth]);

        // Live Chart Data from Backend Metrics
        const trendData = metrics?.trendData || [];
        const sqdData = metrics?.sqd_data || [];
        const clientTypeData = metrics?.client_types || [];
        const sexData = metrics?.sex_demographics || [];
        const transactionTypeData = metrics?.transaction_types || [];
        const regionData = metrics?.region_demographics || []; 
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

        const handleRefresh = () => {
            setIsRefreshing(true);
            router.visit(window.location.href, {
                preserveScroll: true,
                preserveState: false, 
                replace: true,
                onFinish: () => setIsRefreshing(false),
            });
        };

        const handleApplyFilters = () => {
            const params = {};
            if (isSuperAdmin && tempDept !== 'overall') params.department = tempDept;
            if (tempRange && tempRange !== 'month') params.range = tempRange;
            if (tempRange === 'custom_date' && tempDate) params.specific_date = tempDate;
            if (tempRange === 'custom_month' && tempMonth) params.specific_month = tempMonth;

            const currentRoute = isSuperAdmin ? 'superadmin.dashboard' : 'focalperson.dashboard';
            
            router.get(route(currentRoute), params, {
                preserveState: true,
                preserveScroll: true,
            });
            setFilterOpen(false);
            };

        const handleResetFilters = () => {
            setTempDept('overall');
            setTempRange('month');
            setTempDate('');
            setTempMonth('');

            const currentRoute = isSuperAdmin ? 'superadmin.dashboard' : 'focalperson.dashboard';

            router.get(
                route(currentRoute),
                {}, 
                { preserveState: true, preserveScroll: true }
            );
            setFilterOpen(false);
        };
        
        useEffect(() => {
            function handleClickOutside(e) {
                if (filterRef.current && !filterRef.current.contains(e.target)) {
                    setFilterOpen(false);
                }
            }
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);     
                
        const deptArray = Object.values(metrics?.departments || {});
        const focalDeptName = !isSuperAdmin && deptArray.length > 0 
            ? deptArray[0].department_name 
            : 'Department';

        const dashboardTitle = isSuperAdmin 
            ? "Executive Dashboard" 
            : `${focalDeptName} Dashboard`;

        // Determine if we should show the 7D/30D/90D tabs
        const showLocalTabs = currentRange === 'month' || currentRange === 'all';

        const filteredTrendData = useMemo(() => {
            if (!trendData || trendData.length === 0) return [];
            
            // If viewing Today (hourly), Year (monthly), etc., do not slice the data.
            if (!showLocalTabs) {
                return trendData;
            }
            
            const sliceCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            return trendData.slice(-sliceCount);
        }, [trendData, timeRange, showLocalTabs]);
    return (
        <SuperAdminLayout headerTitle={dashboardTitle}>
            <Head title={dashboardTitle} />

            <div className="max-w-7xl mx-auto space-y-6 pb-10">

                {/* --- GLOBAL CONTROL PANEL --- */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-4">
                        <h2 className="text-lg font-bold text-gray-800 hidden sm:block">
                            <i className="fa-solid fa-chart-pie mr-2 text-blue-600"></i> Analytics Overview
                        </h2>

                        <div className="relative w-full sm:w-auto" ref={filterRef}>
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2 rounded-lg font-medium text-sm transition shadow-sm border ${
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

                                    {isSuperAdmin && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">Department</label>
                                            <select 
                                                value={tempDept}
                                                onChange={(e) => setTempDept(e.target.value)}
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
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Date Range</label>
                                        <select 
                                            value={tempRange}
                                            onChange={(e) => setTempRange(e.target.value)}
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

                                    {tempRange === 'custom_date' && (
                                        <div className="space-y-1.5 pt-1">
                                            <label className="text-xs font-semibold text-blue-700">Pick Date</label>
                                            <input 
                                                type="date" 
                                                value={tempDate}
                                                onChange={(e) => setTempDate(e.target.value)}
                                                className="bg-white border border-blue-400 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 shadow-sm cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    {tempRange === 'custom_month' && (
                                        <div className="space-y-1.5 pt-1">
                                            <label className="text-xs font-semibold text-blue-700">Pick Month</label>
                                            <input 
                                                type="month" 
                                                value={tempMonth}
                                                onChange={(e) => setTempMonth(e.target.value)}
                                                className="bg-white border border-blue-400 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 shadow-sm cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            onClick={handleApplyFilters}
                                            className="w-full bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button 
                            type="button"
                            title="Refresh Data"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-95 transition shadow-xs flex items-center justify-center disabled:opacity-50"
                        >
                            <i className={`fa-solid fa-arrows-rotate text-sm ${isRefreshing ? 'fa-spin text-blue-600' : ''}`}></i>
                        </button>

                        {isSuperAdmin && (
                            <>
                                <Link 
                                    href={route('superadmin.users.index')} 
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition shadow-xs"
                                >
                                    <i className="fa-solid fa-user-plus text-xs"></i>
                                    <span>Add Account</span>
                                </Link>

                                <Link 
                                    href={route('superadmin.forms.builder')} 
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition shadow-xs"
                                >
                                    <i className="fa-solid fa-file-circle-plus text-xs"></i>
                                    <span>Build Form</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Primary KPI Metrics Grid */}
                <div className={`grid grid-cols-1 md:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
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

                    {isSuperAdmin && (
                        <>
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
                        </>
                    )}

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
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 lg:col-span-3 transition duration-200 hover:shadow-md">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 tracking-tight">Departmental Sentiment Trend</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Sentiment metrics over the selected timeline</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">



                                {/* Sentiment Totals Pill */}
                                <div className="flex items-center gap-2 sm:gap-3 bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-200/60 text-xs">
                                    <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Positive: {filteredTrendData.reduce((acc, curr) => acc + (Number(curr.Positive) || 0), 0)}
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <span className="flex items-center gap-1.5 font-medium text-amber-700">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        Neutral: {filteredTrendData.reduce((acc, curr) => acc + (Number(curr.Neutral) || 0), 0)}
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <span className="flex items-center gap-1.5 font-medium text-rose-700">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                        Negative: {filteredTrendData.reduce((acc, curr) => acc + (Number(curr.Negative) || 0), 0)}
                                    </span>
                                </div>

                                
                                {/* 7D / 30D / 90D Filter Tabs */}
                                {showLocalTabs && (
                                    <div className="flex items-center bg-gray-100/90 p-1 rounded-lg border border-gray-200/60 shadow-inner">
                                        {[
                                            { label: '7 Days', value: '7d' },
                                            { label: '30 Days', value: '30d' },
                                            { label: '90 Days', value: '90d' },
                                        ].map((tab) => {
                                            const isSelected = timeRange === tab.value;
                                            return (
                                                <button
                                                    key={tab.value}
                                                    type="button"
                                                    onClick={() => setTimeRange(tab.value)}
                                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 ${
                                                        isSelected
                                                            ? 'bg-[#1E6031] text-white shadow-sm'
                                                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                                    }`}
                                                >
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                
                            </div>
                        </div>

                        <div className="w-full h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={filteredTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} dy={8} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, (dataMax) => (dataMax === 0 ? 5 : Math.ceil(dataMax * 1.25))]} />
                                    <RechartsTooltip content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white/95 backdrop-blur-sm border border-gray-200/90 shadow-xl rounded-xl p-3 text-xs min-w-[150px]">
                                                    <p className="font-bold text-gray-800 border-b border-gray-100 pb-1.5 mb-2 flex items-center justify-between">
                                                        <span>{label}</span>
                                                        <span className="text-[10px] text-gray-400 font-normal">Timeline</span>
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        {payload.map((entry, index) => (
                                                            <div key={index} className="flex items-center justify-between">
                                                                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                                                    {entry.name}
                                                                </span>
                                                                <span className="font-bold text-gray-900">{entry.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: 500, color: '#475569' }} />
                                    <Line type="monotone" dataKey="Positive" name="Positive" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 5.5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }} />
                                    <Line type="monotone" dataKey="Neutral" name="Neutral" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3.5, fill: '#ffffff', stroke: '#f59e0b', strokeWidth: 2 }} activeDot={{ r: 5.5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }} />
                                    <Line type="monotone" dataKey="Negative" name="Negative" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3.5, fill: '#ffffff', stroke: '#f43f5e', strokeWidth: 2 }} activeDot={{ r: 5.5, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Department Performance Ranking - SUPERADMIN ONLY */}
                    {isSuperAdmin && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 lg:col-span-3 transition duration-200 hover:shadow-md">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-award text-blue-600 text-base"></i>
                                    <h2 className="text-base font-bold text-gray-900 tracking-tight">Office Performance Benchmark</h2>
                                </div>
                            </div>

                            <div className="w-full h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }} barSize={36}>
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} dy={6} />
                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" />
                                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl p-3 text-xs min-w-[170px]">
                                                        <p className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 mb-2">{data.full_name || data.name}</p>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-500 font-medium">Performance Score:</span>
                                                                <span className={`font-bold ${data.score >= 80 ? 'text-emerald-600' : data.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{data.score}%</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-gray-500">
                                                                <span>Responses Recorded:</span>
                                                                <span className="font-semibold text-gray-800">{data.total}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                                            {departmentData.map((entry, index) => {
                                                const barColor = entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#f43f5e';
                                                return <Cell key={`dept-cell-${index}`} fill={barColor} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

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

                            {/* Client Classification Donut */}
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

                            {/* Transaction Type Donut */}
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

                            {/* Sex Breakdown Donut */}
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

                    {/* --- REGION OF RESIDENCE ANALYTICAL GRAPH (Available for SuperAdmin & Focal Person) --- */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 lg:col-span-3 transition duration-200 hover:shadow-md">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-map-location-dot text-indigo-600 text-base"></i>
                                    <h2 className="text-base font-bold text-gray-900 tracking-tight">
                                        Region of Residence Demographics
                                    </h2>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {isSuperAdmin && currentDept === 'overall'
                                        ? 'Geographic distribution of respondents across all university transactions'
                                        : `Geographic distribution of respondents for ${!isSuperAdmin ? focalDeptName : (deptArray.find(d => String(d.department_id) === String(currentDept))?.department_name || 'selected department')}`
                                    }
                                </p>
                            </div>
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-semibold border border-indigo-100">
                                {regionData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)} Total Responses
                            </span>
                        </div>

                        {regionData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <i className="fa-solid fa-earth-asia text-4xl mb-3 text-gray-300"></i>
                                <p className="text-sm font-medium text-gray-600">No regional data recorded yet</p>
                                <p className="text-xs text-gray-400 mt-0.5">Responses containing a region will appear here automatically.</p>
                            </div>
                        ) : (
                            <div className="w-full h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={regionData} 
                                        layout="vertical" 
                                        margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                                        barSize={20}
                                    >
                                        <CartesianGrid strokeDasharray="4 4" horizontal={false} vertical={true} stroke="#f1f5f9" />
                                        <XAxis 
                                            type="number" 
                                            tick={{ fontSize: 11, fill: '#64748b' }} 
                                            axisLine={{ stroke: '#e2e8f0' }} 
                                            tickLine={false} 
                                            allowDecimals={false} 
                                        />
                                        <YAxis 
                                            type="category" 
                                            dataKey="name" 
                                            tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            width={140}
                                        />
                                        <RechartsTooltip 
                                            cursor={{ fill: '#f8fafc' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    const total = regionData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 1;
                                                    const percent = Math.round((Number(data.value) / total) * 100);
                                                    return (
                                                        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl rounded-xl p-3 text-xs min-w-[170px]">
                                                            <p className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 mb-2">{data.name}</p>
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between items-center text-gray-600">
                                                                    <span>Respondent Count:</span>
                                                                    <span className="font-bold text-indigo-600">{data.value}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-gray-500">
                                                                    <span>Proportion:</span>
                                                                    <span className="font-semibold text-gray-800">{percent}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#6366f1" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Citizen's Charter Compliance & Qualitative Keyword Trends --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {(isSuperAdmin || ccMetrics.total_responses > 0) && (
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
                    )}

                    <div className={`bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between transition duration-200 hover:shadow-md ${(isSuperAdmin || ccMetrics.total_responses > 0) ? '' : 'lg:col-span-3'}`}>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-triangle-exclamation text-rose-500 text-sm"></i>
                                    <h2 className="text-base font-bold text-gray-900 tracking-tight">Recurring Complaints</h2>
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                    Issues Log
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-5">Most frequent pain points in negative & constructive feedback</p>

                            {topWords.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                                        <i className="fa-solid fa-check-double text-emerald-500 text-lg"></i>
                                    </div>
                                    <p className="text-xs font-medium text-gray-600">No recurring complaints detected</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">All transactions within this period meet standards.</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {topWords.map((item, idx) => (
                                        <span 
                                            key={idx} 
                                            className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-xs bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 transition"
                                        >
                                            <i className="fa-regular fa-circle-dot mr-1.5 text-[8px] text-rose-500"></i>
                                            {item.word}
                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-white text-rose-800 rounded-md font-bold shadow-xs border border-rose-100">
                                                {item.count}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <p className="text-[11px] text-gray-400 mt-4 border-t border-gray-100 pt-3 flex items-center justify-between">
                            <span>Filtered from Negative / Harassment remarks</span>
                            <i className="fa-solid fa-shield-halved text-gray-300"></i>
                        </p>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}