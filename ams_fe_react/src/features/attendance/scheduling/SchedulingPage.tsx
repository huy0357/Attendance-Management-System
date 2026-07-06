import React, { useState, useMemo } from 'react';
import { Clock, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthContext';
import { scheduleApi, shiftApi, ShiftTemplateResponse, Shift } from '../api/attendanceCore.api';
import styles from './SchedulingPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

const DUMMY_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (d: Date, days: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

interface MappedTemplate extends ShiftTemplateResponse {
  id: string;
  name: string;
  time: string;
  type: 'morning' | 'afternoon' | 'night';
}

const deriveShiftType = (isNightShift: boolean, startTime?: string): 'morning' | 'afternoon' | 'night' => {
  if (isNightShift) return 'night';
  if (!startTime) return 'morning';
  const hour = Number(startTime.split(':')[0]);
  if (Number.isNaN(hour)) return 'morning';
  return hour < 12 ? 'morning' : 'afternoon';
};

const SchedulingPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(new Set());

  const [selectedStatsEmployee, setSelectedStatsEmployee] = useState<ScheduleEmployee | null>(null);

  const calculateEmployeeStats = (empId: string) => {
    const empShifts = shifts.filter(s => s.employeeId === empId);
    let totalHours = 0;
    empShifts.forEach(s => {
       if (s.startTime && s.endTime) {
         const [sh, sm] = s.startTime.split(':').map(Number);
         const [eh, em] = s.endTime.split(':').map(Number);
         let diff = (eh * 60 + em) - (sh * 60 + sm);
         if (diff < 0) diff += 24 * 60; // night shift crossover
         totalHours += diff / 60;
       }
    });
    return {
      totalShifts: empShifts.length,
      totalExpectedHours: Number(totalHours.toFixed(1))
    };
  };

  // Modal / Drag states
  const [showAssignRangeModal, setShowAssignRangeModal] = useState(false);
  const [assignRangeForm, setAssignRangeForm] = useState({
    employeeId: null as number | null,
    shiftId: null as number | null,
    startDate: formatDate(weekStart),
    endDate: formatDate(addDays(weekStart, 6)),
    scheduleSource: 'MANUAL',
    note: '',
    overwrite: true,
  });
  const [assignRangeEmployeeSearch, setAssignRangeEmployeeSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [draggedTemplate, setDraggedTemplate] = useState<MappedTemplate | null>(null);
  const [dragOver, setDragOver] = useState<{ day: number; employeeId: string } | null>(null);

  // Queries
  const { data: rawTemplates = [] } = useQuery({
    queryKey: ['shiftTemplates', 'active'],
    queryFn: () => shiftApi.getShiftTemplates(true),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['scheduleEmployees'],
    queryFn: () => scheduleApi.getScheduleEmployees(),
  });

  const employeeIds = useMemo(() => employees.map(e => Number(e.id)), [employees]);

  const { data: shifts = [], isLoading: isWeekLoading } = useQuery({
    queryKey: ['scheduleShifts', employeeIds, formatDate(weekStart)],
    queryFn: () => scheduleApi.getInitialShifts(employeeIds, weekStart),
    enabled: employeeIds.length > 0,
  });

  const assignRangeMutation = useMutation({
    mutationFn: (payload: any) => scheduleApi.assignShiftRange(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });
      setSuccessMessage(`Assigned shift ${data.shiftId} for employee ${data.employeeId} from ${data.startDate} to ${data.endDate}.`);
      setShowAssignRangeModal(false);
    },
    onError: () => setErrorMessage('Unable to assign shift range.')
  });

  const templates: MappedTemplate[] = useMemo(() => {
    return rawTemplates.map(t => ({
      ...t,
      id: t.shiftId.toString(),
      name: t.shiftName,
      time: `${t.startTime.substring(0, 5)} - ${t.endTime.substring(0, 5)}`,
      type: deriveShiftType(t.isNightShift, t.startTime),
    }));
  }, [rawTemplates]);

  const shiftByCell = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach(s => map.set(`${s.employeeId}|${s.day}`, s));
    return map;
  }, [shifts]);

  const toggleDeptCollapsed = (dept: string) => {
    const next = new Set(collapsedDepartments);
    if (next.has(dept)) next.delete(dept);
    else next.add(dept);
    setCollapsedDepartments(next);
  };

  const visibleGroups = useMemo(() => {
    const lowerQuery = searchTerm.trim().toLowerCase();
    
    let filteredEmployees = employees;
    if (lowerQuery) {
       filteredEmployees = filteredEmployees.filter(e => 
         e.name.toLowerCase().includes(lowerQuery) || 
         (e.employeeCode || '').toLowerCase().includes(lowerQuery)
       );
    }
    
    if (hideEmptyRows) {
       const hasShiftEmpIds = new Set(shifts.map(s => s.employeeId));
       filteredEmployees = filteredEmployees.filter(e => hasShiftEmpIds.has(e.id));
    }

    const grouped = new Map<string, typeof filteredEmployees>();
    filteredEmployees.forEach(e => {
       const dept = e.department || 'Unassigned';
       if (!grouped.has(dept)) grouped.set(dept, []);
       grouped.get(dept)!.push(e);
    });

    return Array.from(grouped.keys()).sort().map(dept => {
      const emps = grouped.get(dept)!;
       const shiftCount = shifts.filter(s => emps.some(e => e.id === s.employeeId)).length;
       return {
         departmentName: dept,
         employees: emps,
         shiftCount,
         collapsed: collapsedDepartments.has(dept)
       };
    });
  }, [employees, searchTerm, hideEmptyRows, shifts, collapsedDepartments]);

  const filteredAssignRangeEmployees = useMemo(() => {
    const query = assignRangeEmployeeSearch.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(e => 
       e.name.toLowerCase().includes(query) || 
       (e.employeeCode || '').toLowerCase().includes(query) || 
       (e.department || '').toLowerCase().includes(query) || 
       e.id.includes(query)
    );
  }, [employees, assignRangeEmployeeSearch]);

  const getShift = (empId: string, day: number) => shiftByCell.get(`${empId}|${day}`);
  const isDragOver = (empId: string, day: number) => dragOver?.employeeId === empId && dragOver?.day === day;

  const handleDrop = (empId: string, day: number) => {
    if (!draggedTemplate) return;
    const existing = getShift(empId, day);
    if (existing) {
       alert('Conflict detected! Employee already has a shift on this day.');
       return;
    }

    const workDate = formatDate(addDays(weekStart, day));
    assignRangeMutation.mutate({
      employeeId: Number(empId),
      shiftId: Number(draggedTemplate.id),
      startDate: workDate,
      endDate: workDate,
      scheduleSource: 'MANUAL',
      overwrite: true,
    });

    setDraggedTemplate(null);
    setDragOver(null);
  };

  const submitAssignRange = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const { employeeId, shiftId, startDate, endDate, scheduleSource, overwrite, note } = assignRangeForm;
    if (!employeeId || !shiftId) {
      setErrorMessage('Employee and shift template are required.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Start date and end date are required.');
      return;
    }
    if (endDate < startDate) {
      setErrorMessage('End date must be on or after start date.');
      return;
    }

    assignRangeMutation.mutate({
      employeeId,
      shiftId,
      startDate,
      endDate,
      scheduleSource,
      overwrite,
      note: note.trim() || undefined
    });
  };

  if (!isAdmin) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--nm-danger)', fontWeight: 'bold' }}>Access Denied. You do not have permission to view this page.</div>;
  }

  return (
    <div className={styles.schedulingPage}>
      <div className="space-y-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className={styles.pageTitle}>Work Schedule Assignment</h1>
            <p className={styles.pageSubtitle}>Assign active shift templates to employees by work date.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className={styles.nmBtnSecondary} style={{ padding: '8px 12px', fontSize: 'var(--fs-xs)' }}>Previous</button>
            <button onClick={() => setWeekStart(getStartOfWeek(new Date()))} className={styles.nmBtnSecondary} style={{ padding: '8px 12px', fontSize: 'var(--fs-xs)' }}>Today</button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className={styles.nmBtnSecondary} style={{ padding: '8px 12px', fontSize: 'var(--fs-xs)' }}>Next</button>
            <button onClick={() => setShowAssignRangeModal(true)} className={styles.nmBtnPrimary}>
              Assign Range
            </button>
          </div>
        </div>

        {isWeekLoading && <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--nm-info)', fontWeight: 'bold' }}>Loading schedules...</p>}
        {successMessage && <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--nm-success)', fontWeight: 'bold' }}>{successMessage}</p>}
        {errorMessage && <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--nm-danger)', fontWeight: 'bold' }}>{errorMessage}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search employee name or code"
            className={styles.nmInput}
            style={{ width: 'auto', minWidth: '300px' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--fs-sm)', color: 'var(--nm-text-muted)', fontWeight: 'bold', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hideEmptyRows}
              onChange={e => setHideEmptyRows(e.target.checked)}
            />
            Hide employees without shifts this week
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 3fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.nmCardInset}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--fs-sm)', fontWeight: 'bold', color: 'var(--nm-text)', marginBottom: '16px' }}>
              <Clock className="w-5 h-5" />
              Active Shift Templates
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templates.map(t => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDraggedTemplate(t)}
                  onDragEnd={() => setDraggedTemplate(null)}
                  className={cn(styles.shiftTag, styles.draggable, styles[t.type])}
                >
                  <p className={styles.shiftName}>{t.name}</p>
                  <p className={styles.shiftTime}>{t.time}</p>
                </div>
              ))}
            </div>
            {templates.length === 0 && <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--nm-text-muted)', marginTop: '16px' }}>No active shift templates available.</p>}
            {templates.length > 0 && <p style={{ fontSize: '10px', color: 'var(--nm-text-muted)', marginTop: '16px', fontStyle: 'italic', lineHeight: '1.4' }}>Drag a template into one day for quick assignment, or use Assign Range for multi-day scheduling.</p>}
          </div>

          <div className={styles.nmCardInset}>
            <h3 style={{ fontSize: 'var(--fs-sm)', fontWeight: 'bold', color: 'var(--nm-text)', marginBottom: '16px' }}>Coverage Stats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--nm-text-muted)' }}>Total Shifts</span>
                  <span style={{ fontWeight: 'bold' }}>{shifts.length}</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--fs-sm)' }}>
                  <span style={{ color: 'var(--nm-text-muted)' }}>Imported</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--nm-info)' }}>{shifts.filter(s => s.scheduleSource === 'IMPORT').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.nmCard} style={{ padding: '24px' }}>
          <div className={styles.schedulingGridScroll}>
            <table className={styles.nmTable}>
              <thead>
                <tr>
                  <th className={styles.stickyColumn} style={{ width: '180px', background: 'var(--nm-surface)' }}>
                    Employee
                  </th>
                  {DUMMY_DAYS.map((day, i) => (
                    <th key={i} style={{ textAlign: 'center', minWidth: '120px' }}>
                      {day} <br/><span style={{ fontSize: '10px', fontWeight: 'normal' }}>{formatDate(addDays(weekStart, i))}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map(group => (
                  <React.Fragment key={group.departmentName}>
                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <td className={styles.stickyColumn} style={{ background: 'rgba(0,0,0,0.02)', padding: '8px 12px' }}>
                        <button
                          type="button"
                          onClick={() => toggleDeptCollapsed(group.departmentName)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-sm)', fontWeight: 'bold', color: 'var(--nm-text)' }}
                        >
                          {group.collapsed ? '+' : '-'} {group.departmentName}
                        </button>
                      </td>
                      <td colSpan={DUMMY_DAYS.length} style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>
                        {group.employees.length} employees - {group.shiftCount} shifts this week
                      </td>
                    </tr>
                    {!group.collapsed && group.employees.map(employee => (
                      <tr key={employee.id}>
                        <td className={styles.stickyColumn} style={{ background: 'var(--nm-surface)', borderRight: '2px solid rgba(0,0,0,0.05)' }}>
                          <div>
                            <span 
                              style={{ fontWeight: 'bold', fontSize: 'var(--fs-sm)', cursor: 'pointer', transition: 'color 0.2s', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'transparent' }}
                              onClick={() => setSelectedStatsEmployee(employee)}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--nm-primary)'; e.currentTarget.style.textDecorationColor = 'var(--nm-primary)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.textDecorationColor = 'transparent'; }}
                            >
                              {employee.name}
                            </span>
                            <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>{employee.department}</p>
                          </div>
                        </td>
                        {DUMMY_DAYS.map((_, dayIndex) => {
                          const shift = getShift(employee.id, dayIndex);
                          const isHovered = isDragOver(employee.id, dayIndex);
                          
                          return (
                            <td
                              key={dayIndex}
                              onDragOver={e => { e.preventDefault(); setDragOver({ day: dayIndex, employeeId: employee.id }); }}
                              onDragLeave={() => setDragOver(null)}
                              onDrop={() => handleDrop(employee.id, dayIndex)}
                              style={{
                                textAlign: 'center',
                                padding: '8px',
                                background: isHovered && !shift ? 'rgba(40, 167, 69, 0.1)' :
                                            isHovered && shift ? 'rgba(220, 53, 69, 0.1)' : 'transparent',
                                transition: 'background 0.2s',
                              }}
                            >
                              {shift ? (
                                <div className={cn(styles.shiftTag, styles[deriveShiftType(shift.isNightShift, shift.startTime)])}>
                                  {shift.scheduleSource === 'IMPORT' && (
                                    <span style={{ position: 'absolute', top: '-6px', right: '-4px', background: 'var(--nm-dark)', color: 'white', fontSize: '8px', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                                      IMPORT
                                    </span>
                                  )}
                                  <p className={styles.shiftName}>{/* Map name from start/end or use backend logic */}{shift.startTime?.substring(0,5)} - {shift.endTime?.substring(0,5)}</p>
                                </div>
                              ) : (
                                <div className={styles.shiftCellEmpty}>
                                  {isHovered && !shift && <CheckCircle className="w-5 h-5 text-green-500" />}
                                  {isHovered && shift && <AlertTriangle className="w-5 h-5 text-red-500" />}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {visibleGroups.length === 0 && (
                  <tr>
                    <td className={styles.stickyColumn} style={{ padding: '32px 16px', fontSize: 'var(--fs-sm)', color: 'var(--nm-text-muted)' }}>No employees match current filters.</td>
                    <td colSpan={DUMMY_DAYS.length}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAssignRangeModal && (
        <ModalPortal onBackdropClick={() => setShowAssignRangeModal(false)}>
          <div className={styles.assignRangeModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Assign Shift Range</h2>
                <p style={{ fontSize: '14px', color: 'var(--nm-text-secondary)', marginTop: '4px' }}>Assign a specific shift template to an employee over a date range.</p>
              </div>
              <button type="button" onClick={() => setShowAssignRangeModal(false)} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label>Find Employee</label>
                <input
                  type="text"
                  value={assignRangeEmployeeSearch}
                  onChange={e => setAssignRangeEmployeeSearch(e.target.value)}
                  className={styles.nmInput}
                  placeholder="Search by name, code, etc"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Select Employee</label>
                <select 
                  value={assignRangeForm.employeeId || ''}
                  onChange={e => setAssignRangeForm({...assignRangeForm, employeeId: Number(e.target.value) || null})}
                  className={styles.nmInput}
                >
                  <option value="">Select employee</option>
                  {filteredAssignRangeEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} (ID {e.id})</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label>Start Date</label>
                <input type="date" value={assignRangeForm.startDate} onChange={e => setAssignRangeForm({...assignRangeForm, startDate: e.target.value})} className={styles.nmInput} />
              </div>

              <div className={styles.fieldGroup}>
                <label>End Date</label>
                <input type="date" value={assignRangeForm.endDate} onChange={e => setAssignRangeForm({...assignRangeForm, endDate: e.target.value})} className={styles.nmInput} />
              </div>

              <div className={styles.fieldGroup}>
                <label>Shift Template</label>
                <select 
                  value={assignRangeForm.shiftId || ''}
                  onChange={e => setAssignRangeForm({...assignRangeForm, shiftId: Number(e.target.value) || null})}
                  className={styles.nmInput}
                >
                  <option value="">Select shift template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} - {t.time}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label>Schedule Source</label>
                <select value={assignRangeForm.scheduleSource} onChange={e => setAssignRangeForm({...assignRangeForm, scheduleSource: e.target.value})} className={styles.nmInput}>
                  <option value="MANUAL">MANUAL</option>
                  <option value="IMPORT">IMPORT</option>
                </select>
              </div>

              <div className={cn(styles.fieldGroup, styles.fullWidth)}>
                <label>Note</label>
                <textarea value={assignRangeForm.note} onChange={e => setAssignRangeForm({...assignRangeForm, note: e.target.value})} className={cn(styles.nmInput)}></textarea>
              </div>

              <label className={cn(styles.checkboxLabel, styles.fullWidth)}>
                <input type="checkbox" checked={assignRangeForm.overwrite} onChange={e => setAssignRangeForm({...assignRangeForm, overwrite: e.target.checked})} />
                Overwrite existing schedule on the same work date
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" onClick={() => setShowAssignRangeModal(false)} className={styles.nmBtnSecondary}>Cancel</button>
              <button 
                type="button" 
                onClick={submitAssignRange} 
                disabled={assignRangeMutation.isPending}
                className={styles.nmBtnPrimary}
              >
                {assignRangeMutation.isPending ? 'Assigning...' : 'Assign Shift'}
              </button>
            </div>
          </div>
         </ModalPortal>
      )}

      {/* --- EMPLOYEE STATS MODAL --- */}
      {selectedStatsEmployee && (
        <ModalPortal onBackdropClick={() => setSelectedStatsEmployee(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className={styles.modalHeader}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'var(--nm-primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '18px', boxShadow: 'var(--nm-shadow-out)'
                  }}>
                    {selectedStatsEmployee.name.split(' ').map(p => p[0]).join('').substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedStatsEmployee.name}</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--nm-text-muted)' }}>{selectedStatsEmployee.department}</p>
                  </div>
               </div>
               <button type="button" onClick={() => setSelectedStatsEmployee(null)} className={styles.nmBtnClose}>
                 <X className="h-5 w-5" />
               </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Weekly Schedule Stats</h3>
              <div style={{
                background: 'var(--nm-surface-deep)', padding: '20px', borderRadius: 'var(--nm-radius-lg)', boxShadow: 'var(--nm-shadow-in)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center'
              }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Shifts</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nm-text)', margin: '8px 0 0' }}>
                    {(() => {
                      const stats = calculateEmployeeStats(selectedStatsEmployee.id);
                      return stats.totalShifts;
                    })()}
                  </p>
                </div>
                <div style={{ borderLeft: '2px solid rgba(0,0,0,0.05)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Expected Hours</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nm-primary)', margin: '8px 0 0' }}>
                    {(() => {
                      const stats = calculateEmployeeStats(selectedStatsEmployee.id);
                      return stats.totalExpectedHours;
                    })()} <span style={{ fontSize: '14px' }}>hrs</span>
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--nm-text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '8px' }}>
                Note: Expected hours are estimated using the shift's block time, excluding break and grace configurations.
              </p>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default SchedulingPage;
