import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Check, X, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { requestApi } from '../api/attendanceCore.api';
import styles from './OtRequestsPage.module.scss';
import { cn } from '../../../shared/utils/cn';

const getStatusBadgeClass = (status: string) => {
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
    case 'APPROVED': return Check;
    case 'REJECTED': return X;
    case 'SUBMITTED': return Clock;
    case 'CANCELLED': return X;
    default: return Clock;
  }
};

const getStatusLabel = (status: string) => {
  if (status === 'SUBMITTED') return 'Chờ duyệt';
  if (status === 'APPROVED') return 'Đã duyệt';
  if (status === 'REJECTED') return 'Từ chối';
  if (status === 'CANCELLED') return 'Đã hủy';
  return status;
};

const formatDateTime = (val?: string) => {
  if (!val) return '-';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleString('vi-VN');
};

const formatDate = (val?: string) => {
  if (!val) return '-';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('vi-VN');
};

const calculateHours = (start: string, end: string) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.round((diffTime / (1000 * 60 * 60)) * 10) / 10;
};

const OtRequestsPage: React.FC = () => {
  const { hasRole, hasAnyRole, getEmployeeId } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const isManager = hasRole('MANAGER');
  const canApproveRequests = hasAnyRole(['ADMIN', 'MANAGER']);
  const currentEmployeeId = getEmployeeId();
  const queryClient = useQueryClient();

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['requestsTable', isAdmin ? 'all' : `manager-${currentEmployeeId}`],
    queryFn: () => {
      if (isAdmin) {
        // ADMIN: xem tất cả OT toàn công ty
        return requestApi.getAllGlobal();
      } else if (isManager && currentEmployeeId) {
        // MANAGER: chỉ thấy queue của team mình — BE: /requests/manager-queue
        return requestApi.getManagerQueue(currentEmployeeId);
      }
      return [];
    },
    enabled: canApproveRequests,
  });

  const otRequests = useMemo(() => {
    return allRequests
      .filter(r => r.requestType === 'OVERTIME')
      .map(r => ({
        ...r,
        hours: calculateHours(r.startDatetime, r.endDatetime),
        formattedDate: formatDate(r.startDatetime),
        formattedSubmittedDate: formatDateTime(r.submittedAt)
      }));
  }, [allRequests]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const statuses = ['All', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'];

  const filteredRequests = useMemo(() => {
    let result = otRequests;
    if (statusFilter !== 'All') result = result.filter(r => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(r => 
        (r.employeeName || '').toLowerCase().includes(q) ||
        String(r.requestId).includes(q)
      );
    }
    return result;
  }, [otRequests, statusFilter, searchQuery]);

  const pendingCountValue = otRequests.filter(r => r.status === 'SUBMITTED').length;

  const statsArray = [
    { label: 'Tổng số đơn', value: otRequests.length, color: 'var(--nm-info)', icon: 'clock' },
    { label: 'Chờ duyệt', value: pendingCountValue, color: 'var(--nm-warning)', icon: 'alert-circle' },
    { label: 'Đã duyệt', value: otRequests.filter(r => r.status === 'APPROVED').length, color: 'var(--nm-success)', icon: 'check' },
    { label: 'Từ chối', value: otRequests.filter(r => r.status === 'REJECTED').length, color: 'var(--nm-danger)', icon: 'x' },
  ];

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: number, status: 'APPROVED' | 'REJECTED', note?: string }) => 
        // Pass the real approver's employeeId — not a hardcoded 1
        requestApi.approveOrReject(id, { approverId: currentEmployeeId!, status, decisionNote: note }),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['requestsTable'] });
       setShowReviewModal(false);
    },
    onError: () => setErrorMessage('Lỗi khi duyệt/từ chối đơn.')
  });

  const handleReview = () => {
    if (reviewAction === 'reject' && !reviewNotes.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    approveMutation.mutate({ 
      id: selectedRequest.requestId, 
      status: reviewAction === 'approve' ? 'APPROVED' : 'REJECTED', 
      note: reviewNotes.trim() 
    });
  };

  // Route is already protected by RoleRoute allowedRoles={['ADMIN','MANAGER']}
  // No need for inline access check

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={styles.pageTitle}>Quản lý Đơn Làm Thêm Giờ</h1>
          <p className={styles.pageSubtitle}>Theo dõi, xét duyệt và quản lý các yêu cầu OT của nhân viên trong đội ngũ.</p>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: '16px', background: 'var(--nm-surface)', borderRadius: 'var(--nm-radius-md)', boxShadow: 'inset 0 0 0 2px var(--nm-danger)', color: 'var(--nm-danger)', fontWeight: 'bold', marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}

      {otRequests.length > 0 && (
        <div className={styles.kpiGrid}>
          {statsArray.map((stat, idx) => (
            <div key={idx} className={styles.kpiCard}>
              <div className={styles.kpiContent}>
                <p className={styles.kpiLabel}>{stat.label}</p>
                <p className={styles.kpiValue} style={{ color: stat.color }}>{stat.value}</p>
              </div>
              <div className={styles.kpiIcon} style={{ color: stat.color }}>
                {stat.icon === 'clock' && <Clock className="w-6 h-6" />}
                {stat.icon === 'alert-circle' && <AlertCircle className="w-6 h-6" />}
                {stat.icon === 'check' && <Check className="w-6 h-6" />}
                {stat.icon === 'x' && <X className="w-6 h-6" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {otRequests.length > 0 && pendingCountValue > 0 && (
        <div className={styles.alertBox}>
          <AlertCircle className={cn(styles.alertIcon, "w-6 h-6")} />
          <div>
            <h3 className={styles.alertTitle}>Action Required</h3>
            <p className={styles.alertDesc}>
              You have <strong>{pendingCountValue} pending overtime request(s)</strong> awaiting review and approval.
            </p>
          </div>
        </div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search className="w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên hoặc mã đơn..."
            className={styles.nmInput}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={styles.nmInput}
          style={{ width: 'auto', minWidth: '200px' }}
        >
          {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'Tất cả trạng thái' : getStatusLabel(s)}</option>)}
        </select>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
          <p style={{ fontWeight: 'bold' }}>Đang tải danh sách...</p>
        </div>
      )}

      {!isLoading && filteredRequests.length > 0 && (
        <div className={styles.nmTableWrapper}>
          <table className={styles.nmTable}>
            <thead>
              <tr>
                <th>Tên nhân viên</th>
                <th>Ngày OT</th>
                <th>Số giờ</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const StatusIcon = getStatusIcon(request.status);
                return (
                  <tr key={request.requestId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.nmAvatar}>
                          {request.employeeName ? request.employeeName.charAt(0) : 'E'}
                        </div>
                        <div>
                          <p style={{ fontWeight: 'bold' }}>{request.employeeName || '-'}</p>
                          <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>ID: {request.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p style={{ fontWeight: 'bold' }}>{request.formattedDate}</p>
                      {request.submittedAt && <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>Nộp: {request.formattedSubmittedDate}</p>}
                    </td>
                    <td>
                      <span className={styles.nmBadge} style={{ background: 'var(--nm-surface)', color: 'var(--nm-primary)', boxShadow: 'var(--nm-shadow-out)' }}>
                        {request.hours} giờ
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <span style={{ fontSize: '14px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={request.reason}>
                        {request.reason || 'Không có lý do'}
                      </span>
                    </td>
                    <td>
                      <span className={cn(styles.nmBadge, getStatusBadgeClass(request.status))}>
                        <StatusIcon className="w-3 h-3" />
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setSelectedRequest(request); setShowDetailsModal(true); }}
                          className={styles.nmBtnIcon}
                          title="Chi tiết đơn"
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </button>
                        {request.status === 'SUBMITTED' && canApproveRequests && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setSelectedRequest(request); setReviewAction('approve'); setReviewNotes(''); setShowReviewModal(true); }}
                              className={styles.nmBtnIcon}
                              title="Duyệt đơn"
                            >
                              <Check className="w-4 h-4 text-green-500" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setSelectedRequest(request); setReviewAction('reject'); setReviewNotes(''); setShowReviewModal(true); }}
                              className={styles.nmBtnIcon}
                              title="Từ chối đơn"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filteredRequests.length === 0 && (
         <div className={styles.nmCardInset} style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
          <Clock className="w-12 h-12 mx-auto mb-4" />
          <p style={{ fontWeight: 'bold' }}>No OT requests found.</p>
        </div>
      )}

      {showReviewModal && selectedRequest && (
        <div className={styles.modalBackdrop} onClick={() => setShowReviewModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{reviewAction === 'approve' ? 'Approve' : 'Reject'} OT Request</h2>
                <p style={{ fontSize: '14px', color: 'var(--nm-text-secondary)', marginTop: '4px' }}>#{selectedRequest.requestId}</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className={styles.nmBtnIcon}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className={styles.nmCardInset}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div className={styles.nmAvatar}>
                    {selectedRequest.employeeName ? selectedRequest.employeeName.charAt(0) : 'E'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 'bold' }}>{selectedRequest.employeeName}</p>
                    <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>Employee ID {selectedRequest.employeeId}</p>
                  </div>
                </div>
                
                <div className={styles.detailsGrid}>
                  <div className={styles.detailsBlock}>
                    <p className={styles.detailsLabel}>OT Date</p>
                    <p className={styles.detailsValue}>{formatDate(selectedRequest.startDatetime)}</p>
                  </div>
                  <div className={styles.detailsBlock}>
                    <p className={styles.detailsLabel}>Hours</p>
                    <p className={styles.detailsValue}>{selectedRequest.hours}h</p>
                  </div>
                  <div className={styles.detailsBlock} style={{ gridColumn: '1 / -1' }}>
                    <p className={styles.detailsLabel}>Submitted</p>
                    <p className={styles.detailsValue}>{formatDateTime(selectedRequest.submittedAt)}</p>
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--nm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</p>
                  <p style={{ fontSize: '14px', marginTop: '4px' }}>{selectedRequest.reason}</p>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label>Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className={cn(styles.nmInput, styles.textarea)}
                  placeholder="Add notes about your decision..."
                ></textarea>
              </div>

              <div style={{ padding: '12px', borderRadius: 'var(--nm-radius-md)', background: reviewAction === 'approve' ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)', color: reviewAction === 'approve' ? 'var(--nm-success)' : 'var(--nm-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                {reviewAction === 'approve' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                {reviewAction === 'approve' ? 'This OT request will be approved' : 'This OT request will be rejected'}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button onClick={() => setShowReviewModal(false)} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button 
                onClick={handleReview}
                disabled={approveMutation.isPending}
                className={cn(styles.nmBtnPrimary, reviewAction === 'approve' ? styles.nmBtnSuccess : styles.nmBtnDanger)}
              >
                {approveMutation.isPending ? 'Saving...' : (reviewAction === 'approve' ? 'Approve Request' : 'Reject Request')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedRequest && (
        <div className={styles.modalBackdrop} onClick={() => setShowDetailsModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>OT Request Details</h2>
                <p style={{ fontSize: '14px', color: 'var(--nm-text-secondary)', marginTop: '4px' }}>#{selectedRequest.requestId}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={cn(styles.nmBadge, getStatusBadgeClass(selectedRequest.status))}>
                   {(() => {
                     const statusIconDetails = getStatusIcon(selectedRequest.status);
                     return statusIconDetails ? React.createElement(statusIconDetails, { className: "w-3 h-3" }) : null;
                   })()}
                   {getStatusLabel(selectedRequest.status)}
                </span>
                <button onClick={() => setShowDetailsModal(false)} className={styles.nmBtnIcon}>
                  <X className="w-5 h-5"/>
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--nm-text)' }}>Employee Information</h3>
                <div className={styles.nmCardInset} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className={styles.nmAvatar}>
                    {selectedRequest.employeeName ? selectedRequest.employeeName.charAt(0) : 'E'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 'bold' }}>{selectedRequest.employeeName}</p>
                    <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>Employee ID {selectedRequest.employeeId}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--nm-text)' }}>Request Information</h3>
                <div className={styles.nmCardInset}>
                  <div className={styles.detailsGrid} style={{ marginTop: 0 }}>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0 }}>
                      <p className={styles.detailsLabel}>OT Date</p>
                      <p className={styles.detailsValue}>{formatDate(selectedRequest.startDatetime)}</p>
                    </div>
                    <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0 }}>
                      <p className={styles.detailsLabel}>Hours Requested</p>
                      <p className={styles.detailsValue}>{selectedRequest.hours}h</p>
                    </div>
                    <div className={styles.detailsBlock} style={{ gridColumn: '1 / -1', boxShadow: 'none', padding: 0, marginTop: '12px' }}>
                      <p className={styles.detailsLabel}>Submitted Date</p>
                      <p className={styles.detailsValue}>{formatDateTime(selectedRequest.submittedAt)}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--nm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</p>
                    <p style={{ fontSize: '14px', marginTop: '4px' }}>{selectedRequest.reason}</p>
                  </div>
                </div>
              </div>

              {selectedRequest.status !== 'SUBMITTED' && selectedRequest.status !== 'DRAFT' && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--nm-text)' }}>Review Information</h3>
                  <div className={styles.nmCardInset} style={{ background: selectedRequest.status === 'APPROVED' ? 'rgba(40, 167, 69, 0.05)' : 'rgba(220, 53, 69, 0.05)' }}>
                    <div className={styles.detailsGrid} style={{ marginTop: 0 }}>
                      <div className={styles.detailsBlock} style={{ boxShadow: 'none', padding: 0, background: 'transparent' }}>
                        <p className={styles.detailsLabel}>Reviewed By</p>
                        <p className={styles.detailsValue}>{selectedRequest.approverName || 'Not available'}</p>
                      </div>
                    </div>
                    {selectedRequest.decisionNote && (
                      <div style={{ marginTop: '16px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--nm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Review Notes</p>
                        <p style={{ fontSize: '14px', marginTop: '4px' }}>{selectedRequest.decisionNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className={styles.nmBtnSecondary}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OtRequestsPage;
