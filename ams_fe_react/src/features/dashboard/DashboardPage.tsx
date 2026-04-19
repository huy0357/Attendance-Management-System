import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  MapPin,
  FileText,
  CalendarDays,
  X,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { dashboardApi } from './api/dashboard.api';
import { ExceptionRecord, LivePulseRecord } from '../../shared/models/dashboard.model';
import { cn } from '../../shared/utils/cn';
import styles from './DashboardPage.module.scss';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

// ── Helpers ────────────────────────────────────────────────────────────
const avatarGradients = [
  'from-blue-500 to-indigo-600', 
  'from-emerald-400 to-teal-600',
  'from-violet-500 to-fuchsia-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-600',
  'from-cyan-400 to-blue-500',
];

const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
};

const getAvatarGradient = (name?: string): string => {
  if (!name) return avatarGradients[0];
  const idx = Math.abs(name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % avatarGradients.length;
  return avatarGradients[idx];
};

const formatTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatCheckInTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
};

// ── Components ─────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className={cn(styles.glassCard, "p-6 flex flex-col gap-4")}>
    <div className="flex justify-between items-start">
      <div className="h-10 w-10 bg-slate-200 rounded-xl animate-pulse" />
      <div className="h-6 w-16 bg-slate-100 rounded-md animate-pulse" />
    </div>
    <div className="space-y-2 mt-4">
      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      <div className="h-8 w-16 bg-slate-300 rounded animate-pulse" />
    </div>
  </div>
);

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

// Mock data for mini charts inside KPI cards
const chartDataOk = Array.from({ length: 7 }).map((_, i) => ({ value: 40 + Math.random() * 60 }));
const chartDataWarn = Array.from({ length: 7 }).map((_, i) => ({ value: 80 - Math.random() * 40 }));

// ── Main Page ──────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { hasRole, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // MANAGER also needs team-level KPI visibility (attendance overview, live pulse)
  const canSeeAdminDashboardActions = hasAnyRole(['ADMIN', 'MANAGER']);
  // Self-service cards only for pure EMPLOYEE role
  const canSeeSelfServiceDashboardActions = hasRole('EMPLOYEE') && !hasRole('ADMIN') && !hasRole('MANAGER');

  // Strict UI requirements: Keep state & queries EXACTLY as they were
  const [selectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedTimeRange, setSelectedTimeRange] = useState('Today');

  const { data: kpi, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['dashboardKpi', selectedDate],
    queryFn: () => dashboardApi.getKpi(selectedDate),
    enabled: canSeeAdminDashboardActions,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const { data: livePulse, isLoading: isLoadingPulse } = useQuery({
    queryKey: ['dashboardLivePulse'],
    queryFn: () => dashboardApi.getLivePulse(20, false),
    enabled: canSeeAdminDashboardActions,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const { data: exceptionsData, isLoading: isLoadingExceptions } = useQuery({
    queryKey: ['dashboardExceptions'],
    queryFn: () => dashboardApi.getExceptions(['PENDING', 'IN_PROGRESS'], undefined, undefined, 20),
    enabled: canSeeAdminDashboardActions,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const isLoading = isLoadingKpi || isLoadingPulse || isLoadingExceptions;

  // -- Modals & Mutate --
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvingException, setResolvingException] = useState<ExceptionRecord | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveSuccess, setResolveSuccess] = useState(false);
  const [resolveError, setResolveError] = useState('');

  const resolveMutation = useMutation({
    mutationFn: (args: { id: number; notes: string }) => dashboardApi.resolveException(args.id, args.notes),
    onSuccess: () => {
      setResolveSuccess(true);
      queryClient.setQueryData<any>(['dashboardExceptions'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          exceptions: old.exceptions.filter((e: ExceptionRecord) => e.id !== resolvingException?.id),
        };
      });
      setTimeout(() => closeResolveModal(), 1200);
    },
    onError: () => {
      setResolveError('Failed to resolve. Please try again.');
    },
  });

  const openResolveModal = (ex: ExceptionRecord) => {
    setResolvingException(ex);
    setResolveNotes('');
    setResolveSuccess(false);
    setResolveError('');
    setShowResolveModal(true);
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setTimeout(() => setResolvingException(null), 300);
  };

  const submitResolve = () => {
    if (!resolvingException) return;
    setResolveError('');
    resolveMutation.mutate({ id: resolvingException.id, notes: resolveNotes });
  };

  const goToAttendanceDaily = () => navigate('/attendance/attendance-daily');

  // -- Computed KPI --
  const kpiAttendancePercent = kpi?.presentToday?.percentage != null ? kpi.presentToday.percentage.toFixed(1) + '%' : '—';
  const kpiLateAvgMin = kpi?.lateCheckins?.averageDelayMinutes != null ? `${kpi.lateCheckins.averageDelayMinutes}m avg` : '—';
  const kpiNewThisMonth = kpi?.totalEmployees?.newThisMonth;

  return (
    <div className={styles.pageContainer}>
      
      {/* ───── HEADER ───── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
            Overview
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {hasRole('ADMIN')
              ? 'Real-time telemetry across all branches and kiosks.'
              : hasRole('MANAGER')
              ? 'Team attendance overview and exception tracking.'
              : 'Welcome back. Use the shortcuts below to navigate.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="h-10 px-4 py-2 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            value={selectedTimeRange}
            onChange={e => setSelectedTimeRange(e.target.value)}
          >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
          {/* Monthly Summary Export — ADMIN only */}
          {hasRole('ADMIN') && (
            <button
              onClick={() => navigate('/attendance/monthly-summary')}
              className="group relative inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95"
            >
              <Download className="h-4 w-4 text-slate-300 transition-transform group-hover:-translate-y-0.5" />
              <span className="mt-0.5">Export</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* ───── KPI GRID ───── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {isLoading && canSeeAdminDashboardActions ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : canSeeAdminDashboardActions ? (
          <>
            {/* KPI 1 : Total Employees */}
            <motion.div variants={itemVariants} className={cn(styles.glassCard, "p-6")}>
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                {kpiNewThisMonth != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/50">
                    <ArrowUpRight className="h-3 w-3" /> {kpiNewThisMonth} new
                  </span>
                )}
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-slate-500">Total Employees</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi?.totalEmployees?.count ?? '—'}</h3>
                </div>
              </div>
            </motion.div>

            {/* KPI 2 : Present Today */}
            <motion.div variants={itemVariants} className={cn(styles.glassCard, "p-6 relative overflow-hidden")}>
              <div className="z-10 relative">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-medium text-slate-500">Present Today</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpiAttendancePercent}</h3>
                    <span className="text-sm font-medium text-slate-500">({kpi?.presentToday?.count ?? 0}/{kpi?.presentToday?.total ?? 0})</span>
                  </div>
                </div>
              </div>
              {/* Mini aesthetics chart */}
              <div className="absolute bottom-0 left-0 w-full h-16 opacity-30 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataOk}>
                    <Area type="monotone" dataKey="value" stroke="#059669" fill="#10b981" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* KPI 3 : Late Check-ins */}
            <motion.div variants={itemVariants} className={cn(styles.glassCard, "p-6 relative overflow-hidden")}>
              <div className="z-10 relative">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100/50">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  {kpi?.lateCheckins?.changeFromYesterday != null && (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border",
                      kpi.lateCheckins.changeFromYesterday >= 0 
                        ? "bg-rose-50 text-rose-700 border-rose-200/50" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                    )}>
                      {kpi.lateCheckins.changeFromYesterday >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(kpi.lateCheckins.changeFromYesterday)} daily
                    </span>
                  )}
                </div>
                <div className="mt-6">
                  <p className="text-sm font-medium text-slate-500">Late Check-ins</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi?.lateCheckins?.count ?? '—'}</h3>
                    <span className="text-sm font-medium text-slate-500">{kpiLateAvgMin}</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-16 opacity-30 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataWarn}>
                    <Area type="monotone" dataKey="value" stroke="#d97706" fill="#fbbf24" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* KPI 4 : Exceptions */}
            <motion.div variants={itemVariants} className={cn(styles.glassCard, "p-6 border-l-4 border-l-rose-500")}>
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100/50">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                  Urgent
                </span>
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-slate-500">Unresolved Exceptions</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi?.exceptions?.count ?? '—'}</h3>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}

        {/* Self Service KPI Placeholder */}
        {!isLoading && canSeeSelfServiceDashboardActions && !canSeeAdminDashboardActions && (
          <motion.div variants={itemVariants} className={cn(styles.glassCard, "p-6")}>
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium text-slate-500">My Dashboard</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Welcome Back</h3>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ───── LAYOUT: MAIN TABLES ───── */}
      {!isLoading && canSeeAdminDashboardActions && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* LEFT: Live Pulse Table (Col-Span-2) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={cn(styles.glassCard, "xl:col-span-2 flex flex-col")}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100/50">
              <div className="flex items-center gap-3">
                {/* Pulsing indicator */}
                <div className={styles.liveDot}>
                  <span className={styles.liveDotPing}></span>
                  <span className={styles.liveDotInner}></span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Live Pulse</h3>
                  <p className="text-xs font-medium text-slate-500">Real-time terminal stream</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md tracking-wider uppercase">
                {livePulse?.totalCount ?? 0} Today
              </span>
            </div>

            <div className={cn(styles.pulseTableWrapper, "flex-1")}>
              {!livePulse?.records?.length ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <RefreshCw className="h-10 w-10 mb-4 opacity-20" />
                  <p className="font-medium text-sm">Awaiting check-ins...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">Employee</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">Time</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">Location</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    <AnimatePresence>
                      {livePulse.records.map((rec, index) => (
                        <motion.tr 
                          key={rec.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm bg-gradient-to-br", getAvatarGradient(rec.employee.name))}>
                                {getInitials(rec.employee.name)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {rec.employee.name}
                                </p>
                                <p className="text-xs font-medium text-slate-500">
                                  {rec.employee.department}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                              {formatCheckInTime(rec.checkInTime)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <MapPin className="h-4 w-4 opacity-50" />
                              <span className="text-sm font-medium">{rec.branchId || rec.location || 'HQ'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap border",
                              rec.lateMinutes > 0
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                              {rec.lateMinutes > 0 ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {rec.lateMinutes > 0 ? 'Late' : 'On Time'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100/50 bg-slate-50/50 flex justify-end rounded-b-2xl">
              <button onClick={goToAttendanceDaily} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1">
                View All Activity <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          {/* RIGHT: Exceptions Card (Col-Span-1) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className={cn(styles.glassCard, "xl:col-span-1 flex flex-col")}
          >
            <div className="flex items-start justify-between p-6 border-b border-rose-100/50 bg-gradient-to-br from-white to-rose-50/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-rose-100/80 rounded-xl flex items-center justify-center text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Attention Required</h3>
                  <p className="text-xs font-medium text-slate-500">Unresolved exceptions</p>
                </div>
              </div>
              {exceptionsData?.exceptions?.length ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow-sm">
                  {exceptionsData.exceptions.length}
                </span>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '480px' }}>
              {!exceptionsData?.exceptions?.length ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                  <CheckCircle2 className="h-12 w-12 mb-4 text-emerald-400/50" />
                  <p className="font-semibold text-slate-600">Everything looks great</p>
                  <p className="text-sm mt-1">No pending exceptions.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {exceptionsData.exceptions.map((ex) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      key={ex.id}
                      onClick={() => openResolveModal(ex)}
                      className={styles.exceptionHoverRow}
                    >
                      <div className={cn("h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm bg-gradient-to-br", getAvatarGradient(ex.employee.name))}>
                        {getInitials(ex.employee.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {ex.employee.name}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5 line-clamp-2">
                          {ex.description || ex.exceptionType}
                        </p>
                      </div>
                      <div className={cn(
                        "shrink-0 h-2 w-2 mt-1.5 rounded-full",
                        ex.severity.toLowerCase() === 'high' ? "bg-rose-500 animate-pulse" : 
                        ex.severity.toLowerCase() === 'medium' ? "bg-amber-500" : "bg-blue-500"
                      )} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ───── Self Service UI ───── */}
      {!isLoading && canSeeSelfServiceDashboardActions && !canSeeAdminDashboardActions && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className={cn(styles.glassCard, "p-5 cursor-pointer hover:bg-slate-50 flex flex-col items-center justify-center text-center gap-3")} onClick={() => navigate('/attendance/requests-management')}>
            <FileText className="h-8 w-8 text-indigo-500" />
            <span className="font-semibold text-slate-700">My Requests</span>
          </div>
          <div className={cn(styles.glassCard, "p-5 cursor-pointer hover:bg-slate-50 flex flex-col items-center justify-center text-center gap-3")} onClick={goToAttendanceDaily}>
            <CalendarDays className="h-8 w-8 text-fuchsia-500" />
            <span className="font-semibold text-slate-700">My Attendance</span>
          </div>
          <div className={cn(styles.glassCard, "p-5 cursor-pointer hover:bg-slate-50 flex flex-col items-center justify-center text-center gap-3")} onClick={() => navigate('/attendance/leave-management')}>
            <Clock className="h-8 w-8 text-amber-500" />
            <span className="font-semibold text-slate-700">Leave</span>
          </div>
          <div className={cn(styles.glassCard, "p-5 cursor-pointer hover:bg-slate-50 flex flex-col items-center justify-center text-center gap-3")} onClick={() => navigate('/hrm/employee-portal')}>
            <Briefcase className="h-8 w-8 text-emerald-500" />
            <span className="font-semibold text-slate-700">Profile</span>
          </div>
        </motion.div>
      )}

      {/* ───── RESOLVE EXCEPTION MODAL (Glassmorphism Modal) ───── */}
      <AnimatePresence>
        {showResolveModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeResolveModal}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Resolve Issue</h3>
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3" /> {resolvingException?.employee?.name}
                  </p>
                </div>
                <button 
                  onClick={closeResolveModal}
                  className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {resolvingException && (
                  <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 text-sm">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                      <span className="font-semibold text-slate-500">Severity</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-md font-bold text-xs uppercase tracking-wider",
                        resolvingException.severity.toLowerCase() === 'high' ? 'bg-rose-100 text-rose-700' :
                        resolvingException.severity.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {resolvingException.severity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="font-semibold text-slate-500">Occurred At</span>
                      <span className="font-medium text-slate-900 bg-white px-2 py-1 border border-slate-200 rounded-md">
                        {formatDateTime(resolvingException.occurrenceTime)}
                      </span>
                    </div>
                    {resolvingException.description && (
                      <div className="pt-2">
                        <span className="block font-semibold text-slate-500 mb-1">Details</span>
                        <p className="text-slate-700 bg-white p-3 border border-slate-200 rounded-lg leading-relaxed">
                          {resolvingException.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Resolution Log</label>
                    <textarea
                      rows={3}
                      placeholder="e.g., Verified valid doctor's note, adjusted system records..."
                      value={resolveNotes}
                      onChange={e => setResolveNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                    />
                  </div>

                  <AnimatePresence>
                    {resolveSuccess && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex items-center gap-2 p-3 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="h-4 w-4" /> Issue formally resolved.
                        </div>
                      </motion.div>
                    )}
                    {resolveError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex items-center gap-2 p-3 text-sm font-medium text-rose-700 bg-rose-50 rounded-lg border border-rose-100">
                          <AlertCircle className="h-4 w-4" /> {resolveError}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                <button 
                  onClick={closeResolveModal} 
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitResolve}
                  disabled={resolveMutation.isPending || resolveSuccess}
                  className="relative inline-flex items-center justify-center px-6 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {resolveMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm Resolution'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DashboardPage;
