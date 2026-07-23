import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Search, Eye, Edit2, Trash2, X, AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { employeeApi, EmployeeDto, EmployeeRequest } from '../api/hrm.api';
import { adminApi } from '../../admin/api/admin.api';
import { RoleResponse } from '../../../shared/models/account.model';
import styles from './EmployeesPage.module.scss';
import ModalPortal from '../../../shared/components/ModalPortal';
import { cn } from '../../../shared/utils/cn';

// Types for UI mapping
interface UiEmployee extends EmployeeDto {
  id: string;
  employeeLabel: string;
  avatar: string;
}

const EmployeesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const queryClient = useQueryClient();

  // --- UI State ---
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('employee_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modal Visibility States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Selected Employee
  const [selectedEmployee, setSelectedEmployee] = useState<UiEmployee | null>(null);

  // Queries for Roles
  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => adminApi.getAccountRoles(),
    enabled: isAdmin
  });

  const { data: employeeRoles = [], isFetching: isLoadingRoles } = useQuery({
    queryKey: ['employeeRoles', selectedEmployee?.id],
    queryFn: () => adminApi.getEmployeeRoles(Number(selectedEmployee!.id)),
    enabled: !!selectedEmployee?.id && showRoleModal
  });

  const [selectedRoleIdToAssign, setSelectedRoleIdToAssign] = useState<number | ''>('');

  const assignRoleMutation = useMutation({
    mutationFn: (roleId: number) => adminApi.assignRoleToEmployee(Number(selectedEmployee!.id), roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeRoles', selectedEmployee?.id] });
      setSelectedRoleIdToAssign('');
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: (roleId: number) => adminApi.removeRoleFromEmployee(Number(selectedEmployee!.id), roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeRoles', selectedEmployee?.id] });
    }
  });

  // Form States
  const defaultFormState: EmployeeRequest = {
    employeeCode: '',
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    departmentId: undefined,
    managerId: undefined,
    hireDate: ''
  };
  const [formData, setFormData] = useState<EmployeeRequest>(defaultFormState);
  const [formTouched, setFormTouched] = useState(false);

  // Debounce search 500ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // --- Queries ---
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => employeeApi.getDepartments(),
    staleTime: 5 * 60 * 1000,
  });



  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['employees', debouncedSearch, page, pageSize, sortBy, sortDir],
    queryFn: () => {
      if (debouncedSearch.trim()) {
        return employeeApi.searchByName(debouncedSearch.trim(), page, pageSize, sortBy, sortDir);
      }
      return employeeApi.getPage(page, pageSize, sortBy, sortDir);
    },
    refetchOnWindowFocus: false,
  });

  // NOTE: Role management via /employees/{id}/roles endpoint was removed —
  // that endpoint does not exist in BE (EmployeeController). Role is managed
  // through AccountManagement (assign roleId when creating account).

  // Derived UI Data
  const employees: UiEmployee[] = useMemo(() => {
    return (pageData?.items || []).map((emp: EmployeeDto) => {
      const fullName = emp.fullName || 'Employee';
      const initials = fullName.split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
      return {
        ...emp,
        id: String(emp.employeeId),
        employeeLabel: emp.employeeCode || `EMP-${emp.employeeId}`,
        avatar: initials || 'EMP'
      };
    });
  }, [pageData]);
  const totalItems = pageData?.totalItems || 0;
  const totalPages = pageData?.totalPages || Math.ceil(totalItems / pageSize) || 1;

  const getDepartmentName = (id: number | null | undefined): string => {
    if (!id) return '-';
    return departments.find(d => d.departmentId === id)?.departmentName || id.toString();
  };

  const getStatusColorClass = (status: string | null): string => {
    const s = (status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (s === 'ACTIVE') return styles.nmBadgeActive;
    if (s === 'INACTIVE') return styles.nmBadgeInactive;
    if (s === 'ON_LEAVE') return styles.nmBadgeLeave;
    return styles.nmBadgeInactive;
  };
  const getStatusLabel = (status: string | null): string => {
    const s = (status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (s === 'ACTIVE') return 'Active';
    if (s === 'INACTIVE') return 'Inactive';
    if (s === 'ON_LEAVE') return 'On Leave';
    return status || 'Unknown';
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return date;
    }
  };

  // Modal Handlers
  const openAdd = () => {
    setFormData(defaultFormState);
    setFormTouched(false);
    setShowAddModal(true);
  };
  const closeAdd = () => setShowAddModal(false);

  const openDetails = (emp: UiEmployee) => {
    setSelectedEmployee(emp);
    setShowDetailsModal(true);
  };
  const closeDetails = () => {
    setShowDetailsModal(false);
    setSelectedEmployee(null);
  };

  const openEdit = (emp: UiEmployee | null) => {
    if (!emp) return;
    setSelectedEmployee(emp);
    setFormData({
      employeeCode: emp.employeeCode || '',
      fullName: emp.fullName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      dob: emp.dob || '',
      gender: emp.gender || '',
      departmentId: emp.departmentId || undefined,
      managerId: emp.managerId || undefined,
      hireDate: emp.hireDate || ''
    });
    setFormTouched(false);
    setShowEditModal(true);
    setShowDetailsModal(false);
  };
  const closeEdit = () => {
    setShowEditModal(false);
    setSelectedEmployee(null);
  };

  const openDelete = (emp: UiEmployee | null) => {
    if (!emp) return;
    setSelectedEmployee(emp);
    setShowDeleteModal(true);
    setShowDetailsModal(false);
  };
  const closeDelete = () => {
    setShowDeleteModal(false);
    setSelectedEmployee(null);
  };



  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: EmployeeRequest) => employeeApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); closeAdd(); },
    onError: () => alert('Unable to add employee. Please try again.')
  });

  const updateMutation = useMutation({
    mutationFn: (data: EmployeeRequest) => employeeApi.update(Number(selectedEmployee!.id), data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); closeEdit(); },
    onError: () => alert('Unable to update employee. Please try again.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); closeDelete(); },
    onError: () => alert('Unable to delete employee. Please try again.')
  });



  const exportMutation = useMutation({
    mutationFn: () => employeeApi.exportEmployees(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: () => alert('Unable to export employees. Please try again.')
  });

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Submit Handlers
  const handleAddSubmit = () => {
    setFormTouched(true);
    if (!formData.fullName || (formData.email && !isValidEmail(formData.email))) return;
    createMutation.mutate({
      ...formData,
      departmentId: formData.departmentId ? Number(formData.departmentId) : undefined,
      managerId: formData.managerId ? Number(formData.managerId) : undefined,
    });
  };

  const handleEditSubmit = () => {
    setFormTouched(true);
    if (!formData.fullName || (formData.email && !isValidEmail(formData.email))) return;
    updateMutation.mutate({
      ...formData,
      departmentId: formData.departmentId ? Number(formData.departmentId) : undefined,
      managerId: formData.managerId ? Number(formData.managerId) : undefined,
    });
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={styles.pageTitle}>Employees</h1>
          <p className={styles.pageSubtitle}>Manage employee records backed by the HR module.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && !showAddModal && (
            <>
              <button
                type="button"
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className={styles.nmBtnSecondary}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span>{exportMutation.isPending ? '...' : 'Export'}</span>
              </button>
              <button
                onClick={openAdd}
                className={styles.nmBtnPrimary}
              >
                <Plus className="h-4 w-4 shrink-0" />
                Add Employee
              </button>
            </>
          )}
        </div>
      </div>

      {isError && (
        <div className="p-4" style={{ color: 'var(--nm-danger)', fontWeight: 'bold' }}>
          Unable to load employee data. Please try again.
        </div>
      )}

      {/* FILTER BAR */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Search by full name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.nmInput}
          />
        </div>

        <div className={styles.statBadge}>
          Total items: <span>{totalItems}</span>
        </div>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className={styles.nmInput}
        >
          <option value="employee_id">Sort by Employee ID</option>
          <option value="employee_code">Sort by Employee Code</option>
          <option value="full_name">Sort by Full Name</option>
          <option value="hire_date">Sort by Hire Date</option>
        </select>

        <select
          value={sortDir}
          onChange={(e) => { setSortDir(e.target.value as 'asc'|'desc'); setPage(1); }}
          className={styles.nmInput}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>

        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className={styles.nmInput}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>

        <div className={styles.viewToggle}>
          <button
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? styles.active : ''}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? styles.active : ''}
          >
            Grid
          </button>
        </div>
      </div>

      {/* TABLE DATA */}
      {viewMode === 'table' && (
        <div className={styles.nmTableWrapper}>
          <table className={styles.nmTable}>
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee Code</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && employees.map((employee: UiEmployee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={styles.nmAvatar}>
                        {employee.avatar}
                      </div>
                      <div>
                        <p style={{ fontWeight: 'bold' }}>{employee.fullName}</p>
                        <p style={{ fontSize: '12px', color: 'var(--nm-text-secondary)' }}>ID {employee.id}</p>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)' }}>{employee.employeeCode || '-'}</span></td>
                  <td>
                    <span className={cn(styles.nmBadge, getStatusColorClass(employee.status))}>
                      {getStatusLabel(employee.status)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => openDetails(employee)}
                      className={styles.nmBtnIcon}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {isLoading && (
                 <tr>
                    <td colSpan={4} style={{ padding: '16px' }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} className={styles.skeletonRow}></div>
                      ))}
                    </td>
                 </tr>
              )}
              {!isLoading && employees.length === 0 && (
                 <tr><td colSpan={4} style={{ textAlign: 'center' }}>No employees found.</td></tr>
              )}
            </tbody>
          </table>
          
          <div className={styles.pagination}>
            <div className={styles.paginationText}>Showing {employees.length} of {totalItems} employees</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page <= 1 || isLoading} 
                className={styles.nmBtnSecondary} 
                style={{ padding: '6px 12px' }}
              >Prev</button>
              <span className={styles.paginationText}>Page {page} / {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page >= totalPages || isLoading} 
                className={styles.nmBtnSecondary} 
                style={{ padding: '6px 12px' }}
              >Next</button>
            </div>
          </div>
        </div>
      )}

      {/* GRID DATA */}
      {viewMode === 'grid' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {!isLoading && employees.map((employee: UiEmployee) => (
              <div key={employee.id} className={cn(styles.nmCard, styles.nmCardHover)}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={styles.nmAvatar}>
                      {employee.avatar}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 'bold' }}>{employee.fullName}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>{employee.employeeLabel}</p>
                    </div>
                  </div>
                  <span className={cn(styles.nmBadge, getStatusColorClass(employee.status))}>
                    {getStatusLabel(employee.status)}
                  </span>
                </div>
                
                <div className={styles.detailsGrid} style={{ marginTop: 0, gridTemplateColumns: '1fr' }}>
                  <div className={styles.detailsBlock}>
                     <span className={styles.detailsLabel}>Employee Code</span>
                     <span className={styles.detailsValue}>{employee.employeeCode || '-'}</span>
                  </div>
                  <div className={styles.detailsBlock}>
                     <span className={styles.detailsLabel}>Email</span>
                     <span className={styles.detailsValue}>{employee.email || '-'}</span>
                  </div>
                  <div className={styles.detailsBlock}>
                     <span className={styles.detailsLabel}>Department</span>
                     <span className={styles.detailsValue}>{getDepartmentName(employee.departmentId)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4" style={{ display: 'flex' }}>
                  <button onClick={() => openDetails(employee)} className={styles.nmBtnSecondary} style={{ width: '100%' }}>
                    <Eye className="h-4 w-4 shrink-0" /> View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.pagination} style={{ marginTop: '16px', borderRadius: 'var(--nm-radius-lg)', boxShadow: 'var(--nm-shadow-out)'}}>
            <div className={styles.paginationText}>Showing {employees.length} of {totalItems} employees</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || isLoading} className={styles.nmBtnSecondary} style={{ padding: '6px 12px' }}>Prev</button>
              <span className={styles.paginationText}>Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading} className={styles.nmBtnSecondary} style={{ padding: '6px 12px' }}>Next</button>
            </div>
          </div>
        </>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedEmployee && (
        <ModalPortal onBackdropClick={closeDetails}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-4">
                <div className={styles.nmAvatarLg} style={{ borderRadius: '50%', background: 'var(--nm-surface)', boxShadow: '4px 4px 10px var(--nm-dark), -4px -4px 10px var(--nm-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-primary)' }}>
                  {selectedEmployee.avatar}
                </div>
                <div>
                  <h2>{selectedEmployee.fullName}</h2>
                  <p className={styles.pageSubtitle}>Employee ID {selectedEmployee.id}</p>
                </div>
              </div>
              <button onClick={closeDetails} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Employee Name</p>
                <p className={styles.detailsValue}>{selectedEmployee.fullName}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Employee Code</p>
                <p className={styles.detailsValue}>{selectedEmployee.employeeCode || '-'}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Email</p>
                <p className={styles.detailsValue}>{selectedEmployee.email || '-'}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Department</p>
                <p className={styles.detailsValue}>{getDepartmentName(selectedEmployee.departmentId)}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Manager ID</p>
                <p className={styles.detailsValue}>{selectedEmployee.managerId || '-'}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Phone</p>
                <p className={styles.detailsValue}>{selectedEmployee.phone || '-'}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Gender</p>
                <p className={styles.detailsValue}>
                  {selectedEmployee.gender === 'MALE' ? 'Male' : 
                   selectedEmployee.gender === 'FEMALE' ? 'Female' : 
                   selectedEmployee.gender === 'OTHER' ? 'Other' : 
                   selectedEmployee.gender || '-'}
                </p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Date of Birth</p>
                <p className={styles.detailsValue}>{formatDate(selectedEmployee.dob)}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Hire Date</p>
                <p className={styles.detailsValue}>{formatDate(selectedEmployee.hireDate)}</p>
              </div>
              <div className={styles.detailsBlock}>
                <p className={styles.detailsLabel}>Status</p>
                <div>
                  <span className={cn(styles.nmBadge, getStatusColorClass(selectedEmployee.status))}>
                    {getStatusLabel(selectedEmployee.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={closeDetails} className={styles.nmBtnSecondary}>
                Close
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setShowRoleModal(true)} className={styles.nmBtnPrimary} style={{ background: 'var(--nm-info)', color: '#fff', boxShadow: 'none' }}>
                    <Shield className="h-4 w-4 shrink-0" /> Manage Roles
                  </button>
                  <button onClick={() => openEdit(selectedEmployee)} className={styles.nmBtnPrimary}>
                    <Edit2 className="h-4 w-4 shrink-0" /> Edit
                  </button>
                  <button onClick={() => openDelete(selectedEmployee)} className={styles.nmBtnPrimary} style={{ background: 'var(--nm-danger)', color: '#fff', boxShadow: 'none' }}>
                    <Trash2 className="h-4 w-4 shrink-0" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ADD/EDIT MODAL FORMS */}
      {(showAddModal || showEditModal) && (
        <ModalPortal onBackdropClick={showAddModal ? closeAdd : closeEdit}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{showEditModal ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={showAddModal ? closeAdd : closeEdit} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label>Employee Code</label>
                <input
                  type="text"
                  disabled={showEditModal}
                  value={formData.employeeCode}
                  onChange={(e) => setFormData(p => ({ ...p, employeeCode: e.target.value }))}
                  className={styles.nmInput}
                />
                {formTouched && !showEditModal && !formData.employeeCode && <p className={styles.errorMessage}>Code is required</p>}
              </div>

              {showEditModal ? (
                <div className={styles.fieldGroup}>
                  <label>Employee ID</label>
                  <input type="text" disabled value={selectedEmployee?.id || ''} className={styles.nmInput} />
                </div>
              ) : (
                <div className={styles.fieldGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                    className={styles.nmInput}
                  />
                  {formTouched && !formData.fullName && <p className={styles.errorMessage}>Full Name is required</p>}
                </div>
              )}

              {showEditModal && (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Full Name</label>
                    <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className={styles.nmInput} />
                    {formTouched && !formData.fullName && <p className={styles.errorMessage}>Full Name is required</p>}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={styles.nmInput} />
                  </div>
                </>
              )}

              {!showEditModal && (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={styles.nmInput} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={styles.nmInput} />
                  </div>
                </>
              )}

              {showEditModal && (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={styles.nmInput} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Gender</label>
                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className={styles.nmInput}>
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </>
              )}

              {!showEditModal && (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Date of Birth</label>
                    <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className={styles.nmInput} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Gender</label>
                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className={styles.nmInput}>
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </>
              )}

              {showEditModal ? (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Date of Birth</label>
                    <input type="date" value={formData.dob || ''} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className={styles.nmInput} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Hire Date</label>
                    <input type="date" value={formData.hireDate || ''} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} className={styles.nmInput} />
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Department</label>
                    <select value={formData.departmentId || ''} onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) || undefined })} className={styles.nmInput}>
                      <option value="">Select dept</option>
                      {departments.map((d: any) => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                    </select>
                  </div>

                </>
              )}

              {showEditModal ? (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Department</label>
                    <select value={formData.departmentId || ''} onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) || undefined })} className={styles.nmInput}>
                      <option value="">Select dept</option>
                      {departments.map((d: any) => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Manager ID</label>
                    <input type="number" value={formData.managerId || ''} onChange={(e) => setFormData({ ...formData, managerId: Number(e.target.value) || undefined })} className={styles.nmInput} />
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Manager ID</label>
                    <input type="number" value={formData.managerId || ''} onChange={(e) => setFormData({ ...formData, managerId: Number(e.target.value) || undefined })} className={styles.nmInput} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Hire Date</label>
                    <input type="date" value={formData.hireDate || ''} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} className={styles.nmInput} />
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button onClick={showAddModal ? closeAdd : closeEdit} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button 
                onClick={showAddModal ? handleAddSubmit : handleEditSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending}
                className={styles.nmBtnPrimary}
              >
                {showAddModal ? <><Plus className="h-4 w-4 shrink-0" /> Add Employee</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedEmployee && (
        <ModalPortal onBackdropClick={closeDelete}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-3">
                <AlertTriangle style={{ color: 'var(--nm-danger)' }} />
                <h2>Delete Employee</h2>
              </div>
            </div>

            <p style={{ fontFamily: 'var(--font-primary)', fontSize: '14px', marginBottom: '24px' }}>
              Are you sure you want to delete <strong>{selectedEmployee.fullName}</strong> ({selectedEmployee.employeeCode || selectedEmployee.id})? This action cannot be undone.
            </p>

            <div className={styles.modalFooter}>
              <button onClick={closeDelete} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(Number(selectedEmployee.id))} disabled={deleteMutation.isPending} className={styles.nmBtnPrimary} style={{ background: 'var(--nm-danger)', boxShadow: 'none' }}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ROLE MANAGEMENT MODAL */}
      {showRoleModal && selectedEmployee && (
        <ModalPortal onBackdropClick={() => setShowRoleModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-3">
                <Shield style={{ color: 'var(--nm-info)' }} />
                <h2>Manage Roles for {selectedEmployee.fullName}</h2>
              </div>
              <button onClick={() => setShowRoleModal(false)} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <h3 style={{ marginBottom: '8px', fontWeight: 'bold' }}>Current Roles</h3>
              {isLoadingRoles ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading roles...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {employeeRoles.length === 0 ? (
                    <p style={{ color: 'var(--nm-text-muted)' }}>No roles assigned.</p>
                  ) : (
                    employeeRoles.map((role: RoleResponse) => (
                      <div key={role.roleId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--nm-surface)', borderRadius: 'var(--nm-radius-md)', border: '1px solid var(--nm-border)' }}>
                        <div>
                          <p style={{ fontWeight: 'bold' }}>{role.roleName}</p>
                          <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>{role.roleCode}</p>
                        </div>
                        <button 
                          onClick={() => removeRoleMutation.mutate(role.roleId)}
                          disabled={removeRoleMutation.isPending}
                          className={styles.nmBtnIcon} 
                          style={{ color: 'var(--nm-danger)' }}
                          title="Remove Role"
                        >
                          {removeRoleMutation.isPending && removeRoleMutation.variables === role.roleId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--nm-border)', paddingTop: '16px' }}>
              <h3 style={{ marginBottom: '8px', fontWeight: 'bold' }}>Assign New Role</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={selectedRoleIdToAssign}
                  onChange={e => setSelectedRoleIdToAssign(Number(e.target.value))}
                  className={styles.nmInput} 
                  style={{ flex: 1 }}
                >
                  <option value="" disabled>Select a role...</option>
                  {allRoles.filter((r: RoleResponse) => !employeeRoles.find((er: RoleResponse) => er.roleId === r.roleId)).map((r: RoleResponse) => (
                    <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
                  ))}
                </select>
                <button 
                  onClick={() => { if (selectedRoleIdToAssign) assignRoleMutation.mutate(Number(selectedRoleIdToAssign)); }}
                  disabled={!selectedRoleIdToAssign || assignRoleMutation.isPending}
                  className={styles.nmBtnPrimary}
                >
                  {assignRoleMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>

            <div className={styles.modalFooter} style={{ marginTop: '24px' }}>
              <button onClick={() => setShowRoleModal(false)} className={styles.nmBtnSecondary}>
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
};

export default EmployeesPage;
