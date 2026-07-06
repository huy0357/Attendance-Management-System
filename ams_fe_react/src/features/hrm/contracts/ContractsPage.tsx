import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Eye, Edit2, Trash2, X, AlertTriangle, FileText, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { contractsApi, ContractRecord, ContractType, ContractStatus } from './contracts.api';
import styles from './ContractsPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

const CONTRACT_TYPES = ['All Types', 'Permanent', 'Contract', 'Probation', 'Intern', 'Part-time'];
const STATUSES = ['All Status', 'Active', 'Expired', 'Pending', 'Terminated'];

const ContractsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const queryClient = useQueryClient();

  // Selected State for Modals
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State
  const defaultForm = {
    employeeName: '',
    department: '',
    position: '',
    contractType: 'permanent' as ContractType,
    startDate: '',
    endDate: '',
    baseSalary: '',
    benefits: '',
    notes: '',
    status: 'active' as ContractStatus
  };
  const [formData, setFormData] = useState(defaultForm);

  // Data Fetching
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.getContracts(),
  });

  const createMutation = useMutation({
    mutationFn: contractsApi.createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      closeAddModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: contractsApi.updateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      closeEditModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: contractsApi.deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      closeDeleteModal();
    }
  });

  // Filtering Logic
  const filteredContracts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    const normType = filterType === 'All Types' ? null : filterType.toLowerCase();
    const normStatus = filterStatus === 'All Status' ? null : filterStatus.toLowerCase();

    return contracts.filter(contract => {
      const matchSearch = contract.employeeName.toLowerCase().includes(query) ||
                          contract.id.toLowerCase().includes(query) ||
                          contract.position.toLowerCase().includes(query);
      
      const matchType = !normType || contract.contractType === normType;
      const matchStatus = !normStatus || contract.status === normStatus;
      const matchStart = !startDate || new Date(contract.startDate) >= new Date(startDate);
      const matchEnd = !endDate || (contract.endDate && new Date(contract.endDate) <= new Date(endDate));

      return matchSearch && matchType && matchStatus && matchStart && matchEnd;
    });
  }, [contracts, searchQuery, filterType, filterStatus, startDate, endDate]);

  // Modals operations
  const openAddModal = () => { setFormData(defaultForm); setShowAddModal(true); };
  const closeAddModal = () => setShowAddModal(false);

  const openEditModal = (c: ContractRecord) => {
    setSelectedContract(c);
    setFormData({
      employeeName: c.employeeName,
      department: c.department,
      position: c.position,
      contractType: c.contractType,
      startDate: c.startDate,
      endDate: c.endDate || '',
      baseSalary: c.baseSalary.toString(),
      benefits: c.benefits.join(', '),
      notes: c.notes || '',
      status: c.status
    });
    setShowEditModal(true);
    setShowDetailsModal(false);
  };
  const closeEditModal = () => { setShowEditModal(false); setSelectedContract(null); };

  const openDetailsModal = (c: ContractRecord) => { setSelectedContract(c); setShowDetailsModal(true); };
  const closeDetailsModal = () => { setShowDetailsModal(false); setSelectedContract(null); };

  const openDeleteModal = (c: ContractRecord) => { setSelectedContract(c); setShowDeleteModal(true); setShowDetailsModal(false); };
  const closeDeleteModal = () => { setShowDeleteModal(false); setSelectedContract(null); };

  // Generate ID helper
  const getInitials = (name: string) => name.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
  
  const handleSaveAdd = () => {
    if (!formData.employeeName || !formData.department || !formData.position || !formData.startDate || !formData.baseSalary) return;
    const newId = `CT-${String(contracts.length + 1).padStart(3, '0')}`;
    const newEmpId = `EMP-${String(contracts.length + 1).padStart(3, '0')}`;
    createMutation.mutate({
      id: newId,
      employeeId: newEmpId,
      employeeName: formData.employeeName,
      employeeAvatar: getInitials(formData.employeeName),
      department: formData.department,
      position: formData.position,
      contractType: formData.contractType,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      baseSalary: Number(formData.baseSalary),
      currency: 'USD',
      benefits: formData.benefits.split(',').map(s => s.trim()).filter(Boolean),
      status: 'pending',
      notes: formData.notes,
      renewalHistory: []
    });
  };

  const handleSaveEdit = () => {
    if (!selectedContract) return;
    updateMutation.mutate({
      ...selectedContract,
      ...formData,
      baseSalary: Number(formData.baseSalary),
      benefits: formData.benefits.split(',').map(s => s.trim()).filter(Boolean),
      endDate: formData.endDate || undefined
    });
  };

  // UI Helpers
  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return null;
    const today = new Date();
    const expiry = new Date(endDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 90 ? diff : null;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return styles.nmBadgeActive;
      case 'expired': return styles.nmBadgeDanger;
      case 'pending': return styles.nmBadgeWarning;
      default: return styles.nmBadgeInactive;
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'permanent': return styles.nmBadgeActive;
      case 'contract': return styles.nmBadgeInfo;
      case 'probation': return styles.nmBadgeWarning;
      case 'intern': return styles.nmBadgeInactive;
      default: return styles.nmBadgeInactive;
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className={styles.pageTitle}>Contracts</h1>
          <p className={styles.pageSubtitle}>Manage employee contracts, renewals, and end-dates.</p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className={styles.nmBtnPrimary}>
            <Plus className="h-4 w-4" /> Add Contract
          </button>
        )}
      </div>

      {/* STATS */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ color: 'var(--nm-info)' }}><FileText className="h-6 w-6"/></div>
          <div><p className={styles.kpiLabel}>Total Contracts</p><h3 className={styles.kpiValue}>{contracts.length}</h3></div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ color: 'var(--nm-success)' }}><CheckCircle className="h-6 w-6"/></div>
          <div><p className={styles.kpiLabel}>Active Contracts</p><h3 className={styles.kpiValue}>{contracts.filter(c => c.status === 'active').length}</h3></div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ color: 'var(--nm-warning)' }}><Clock className="h-6 w-6"/></div>
          <div><p className={styles.kpiLabel}>Expiring Soon</p><h3 className={styles.kpiValue}>{contracts.filter(c => getDaysUntilExpiry(c.endDate) !== null).length}</h3></div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ color: 'var(--nm-danger)' }}><AlertTriangle className="h-6 w-6"/></div>
          <div><p className={styles.kpiLabel}>Expired</p><h3 className={styles.kpiValue}>{contracts.filter(c => c.status === 'expired').length}</h3></div>
        </div>
      </div>

      {/* FILTER */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search className="h-4 w-4" />
          <input type="text" placeholder="Search employee or position..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={styles.nmInput} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={styles.nmInput} style={{ width: 'auto', minWidth: '160px' }}>
          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={styles.nmInput} style={{ width: 'auto', minWidth: '160px' }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.nmInput} style={{ width: 'auto' }} />
        <span style={{ color: 'var(--nm-text-muted)' }}>-</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.nmInput} style={{ width: 'auto' }} />
      </div>

      {/* LISTING */}
      <div className={styles.nmTableWrapper}>
        <table className={styles.nmTable}>
          <thead>
            <tr>
              <th>Employee / ID</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Base Salary</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>Loading contracts...</td>
              </tr>
            )}
            {!isLoading && filteredContracts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px', opacity: 0.6, fontWeight: 'bold' }}>
                  No contracts match filters.
                </td>
              </tr>
            )}
            {!isLoading && filteredContracts.map(contract => (
              <tr key={contract.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--nm-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', boxShadow: 'var(--nm-shadow-out)' }}>
                      {contract.employeeAvatar}
                    </div>
                    <div>
                      <p style={{ fontWeight: 'bold' }}>{contract.employeeName}</p>
                      <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>{contract.id} • {contract.position}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={cn(styles.nmBadge, getTypeClass(contract.contractType))}>
                    {contract.contractType}
                  </span>
                </td>
                <td>
                  <div>
                    <p style={{ fontWeight: 'bold' }}>{new Date(contract.startDate).toLocaleDateString()}</p>
                    {contract.endDate ? (
                      <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>to {new Date(contract.endDate).toLocaleDateString()}</p>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>Indefinite</p>
                    )}
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  {contract.currency} {contract.baseSalary.toLocaleString()}
                </td>
                <td>
                  <span className={cn(styles.nmBadge, getStatusClass(contract.status))}>
                    {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                  </span>
                  {getDaysUntilExpiry(contract.endDate) !== null && contract.status === 'active' && (
                     <p style={{ fontSize: '10px', color: 'var(--nm-warning)', fontWeight: 'bold', marginTop: '4px' }}>
                       Expiring in {getDaysUntilExpiry(contract.endDate)} days
                     </p>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => openDetailsModal(contract)} className={styles.nmBtnIcon} title="View Details">
                      <Eye className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEditModal(contract)} className={styles.nmBtnIcon} title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => openDeleteModal(contract)} className={cn(styles.nmBtnIcon, 'danger')} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {(showAddModal || showEditModal) && (
        <ModalPortal onBackdropClick={showAddModal ? closeAddModal : closeEditModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{showAddModal ? 'New Contract' : 'Edit Contract'}</h2>
                <p>{showAddModal ? 'Add a new employee contract record' : 'Modify an existing contract'}</p>
              </div>
              <button onClick={showAddModal ? closeAddModal : closeEditModal} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label>Employee Name</label>
                <input type="text" value={formData.employeeName} onChange={e => setFormData({...formData, employeeName: e.target.value})} className={styles.nmInput} disabled={!showAddModal} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Department</label>
                <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Job Title/Position</label>
                <input type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Contract Type</label>
                <select value={formData.contractType} onChange={e => setFormData({...formData, contractType: e.target.value as ContractType})} className={styles.nmInput} >
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contractor</option>
                  <option value="probation">Probation</option>
                  <option value="intern">Internship</option>
                  <option value="part-time">Part-time</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>Start Date</label>
                <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>End Date (Optional)</label>
                <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Base Salary (USD)</label>
                <input type="number" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: e.target.value})} className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ContractStatus})} className={styles.nmInput} >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div className={cn(styles.fieldGroup, styles.fullWidth)}>
                <label>Benefits (comma separated)</label>
                <input type="text" value={formData.benefits} onChange={e => setFormData({...formData, benefits: e.target.value})} className={styles.nmInput} placeholder="e.g. Health Insurance, Dental, 20 PTO days" />
              </div>
              <div className={cn(styles.fieldGroup, styles.fullWidth)}>
                <label>Additional Notes</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className={styles.nmInput} style={{ resize: 'vertical' }}></textarea>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={showAddModal ? closeAddModal : closeEditModal} className={styles.nmBtnSecondary}>Cancel</button>
              <button onClick={showAddModal ? handleSaveAdd : handleSaveEdit} disabled={createMutation.isPending || updateMutation.isPending} className={styles.nmBtnPrimary}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Contract'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedContract && (
        <ModalPortal onBackdropClick={closeDetailsModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--nm-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', boxShadow: 'var(--nm-shadow-out)' }}>
                  {selectedContract.employeeAvatar}
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', margin: 0 }}>{selectedContract.employeeName}</h2>
                  <p style={{ margin: 0 }}>Contract: {selectedContract.id}</p>
                </div>
              </div>
              <button onClick={closeDetailsModal} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Status</p>
                <span className={cn(styles.nmBadge, getStatusClass(selectedContract.status))}>
                  {selectedContract.status.charAt(0).toUpperCase() + selectedContract.status.slice(1)}
                </span>
                {getDaysUntilExpiry(selectedContract.endDate) !== null && selectedContract.status === 'active' && (
                  <p style={{ fontSize: '12px', color: 'var(--nm-warning)', fontWeight: 'bold', marginTop: '8px' }}>
                    Warning: Expires in {getDaysUntilExpiry(selectedContract.endDate)} days
                  </p>
                )}
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Contract Type</p>
                <span className={cn(styles.nmBadge, getTypeClass(selectedContract.contractType))}>
                  {selectedContract.contractType}
                </span>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Position & Department</p>
                <p className={styles.detailsValue}>{selectedContract.position}</p>
                <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>{selectedContract.department}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Salary & Allowances</p>
                <p className={styles.detailsValue} style={{ fontFamily: 'var(--font-mono)' }}>{selectedContract.currency} {selectedContract.baseSalary.toLocaleString()}</p>
              </div>
              <div className={styles.detailsBlock} style={{ gridColumn: 'span 2' }}>
                <p className={styles.detailsLabel}>Contract Duration</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <div style={{ textAlign: 'center', flex: 1, padding: '8px', background: 'var(--nm-surface)', borderRadius: 'var(--nm-radius-md)', boxShadow: 'var(--nm-shadow-out)' }}>
                    <p style={{ fontSize: '10px', color: 'var(--nm-text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Start Date</p>
                    <p style={{ fontWeight: 'bold', color: 'var(--nm-text)' }}>{new Date(selectedContract.startDate).toLocaleDateString()}</p>
                  </div>
                  <div style={{ flex: 1, height: '2px', background: 'rgba(0,0,0,0.1)', margin: '0 16px' }}></div>
                  <div style={{ textAlign: 'center', flex: 1, padding: '8px', background: 'var(--nm-surface)', borderRadius: 'var(--nm-radius-md)', boxShadow: 'var(--nm-shadow-out)' }}>
                    <p style={{ fontSize: '10px', color: 'var(--nm-text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>End Date</p>
                    <p style={{ fontWeight: 'bold', color: 'var(--nm-text)' }}>{selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString() : 'Indefinite'}</p>
                  </div>
                </div>
              </div>
              <div className={styles.detailsBlock} style={{ gridColumn: 'span 2' }}>
                <p className={styles.detailsLabel}>Benefits Package</p>
                {selectedContract.benefits.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {selectedContract.benefits.map((b, i) => (
                      <span key={i} style={{ padding: '4px 8px', background: 'var(--nm-surface)', borderRadius: 'var(--nm-radius-md)', fontSize: '12px', fontWeight: 'bold', color: 'var(--nm-text)', boxShadow: 'var(--nm-shadow-out)' }}>
                        {b}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={styles.detailsValue}>None specified.</p>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              {isAdmin && (
                <button onClick={() => openEditModal(selectedContract)} className={styles.nmBtnPrimary}>
                  Edit Contract
                </button>
              )}
              <button onClick={closeDetailsModal} className={styles.nmBtnSecondary}>
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedContract && (
        <ModalPortal onBackdropClick={closeDeleteModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--nm-danger)' }}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h2>Delete Contract</h2>
              </div>
              <button onClick={closeDeleteModal} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p style={{ color: 'var(--nm-text)', fontSize: 'var(--fs-sm)', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete the contract for <strong>{selectedContract.employeeName}</strong>? All history associated with this contract will be lost.
            </p>

            <div className={styles.modalFooter} style={{ borderTop: 'none', paddingBottom: 0 }}>
              <button onClick={closeDeleteModal} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(selectedContract.id)} disabled={deleteMutation.isPending} className={styles.nmBtnPrimary} style={{ background: 'var(--nm-danger)' }}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Contract'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ContractsPage;
