import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../core/toast/ToastContext';
import { attendanceEmailApi, AttendanceEmailEmployee } from './attendance-email.api';
import { CheckCircle2, XCircle, Search, Loader2, Send } from 'lucide-react';
import styles from './AttendanceEmailPage.module.scss';
import { cn } from '../../../shared/utils/cn';

const AttendanceEmailPage: React.FC = () => {
  const { hasRole, hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const canManageAttendanceEmails = hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  const canSelectAttendanceEmailRecipient = hasRole('ADMIN');
  const canSendAttendanceEmailToAll = canManageAttendanceEmails;

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [regenerate, setRegenerate] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState('');
  
  const [employees, setEmployees] = useState<AttendanceEmailEmployee[]>([]);
  const [sendingEmployeeId, setSendingEmployeeId] = useState<number | null>(null);
  const [isSearchingEmployees, setIsSearchingEmployees] = useState(false);
  const [isSendingAll, setIsSendingAll] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [employeeSearchPage, setEmployeeSearchPage] = useState(1);
  const employeeSearchPageSize = 10;
  const [employeeSearchTotalItems, setEmployeeSearchTotalItems] = useState(0);
  const [employeeSearchTotalPages, setEmployeeSearchTotalPages] = useState(0);

  useEffect(() => {
    if (canSelectAttendanceEmailRecipient) {
      searchEmployees(1);
    }
  }, [canSelectAttendanceEmailRecipient]);

  const searchEmployees = async (page: number = 1) => {
    if (!canSelectAttendanceEmailRecipient) {
      setEmployees([]);
      return;
    }

    setIsSearchingEmployees(true);
    setErrorMessage('');
    setEmployeeSearchPage(page);

    try {
      const response = await attendanceEmailApi.searchEmployees(employeeQuery.trim(), page, employeeSearchPageSize);
      const rawItems = response?.items;
      setEmployees(Array.isArray(rawItems) ? rawItems : []);
      setEmployeeSearchTotalItems(response?.totalItems ?? 0);
      setEmployeeSearchTotalPages(
        response?.totalPages || Math.ceil((response?.totalItems ?? 0) / employeeSearchPageSize) || 1
      );
    } catch (error: any) {
      setEmployees([]);
      setEmployeeSearchTotalItems(0);
      setEmployeeSearchTotalPages(0);
      setErrorMessage(error?.response?.data?.message || error.message || 'Unable to load employees.');
    } finally {
      setIsSearchingEmployees(false);
    }
  };

  const onEmployeeSearch = () => {
    if (!canSelectAttendanceEmailRecipient) return;
    searchEmployees(1);
  };

  const sendToEmployee = async (employee: AttendanceEmailEmployee) => {
    const normalizedMonth = month;
    if (!normalizedMonth) {
      const msg = 'Vui lòng chọn tháng hợp lệ (định dạng yyyy-MM).';
      setErrorMessage(msg);
      toast.error(msg);
      setSuccessMessage('');
      return;
    }

    setSendingEmployeeId(employee.employeeId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await attendanceEmailApi.sendToEmployee(normalizedMonth, employee.employeeId, regenerate);
      if (response && (response as any).error || (response as any).status === 500 || (response as any).success === false) {
        throw new Error((response as any).message || (response as any).error || 'Backend indicated error in response body');
      }
      const msg = response?.message || `Đã gửi email thành công cho ${employee.fullName}.`;
      setSuccessMessage(msg);
      toast.success(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('[Send Employee Error]', error);
      let finalMsg = `Không thể gửi email cho ${employee.fullName}.`;

      if ((error?.response?.data?.message || '').toLowerCase().includes('not found')) {
         finalMsg = "Không tìm thấy dữ liệu tổng kết tháng của nhân viên này. Vui lòng tick chọn 'Recalculate attendance summary before sending' và thử lại!";
      } else {
         const serverMsg = error?.response?.data?.message || error?.response?.data?.error;
         if (serverMsg) finalMsg = serverMsg;
      }

      setErrorMessage(finalMsg);
      toast.error(finalMsg);
      setSuccessMessage('');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Tự động tắt sau 7 giây
      setTimeout(() => setErrorMessage(''), 7000);
    } finally {
      setSendingEmployeeId(null);
    }
  };

  const sendToAllEmployees = async () => {
    const normalizedMonth = month;
    if (!normalizedMonth) {
      const msg = 'Vui lòng chọn tháng hợp lệ (định dạng yyyy-MM).';
      setErrorMessage(msg);
      toast.error(msg);
      setSuccessMessage('');
      return;
    }

    setIsSendingAll(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await attendanceEmailApi.sendToAll(normalizedMonth, regenerate);
      if (response && (response as any).error || (response as any).status === 500 || (response as any).success === false) {
        throw new Error((response as any).message || (response as any).error || 'Backend indicated error in response body');
      }
      const msg = response?.message || 'Đã gửi email báo cáo công tháng cho toàn bộ nhân viên thành công.';
      setSuccessMessage(msg);
      toast.success(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('[Send All Error]', error);
      const serverMsg = error?.response?.data?.message || error?.response?.data?.error;
      const finalMsg = serverMsg || error?.message || 'Unable to send attendance emails to all employees.';
      setErrorMessage(finalMsg);
      toast.error(finalMsg);
      setSuccessMessage('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSendingAll(false);
    }
  };

  const prevEmployeePage = () => {
    if (employeeSearchPage <= 1 || isSearchingEmployees) return;
    searchEmployees(employeeSearchPage - 1);
  };

  const nextEmployeePage = () => {
    if (employeeSearchPage >= employeeSearchTotalPages || isSearchingEmployees) return;
    searchEmployees(employeeSearchPage + 1);
  };

  const dismissMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={styles.pageTitle}>{t('attendanceEmail.title')}</h1>
        <p className={styles.pageSubtitle}>{t('attendanceEmail.subtitle')}</p>
      </div>

      {successMessage && (
        <div className={cn(styles.alertBox, styles.success)}>
          <div className={styles.alertInner}>
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={dismissMessages}>
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className={cn(styles.alertBox, styles.error)}>
          <div className={styles.alertInner}>
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={dismissMessages}>
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={styles.nmCard}>
        <div className={styles.nmCardHeader}>
          <h2>{t('attendanceEmail.configTitle')}</h2>
          <p>{t('attendanceEmail.configDesc')}</p>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold', color: 'var(--nm-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('attendanceEmail.selectMonth')}</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={styles.nmInput}
              />
            </div>
            {canSendAttendanceEmailToAll && (
              <div>
                <button
                  onClick={sendToAllEmployees}
                  disabled={isSendingAll || !month}
                  className={styles.nmBtnSecondary}
                >
                  {isSendingAll ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                     <Send className="h-4 w-4 shrink-0 text-blue-600" />
                  )}
                  {isSendingAll ? t('attendanceEmail.sendingAll') : t('attendanceEmail.sendAllBtn')}
                </button>
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <label className={styles.nmCheckboxWrapper}>
              <input
                type="checkbox"
                checked={regenerate}
                onChange={(e) => setRegenerate(e.target.checked)}
              />
              <span>
                {t('attendanceEmail.recalculate')}
              </span>
            </label>
          </div>
        </div>
      </div>

      {canSelectAttendanceEmailRecipient && (
        <div className={styles.nmCard}>
          <div className={styles.nmCardHeader}>
            <h2>{t('attendanceEmail.individualTitle')}</h2>
            <p>{t('attendanceEmail.individualDesc')}</p>
          </div>

          <div style={{ paddingBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className={styles.searchWrapper}>
              <Search className="h-4 w-4" />
              <input
                type="text"
                value={employeeQuery}
                onChange={(e) => setEmployeeQuery(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && onEmployeeSearch()}
                placeholder={t('attendanceEmail.searchPlaceholder')}
                className={styles.nmInput}
              />
            </div>
            <button
              onClick={onEmployeeSearch}
              disabled={isSearchingEmployees}
              className={styles.nmBtnPrimary}
            >
              {isSearchingEmployees && <Loader2 className="h-3 w-3 animate-spin" />}
              {isSearchingEmployees ? t('attendanceEmail.searching') : t('attendanceEmail.searchBtn')}
            </button>
          </div>

          <div className={styles.nmTableWrapper}>
            <table className={styles.nmTable}>
              <thead>
                <tr>
                  <th>{t('attendanceEmail.colCode')}</th>
                  <th>{t('attendanceEmail.colName')}</th>
                  <th>{t('attendanceEmail.colEmail')}</th>
                  <th>{t('attendanceEmail.colStatus')}</th>
                  <th style={{ textAlign: 'right' }}>{t('attendanceEmail.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {isSearchingEmployees ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>{t('attendanceEmail.loadingEmployees')}</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>{t('attendanceEmail.noEmployees')}</td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.employeeId}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{employee.employeeCode}</td>
                      <td style={{ fontWeight: 'bold' }}>{employee.fullName}</td>
                      <td>{employee.email || '-'}</td>
                      <td>
                        <span className={cn(styles.nmBadge, employee.status === 'ACTIVE' ? styles.nmBadgeSuccess : '')}>
                          {employee.status || '-'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => sendToEmployee(employee)}
                          disabled={sendingEmployeeId !== null || !month}
                          className={cn(styles.nmBtnPrimary, styles.nmBtnSm)}
                          style={{ background: 'var(--nm-info)', boxShadow: 'none' }}
                        >
                          {sendingEmployeeId === employee.employeeId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          {sendingEmployeeId === employee.employeeId ? t('attendanceEmail.sending') : t('attendanceEmail.sendBtn')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '14px', color: 'var(--nm-text-secondary)' }}>
              {t('common.showingEmployees', { count: employees.length, total: employeeSearchTotalItems })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={prevEmployeePage}
                disabled={employeeSearchPage <= 1 || isSearchingEmployees}
                className={styles.nmBtnSecondary}
                style={{ padding: '6px 12px' }}
              >
                {t('common.prev')}
              </button>
              <span style={{ fontSize: '14px', color: 'var(--nm-text-secondary)' }}>{t('common.pageOf', { current: employeeSearchPage, total: employeeSearchTotalPages || 1 })}</span>
              <button
                onClick={nextEmployeePage}
                disabled={employeeSearchPage >= employeeSearchTotalPages || isSearchingEmployees}
                className={styles.nmBtnSecondary}
                style={{ padding: '6px 12px' }}
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceEmailPage;
