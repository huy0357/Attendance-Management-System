import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  Search,
  X,
  ChevronLeft,
  ChevronRight,
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

interface MonthlySummaryPageProps {
  isPersonalOnly?: boolean;
}

// --- Main Page ---
const MonthlySummaryPage: React.FC<MonthlySummaryPageProps> = ({ isPersonalOnly: isPersonalOnlyProp }) => {
  const location = useLocation();
  const { hasAnyRole } = useAuth();
  const { t } = useTranslation();
  
  const isPersonalMode = Boolean(isPersonalOnlyProp) || location.pathname.includes('my-monthly-summary');
  const isAdmin = hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  const showAdminView = isAdmin && !isPersonalMode;

  const colSpanCount: number = showAdminView ? 9 : 7;

  const [selectedMonth, setSelectedMonth] = useState(getMonthVal(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Reset page when search term, page size or month changes
  useEffect(() => {
    setPage(0);
  }, [searchTerm, pageSize, selectedMonth]);

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
    queryKey: ['monthlySummary', selectedMonth, showAdminView],
    queryFn: () =>
      showAdminView
        ? monthlySummaryApi.getAdminSummary(selectedMonth)
        : monthlySummaryApi.getMySummary(selectedMonth),
    retry: false,
  });

  const rows: MonthlySummaryResponse[] = Array.isArray(data)
    ? data
    : data
    ? [data]
    : [];

  // Filter and sort alphabetically by employee name
  const filteredRows = useMemo(() => {
    let result = [...rows];
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.employeeName && r.employeeName.toLowerCase().includes(term)) ||
          (r.employeeCode && r.employeeCode.toLowerCase().includes(term)) ||
          (r.email && r.email.toLowerCase().includes(term))
      );
    }
    result.sort((a, b) =>
      (a.employeeName || '').localeCompare(b.employeeName || '', 'vi', { sensitivity: 'base' })
    );
    return result;
  }, [rows, searchTerm]);

  // --- Aggregate stats (Admin mode) - calculated on filteredRows (reflects current view/search accurately) ---
  const totalEmployees = filteredRows.length;
  const totalWorkDays = filteredRows.reduce((s, r) => s + (Number(r.workDays) || 0), 0);
  const totalAbsent = filteredRows.reduce((s, r) => s + (Number(r.absentDays) || 0), 0);
  const totalOT = filteredRows.reduce((s, r) => s + (r.otMinutes || 0), 0);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    if (isPersonalMode) return filteredRows;
    const start = page * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize, isPersonalMode]);

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
            {isPersonalMode ? t('nav.myMonthlySummary') : t('monthlySummary.title')}
          </h1>
          <p className={styles.pageSubtitle}>
            {showAdminView
              ? t('monthlySummary.adminSubtitle')
              : t('monthlySummary.employeeSubtitle')}
          </p>
        </div>

        {/* ── Actions (Admin only) ───────────────────────────── */}
        {showAdminView && (
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

      {/* ── Filter Bar ─────────────────────────────────────────────── */}
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

        {showAdminView && (
          <div className={styles.searchInputWrap}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('monthlySummary.searchPlaceholder') || 'Tìm kiếm theo tên, mã NV, email...'}
              className={styles.searchInput}
              disabled={isBusy}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchTerm('')}
                title="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Stats (Admin aggregate) ───────────────────────────────────── */}
      {showAdminView && filteredRows.length > 0 && (
        <div className={styles.statsGrid}>
          <StatCard
            label={t('monthlySummary.statTotalEmp')}
            value={searchTerm.trim() ? `${filteredRows.length} / ${rows.length}` : totalEmployees}
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

      {/* ── Stats (Personal mode) ─────────────────────────────────────── */}
      {isPersonalMode && rows.length > 0 && (
        <div className={styles.statsGrid}>
          <StatCard
            label={t('monthlySummary.colWorkDays')}
            value={Number(rows[0]?.workDays || 0).toFixed(1)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="var(--nm-success)"
          />
          <StatCard
            label={t('monthlySummary.colLeaveDays')}
            value={Number(rows[0]?.leaveDays || 0).toFixed(1)}
            icon={<Calendar className="w-5 h-5" />}
            color="var(--nm-primary)"
          />
          <StatCard
            label={t('monthlySummary.colAbsentDays')}
            value={Number(rows[0]?.absentDays || 0).toFixed(1)}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="var(--nm-danger)"
          />
          <StatCard
            label={t('monthlySummary.colOT')}
            value={formatMinutes(rows[0]?.otMinutes)}
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
              {showAdminView && <th>{t('monthlySummary.colEmpCode')}</th>}
              {showAdminView && <th>{t('monthlySummary.colEmpName')}</th>}
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
                <td colSpan={colSpanCount} className={styles.emptyCell}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('monthlySummary.loadingData')}</span>
                </td>
              </tr>
            ) : null}

            {/* Error */}
            {(!isLoading && !!error) ? (
              <tr>
                <td colSpan={colSpanCount} className={styles.emptyCell}>
                  <AlertCircle className="w-8 h-8" style={{ color: 'var(--nm-danger)' }} />
                  <span style={{ color: 'var(--nm-danger)', fontWeight: 'bold' }}>
                    {error instanceof Error ? error.message : t('monthlySummary.errorData')}
                  </span>
                </td>
              </tr>
            ) : null}

            {/* Empty search results */}
            {(!isLoading && !error && rows.length > 0 && filteredRows.length === 0) ? (
              <tr>
                <td colSpan={colSpanCount} className={styles.emptyCell}>
                  <AlertCircle className="w-8 h-8" style={{ color: 'var(--nm-text-muted)' }} />
                  <span style={{ color: 'var(--nm-text-muted)', fontWeight: '500' }}>
                    Không tìm thấy nhân viên nào khớp với &quot;{searchTerm}&quot;
                  </span>
                </td>
              </tr>
            ) : null}

            {/* Empty month data */}
            {(!isLoading && !error && rows.length === 0) ? (
              <tr>
                <td colSpan={colSpanCount} className={styles.emptyCellWrapper}>
                  <div className={styles.emptyCell}>
                    <div className={styles.emptyIconWrap}>
                      <Calendar className="w-10 h-10" />
                    </div>
                    <div className={styles.emptyTextWrap}>
                      <h3 className={styles.emptyTitle}>{t('monthlySummary.emptyTitle')}</h3>
                      {showAdminView ? (
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
              paginatedRows.map((row) => {
                const workDays = Number(row.workDays) || 0;
                const leaveDays = Number(row.leaveDays) || 0;
                const absentDays = Number(row.absentDays) || 0;

                return (
                  <tr key={`${row.employeeId}-${row.monthKey}`}>
                    {showAdminView && (
                      <td>
                        <span className={styles.codeTag}>
                          {row.employeeCode || `EMP-${row.employeeId}`}
                        </span>
                      </td>
                    )}
                    {showAdminView && (
                      <td>
                        <div className={styles.employeeCell}>
                          <div className={styles.avatar}>
                            {row.employeeName?.charAt(0).toUpperCase() || 'E'}
                          </div>
                          <div>
                            <span className={styles.employeeName}>{row.employeeName}</span>
                            {row.email ? (
                              <span className={styles.employeeEmail}>{row.email}</span>
                            ) : (
                              <span className={styles.employeeEmail} style={{ fontStyle: 'italic', opacity: 0.6 }}>
                                (Chưa có email)
                              </span>
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

        {/* ── Footer & Pagination ── */}
        {!isLoading && filteredRows.length > 0 && (
          <div className={styles.tableFooter}>
            <div>
              <span>
                Hiển thị{' '}
                <strong>
                  {showAdminView
                    ? `${page * pageSize + 1} - ${Math.min((page + 1) * pageSize, filteredRows.length)}`
                    : filteredRows.length}
                </strong>{' '}
                / <strong>{filteredRows.length}</strong> nhân viên
                {rows.length !== filteredRows.length && (
                  <span style={{ opacity: 0.7 }}> (lọc từ tổng số {rows.length})</span>
                )}
                {' — '}Tháng: <strong>{selectedMonth}</strong>
              </span>
            </div>

            {showAdminView && (
              <div className={styles.paginationControls}>
                <div className={styles.pageSizeGroup}>
                  <label htmlFor="page-size-select" className={styles.pageSizeLabel}>
                    {t('monthlySummary.itemsPerPage') || 'Số dòng:'}
                  </label>
                  <select
                    id="page-size-select"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className={styles.pageSizeSelect}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {t('monthlySummary.prev') || 'Trước'}
                </button>

                <span className={styles.pageIndicator}>
                  {t('monthlySummary.pageOf', { current: page + 1, total: totalPages }) ||
                    `Trang ${page + 1} / ${totalPages}`}
                </span>

                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  {t('monthlySummary.next') || 'Sau'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlySummaryPage;
