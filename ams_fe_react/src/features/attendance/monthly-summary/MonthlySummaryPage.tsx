import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Download,
  Mail,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Calendar,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { monthlySummaryApi } from './api/monthly-summary.api';
import { MonthlySummaryResponse } from '../../../shared/models/monthly-summary.model';
import styles from './MonthlySummaryPage.module.scss';

// --- Helpers ---
const getMonthVal = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
};

const formatMinutes = (mins?: number | null): string => {
  if (!mins) return '0h 0m';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

// --- Sub-components ---
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <div className={styles.statCard} style={{ borderColor: color }}>
    <div className={styles.statIconWrap} style={{ background: `${color}22`, color }}>
      {icon}
    </div>
    <div>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </div>
  </div>
);

// --- Main Page ---
const MonthlySummaryPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const isAdmin = hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  const colSpanCount: number = isAdmin ? 9 : 7;
  void colSpanCount; // suppress unused var — used inline below

  const [selectedMonth, setSelectedMonth] = useState(getMonthVal(new Date()));
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // --- Queries ---
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MonthlySummaryResponse | MonthlySummaryResponse[]>({
    queryKey: ['monthlySummary', selectedMonth, isAdmin],
    queryFn: () =>
      isAdmin
        ? monthlySummaryApi.getAdminSummary(selectedMonth)
        : monthlySummaryApi.getMySummary(selectedMonth),
    retry: false,
  });

  const rows: MonthlySummaryResponse[] = Array.isArray(data)
    ? data
    : data
    ? [data]
    : [];

  // --- Aggregate stats (Admin mode) ---
  const totalWorkDays = rows.reduce((s, r) => s + (Number(r.workDays) || 0), 0);
  const totalAbsent = rows.reduce((s, r) => s + (Number(r.absentDays) || 0), 0);
  const totalOT = rows.reduce((s, r) => s + (r.otMinutes || 0), 0);

  // --- Mutations ---
  const generateMutation = useMutation({
    mutationFn: () => monthlySummaryApi.generateSummary(selectedMonth),
    onSuccess: () => {
      showToast('success', t('monthlySummary.toastGenerateSuccess'));
      refetch();
    },
    onError: (err: any) =>
      showToast('error', err?.response?.data?.message || err.message || t('monthlySummary.toastGenerateError')),
  });

  const emailAllMutation = useMutation({
    mutationFn: () => monthlySummaryApi.sendEmailAll(selectedMonth),
    onSuccess: () => showToast('success', t('monthlySummary.toastEmailSuccess')),
    onError: (err: any) =>
      showToast('error', err?.response?.data?.message || err.message || t('monthlySummary.toastEmailError')),
  });

  const exportMutation = useMutation({
    mutationFn: () => monthlySummaryApi.exportExcel(selectedMonth),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_monthly_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', t('monthlySummary.toastExportSuccess'));
    },
    onError: (err: any) =>
      showToast('error', err?.response?.data?.message || err.message || t('monthlySummary.toastExportError')),
  });

  const isBusy =
    generateMutation.isPending ||
    emailAllMutation.isPending ||
    exportMutation.isPending;

  return (
    <div className={styles.page}>
      {/* ── Toast notification ───────────────────────────────────────── */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>
            <Calendar className="w-6 h-6" />
            {t('monthlySummary.title')}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAdmin
              ? t('monthlySummary.adminSubtitle')
              : t('monthlySummary.employeeSubtitle')}
          </p>
        </div>

        {/* ── Actions (Admin only) ───────────────────────────── */}
        {isAdmin && (
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => generateMutation.mutate()}
              disabled={isBusy}
              title={t('monthlySummary.generateTooltip')}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {t('monthlySummary.generateBtn')}
            </button>

            <button
              className={`${styles.btn} ${styles.btnInfo}`}
              onClick={() => emailAllMutation.mutate()}
              disabled={isBusy}
              title={t('monthlySummary.emailAllTooltip')}
            >
              {emailAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {t('monthlySummary.emailAllBtn')}
            </button>

            <button
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={() => exportMutation.mutate()}
              disabled={isBusy}
              title={t('monthlySummary.exportExcelTooltip')}
            >
              {exportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t('monthlySummary.exportExcelBtn')}
            </button>
          </div>
        )}
      </div>

      {/* ── Month Picker ─────────────────────────────────────────────── */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="monthly-summary-month-picker" className={styles.filterLabel}>
            {t('monthlySummary.selectMonth')}
          </label>
          <input
            id="monthly-summary-month-picker"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={styles.monthInput}
            disabled={isBusy}
          />
        </div>
      </div>

      {/* ── Stats (Admin aggregate) ───────────────────────────────────── */}
      {isAdmin && rows.length > 0 && (
        <div className={styles.statsGrid}>
          <StatCard
            label={t('monthlySummary.statTotalEmp')}
            value={rows.length}
            icon={<Users className="w-5 h-5" />}
            color="var(--nm-primary)"
          />
          <StatCard
            label={t('monthlySummary.statTotalWorkDays')}
            value={totalWorkDays.toFixed(1)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="var(--nm-success)"
          />
          <StatCard
            label={t('monthlySummary.statTotalAbsent')}
            value={totalAbsent.toFixed(1)}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="var(--nm-danger)"
          />
          <StatCard
            label={t('monthlySummary.statTotalOT')}
            value={formatMinutes(totalOT)}
            icon={<Clock className="w-5 h-5" />}
            color="var(--nm-warning)"
          />
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {isAdmin && <th>{t('monthlySummary.colEmpCode')}</th>}
              {isAdmin && <th>{t('monthlySummary.colEmpName')}</th>}
              <th>{t('monthlySummary.colMonth')}</th>
              <th>{t('monthlySummary.colWorkDays')}</th>
              <th>{t('monthlySummary.colLeaveDays')}</th>
              <th>{t('monthlySummary.colAbsentDays')}</th>
              <th>{t('monthlySummary.colLate')}</th>
              <th>{t('monthlySummary.colEarly')}</th>
              <th>{t('monthlySummary.colOT')}</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading */}
            {isLoading ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 7} className={styles.emptyCell}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('monthlySummary.loadingData')}</span>
                </td>
              </tr>
            ) : null}

            {/* Error */}
            {(!isLoading && !!error) ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 7} className={styles.emptyCell}>
                  <AlertCircle className="w-8 h-8" style={{ color: 'var(--nm-danger)' }} />
                  <span style={{ color: 'var(--nm-danger)', fontWeight: 'bold' }}>
                    {error instanceof Error ? error.message : t('monthlySummary.errorData')}
                  </span>
                </td>
              </tr>
            ) : null}

            {/* Empty */}
            {(!isLoading && !error && rows.length === 0) ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 7} className={styles.emptyCellWrapper}>
                  <div className={styles.emptyCell}>
                    <div className={styles.emptyIconWrap}>
                      <Calendar className="w-10 h-10" />
                    </div>
                    <div className={styles.emptyTextWrap}>
                      <h3 className={styles.emptyTitle}>{t('monthlySummary.emptyTitle')}</h3>
                      {isAdmin ? (
                        <p className={styles.emptySubtitle}>
                          {t('monthlySummary.emptyAdminSubtitle')}
                        </p>
                      ) : (
                        <p className={styles.emptySubtitle}>
                          {t('monthlySummary.emptyEmpSubtitle')}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}


            {/* Data rows */}
            {!isLoading &&
              rows.map((row) => {
                const workDays = Number(row.workDays) || 0;
                const leaveDays = Number(row.leaveDays) || 0;
                const absentDays = Number(row.absentDays) || 0;

                return (
                  <tr key={`${row.employeeId}-${row.monthKey}`}>
                    {isAdmin && (
                      <td>
                        <span className={styles.codeTag}>
                          {row.employeeCode || `EMP-${row.employeeId}`}
                        </span>
                      </td>
                    )}
                    {isAdmin && (
                      <td>
                        <div className={styles.employeeCell}>
                          <div className={styles.avatar}>
                            {row.employeeName?.charAt(0).toUpperCase() || 'E'}
                          </div>
                          <div>
                            <span className={styles.employeeName}>{row.employeeName}</span>
                            {row.email && (
                              <span className={styles.employeeEmail}>{row.email}</span>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    <td>
                      <span className={styles.monthBadge}>{row.monthKey}</span>
                    </td>
                    <td>
                      <span className={styles.highlightValue} style={{ color: 'var(--nm-success)' }}>
                        {workDays.toFixed(1)}
                      </span>
                    </td>
                    <td>{leaveDays.toFixed(1)}</td>
                    <td>
                      <span
                        className={styles.highlightValue}
                        style={{ color: absentDays > 0 ? 'var(--nm-danger)' : 'inherit' }}
                      >
                        {absentDays.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      {(row.lateMinutes || 0) > 0 ? (
                        <span className={styles.warningText}>
                          {formatMinutes(row.lateMinutes)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--nm-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {(row.earlyLeaveMinutes || 0) > 0 ? (
                        <span className={styles.warningText}>
                          {formatMinutes(row.earlyLeaveMinutes)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--nm-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {(row.otMinutes || 0) > 0 ? (
                        <span style={{ fontWeight: 'bold', color: 'var(--nm-primary)' }}>
                          {formatMinutes(row.otMinutes)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--nm-text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {/* Footer info */}
        {!isLoading && rows.length > 0 && (
          <div className={styles.tableFooter}>
            <span>
              Hiển thị <strong>{rows.length}</strong> nhân viên — Tháng:{' '}
              <strong>{selectedMonth}</strong>
            </span>
            {isAdmin && (
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                * Dữ liệu tự động fallback tính realtime nếu tháng chưa được chốt.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlySummaryPage;
