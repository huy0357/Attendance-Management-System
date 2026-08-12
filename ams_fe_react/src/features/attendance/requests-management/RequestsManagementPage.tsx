import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, Eye, Pencil, Trash2, CheckCircle, XCircle, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../core/toast/ToastContext';
import { requestApi, RequestsResponse, RequestsUpsertRequest } from '../api/attendanceCore.api';
import styles from './RequestsManagementPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

const RequestsManagementPage: React.FC = () => {
  const { hasRole, getEmployeeId } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const isAdmin = hasRole('ADMIN');
  const isManager = hasRole('MANAGER');
  // ADMIN and MANAGER can both approve/reject — matches BE @PreAuthorize("hasRole('MANAGER')")
  const canApproveRequests = isAdmin || isManager;
  // EVERYONE can create a request
  const canCreateRequest = true;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRequest, setViewRequest] = useState<RequestsResponse | null>(null);
  const [viewRequestId, setViewRequestId] = useState<number | null>(null);

  const { data: requestDetails, isFetching: isFetchingDetails } = useQuery({
    queryKey: ['requestDetails', viewRequestId],
    queryFn: () => requestApi.getRequestById(viewRequestId!),
    enabled: !!viewRequestId,
    retry: false
  });

  const displayRequest = requestDetails || viewRequest;

  const [editRequestId, setEditRequestId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    requestType: 'LEAVE',
    title: '',
    reason: '',
    startDatetime: '',
    endDatetime: ''
  });

  const [formTouched, setFormTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const currentEmployeeId = getEmployeeId() ?? null;

  // Requests Data Query
  // ADMIN sees all via /requests/all
  // MANAGER sees team queue via /requests/manager-queue
  // EMPLOYEE sees only their own via /requests?employeeId=
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requestsTable', isAdmin ? 'all' : isManager ? `manager-${currentEmployeeId}` : currentEmployeeId],
    queryFn: () => {
      if (isAdmin) {
        return requestApi.getAllGlobal();
      } else if (isManager && currentEmployeeId) {
        return requestApi.getManagerQueue(currentEmployeeId);
      } else {
        return requestApi.getMyRequests(currentEmployeeId!);
      }
    },
    enabled: !!currentEmployeeId || isAdmin,
  });

  // Filtered requests
  const filteredRequests = useMemo(() => {
    let result = requests;
    if (requestTypeFilter) result = result.filter(r => r.requestType === requestTypeFilter);
    if (statusFilter) result = result.filter(r => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(r => 
        (r.title || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        String(r.requestId).includes(q) ||
        (canApproveRequests && (r.employeeName || '').toLowerCase().includes(q))
      );
    }
    return result;
  }, [requests, searchQuery, requestTypeFilter, statusFilter]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: RequestsUpsertRequest) => requestApi.createRequest(data),
    onSuccess: (savedReq) => {
       queryClient.invalidateQueries({ queryKey: ['requestsTable'] });
       setSuccessMessage(`Request ${savedReq.requestId} created successfully.`);
       setShowCreateForm(false);
    },
    onError: () => setErrorMessage('Unable to create request.')
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => requestApi.submitRequestByEmployee(id, currentEmployeeId!),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['requestsTable'] });
       setSuccessMessage('Request submitted successfully.');
       setShowCreateForm(false);
    },
    onError: () => setErrorMessage('Unable to submit request.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: RequestsUpsertRequest }) => requestApi.updateRequest(id, data),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['requestsTable'] });
       setSuccessMessage(`Request updated successfully.`);
       setShowEditForm(false);
    },
    onError: () => setErrorMessage('Unable to update request.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => requestApi.deleteRequest(id, currentEmployeeId!),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['requestsTable'] });
       setSuccessMessage(`Request deleted successfully.`);
    },
    onError: () => setErrorMessage('Unable to delete request.')
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: number, status: 'APPROVED' | 'REJECTED', note?: string }) => 
        requestApi.approveOrReject(id, { approverId: currentEmployeeId!, status, decisionNote: note }),
    onMutate: async ({ id, status, note }) => {
      const queryKeyContext = isAdmin ? 'all' : isManager ? `manager-${currentEmployeeId}` : currentEmployeeId;
      const exactQueryKey = ['requestsTable', queryKeyContext];
      
      await queryClient.cancelQueries({ queryKey: exactQueryKey });
      const prevData = queryClient.getQueryData(exactQueryKey);
      
      if (prevData) {
        queryClient.setQueryData(exactQueryKey, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((r: any) => r.requestId === id ? { 
            ...r, 
            status: status, 
            approverName: isManager ? 'Manager' : 'Admin', 
            decisionNote: note 
          } : r);
        });
      }
      return { prevData, exactQueryKey };
    },
    onError: (_err, _val, context: any) => {
      if (context?.prevData) {
         queryClient.setQueryData(context.exactQueryKey, context.prevData);
      }
      setErrorMessage('Unable to perform approval action.');
    },
    onSettled: (data, error, _variables, context: any) => {
       queryClient.invalidateQueries({ queryKey: context?.exactQueryKey || ['requestsTable'] });
       if (!error && data) {
         setSuccessMessage(`Request ${data.requestId} ${data.status.toLowerCase()} successfully.`);
       }
    }
  });

  // Actions
  const clearFilters = () => {
    setSearchQuery('');
    setRequestTypeFilter('');
    setStatusFilter('');
  };

  const openCreate = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormData({ requestType: 'LEAVE', title: '', reason: '', startDatetime: '', endDatetime: '' });
    setFormTouched(false);
    setFormError(null);
    setShowCreateForm(true);
  };

  const openEdit = (req: RequestsResponse) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditRequestId(req.requestId);
    setFormData({
      requestType: req.requestType || 'LEAVE',
      title: req.title || '',
      reason: req.reason || '',
      startDatetime: req.startDatetime ? req.startDatetime.replace('Z', '').substring(0, 16) : '',
      endDatetime: req.endDatetime ? req.endDatetime.replace('Z', '').substring(0, 16) : ''
    });
    setFormTouched(false);
    setFormError(null);
    setShowEditForm(true);
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required.';
    if (!formData.startDatetime) return 'Start time is required.';
    if (!formData.endDatetime) return 'End time is required.';
    const start = new Date(formData.startDatetime).getTime();
    const end = new Date(formData.endDatetime).getTime();
    if (start > end) return 'End must be on or after start.';
    return null;
  };



  const handleCreate = (submitAndCreate: boolean) => {
    setFormTouched(true);
    const err = validateForm();
    if (err) { setFormError(err); return; }

    const payload: RequestsUpsertRequest = {
      employeeId: currentEmployeeId!,
      requestType: formData.requestType,
      title: formData.title,
      reason: formData.reason,
      startDatetime: formData.startDatetime.length === 16 ? `${formData.startDatetime}:00` : formData.startDatetime,
      endDatetime: formData.endDatetime.length === 16 ? `${formData.endDatetime}:00` : formData.endDatetime,
    };

    if (submitAndCreate) {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          submitMutation.mutate(created.requestId);
        }
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = () => {
    setFormTouched(true);
    const err = validateForm();
    if (err) { setFormError(err); return; }

    const payload: RequestsUpsertRequest = {
      employeeId: currentEmployeeId!,
      requestType: formData.requestType,
      title: formData.title,
      reason: formData.reason,
      startDatetime: formData.startDatetime.length === 16 ? `${formData.startDatetime}:00` : formData.startDatetime,
      endDatetime: formData.endDatetime.length === 16 ? `${formData.endDatetime}:00` : formData.endDatetime,
    };

    updateMutation.mutate({ id: editRequestId!, data: payload });
  };

  const handleApproveAction = (req: RequestsResponse, status: 'APPROVED' | 'REJECTED') => {
    const note = window.prompt(status === 'APPROVED' ? 'Enter approval note (optional):' : 'Enter rejection note (required):');
    if (note === null) return;
    if (status === 'REJECTED' && !note.trim()) {
      toast.warning('Bắt buộc phải nhập lý do khi từ chối yêu cầu.');
      return;
    }
    approveMutation.mutate({ id: req.requestId, status, note });
  };

  const handleDelete = (req: RequestsResponse) => {
    if (window.confirm(`Delete request ${req.requestId}?`)) {
       deleteMutation.mutate(req.requestId);
    }
  };

  const handleDirectSubmit = (req: RequestsResponse) => {
    submitMutation.mutate(req.requestId);
  };

  const formatDateTime = (val?: string) => {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleString();
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className={styles.pageTitle}>{t('requestsManagement.title')}</h1>
          <p className={styles.pageSubtitle}>
            {isAdmin
              ? t('requestsManagement.adminSubtitle')
              : isManager
              ? t('requestsManagement.managerSubtitle')
              : t('requestsManagement.employeeSubtitle')}
          </p>
        </div>
        {canCreateRequest && (
          <button onClick={openCreate} className={styles.nmBtnPrimary}>
            <Plus className="h-4 w-4 shrink-0" /> {t('requestsManagement.createBtn')}
          </button>
        )}
      </div>

      {successMessage && (
        <div className={cn(styles.alertBox, styles.success)}>
          <div className={styles.alertInner}>
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className={styles.nmBtnIcon}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className={cn(styles.alertBox, styles.error)}>
          <div className={styles.alertInner}>
            <XCircle className="h-5 w-5" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className={styles.nmBtnIcon}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.filterGrid}>
          <div className={styles.fieldGroup}>
            <label>{t('header.search')}</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('requestsManagement.searchPlaceholder')}
              className={styles.nmInput}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label>{t('requestsManagement.filterType')}</label>
            <select value={requestTypeFilter} onChange={e => setRequestTypeFilter(e.target.value)} className={styles.nmInput}>
              <option value="">{t('requestsManagement.filterAll')}</option>
              <option value="LEAVE">LEAVE</option>
              <option value="REMOTE">REMOTE</option>
              <option value="OVERTIME">OVERTIME</option>
              <option value="LATE_EARLY">LATE_EARLY</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label>{t('requestsManagement.filterStatus')}</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={styles.nmInput}>
              <option value="">{t('requestsManagement.filterAll')}</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button onClick={clearFilters} className={styles.nmBtnText}>
            <Filter className="h-4 w-4 shrink-0" /> {t('shiftTemplates.cancel')}
          </button>
        </div>
      </div>

      <div className={styles.nmTableWrapper}>
        <table className={styles.nmTable}>
          <thead>
            <tr>
              <th>{t('requestsManagement.colRequestId')}</th>
              {canApproveRequests && <th>{t('requestsManagement.colEmployee')}</th>}
              <th>{t('requestsManagement.colType')}</th>
              <th>{t('requestsManagement.colTitle')}</th>
              <th>{t('monthlySummary.emailAllTooltip').slice(0, 0)}Reason</th>
              <th>Start</th>
              <th>End</th>
              <th>{t('requestsManagement.colSubmittedAt')}</th>
              <th>{t('requestsManagement.colStatus')}</th>
              <th style={{ textAlign: 'right' }}>{t('requestsManagement.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>{t('requestsManagement.loading')}</td></tr>
            )}
            {!isLoading && filteredRequests.map(r => (
              <tr key={r.requestId}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{r.requestId}</td>
                {canApproveRequests && <td style={{ fontWeight: 'bold' }}>{r.employeeName || `ID: ${r.employeeId}`}</td>}
                <td>{r.requestType}</td>
                <td style={{ fontWeight: 'bold' }}>{r.title}</td>
                <td style={{ maxWidth: '200px' }}>
                  <span style={{ fontSize: '14px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason || ''}>
                    {r.reason || '-'}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatDateTime(r.startDatetime)}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatDateTime(r.endDatetime)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--nm-text-muted)' }}>{formatDateTime(r.submittedAt || '')}</td>
                <td>
                  <span className={cn(
                    styles.nmBadge,
                    r.status === 'APPROVED' ? styles.nmBadgeSuccess : 
                    r.status === 'REJECTED' ? styles.nmBadgeDanger : 
                    r.status === 'SUBMITTED' ? styles.nmBadgeInfo : 
                    styles.nmBadgeNeutral
                  )}>
                    {r.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => { setViewRequest(r); setViewRequestId(r.requestId); setShowViewModal(true); }} className={styles.nmBtnIcon} title="View details">
                        <Eye className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                      </button>
                      
                      {/* Owner Actions */}
                      {r.status === 'DRAFT' && r.employeeId === currentEmployeeId && (
                        <>
                          <button onClick={() => openEdit(r)} className={styles.nmBtnIcon} title="Edit">
                            <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                          </button>
                          <button onClick={() => handleDelete(r)} className={styles.nmBtnIcon} title="Delete">
                             <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                          </button>
                          <button onClick={() => handleDirectSubmit(r)} className={styles.nmBtnSecondary} style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}>
                             Submit
                          </button>
                        </>
                      )}
                      
                      {/* Cancel Action (Only for DRAFT or PENDING/SUBMITTED) */}
                      {(r.status === 'DRAFT' || r.status === 'SUBMITTED' || r.status === 'PENDING') && r.employeeId === currentEmployeeId && r.status !== 'DRAFT' && (
                        <button onClick={() => handleDelete(r)} className={styles.nmBtnIcon} title="Cancel Request">
                           <XCircle className="h-4 w-4 text-orange-500 hover:text-orange-700" />
                        </button>
                      )}
                      
                      {/* ADMIN & MANAGER APPROVAL — matches BE @PreAuthorize("hasRole('MANAGER')") */}
                      {canApproveRequests && r.status === 'SUBMITTED' && (
                         <>
                            <button onClick={() => handleApproveAction(r, 'APPROVED')} disabled={approveMutation.isPending} className={styles.nmBtnIcon} title="Approve">
                              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-green-500" /> : <CheckCircle className="h-4 w-4 text-green-500 hover:text-green-700" />}
                            </button>
                            <button onClick={() => handleApproveAction(r, 'REJECTED')} disabled={approveMutation.isPending} className={styles.nmBtnIcon} title="Reject">
                              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <XCircle className="h-4 w-4 text-red-500 hover:text-red-700" />}
                            </button>
                         </>
                      )}
                   </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredRequests.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '48px', opacity: 0.6, fontWeight: 'bold' }}>No requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateForm && (
        <ModalPortal onBackdropClick={() => setShowCreateForm(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Create New Request</h2>
              <button onClick={() => setShowCreateForm(false)} className={styles.nmBtnIcon}><X className="h-5 w-5" /></button>
            </div>
            
            <div className={styles.formGrid}>
               {formTouched && formError && <div className={cn(styles.fieldGroup, styles['full-width'])} style={{ color: 'var(--nm-danger)', fontWeight: 'bold' }}>{formError}</div>}
               <div className={styles.fieldGroup}>
                  <label>Type</label>
                  <select value={formData.requestType} onChange={e => setFormData({...formData, requestType: e.target.value})} className={styles.nmInput}>
                    <option value="LEAVE">LEAVE</option>
                    <option value="OVERTIME">OVERTIME</option>
                    <option value="REMOTE">REMOTE</option>
                    <option value="LATE_EARLY">LATE_EARLY</option>
                  </select>
               </div>
               <div className={styles.fieldGroup}>
                 <label>Title</label>
                 <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={styles.nmInput} />
               </div>
               <div className={styles.fieldGroup}>
                 <label>Start Time</label>
                 <input type="datetime-local" value={formData.startDatetime} onChange={e => setFormData({...formData, startDatetime: e.target.value})} className={styles.nmInput} />
               </div>
               <div className={styles.fieldGroup}>
                 <label>End Time</label>
                 <input type="datetime-local" value={formData.endDatetime} onChange={e => setFormData({...formData, endDatetime: e.target.value})} className={styles.nmInput} />
               </div>
               <div className={cn(styles.fieldGroup, styles['full-width'])}>
                 <label>Reason</label>
                 <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} rows={3} className={cn(styles.nmInput, styles.textarea)}></textarea>
               </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button onClick={() => setShowCreateForm(false)} className={styles.nmBtnSecondary}>Cancel</button>
              <button onClick={() => handleCreate(false)} disabled={createMutation.isPending || submitMutation.isPending} className={styles.nmBtnSecondary} style={{ background: 'var(--nm-dark)', color: 'white' }}>
                 {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Draft
              </button>
              <button onClick={() => handleCreate(true)} disabled={createMutation.isPending || submitMutation.isPending} className={styles.nmBtnPrimary}>
                 {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {showEditForm && (
        <ModalPortal onBackdropClick={() => setShowEditForm(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Request</h2>
              <button onClick={() => setShowEditForm(false)} className={styles.nmBtnIcon}><X className="h-5 w-5" /></button>
            </div>
            
            <div className={styles.formGrid}>
               {formTouched && formError && <div className={cn(styles.fieldGroup, styles['full-width'])} style={{ color: 'var(--nm-danger)', fontWeight: 'bold' }}>{formError}</div>}
               <div className={styles.fieldGroup}>
                  <label>Type</label>
                  <select value={formData.requestType} onChange={e => setFormData({...formData, requestType: e.target.value})} className={styles.nmInput}>
                    <option value="LEAVE">LEAVE</option>
                    <option value="OVERTIME">OVERTIME</option>
                    <option value="REMOTE">REMOTE</option>
                    <option value="LATE_EARLY">LATE_EARLY</option>
                  </select>
               </div>
               <div className={styles.fieldGroup}>
                 <label>Title</label>
                 <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={styles.nmInput} />
               </div>
               <div className={styles.fieldGroup}>
                 <label>Start Time</label>
                 <input type="datetime-local" value={formData.startDatetime} onChange={e => setFormData({...formData, startDatetime: e.target.value})} className={styles.nmInput} />
               </div>
               <div className={styles.fieldGroup}>
                 <label>End Time</label>
                 <input type="datetime-local" value={formData.endDatetime} onChange={e => setFormData({...formData, endDatetime: e.target.value})} className={styles.nmInput} />
               </div>
               <div className={cn(styles.fieldGroup, styles['full-width'])}>
                 <label>Reason</label>
                 <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} rows={3} className={cn(styles.nmInput, styles.textarea)}></textarea>
               </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button onClick={() => setShowEditForm(false)} className={styles.nmBtnSecondary}>Cancel</button>
              <button onClick={handleEdit} disabled={updateMutation.isPending} className={styles.nmBtnPrimary}>
                 {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ──────────────────────────────── VIEW MODAL ──────────────────────────────── */}
      {showViewModal && displayRequest && (
        <ModalPortal onBackdropClick={() => { setShowViewModal(false); setViewRequestId(null); setViewRequest(null); }}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2>Request Details</h2>
                {isFetchingDetails && <span title="Fetching latest details..."><Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--nm-text-muted)' }} /></span>}
              </div>
              <button onClick={() => { setShowViewModal(false); setViewRequestId(null); setViewRequest(null); }} className={styles.nmBtnIcon}><X className="h-5 w-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div className={styles.detailsGrid}>
                <div className={styles.detailsBlock}><p className={styles.detailsLabel}>Request ID</p><p className={styles.detailsValue}>#{displayRequest.requestId}</p></div>
                <div className={styles.detailsBlock}><p className={styles.detailsLabel}>Employee</p><p className={styles.detailsValue}>{displayRequest.employeeName || '-'}</p></div>
                <div className={styles.detailsBlock}><p className={styles.detailsLabel}>Type</p><p className={styles.detailsValue}>{displayRequest.requestType}</p></div>
                <div className={styles.detailsBlock}><p className={styles.detailsLabel}>Status</p><p className={styles.detailsValue}>
                  <span className={cn(styles.nmBadge, displayRequest.status === 'APPROVED' ? styles.nmBadgeSuccess : displayRequest.status === 'REJECTED' ? styles.nmBadgeDanger : displayRequest.status === 'SUBMITTED' ? styles.nmBadgeInfo : styles.nmBadgeNeutral)}>
                     {displayRequest.status}
                  </span>
                </p></div>
                {(displayRequest.status === 'APPROVED' || displayRequest.status === 'REJECTED') && (
                  <div className={styles.detailsBlock}>
                    <p className={styles.detailsLabel}>Action By</p>
                    <p className={styles.detailsValue}>{displayRequest.approverName ? `Approved by: ${displayRequest.approverName}` : (displayRequest as any).approverId ? `Approved by ID: ${(displayRequest as any).approverId}` : 'Manager / Admin'}</p>
                  </div>
                )}
                <div className={cn(styles.detailsBlock, styles['full-width'])}><p className={styles.detailsLabel}>Title</p><p className={styles.detailsValue}>{displayRequest.title}</p></div>
              </div>
              
              <div className={styles.detailsGrid}>
                <div className={styles.detailsBlock}><p className={styles.detailsLabel}>Start</p><p className={styles.detailsValue}>{formatDateTime(displayRequest.startDatetime)}</p></div>
                <div className={styles.detailsBlock}><p className={styles.detailsLabel}>End</p><p className={styles.detailsValue}>{formatDateTime(displayRequest.endDatetime)}</p></div>
              </div>
              
              <div className={styles.nmCardInset} style={{ marginTop: '16px' }}>
                <p className={styles.detailsLabel} style={{ marginBottom: '4px' }}>Reason</p>
                <p className={styles.detailsValue}>{displayRequest.reason || '-'}</p>
              </div>
              
              {displayRequest.decisionNote && (
                <div className={styles.nmCardInset} style={{ marginTop: '16px', background: 'rgba(220, 53, 69, 0.05)', boxShadow: 'none' }}>
                  <p className={styles.detailsLabel} style={{ marginBottom: '4px', color: 'var(--nm-danger)' }}>Decision Note</p>
                  <p className={styles.detailsValue} style={{ color: 'var(--nm-danger)' }}>{displayRequest.decisionNote}</p>
                </div>
              )}
            </div>
            
            <div className={styles.modalFooter}>
              <button onClick={() => { setShowViewModal(false); setViewRequestId(null); setViewRequest(null); }} className={styles.nmBtnSecondary}>Close</button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default RequestsManagementPage;
