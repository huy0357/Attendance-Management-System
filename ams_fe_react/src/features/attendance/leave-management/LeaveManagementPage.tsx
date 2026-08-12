import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, CheckCircle, Clock, XCircle, AlertCircle, TriangleAlert, X } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { requestApi, RequestsResponse } from '../api/attendanceCore.api';
import styles from './LeaveManagementPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED': return styles.nmBadgeSuccess;
    case 'REJECTED': return styles.nmBadgeDanger;
    case 'SUBMITTED': return styles.nmBadgeInfo;
    case 'CANCELLED': return styles.nmBadgeNeutral;
    default: return styles.nmBadgeWarning;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'APPROVED': return CheckCircle;
    case 'REJECTED': return XCircle;
    case 'SUBMITTED': return Clock;
    case 'CANCELLED': return XCircle;
    default: return Clock;
  }
};

const formatDateTime = (val?: string) => {
  if (!val) return '-';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleString();
};

const formatDate = (val?: string) => {
  if (!val) return '-';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString();
};

const calculateDays = (start: string, end: string) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  
  // Note: Simplified calculation
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays || 1;
};

const LeaveManagementPage: React.FC = () => {
  const { hasAnyRole, getEmployeeId } = useAuth();
  const { t } = useTranslation();
  const isAdminOrManager = hasAnyRole(['ADMIN', 'MANAGER']);

  const currentEmployeeId = getEmployeeId() ?? undefined;

  const { data: allRequests = [], isLoading, error } = useQuery({
    queryKey: ['requestsTable', currentEmployeeId],
    queryFn: () => requestApi.getMyRequests(currentEmployeeId!),
    enabled: !!currentEmployeeId,
  });

  // Filter for Leave only
  const leaveRequests = useMemo(() => {
    return allRequests
      .filter(r => r.requestType === 'LEAVE')
      .map(r => ({ ...r, days: calculateDays(r.startDatetime, r.endDatetime) }));
  }, [allRequests]);

  const [activeTab, setActiveTab] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestsResponse & { days?: number } | null>(null);

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'open': return leaveRequests.filter(r => r.status === 'DRAFT' || r.status === 'SUBMITTED').length;
      case 'approved': return leaveRequests.filter(r => r.status === 'APPROVED').length;
      case 'rejected': return leaveRequests.filter(r => r.status === 'REJECTED').length;
      case 'cancelled': return leaveRequests.filter(r => r.status === 'CANCELLED').length;
      case 'all': return leaveRequests.length;
      default: return 0;
    }
  };

  const filteredRequests = useMemo(() => {
    let result = leaveRequests;
    if (activeTab === 'open') result = result.filter(r => r.status === 'DRAFT' || r.status === 'SUBMITTED');
    else if (activeTab !== 'all') result = result.filter(r => r.status.toLowerCase() === activeTab);
    
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(r => 
        String(r.requestId).includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        (isAdminOrManager && (r.employeeName || '').toLowerCase().includes(q))
      );
    }
    return result;
  }, [leaveRequests, activeTab, searchQuery]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return t('leaveManagement.statusApproved');
      case 'REJECTED': return t('leaveManagement.statusRejected');
      case 'SUBMITTED': return t('leaveManagement.statusPending');
      case 'CANCELLED': return t('leaveManagement.statusCancelled');
      case 'DRAFT': return t('leaveManagement.statusDraft');
      default: return status;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'open': return t('leaveManagement.tabOpen');
      case 'approved': return t('leaveManagement.tabApproved');
      case 'rejected': return t('leaveManagement.tabRejected');
      case 'cancelled': return t('leaveManagement.tabCancelled');
      case 'all': return t('leaveManagement.tabAll');
      default: return tab;
    }
  };

  const stats = [
    { key: 'open-total', label: t('leaveManagement.kpiOpen'), value: getTabCount('open'), color: 'var(--nm-info)', icon: 'clock' },
    { key: 'approved-total', label: t('leaveManagement.kpiApproved'), value: getTabCount('approved'), color: 'var(--nm-success)', icon: 'check-circle' },
    { key: 'rejected-total', label: t('leaveManagement.kpiRejected'), value: getTabCount('rejected'), color: 'var(--nm-danger)', icon: 'x-circle' },
    { key: 'cancelled-total', label: t('leaveManagement.kpiCancelled'), value: getTabCount('cancelled'), color: 'var(--nm-text-muted)', icon: 'alert-circle' },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={styles.pageTitle}>{t('leaveManagement.myTitle')}</h1>
          <p className={styles.pageSubtitle}>{t('leaveManagement.subtitle')}</p>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        {stats.map(stat => (
          <div key={stat.key} className={styles.kpiCard}>
            <div className={styles.kpiContent}>
              <p className={styles.kpiLabel}>{stat.label}</p>
              <p className={styles.kpiValue} style={{ color: stat.color }}>{stat.value}</p>
            </div>
            <div className={styles.kpiIcon} style={{ color: stat.color }}>
              {stat.icon === 'clock' && <Clock className="w-6 h-6" />}
              {stat.icon === 'check-circle' && <CheckCircle className="w-6 h-6" />}
              {stat.icon === 'x-circle' && <XCircle className="w-6 h-6" />}
              {stat.icon === 'alert-circle' && <AlertCircle className="w-6 h-6" />}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.nmCard} style={{ padding: '24px' }}>
        <div className={styles.nmTabs}>
          {['open', 'approved', 'rejected', 'cancelled', 'all'].map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={activeTab === tab ? styles.active : ''}>
              {getTabLabel(tab)} <span className={styles.tabCount}>{getTabCount(tab)}</span>
            </button>
          ))}
        </div>

        <div className={styles.searchWrapper} style={{ marginBottom: '16px' }}>
          <Search className="h-4 w-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAdminOrManager ? t('leaveManagement.searchAdminPlaceholder') : t('leaveManagement.searchEmpPlaceholder')}
            className={styles.nmInput}
          />
        </div>

        <div className={styles.nmTableWrapper} style={{ marginTop: 0, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
          <table className={styles.nmTable}>
            <thead>
              <tr>
                <th>{t('leaveManagement.colRequestId')}</th>
                {isAdminOrManager && <th>{t('leaveManagement.colEmployee')}</th>}
                <th>{t('leaveManagement.colTitle')}</th>
                <th>{t('leaveManagement.colDates')}</th>
                <th>{t('leaveManagement.colDays')}</th>
                <th>{t('leaveManagement.colSubmittedAt')}</th>
                <th>{t('leaveManagement.colStatus')}</th>
                <th>{t('leaveManagement.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></span>
                      <span style={{ fontWeight: 'bold' }}>{t('leaveManagement.loading')}</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && (error || filteredRequests.length === 0) && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <TriangleAlert className="mb-3 h-10 w-10 text-gray-400" />
                      <p style={{ fontWeight: 'bold' }}>
                        {t('leaveManagement.empty')}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filteredRequests.map(request => {
                const Icon = getStatusIcon(request.status);
                return (
                  <tr key={request.requestId}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>#{request.requestId}</td>
                    {isAdminOrManager && (
                      <td>
                        <div>
                          <p style={{ fontWeight: 'bold' }}>{request.employeeName || 'Employee #' + request.employeeId}</p>
                          <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>ID: {request.employeeId}</p>
                        </div>
                      </td>
                    )}
                    <td>
                      <span className={styles.nmBadge} style={{ background: 'var(--nm-surface)', color: 'var(--nm-primary)', boxShadow: 'var(--nm-shadow-out)' }}>{request.title}</span>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 'bold' }}>{formatDate(request.startDatetime)}</p>
                        <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>{t('leaveManagement.to')} {formatDate(request.endDatetime)}</p>
                      </div>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      {request.days} {t('leaveManagement.colDays').toLowerCase()}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--nm-text-muted)' }}>
                      {formatDateTime(request.submittedAt)}
                    </td>
                    <td>
                      <span className={cn(styles.nmBadge, getStatusColor(request.status))}>
                        <Icon className="w-3 h-3" />
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td>
                      <button type="button" onClick={() => { setSelectedRequest(request); setShowReviewModal(true); }} className={styles.nmBtnIcon} title="Details">
                        <Eye className="w-4 h-4 text-blue-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showReviewModal && selectedRequest && (
        <ModalPortal onBackdropClick={() => setShowReviewModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Leave Request Details</h2>
                <p style={{ fontSize: '14px', color: 'var(--nm-text-secondary)', marginTop: '4px' }}>Request ID: #{selectedRequest.requestId}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={cn(styles.nmBadge, getStatusColor(selectedRequest.status))}>
                   {(() => {
                     const ModalIcon = getStatusIcon(selectedRequest.status);
                     return <ModalIcon className="w-3 h-3" />;
                   })()}
                   {getStatusLabel(selectedRequest.status)}
                </span>
                <button onClick={() => setShowReviewModal(false)} className={styles.nmBtnIcon}><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--nm-text)' }}>Employee Information</h3>
                <div className={styles.nmCardInset}>
                  <div className={styles.detailsGrid} style={{ marginTop: 0 }}>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0 }}>
                      <p className={styles.detailsLabel}>Name</p>
                      <p className={styles.detailsValue}>{selectedRequest.employeeName || 'Employee #' + selectedRequest.employeeId}</p>
                    </div>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0 }}>
                      <p className={styles.detailsLabel}>Employee ID</p>
                      <p className={styles.detailsValue}>{selectedRequest.employeeId}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--nm-text)' }}>Leave Details</h3>
                <div className={styles.nmCardInset} style={{ background: 'rgba(0, 102, 102, 0.03)' }}>
                  <div className={styles.detailsGrid} style={{ marginTop: 0 }}>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0, background: 'transparent' }}>
                      <p className={styles.detailsLabel}>Title</p>
                      <p className={styles.detailsValue}>{selectedRequest.title}</p>
                    </div>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0, background: 'transparent' }}>
                      <p className={styles.detailsLabel}>Duration</p>
                      <p className={styles.detailsValue}>{selectedRequest.days} days</p>
                    </div>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0, background: 'transparent' }}>
                      <p className={styles.detailsLabel}>Start Date</p>
                      <p className={styles.detailsValue}>{formatDate(selectedRequest.startDatetime)}</p>
                    </div>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0, background: 'transparent' }}>
                      <p className={styles.detailsLabel}>End Date</p>
                      <p className={styles.detailsValue}>{formatDate(selectedRequest.endDatetime)}</p>
                    </div>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0, background: 'transparent' }}>
                      <p className={styles.detailsLabel}>Submitted At</p>
                      <p className={styles.detailsValue}>{formatDateTime(selectedRequest.submittedAt)}</p>
                    </div>
                    {selectedRequest.approverName && (
                      <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0, background: 'transparent' }}>
                        <p className={styles.detailsLabel}>Approver</p>
                        <p className={styles.detailsValue}>{selectedRequest.approverName}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className={styles.nmCardInset}>
                  <p className={styles.detailsLabel} style={{ marginBottom: '4px' }}>Reason</p>
                  <p className={styles.detailsValue}>{selectedRequest.reason || 'No reason provided'}</p>
                </div>
              </div>

              {selectedRequest.decisionNote && (
                <div>
                  <div className={styles.nmCardInset} style={{ background: 'rgba(220, 53, 69, 0.05)', boxShadow: 'none' }}>
                    <p className={styles.detailsLabel} style={{ marginBottom: '4px', color: 'var(--nm-danger)' }}>Decision Note</p>
                    <p className={styles.detailsValue} style={{ color: 'var(--nm-danger)' }}>{selectedRequest.decisionNote}</p>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setShowReviewModal(false)} className={styles.nmBtnSecondary}>
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default LeaveManagementPage;
