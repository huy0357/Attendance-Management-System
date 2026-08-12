import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, Shield, Search, Eye, Plus, Edit2, Trash2, LogIn, LogOut, Check, X, Lock, Unlock, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../../../core/toast/ToastContext';
import { adminApi, AuditLog, AuditLogAction } from '../api/admin.api';
import styles from './AuditLogPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

const getActionBadgeClasses = (action: AuditLogAction) => {
  switch (action) {
    case 'create':
    case 'approve':
      return { background: 'var(--nm-surface)', color: 'var(--nm-success)' };
    case 'update':
    case 'login':
    case 'logout':
      return { background: 'var(--nm-surface)', color: 'var(--nm-info)' };
    case 'delete':
    case 'reject':
      return { background: 'var(--nm-surface)', color: 'var(--nm-danger)' };
    case 'lock':
    case 'unlock':
    default:
      return { background: 'var(--nm-surface)', color: 'var(--nm-text-muted)' };
  }
};

const getActionIcon = (action: AuditLogAction) => {
  switch (action) {
    case 'create': return Plus;
    case 'update': return Edit2;
    case 'delete': return Trash2;
    case 'login': return LogIn;
    case 'logout': return LogOut;
    case 'approve': return Check;
    case 'reject': return X;
    case 'lock': return Lock;
    case 'unlock': return Unlock;
    default: return AlertCircle;
  }
};

const getActionLabel = (action: AuditLogAction) => {
  const lbl = String(action);
  return lbl.charAt(0).toUpperCase() + lbl.slice(1).toLowerCase();
};

const formatJsonDisplay = (val: unknown) => {
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  }
  return JSON.stringify(val, null, 2);
};

const AuditLogPage: React.FC = () => {
  const toast = useToast();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('All Modules');
  const [filterAction, setFilterAction] = useState('All Actions');
  const [filterUser, setFilterUser] = useState('All Users');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['auditLogs', page, filterModule, filterAction],
    queryFn: () => adminApi.getAuditLogs(page, 10, filterModule, filterAction)
  });

  const logs = pageData?.items || [];
  const totalPages = pageData?.totalPages || 1;

  const modules = ['All Modules', 'Employee', 'Department', 'Contract', 'Leave', 'OT']; 
  const actions = ['All Actions', 'create', 'update', 'delete', 'login', 'logout', 'approve', 'reject'];
  const users = ['All Users']; 

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: logDetails, isFetching: isFetchingDetails } = useQuery({
    queryKey: ['auditLogDetails', selectedLogId],
    queryFn: () => adminApi.getAuditLogById(selectedLogId!),
    enabled: !!selectedLogId,
    retry: false
  });

  const displayLog = logDetails || selectedLog;

  const filteredLogs = useMemo(() => {
    let res = logs;
    if (filterUser !== 'All Users') res = res.filter(r => r.userName === filterUser);
    
    if (startDate) res = res.filter(r => r.timestamp >= startDate);
    if (endDate) res = res.filter(r => r.timestamp.slice(0, 10) <= endDate);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      res = res.filter(r => 
        r.userName.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q) ||
        r.recordId.toLowerCase().includes(q)
      );
    }
    return res;
  }, [logs, filterUser, startDate, endDate, searchQuery]);

  const stats = [
    { label: t('auditLogs.totalLogs'), value: logs.length, color: 'var(--nm-info)', icon: 'shield' },
    { label: t('auditLogs.criticalEvents'), value: logs.filter(l => l.action === 'delete' || l.action === 'reject').length, color: 'var(--nm-danger)', icon: 'alert-circle' },
    { label: t('auditLogs.loginEvents'), value: logs.filter(l => l.action === 'login' || l.action === 'logout').length, color: 'var(--nm-primary)', icon: 'log-in' },
    { label: t('auditLogs.modifications'), value: logs.filter(l => l.action === 'create' || l.action === 'update').length, color: 'var(--nm-success)', icon: 'edit-2' }
  ];

  const exportLogs = () => {
    if (!logs.length) {
      toast.info('Không có dữ liệu nhật ký hệ thống để xuất.');
      return;
    }
    const headers = "ID,Timestamp,User,Action,Module,Record ID,IP Address\n";
    const csvRows = logs.map(l => 
      `"${l.id}","${l.timestamp}","${l.userName}","${l.action}","${l.module}","${l.recordId}","${l.ipAddress || ''}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + headers + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Xuất dữ liệu nhật ký hệ thống (CSV) thành công!');
  };

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className={styles.pageTitle}>{t('auditLogs.title')}</h1>
          <p className={styles.pageSubtitle}>{t('auditLogs.subtitle')}</p>
        </div>
        <button className={styles.nmBtnPrimary} onClick={exportLogs}>
          <Download className="w-5 h-5 shrink-0" /> {t('auditLogs.exportBtn')}
        </button>
      </div>

      {/* STATS */}
      <div className={styles.kpiGrid}>
        {stats.map((stat, idx) => (
          <div key={idx} className={styles.kpiCard}>
             <div className={styles.kpiHeader}>
                <p className={styles.kpiLabel}>{stat.label}</p>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--nm-surface-deep)', boxShadow: 'var(--nm-shadow-in)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                  {stat.icon === 'shield' && <Shield className="w-4 h-4" />}
                  {stat.icon === 'alert-circle' && <AlertCircle className="w-4 h-4" />}
                  {stat.icon === 'log-in' && <LogIn className="w-4 h-4" />}
                  {stat.icon === 'edit-2' && <Edit2 className="w-4 h-4" />}
                </div>
             </div>
             <p className={styles.kpiValue} style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className={styles.infoBar}>
        <div style={{ padding: '8px', background: 'var(--nm-surface)', borderRadius: '50%', boxShadow: 'var(--nm-shadow-out)', color: 'var(--nm-info)' }}>
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h3>{t('auditLogs.complianceTitle')}</h3>
          <p>
            {t('auditLogs.complianceDesc')}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className={styles.filterBar}>
        <div className={styles.filterRow}>
          <div className={styles.searchWrapper}>
            <Search className="h-4 w-4" />
            <input type="text" placeholder={t('auditLogs.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={styles.nmInput} />
          </div>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className={styles.nmInput} style={{ width: '160px' }}>
            {modules.map(m => <option key={m} value={m}>{m === 'All Modules' ? t('auditLogs.allModules') : m}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className={styles.nmInput} style={{ width: '160px' }}>
            {actions.map(a => <option key={a} value={a}>{a === 'All Actions' ? t('auditLogs.allActions') : a}</option>)}
          </select>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className={styles.nmInput} style={{ width: '160px' }}>
            {users.map(u => <option key={u} value={u}>{u === 'All Users' ? t('auditLogs.allUsers') : u}</option>)}
          </select>
        </div>
        <div className={styles.filterRow}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--nm-text-muted)' }}>{t('auditLogs.startDate')}</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.nmInput} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--nm-text-muted)' }}>{t('auditLogs.endDate')}</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.nmInput} />
          </div>
        </div>
      </div>

      {/* CONSOLE TABLE (Deep Inset) */}
      <div className={styles.auditConsole}>
        <div className={styles.nmTableWrapper}>
          <table className={styles.nmTable}>
            <thead>
              <tr>
                <th>{t('auditLogs.colTimestamp')}</th>
                <th>{t('auditLogs.colUser')}</th>
                <th>{t('auditLogs.colAction')}</th>
                <th>{t('auditLogs.colModule')}</th>
                <th>{t('auditLogs.colRecordId')}</th>
                <th>{t('auditLogs.colIp')}</th>
                <th>{t('auditLogs.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const Icon = getActionIcon(log.action);
                const badgeStyle = getActionBadgeClasses(log.action);
                
                return (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{log.timestamp}</td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 'bold' }}>{log.userName}</p>
                        <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>{log.userRole}</p>
                      </div>
                    </td>
                    <td>
                      <span className={styles.nmBadge} style={badgeStyle}>
                        <Icon />
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td>{log.module}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{log.recordId}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{log.ipAddress}</td>
                    <td>
                      <button onClick={() => { setSelectedLog(log); setSelectedLogId(log.rawId); setShowDetailsModal(true); }} className={styles.nmBtnIcon} title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLogs.length === 0 && !isLoading && (
            <div style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
              <Shield className="w-12 h-12 mx-auto mb-4" />
              <p style={{ fontWeight: 'bold' }}>No audit logs found</p>
              <p style={{ fontSize: '12px' }}>Try adjusting your filters or search query</p>
            </div>
          )}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
              <p style={{ fontWeight: 'bold', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>Loading logs...</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
           <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
             <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--nm-text-muted)' }}>
               Page {page} of {totalPages}
             </span>
             <button 
               className={styles.nmBtnPrimary} 
               disabled={page === 1} 
               onClick={() => setPage(p => Math.max(1, p - 1))}
               style={{ padding: '6px 12px', fontSize: '14px' }}
             >
               Prev
             </button>
             <button 
               className={styles.nmBtnPrimary} 
               disabled={page >= totalPages} 
               onClick={() => setPage(p => Math.min(totalPages, p + 1))}
               style={{ padding: '6px 12px', fontSize: '14px' }}
             >
               Next
             </button>
           </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      {showDetailsModal && displayLog && (
        <ModalPortal onBackdropClick={() => { setShowDetailsModal(false); setSelectedLogId(null); setSelectedLog(null); }}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Audit Log Details</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <p>{displayLog.id}</p>
                  {isFetchingDetails && <span title="Fetching latest details..."><Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--nm-text-muted)' }} /></span>}
                </div>
              </div>
              <button onClick={() => { setShowDetailsModal(false); setSelectedLogId(null); setSelectedLog(null); }} className={styles.nmBtnIcon}>
                 <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className={styles.detailsGrid}>
              <div className={cn(styles.detailsBlock, styles.col2)}>
                <h3 className={styles.detailsLabel} style={{ marginBottom: '12px' }}>Event Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <p className={styles.detailsLabel}>Timestamp</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '14px' }}>{displayLog.timestamp}</p>
                  </div>
                  <div>
                    <p className={styles.detailsLabel}>Action</p>
                    <div style={{ marginTop: '2px' }}>
                      <span className={styles.nmBadge} style={getActionBadgeClasses(displayLog.action)}>
                         {(() => {
                           const Icon = getActionIcon(displayLog.action);
                           return <Icon />;
                         })()}
                         {getActionLabel(displayLog.action)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className={styles.detailsLabel}>Module</p>
                    <p style={{ fontWeight: 'bold' }}>{displayLog.module}</p>
                  </div>
                  <div>
                    <p className={styles.detailsLabel}>Record ID</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '14px' }}>{displayLog.recordId}</p>
                  </div>
                </div>
              </div>

              <div className={cn(styles.detailsBlock, styles.col2)}>
                <h3 className={styles.detailsLabel} style={{ marginBottom: '12px' }}>User Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <p className={styles.detailsLabel}>User ID</p>
                    <p style={{ fontWeight: 'bold' }}>{displayLog.userId}</p>
                  </div>
                  <div>
                    <p className={styles.detailsLabel}>User Name</p>
                    <p style={{ fontWeight: 'bold' }}>{displayLog.userName}</p>
                  </div>
                  <div>
                    <p className={styles.detailsLabel}>Role</p>
                    <p style={{ fontWeight: 'bold' }}>{displayLog.userRole}</p>
                  </div>
                  <div>
                    <p className={styles.detailsLabel}>IP Address</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '14px' }}>{displayLog.ipAddress}</p>
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <p className={styles.detailsLabel}>User Agent</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{displayLog.userAgent}</p>
                </div>
              </div>

              {displayLog.beforeValue != null && (
                <div className={styles.detailsBlock}>
                   <h3 className={styles.detailsLabel}>Before Value</h3>
                   <div className={styles.preBlock}>
                      <pre><code>{formatJsonDisplay(displayLog.beforeValue)}</code></pre>
                   </div>
                </div>
              )}
              {displayLog.afterValue != null && (
                <div className={styles.detailsBlock}>
                   <h3 className={styles.detailsLabel}>After Value</h3>
                   <div className={styles.preBlock}>
                      <pre><code>{formatJsonDisplay(displayLog.afterValue)}</code></pre>
                   </div>
                </div>
              )}

              {displayLog.notes && (
                <div className={cn(styles.detailsBlock, styles.col2)}>
                  <h3 className={styles.detailsLabel}>Notes</h3>
                  <p>{displayLog.notes}</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => { setShowDetailsModal(false); setSelectedLogId(null); setSelectedLog(null); }}
                className={styles.nmBtnPrimary}
              >
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default AuditLogPage;
