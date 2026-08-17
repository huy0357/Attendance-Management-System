import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Search, X, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../core/toast/ToastContext';
import { attendanceDailyApi } from './api/attendance-daily.api';
import styles from './AttendanceDailyPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

// --- Helpers ---
const enumerateIsoDatesInclusive = (from: string, to: string): string[] => {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const out: string[] = [];
  const cursor = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cursor.getTime() <= end.getTime()) {
    const y = cursor.getFullYear();
    const month = `${cursor.getMonth() + 1}`.padStart(2, '0');
    const day = `${cursor.getDate()}`.padStart(2, '0');
    out.push(`${y}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
};

const getMonthVal = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
};

export const AttendanceDailyPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();

  const queryClient = useQueryClient();
  const isHR = hasAnyRole(['ADMIN', 'HR']);
  const canDebug = hasAnyRole(['ADMIN']);
  const [activeTab, setActiveTab] = useState<'all' | 'me'>(isHR ? 'all' : 'me');

  const today = new Date();
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  
  const [syncWarning, setSyncWarning] = useState('');

  // Track if we need to sync batch admin
  const syncedRangeRef = useRef<{from: string, to: string} | null>(null);
  const isSyncingRef = useRef(false);

  // --- Queries ---

  // 1. Employees Dictionary
  const { data: employeesList } = useQuery({
    queryKey: ['scheduleEmployees'],
    queryFn: async () => {
      try {
        return await attendanceDailyApi.getScheduleEmployees();
      } catch (err) {
        console.warn('[AttendanceDailyPage] Could not load employee dictionary:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const employeesMap = useMemo(() => {
    const map = new Map<number, any>();
    if (employeesList) {
      employeesList.forEach(emp => map.set(Number(emp.id), emp));
    }
    return map;
  }, [employeesList]);

  const getEmployeeName = (empId: number) => employeesMap.get(empId)?.name || `Employee #${empId}`;
  const getEmployeeInitial = (empId: number) => {
    const name = getEmployeeName(empId);
    return name ? name.charAt(0).toUpperCase() : 'E';
  };

  // 2. Fetch Records
  const { data: recordsPage, isLoading, error } = useQuery({
    queryKey: ['attendanceDaily', activeTab, employeeId, from, to, page, size],
    queryFn: async () => {
      setErrorMessage('');
      
      const dayCount = enumerateIsoDatesInclusive(from, to).length;
      if (dayCount > 62) {
        throw new Error('Khoảng ngày quá lớn (tối đa 62 ngày). Thu hẹp From/To.');
      }
      if (to < from) {
        throw new Error('To date must be on or after From date.');
      }

      if (employeeId) {
        return await attendanceDailyApi.getAttendanceDailyEmployee(Number(employeeId), from, to, page, size);
      }

      // Admin/Manager tab: trigger batch sync in background (non-blocking), always fetch data
      if (isAdmin && activeTab === 'all') {
        const currentRange = `${from}_${to}`;
        const lastRange = syncedRangeRef.current ? `${syncedRangeRef.current.from}_${syncedRangeRef.current.to}` : null;
        
        if (currentRange !== lastRange && !isSyncingRef.current) {
          syncedRangeRef.current = { from, to };
          isSyncingRef.current = true;
          setSyncWarning('');
          const dates = enumerateIsoDatesInclusive(from, to);
          Promise.allSettled(dates.map(d => attendanceDailyApi.runAttendanceBatchForDate(d)))
            .then(() => { isSyncingRef.current = false; })
            .catch(() => {
              isSyncingRef.current = false;
              setSyncWarning('Batch sync gặp lỗi, dữ liệu có thể chưa cập nhật đầy đủ.');
            });
        }
        return await attendanceDailyApi.getAttendanceDailyAdmin(from, to, page, size);
      } else {
        return await attendanceDailyApi.getMyAttendanceDaily(from, to, page, size);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải bảng công hàng ngày.');
    }
  }, [error, toast]);

  const records = recordsPage?.content || [];
  const totalElements = recordsPage?.totalElements || 0;
  const totalPages = recordsPage?.totalPages || 0;
  const currentPage = page + 1;
  const isLastPage = totalPages > 0 && page >= totalPages - 1;

  // --- Formatting Helpers ---
  const formatWorkDate = (val?: string | null) => val ? val.slice(0, 10) : '-';
  const formatTime = (val?: string | null) => {
    if (!val) return '-';
    // Expecting 2026-04-01T08:00:00
    const t = val.indexOf('T');
    const fragment = t >= 0 ? val.slice(t + 1) : val;
    const match = fragment.match(/^(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : '-';
  };
  const formatHours = (mins?: number | null) => {
    if (!mins) return '0h 0m';
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const getDisplayStatus = (rec: any) => {
    if (rec.status === 'PRESENT') {
      if ((rec.lateMinutes || 0) > 0) return 'LATE';
      if ((rec.earlyLeaveMinutes || 0) > 0) return 'EARLY_LEAVE';
    }
    return rec.status || '-';
  };

  // --- Handlers ---
  const handleTabChange = (tab: 'all' | 'me') => {
    setActiveTab(tab);
    setPage(0);
  };

  // --- Monthly Summary Modal State ---
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [summaryMonth, setSummaryMonth] = useState(getMonthVal(new Date()));
  const [summarySuccessMsg, setSummarySuccessMsg] = useState('');
  const [summaryErrorMsg, setSummaryErrorMsg] = useState('');

  const generateMutation = useMutation({
    mutationFn: () => attendanceDailyApi.generateMonthlySummary(summaryMonth),
    onSuccess: () => {
      setSummaryErrorMsg('');
      setSummarySuccessMsg('Monthly summary generated successfully.');
      setTimeout(() => setSummarySuccessMsg(''), 3500);
    },
    onError: (err: any) => {
      setSummarySuccessMsg('');
      setSummaryErrorMsg(err.response?.data?.message || err.message || 'Unable to generate summary.');
    }
  });

  const exportMutation = useMutation({
    mutationFn: () => attendanceDailyApi.exportAttendanceMonthly(summaryMonth),
    onSuccess: (blob) => {
      setSummaryErrorMsg('');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_monthly_${summaryMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSummarySuccessMsg('Report exported successfully.');
      setTimeout(() => setSummarySuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setSummarySuccessMsg('');
      setSummaryErrorMsg(err.response?.data?.message || err.message || 'Unable to export report.');
    }
  });

  const openMonthlyModal = () => {
    setSummaryMonth(getMonthVal(new Date()));
    setSummarySuccessMsg('');
    setSummaryErrorMsg('');
    setIsMonthlyModalOpen(true);
  };

  // --- Debug Run Modal State ---
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [debugDate, setDebugDate] = useState(new Date().toISOString().slice(0, 10));
  const [debugSuccessMsg, setDebugSuccessMsg] = useState('');
  const [debugErrorMsg, setDebugErrorMsg] = useState('');

  const debugMutation = useMutation({
    mutationFn: () => attendanceDailyApi.runAttendanceBatchForDate(debugDate),
    onSuccess: (data) => {
      setDebugErrorMsg('');
      setDebugSuccessMsg(data?.message || 'Chạy batch tính công thành công.');
      setTimeout(() => setDebugSuccessMsg(''), 3500);
      queryClient.invalidateQueries({ queryKey: ['attendanceDaily'] });
    },
    onError: (err: any) => {
      setDebugSuccessMsg('');
      setDebugErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi chạy tính công.');
    }
  });

  const openDebugModal = () => {
    setDebugDate(new Date().toISOString().slice(0, 10));
    setDebugSuccessMsg('');
    setDebugErrorMsg('');
    setIsDebugModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────── HEADER ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {employeeId && (
            <button 
              onClick={() => navigate('/attendance/attendance-daily')}
              className={styles.nmBtnSecondary}
              style={{ padding: '8px', borderRadius: '50%' }}
              title="Back to All Employees"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className={styles.pageTitle}>
              {employeeId ? `${t('attendanceDaily.title')} - ${getEmployeeName(Number(employeeId))}` : t('attendanceDaily.title')}
            </h1>
            <p className={styles.pageSubtitle}>{t('attendanceDaily.subtitle')}</p>
          </div>
        </div>
      </div>

      {!employeeId && isAdmin && (
        <div className={styles.viewToggle} style={{ width: 'fit-content' }}>
          <button 
            className={activeTab === 'all' ? styles.active : ''} 
            onClick={() => handleTabChange('all')}
          >
            {t('attendanceDaily.tabAll')}
          </button>
          <button 
            className={activeTab === 'me' ? styles.active : ''} 
            onClick={() => handleTabChange('me')}
          >
            {t('attendanceDaily.tabMe')}
          </button>
        </div>
      )}

      {/* ──────────────────────────────── TOOLBAR ──────────────────────────────── */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--nm-text-muted)', textTransform: 'uppercase' }}>{t('attendanceDaily.range')}</span>
            <input 
              type="date" 
              value={from} 
              max={to} 
              onChange={(e) => { setFrom(e.target.value); setPage(0); }} 
              className={styles.nmInput}
              style={{ width: 'auto' }}
            />
            <span style={{ fontSize: '14px', color: 'var(--nm-text-secondary)' }}>{t('attendanceDaily.to')}</span>
            <input 
              type="date" 
              value={to} 
              min={from} 
              onChange={(e) => { setTo(e.target.value); setPage(0); }} 
              className={styles.nmInput}
              style={{ width: 'auto' }}
            />
          </div>
        </div>
        
        {/* Admin Actions */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={styles.nmBtnSecondary} onClick={openDebugModal}>
              {t('attendanceDaily.btnDebug')}
            </button>
            <button className={styles.nmBtnPrimary} onClick={openMonthlyModal} style={{ background: 'var(--nm-info)', boxShadow: 'none' }}>
              <Download className="w-4 h-4" />
              {t('attendanceDaily.btnMonthly')}
            </button>
          </div>
        )}
      </div>

      {syncWarning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--nm-surface)', borderRadius: 'var(--nm-radius-md)', boxShadow: 'inset 0 0 0 2px var(--nm-warning)', color: 'var(--nm-warning)', fontWeight: 'bold', marginBottom: '16px' }}>
          <AlertCircle className="h-5 w-5 shrink-0" />
          {syncWarning}
        </div>
      )}

      {/* ──────────────────────────────── DATA TABLE ──────────────────────────────── */}
      <div className={styles.nmTableWrapper}>
        <table className={styles.nmTable}>
          <thead>
            <tr>
              <th>{t('attendanceDaily.colDate')}</th>
              <th>{t('attendanceDaily.colEmp')}</th>
              <th>{t('attendanceDaily.colCheckIn')}</th>
              <th>{t('attendanceDaily.colCheckOut')}</th>
              <th>{t('attendanceDaily.colWorkHours')}</th>
              <th>{t('attendanceDaily.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            
            {/* LOADING STATE */}
            {isLoading && (
              <tr>
                 <td colSpan={6} style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                       <Loader2 className="animate-spin w-5 h-5" />
                       <span>{t('attendanceDaily.loading')}</span>
                    </div>
                 </td>
              </tr>
            )}
            
            {/* EMPTY STATE */}
            {!isLoading && records.length === 0 && (
              <tr>
                 <td colSpan={6} style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                     <Search className="text-gray-400 w-12 h-12 mb-2" />
                     <p style={{ fontWeight: 'bold' }}>{t('attendanceDaily.emptyTitle')}</p>
                     <p style={{ fontSize: '14px' }}>{t('attendanceDaily.emptySubtitle')}</p>
                   </div>
                 </td>
              </tr>
            )}

            {/* DATA ROWS */}
            {!isLoading && records.length > 0 && records.map((record: any) => {
              const status = getDisplayStatus(record);
              let statusClass = styles.nmBadgeNeutral;
              if (status === 'PRESENT') statusClass = styles.nmBadgeSuccess;
              else if (status === 'LATE' || status === 'EARLY_LEAVE') statusClass = styles.nmBadgeWarning;
              else if (status === 'ABSENT') statusClass = styles.nmBadgeDanger;
              else if (status === 'LEAVE') statusClass = styles.nmBadgeInfo;

              return (
                <tr key={record.attendanceId}>
                  <td style={{ fontWeight: 'bold' }}>{formatWorkDate(record.workDate)}</td>
                  <td>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: (isAdmin && !employeeId) ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (isAdmin && !employeeId) {
                          navigate(`/attendance/attendance-daily/employee/${record.employeeId}`);
                        }
                      }}
                    >
                      <div className={styles.nmAvatar}>{getEmployeeInitial(record.employeeId)}</div>
                      <div>
                        <span style={{ display: 'block', fontWeight: 'bold' }}>{getEmployeeName(record.employeeId)}</span>
                        <span style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>VDP-{record.employeeId}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(record.firstInTime)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(record.lastOutTime)}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatHours(record.workMinutes)}</td>
                  <td>
                    <div>
                      <span className={cn(styles.nmBadge, statusClass)}>
                        {status}
                      </span>
                      {(record.lateMinutes > 0) && (
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--nm-danger)', fontWeight: 'bold' }}>Đi muộn {record.lateMinutes}p</span>
                      )}
                      {(record.earlyLeaveMinutes > 0) && (
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--nm-danger)', fontWeight: 'bold' }}>Về sớm {record.earlyLeaveMinutes}p</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ──────────────────────────────── PAGINATION ──────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '2px solid rgba(0,0,0,0.05)', background: 'var(--nm-surface)' }}>
          <div style={{ fontSize: '14px', color: 'var(--nm-text-secondary)' }}>
            {t('common.showingRecords', { count: records.length, total: totalElements })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--nm-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Items per page:</label>
              <select 
                value={size} 
                onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} 
                className={styles.nmInput}
                style={{ padding: '4px 8px' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button disabled={page <= 0 || isLoading} onClick={() => setPage(p => p - 1)} className={styles.nmBtnSecondary} style={{ padding: '6px 12px' }}>Prev</button>
            <span style={{ fontSize: '14px', color: 'var(--nm-text-secondary)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button disabled={isLastPage || isLoading} onClick={() => setPage(p => p + 1)} className={styles.nmBtnSecondary} style={{ padding: '6px 12px' }}>Next</button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────── MONTHLY SUMMARY MODAL ──────────────────────────────── */}
      {isMonthlyModalOpen && (
        <ModalPortal onBackdropClick={() => setIsMonthlyModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} aria-busy={generateMutation.isPending || exportMutation.isPending}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Monthly Summary</h2>
                <p style={{ fontSize: '14px', color: 'var(--nm-text-secondary)', marginTop: '4px' }}>Generate the monthly attendance summary and export.</p>
              </div>
              <button 
                className={styles.nmBtnIcon}
                onClick={() => setIsMonthlyModalOpen(false)} 
                disabled={generateMutation.isPending || exportMutation.isPending}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div className={styles.fieldGroup}>
                <label htmlFor="attendance-summary-month">Month</label>
                <input
                  id="attendance-summary-month"
                  type="month"
                  value={summaryMonth}
                  onChange={(e) => setSummaryMonth(e.target.value)}
                  className={styles.nmInput}
                />
              </div>
              
              {summarySuccessMsg && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--nm-success)', fontWeight: 'bold' }}>
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  {summarySuccessMsg}
                </div>
              )}

              {summaryErrorMsg && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--nm-danger)', fontWeight: 'bold' }}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {summaryErrorMsg}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setIsMonthlyModalOpen(false)}
                disabled={generateMutation.isPending || exportMutation.isPending}
                className={styles.nmBtnSecondary}
              >
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || exportMutation.isPending || !summaryMonth}
                  className={styles.nmBtnPrimary}
                >
                  {generateMutation.isPending && <Loader2 className="animate-spin w-4 h-4" />}
                  {generateMutation.isPending ? 'Generating...' : 'Generate '}
                </button>
                <button
                  type="button"
                  onClick={() => exportMutation.mutate()}
                  disabled={generateMutation.isPending || exportMutation.isPending || !summaryMonth}
                  className={styles.nmBtnPrimary}
                  style={{ background: 'var(--nm-info)', boxShadow: 'none' }}
                >
                  {exportMutation.isPending && <Loader2 className="animate-spin w-4 h-4" />}
                  {exportMutation.isPending ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ──────────────────────────────── DEBUG MODAL ──────────────────────────────── */}
      {isDebugModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className={cn(styles.nmCard, 'w-full max-w-md')} style={{ padding: '24px' }}>
              
              <div className="flex items-center justify-between mb-4">
                <h3 className={styles.pageTitle} style={{ fontSize: '1.25rem', marginBottom: 0 }}>
                  Chạy Debug Tính Công (Thủ công)
                </h3>
                <button onClick={() => setIsDebugModalOpen(false)} className={styles.nmBtnSecondary} style={{ padding: '6px', borderRadius: '50%' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-6 space-y-4">
                <p className={styles.pageSubtitle} style={{ color: 'var(--nm-text)' }}>
                  Chọn ngày để chạy lại tiến trình tính công (attendance batch). Tiến trình này sẽ quét lại toàn bộ giờ quét thẻ và cập nhật lại trạng thái Đi Trễ / Về Sớm / Tăng Ca cho ngày đó.
                </p>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-500 uppercase">Ngày chạy debug:</label>
                  <input
                    type="date"
                    value={debugDate}
                    onChange={(e) => setDebugDate(e.target.value)}
                    className={styles.nmInput}
                  />
                </div>

                {debugErrorMsg && (
                  <div className="p-3 mt-2 text-sm font-bold text-red-600 bg-red-50 rounded-md">
                    {debugErrorMsg}
                  </div>
                )}
                {debugSuccessMsg && (
                  <div className="p-3 mt-2 text-sm font-bold text-green-600 bg-green-50 rounded-md">
                    {debugSuccessMsg}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setIsDebugModalOpen(false)} 
                  className={styles.nmBtnSecondary}
                  disabled={debugMutation.isPending}
                >
                  Đóng
                </button>
                <button 
                  onClick={() => debugMutation.mutate()} 
                  className={styles.nmBtnPrimary}
                  style={{ background: 'var(--nm-primary)' }}
                  disabled={debugMutation.isPending}
                >
                  {debugMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang chạy...</>
                  ) : (
                    'Chạy Batch'
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default AttendanceDailyPage;
