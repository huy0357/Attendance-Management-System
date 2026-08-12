import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Loader2, Edit2, Power, Trash2 } from 'lucide-react';
import { useToast } from '../../../core/toast/ToastContext';
import { useTranslation } from 'react-i18next';
import { shiftApi, ShiftTemplateResponse, ShiftTemplateUpsertPayload } from '../api/attendanceCore.api';
import styles from './ShiftTemplatesPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

const ShiftTemplatesPage: React.FC = () => {
  const toast = useToast();
  const { t } = useTranslation();
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
      toast.error('Không thể tải thông tin Ca làm việc.');
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
      toast.success('Khởi tạo Ca làm việc thành công!');
    },
    onError: () => toast.error('Không thể tạo Ca làm việc. Vui lòng kiểm tra lại!')
  });

  const updateMutation = useMutation({
    mutationFn: (data: ShiftTemplateUpsertPayload) => shiftApi.updateShiftTemplate(selectedId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] });
      setShowForm(false);
      toast.success('Cập nhật Ca làm việc thành công!');
    },
    onError: () => toast.error('Cập nhật Ca làm việc thất bại!')
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
    onError: (_err, _variables, context: any) => {
      if (context?.prevData) {
        queryClient.setQueryData(['shiftTemplates', debouncedSearch, activeParam], context.prevData);
      }
      toast.error('Không thể cập nhật trạng thái hoạt động.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shiftApi.deleteShiftTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] });
      setShowDeleteModal(false);
      toast.success('Đã xóa Ca làm việc thành công!');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 400 || status === 409 || status === 500) {
        toast.warning('Không thể xóa Ca làm việc đang được gán lịch cho nhân viên. Vui lòng gỡ lịch trước khi xóa!');
      } else {
        toast.error('Xóa Ca làm việc thất bại.');
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



  return (
    <div className="space-y-6 pb-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className={styles.pageTitle}>{t('shiftTemplates.title')}</h1>
          <p className={styles.pageSubtitle}>{t('shiftTemplates.description')}</p>
        </div>
        <button onClick={openCreate} className={styles.nmBtnPrimary}>
          <Plus className="h-4 w-4" /> {t('shiftTemplates.newTemplate')}
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
          <p className={styles.kpiLabel}>{t('shiftTemplates.totalTemplates')}</p>
          <p className={styles.kpiValue}>{totalTemplates}</p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>{t('shiftTemplates.activeCount')}</p>
          <p className={cn(styles.kpiValue, styles.active)}>{activeCount}</p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>{t('shiftTemplates.inactiveCount')}</p>
          <p className={cn(styles.kpiValue, styles.inactive)}>{inactiveCount}</p>
        </div>
      </div>

      {/* FILTER */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder={t('shiftTemplates.search')}
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
          <option value="">{t('shiftTemplates.showInactive')}</option>
          <option value="true">{t('shiftTemplates.active')}</option>
          <option value="false">{t('shiftTemplates.inactive')}</option>
        </select>
      </div>

      {/* TABLE */}
      <div className={styles.nmTableWrapper}>
        <table className={styles.nmTable}>
          <thead>
            <tr>
              <th>{t('shiftTemplates.shiftCode')}</th>
              <th>{t('shiftTemplates.shiftName')}</th>
              <th>{t('shiftTemplates.time')}</th>
              <th>{t('shiftTemplates.break')}</th>
              <th>{t('shiftTemplates.grace')}</th>
              <th>{t('shiftTemplates.minWork')}</th>
              <th>{t('shiftTemplates.isNight')}</th>
              <th>{t('shiftTemplates.status')}</th>
              <th>{t('shiftTemplates.updatedAt')}</th>
              <th style={{ textAlign: 'right' }}>{t('shiftTemplates.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>Loading shift templates...</td>
              </tr>
            )}
            {!isLoading && templates.map(tItem => (
              <tr key={tItem.shiftId}>
                <td style={{ fontWeight: 'bold' }}>{tItem.shiftCode}</td>
                <td>{tItem.shiftName}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{tItem.startTime?.substring(0,5)} - {tItem.endTime?.substring(0,5)}</td>
                <td>{tItem.breakMinutes}m</td>
                <td>{tItem.graceInMinutes} / {tItem.graceOutMinutes}m</td>
                <td>{tItem.minWorkMinutes}m</td>
                <td>{tItem.isNightShift ? t('shiftTemplates.yes') : t('shiftTemplates.no')}</td>
                <td>
                  <span className={cn(styles.nmBadge, tItem.isActive ? styles.active : styles.inactive)}>
                    {tItem.isActive ? t('shiftTemplates.active') : t('shiftTemplates.inactive')}
                  </span>
                </td>
                <td style={{ fontSize: '10px', color: 'var(--nm-text-muted)' }}>{formatDateTime(tItem.updatedAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => openEdit(tItem.shiftId)} className={styles.nmBtnIcon} title={t('shiftTemplates.edit')}>
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => activeMutation.mutate({ id: tItem.shiftId, active: !tItem.isActive })} className={cn(styles.nmBtnIcon, 'warning')} title={tItem.isActive ? t('shiftTemplates.setInactive') : t('shiftTemplates.setActive')}>
                      <Power className="h-4 w-4" />
                    </button>
                    {tItem.isActive && (
                      <button onClick={() => { setTemplateToDelete(tItem); setShowDeleteModal(true); }} className={cn(styles.nmBtnIcon, 'danger')} title={t('shiftTemplates.delete')}>
                        <Trash2 className="h-4 w-4" />
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
              Are you sure you want to delete this shift template? This action will permanently delete the template from the database and cannot be undone.
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
