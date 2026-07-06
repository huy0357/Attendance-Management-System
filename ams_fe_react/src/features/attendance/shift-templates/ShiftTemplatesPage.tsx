import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { shiftApi, ShiftTemplateResponse, ShiftTemplateUpsertPayload } from '../api/attendanceCore.api';
import styles from './ShiftTemplatesPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

const ShiftTemplatesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const queryClient = useQueryClient();

  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // UI state
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ShiftTemplateResponse | null>(null);

  const defaultForm: ShiftTemplateUpsertPayload = {
    shiftCode: '',
    shiftName: '',
    startTime: '',
    endTime: '',
    breakMinutes: 0,
    graceInMinutes: 0,
    graceOutMinutes: 0,
    isNightShift: false,
    minWorkMinutes: 1,
    isActive: true,
  };
  const [formData, setFormData] = useState<ShiftTemplateUpsertPayload>(defaultForm);
  const [formTouched, setFormTouched] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query
  const activeParam = activeFilter === '' ? undefined : activeFilter === 'true';
  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ['shiftTemplates', debouncedSearch, activeParam],
    queryFn: () => shiftApi.getShiftTemplates(activeParam, debouncedSearch || undefined),
    refetchOnWindowFocus: false,
  });

  // Derived stats
  const totalTemplates = templates.length;
  const activeCount = templates.filter(t => t.isActive).length;
  const inactiveCount = totalTemplates - activeCount;

  // Modals handle
  const openCreate = () => {
    setMode('create');
    setSelectedId(null);
    setFormData(defaultForm);
    setFormTouched(false);
    setFormErrors([]);
    setShowForm(true);
  };

  const openEdit = async (id: number) => {
    try {
      const data = await shiftApi.getShiftTemplateById(id);
      setFormData({
        shiftCode: data.shiftCode,
        shiftName: data.shiftName,
        startTime: data.startTime.substring(0, 5),
        endTime: data.endTime.substring(0, 5),
        breakMinutes: data.breakMinutes,
        graceInMinutes: data.graceInMinutes,
        graceOutMinutes: data.graceOutMinutes,
        isNightShift: data.isNightShift,
        minWorkMinutes: data.minWorkMinutes,
        isActive: data.isActive,
      });
      setMode('edit');
      setSelectedId(id);
      setFormTouched(false);
      setFormErrors([]);
      setShowForm(true);
    } catch {
      alert('Unable to load shift template.');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ShiftTemplateUpsertPayload) => shiftApi.createShiftTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] });
      setShowForm(false);
    },
    onError: () => alert('Unable to create shift template.')
  });

  const updateMutation = useMutation({
    mutationFn: (data: ShiftTemplateUpsertPayload) => shiftApi.updateShiftTemplate(selectedId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] });
      setShowForm(false);
    },
    onError: () => alert('Unable to update shift template.')
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: number, active: boolean }) => shiftApi.setShiftTemplateActive(id, active),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ['shiftTemplates'] });
      const prevData = queryClient.getQueryData(['shiftTemplates', debouncedSearch, activeParam]);
      
      if (prevData) {
        queryClient.setQueryData(['shiftTemplates', debouncedSearch, activeParam], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((t: any) => t.shiftId === id ? { ...t, isActive: active } : t);
        });
      }
      return { prevData };
    },
    onError: (err, variables, context: any) => {
      if (context?.prevData) {
        queryClient.setQueryData(['shiftTemplates', debouncedSearch, activeParam], context.prevData);
      }
      alert('Unable to update active status.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shiftApi.deleteShiftTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] });
      setShowDeleteModal(false);
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 400 || status === 409 || status === 500) {
        alert('Không thể xóa Ca làm việc đang được gán lịch cho nhân viên. Vui lòng gỡ lịch trước khi xóa!');
      } else {
        alert('Unable to delete shift template. It might be linked to existing schedules.');
      }
    }
  });

  // Validation
  const toMinutes = (time: string) => {
    const parts = time.split(':');
    if (parts.length < 2) return null;
    return Number(parts[0]) * 60 + Number(parts[1]);
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.shiftCode.trim()) errors.push('Code is required.');
    if (!formData.shiftName.trim()) errors.push('Name is required.');
    if (!formData.startTime) errors.push('Start time is required.');
    if (!formData.endTime) errors.push('End time is required.');
    
    if (formData.startTime && formData.endTime) {
      const start = toMinutes(formData.startTime);
      const end = toMinutes(formData.endTime);
      
      if (start !== null && end !== null) {
        let duration = 0;
        if (!formData.isNightShift) {
           if (end <= start) errors.push('End time must be after start time when this is not a night shift.');
           else duration = end - start;
        } else {
           if (end > start) duration = end - start;
           else duration = (24 * 60 - start) + end;
        }
        
        if (duration > 0) {
          if (formData.breakMinutes > duration) errors.push('Break minutes cannot exceed the total shift duration.');
          if (formData.minWorkMinutes > duration - formData.breakMinutes) errors.push('Min work minutes cannot exceed the shift duration after subtracting break minutes.');
        }
      }
    }
    setFormErrors(errors);
    return errors.length === 0;
  };

  const submitForm = () => {
    setFormTouched(true);
    if (!validateForm()) return;
    
    const payload = {
      ...formData,
      startTime: formData.startTime && formData.startTime.length === 5 ? `${formData.startTime}:00` : formData.startTime,
      endTime: formData.endTime && formData.endTime.length === 5 ? `${formData.endTime}:00` : formData.endTime
    };
    
    if (mode === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  // Helper formatting
  const formatDateTime = (val?: string) => {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleString();
  };

  if (!isAdmin) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--nm-danger)', fontWeight: 'bold' }}>Access Denied. You do not have permission to view Shift Templates.</div>;
  }

  return (
    <div className="space-y-6 pb-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className={styles.pageTitle}>Shift Templates</h1>
          <p className={styles.pageSubtitle}>Manage shift template definitions from the backend shift template API.</p>
        </div>
        <button onClick={openCreate} className={styles.nmBtnPrimary}>
          <Plus className="h-4 w-4" /> Add Template
        </button>
      </div>

      {isError && (
        <div style={{ background: 'var(--nm-surface)', padding: '16px', borderRadius: 'var(--nm-radius-md)', color: 'var(--nm-warning)', fontWeight: 'bold', boxShadow: 'inset 0 0 0 2px var(--nm-warning)' }}>
          Unable to load shift templates.
        </div>
      )}

      {/* STATS */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Total Templates</p>
          <p className={styles.kpiValue}>{totalTemplates}</p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Active</p>
          <p className={cn(styles.kpiValue, styles.active)}>{activeCount}</p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Inactive</p>
          <p className={cn(styles.kpiValue, styles.inactive)}>{inactiveCount}</p>
        </div>
      </div>

      {/* FILTER */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Search by shift code or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.nmInput}
          />
        </div>
        <select
          value={activeFilter}
          onChange={e => setActiveFilter(e.target.value)}
          className={styles.nmInput}
          style={{ width: '200px' }}
        >
          <option value="">All statuses</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {/* TABLE */}
      <div className={styles.nmTableWrapper}>
        <table className={styles.nmTable}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Time</th>
              <th>Break</th>
              <th>Grace In/Out</th>
              <th>Min Work</th>
              <th>Night Shift</th>
              <th>Status</th>
              <th>Updated At</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>Loading shift templates...</td>
              </tr>
            )}
            {!isLoading && templates.map(t => (
              <tr key={t.shiftId}>
                <td style={{ fontWeight: 'bold' }}>{t.shiftCode}</td>
                <td>{t.shiftName}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{t.startTime?.substring(0,5)} - {t.endTime?.substring(0,5)}</td>
                <td>{t.breakMinutes}m</td>
                <td>{t.graceInMinutes} / {t.graceOutMinutes}m</td>
                <td>{t.minWorkMinutes}m</td>
                <td>{t.isNightShift ? 'Yes' : 'No'}</td>
                <td>
                  <span className={cn(styles.nmBadge, t.isActive ? styles.active : styles.inactive)}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ fontSize: '10px', color: 'var(--nm-text-muted)' }}>{formatDateTime(t.updatedAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', items: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => openEdit(t.shiftId)} className={styles.nmBtnText} title="Edit">
                      Edit
                    </button>
                    <button onClick={() => activeMutation.mutate({ id: t.shiftId, active: !t.isActive })} className={cn(styles.nmBtnText, styles.primary)}>
                      {t.isActive ? 'Set inactive' : 'Set active'}
                    </button>
                    {t.isActive && (
                      <button onClick={() => { setTemplateToDelete(t); setShowDeleteModal(true); }} className={cn(styles.nmBtnText, styles.danger)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && templates.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px', opacity: 0.6, fontWeight: 'bold' }}>No shift templates found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <ModalPortal onBackdropClick={cancelForm}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
             <div className={styles.modalHeader}>
              <div>
                <h2>{mode === 'create' ? 'Add Shift Template' : 'Edit Shift Template'}</h2>
                <p>Define working hours and rules for this shift.</p>
              </div>
              <button onClick={cancelForm} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={styles.formGrid}>
               {formTouched && formErrors.length > 0 && (
                 <div className={cn(styles.fieldGroup, styles.fullWidth)}>
                   {formErrors.map((err, i) => <div key={i} className={styles.errorMessage}>{err}</div>)}
                 </div>
               )}
               
               <div className={styles.fieldGroup}>
                 <label>Code</label>
                 <input type="text" value={formData.shiftCode} onChange={e => { setFormData({...formData, shiftCode: e.target.value}); setFormTouched(false); }} className={styles.nmInput} />
               </div>
               <div className={styles.fieldGroup}>
                 <label>Name</label>
                 <input type="text" value={formData.shiftName} onChange={e => { setFormData({...formData, shiftName: e.target.value}); setFormTouched(false); }} className={styles.nmInput} />
               </div>
               
               <div className={styles.fieldGroup}>
                 <label>Start Time</label>
                 <input type="time" value={formData.startTime} onChange={e => { setFormData({...formData, startTime: e.target.value}); setFormTouched(false); }} className={styles.nmInput} />
               </div>
               <div className={styles.fieldGroup}>
                 <label>End Time</label>
                 <input type="time" value={formData.endTime} onChange={e => { setFormData({...formData, endTime: e.target.value}); setFormTouched(false); }} className={styles.nmInput} />
               </div>
               
               <div className={styles.fieldGroup}>
                 <label>Break Minutes</label>
                 <input type="number" value={formData.breakMinutes} onChange={e => { setFormData({...formData, breakMinutes: Number(e.target.value)}); setFormTouched(false); }} className={styles.nmInput} />
               </div>
               <div className={styles.fieldGroup}>
                 <label>Grace In (Min)</label>
                 <input type="number" value={formData.graceInMinutes} onChange={e => { setFormData({...formData, graceInMinutes: Number(e.target.value)}); setFormTouched(false); }} className={styles.nmInput} />
               </div>
               
               <div className={styles.fieldGroup}>
                 <label>Grace Out (Min)</label>
                 <input type="number" value={formData.graceOutMinutes} onChange={e => { setFormData({...formData, graceOutMinutes: Number(e.target.value)}); setFormTouched(false); }} className={styles.nmInput} />
               </div>
               <div className={styles.fieldGroup}>
                 <label>Min Work (Min)</label>
                 <input type="number" value={formData.minWorkMinutes} onChange={e => { setFormData({...formData, minWorkMinutes: Number(e.target.value)}); setFormTouched(false); }} className={styles.nmInput} />
               </div>
               
               <div className={styles.fullWidth} style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={formData.isNightShift} onChange={e => { setFormData({...formData, isNightShift: e.target.checked}); setFormTouched(false); }} />
                    Night Shift
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={formData.isActive} onChange={e => { setFormData({...formData, isActive: e.target.checked}); setFormTouched(false); }} />
                    Active
                  </label>
               </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={cancelForm} className={styles.nmBtnSecondary}>Cancel</button>
              <button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending} className={styles.nmBtnPrimary}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {mode === 'create' ? 'Add Template' : 'Save Changes'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && templateToDelete && (
        <ModalPortal onBackdropClick={() => setShowDeleteModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className={styles.modalHeader}>
              <h2>Delete Template</h2>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--nm-text)', margin: '16px 0' }}>
              Are you sure you want to delete this shift template? This action will deactivate the template and it will no longer be available for scheduling.
            </p>
            <div className={styles.modalFooter}>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleteMutation.isPending} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(templateToDelete.shiftId)} disabled={deleteMutation.isPending} className={styles.nmBtnPrimary} style={{ background: 'var(--nm-danger)' }}>
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ShiftTemplatesPage;
