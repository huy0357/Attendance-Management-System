import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Network, Plus, Search, Edit2, Trash2, X, AlertTriangle, CheckCircle2, XCircle, LayoutTemplate } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { departmentApi, DepartmentDto, DepartmentRequest } from '../api/hrm.api';
import styles from './DepartmentsPage.module.scss';
import { cn } from '../../../shared/utils/cn';

// Recursive Tree Node Component
const TreeNode: React.FC<{ node: DepartmentDto; level?: number }> = ({ node, level = 0 }) => {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div style={{ marginLeft: `${level * 1.5}rem`, marginBottom: '12px' }}>
      <div className={styles.treeNode}>
        <div className={cn(styles.treeIcon, level === 0 ? styles.root : styles.child)}>
          <LayoutTemplate className="h-4 w-4" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 'bold' }}>{node.departmentName}</p>
          {node.departmentCode && <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>Code: {node.departmentCode}</p>}
        </div>
        <div>
          <span className={cn(styles.nmBadge, node.isActive ? styles.nmBadgeActive : styles.nmBadgeInactive)}>
            {node.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      {hasChildren && (
        <div style={{ marginTop: '8px', paddingLeft: '16px', borderLeft: '2px solid rgba(0,0,0,0.05)' }}>
          {node.children!.map((child) => (
            <TreeNode key={child.departmentId} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const DepartmentsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const queryClient = useQueryClient();

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'list' | 'tree'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Modal Visibility States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected Department
  const [selectedDept, setSelectedDept] = useState<DepartmentDto | null>(null);

  // Form States
  const defaultFormState: DepartmentRequest = {
    departmentName: '',
    departmentCode: '',
    parentDepartmentId: null,
    isActive: true
  };
  const [formData, setFormData] = useState<DepartmentRequest>(defaultFormState);
  const [formTouched, setFormTouched] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // --- Queries ---
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['departments', debouncedSearch, page, pageSize],
    queryFn: () => departmentApi.getAll(page, pageSize, debouncedSearch, 'departmentId', 'desc'),
    enabled: activeTab === 'list',
    refetchOnWindowFocus: false,
  });

  const { data: treeData = [], isLoading: isLoadingTree } = useQuery({
    queryKey: ['departments', 'tree'],
    queryFn: () => departmentApi.getTree(),
    enabled: activeTab === 'tree' || showAddModal || showEditModal,
    refetchOnWindowFocus: false,
  });

  // Flat list for Parent Dropdown (from tree by flattening)
  const allFlattenedDepartments = useMemo(() => {
    const flatten = (nodes: DepartmentDto[]): DepartmentDto[] => {
      let result: DepartmentDto[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.children) {
          result = result.concat(flatten(node.children));
        }
      }
      return result;
    };
    return flatten(treeData);
  }, [treeData]);

  // Derived UI Data for Stats (use flat array of tree because pageData is paginated)
  const stats = useMemo(() => {
    const total = allFlattenedDepartments.length;
    const active = allFlattenedDepartments.filter(d => d.isActive).length;
    const inactive = total - active;
    const root = treeData.length;
    return { total, active, inactive, root };
  }, [allFlattenedDepartments, treeData]);

  const departmentsList = pageData?.items || [];
  const totalItems = pageData?.totalItems || 0;
  const totalPages = pageData?.totalPages || Math.ceil(totalItems / pageSize) || 1;

  // Modal Handlers
  const openAdd = () => {
    setFormData(defaultFormState);
    setFormTouched(false);
    setShowAddModal(true);
  };
  const closeAdd = () => setShowAddModal(false);

  const openEdit = (dept: DepartmentDto) => {
    setSelectedDept(dept);
    setFormData({
      departmentName: dept.departmentName || '',
      departmentCode: dept.departmentCode || '',
      parentDepartmentId: dept.parentDepartmentId || null,
      isActive: dept.isActive !== false
    });
    setFormTouched(false);
    setShowEditModal(true);
  };
  const closeEdit = () => {
    setShowEditModal(false);
    setSelectedDept(null);
  };

  const openDelete = (dept: DepartmentDto) => {
    setSelectedDept(dept);
    setShowDeleteModal(true);
  };
  const closeDelete = () => {
    setShowDeleteModal(false);
    setSelectedDept(null);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: DepartmentRequest) => departmentApi.create(data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeAdd(); 
    },
    onError: () => alert('Unable to create department.')
  });

  const updateMutation = useMutation({
    mutationFn: (data: DepartmentRequest) => departmentApi.update(selectedDept!.departmentId, data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeEdit(); 
    },
    onError: () => alert('Unable to update department.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentApi.delete(id),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeDelete(); 
    },
    onError: () => alert('Unable to delete department. It might have child departments or employees.')
  });

  // Submit Handlers
  const handleAddSubmit = () => {
    setFormTouched(true);
    if (!formData.departmentName) return;
    createMutation.mutate({
      ...formData,
      parentDepartmentId: formData.parentDepartmentId ? Number(formData.parentDepartmentId) : null
    });
  };

  const handleEditSubmit = () => {
    setFormTouched(true);
    if (!formData.departmentName) return;
    updateMutation.mutate({
      ...formData,
      parentDepartmentId: formData.parentDepartmentId ? Number(formData.parentDepartmentId) : null
    });
  };

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className={styles.pageTitle}>Departments</h1>
          <p className={styles.pageSubtitle}>Company organizational structure</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && !showAddModal && !showEditModal && !showDeleteModal && (
            <button
              onClick={openAdd}
              className={styles.nmBtnPrimary}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Department
            </button>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ color: 'var(--nm-info)' }}>
            <Network className="h-6 w-6" />
          </div>
          <div>
            <p className={styles.kpiLabel}>Total Departments</p>
            <p className={styles.kpiValue}>{stats.total}</p>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ color: 'var(--nm-success)' }}>
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className={styles.kpiLabel}>Active</p>
            <p className={styles.kpiValue}>{stats.active}</p>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ color: 'var(--nm-danger)' }}>
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className={styles.kpiLabel}>Inactive</p>
            <p className={styles.kpiValue}>{stats.inactive}</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className={cn(styles.nmCard, 'p-6')}>
        <div className={styles.nmTabs}>
          <button
            onClick={() => setActiveTab('list')}
            className={activeTab === 'list' ? styles.active : ''}
          >
            List View
          </button>
          <button
            onClick={() => setActiveTab('tree')}
            className={activeTab === 'tree' ? styles.active : ''}
          >
            Tree View
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
              <div className={styles.searchWrapper}>
                <Search className="h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={styles.nmInput}
                />
              </div>
            </div>

            <div className={styles.nmTableWrapper}>
              <table className={styles.nmTable}>
                <thead>
                  <tr>
                    <th>Department ID</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Parent ID</th>
                    <th>Status</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>Loading departments...</td>
                    </tr>
                  )}
                  {!isLoading && departmentsList.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <AlertTriangle className="h-10 w-10 text-gray-400 mb-3" />
                          <p style={{ fontWeight: 'bold' }}>No departments found matching your criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isLoading && departmentsList.map((dept: DepartmentDto) => (
                    <tr key={dept.departmentId}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>#{dept.departmentId}</td>
                      <td style={{ fontWeight: 'bold' }}>{dept.departmentCode || '-'}</td>
                      <td>{dept.departmentName}</td>
                      <td>{dept.parentDepartmentId || '-'}</td>
                      <td>
                        <span className={cn(styles.nmBadge, dept.isActive ? styles.nmBadgeActive : styles.nmBadgeInactive)}>
                          {dept.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => openEdit(dept)}
                              className={styles.nmBtnIcon}
                              title="Edit Department"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDelete(dept)}
                              className={cn(styles.nmBtnIcon, 'danger')}
                              title="Delete Department"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={styles.nmPagination}>
                <div>
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalItems)} of {totalItems} results
                </div>
                <div className={styles.paginationActions}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={styles.nmBtnSecondary} style={{ padding: '8px 12px' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '0 8px' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={styles.nmBtnSecondary} style={{ padding: '8px 12px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'tree' && (
          <div className={styles.nmCardInset} style={{ minHeight: '300px' }}>
            {isLoadingTree ? (
               <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>Loading organizational tree...</div>
            ) : treeData.length === 0 ? (
               <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>No departments defined yet.</div>
            ) : (
               <div style={{ padding: '16px 0' }}>
                 {treeData.map(node => (
                   <TreeNode key={node.departmentId} node={node} />
                 ))}
               </div>
            )}
          </div>
        )}
      </div>

      {/* --- ADD MODAL --- */}
      {showAddModal && (
        <div className={styles.modalBackdrop} onClick={closeAdd}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Add Department</h2>
                <p>Create a new department node in the organization.</p>
              </div>
              <button onClick={closeAdd} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.fieldGroup}>
                <label>Department Name <span style={{ color: 'var(--nm-danger)' }}>*</span></label>
                <input
                  type="text"
                  value={formData.departmentName}
                  onChange={e => setFormData({ ...formData, departmentName: e.target.value })}
                  className={styles.nmInput}
                  placeholder="e.g. Human Resources"
                />
                {formTouched && !formData.departmentName && (
                  <span style={{ color: 'var(--nm-danger)', fontSize: '10px', marginTop: '4px' }}>Name is required</span>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Department Code</label>
                <input
                  type="text"
                  value={formData.departmentCode}
                  onChange={e => setFormData({ ...formData, departmentCode: e.target.value })}
                  className={styles.nmInput}
                  placeholder="e.g. HR"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Parent Department</label>
                <select
                  value={formData.parentDepartmentId || ''}
                  onChange={e => setFormData({ ...formData, parentDepartmentId: e.target.value ? Number(e.target.value) : null })}
                  className={styles.nmInput}
                >
                  <option value="">None (Root Department)</option>
                  {allFlattenedDepartments.map(d => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.departmentName} ({d.departmentCode || `ID: ${d.departmentId}`})
                    </option>
                  ))}
                </select>
              </div>
              <label className={styles.checkboxLabel} style={{ marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Active Status
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={closeAdd} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button onClick={handleAddSubmit} disabled={createMutation.isPending} className={styles.nmBtnPrimary}>
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {showEditModal && selectedDept && (
        <div className={styles.modalBackdrop} onClick={closeEdit}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Edit Department</h2>
                <p>Modify existing department details.</p>
              </div>
              <button onClick={closeEdit} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.fieldGroup}>
                <label>Department Name <span style={{ color: 'var(--nm-danger)' }}>*</span></label>
                <input
                  type="text"
                  value={formData.departmentName}
                  onChange={e => setFormData({ ...formData, departmentName: e.target.value })}
                  className={styles.nmInput}
                />
                {formTouched && !formData.departmentName && (
                  <span style={{ color: 'var(--nm-danger)', fontSize: '10px', marginTop: '4px' }}>Name is required</span>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Department Code</label>
                <input
                  type="text"
                  value={formData.departmentCode}
                  onChange={e => setFormData({ ...formData, departmentCode: e.target.value })}
                  className={styles.nmInput}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Parent Department</label>
                <select
                  value={formData.parentDepartmentId || ''}
                  onChange={e => setFormData({ ...formData, parentDepartmentId: e.target.value ? Number(e.target.value) : null })}
                  className={styles.nmInput}
                >
                  <option value="">None (Root Department)</option>
                  {allFlattenedDepartments
                    .filter(d => d.departmentId !== selectedDept.departmentId) // Prevent self-parenting
                    .map(d => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.departmentName} ({d.departmentCode || `ID: ${d.departmentId}`})
                    </option>
                  ))}
                </select>
              </div>
              <label className={styles.checkboxLabel} style={{ marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Active Status
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={closeEdit} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button onClick={handleEditSubmit} disabled={updateMutation.isPending} className={styles.nmBtnPrimary}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {showDeleteModal && selectedDept && (
        <div className={styles.modalBackdrop} onClick={closeDelete}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className={styles.modalHeader} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--nm-danger)' }}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h2>Delete Department</h2>
              </div>
              <button onClick={closeDelete} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p style={{ color: 'var(--nm-text)', fontSize: 'var(--fs-sm)' }}>
              Are you sure you want to delete <strong>{selectedDept.departmentName}</strong>?
            </p>
            <p style={{ color: 'var(--nm-text-muted)', fontSize: '12px', marginTop: '8px', lineHeight: '1.5' }}>
              This action cannot be undone. You can only delete empty departments. If this department contains employees or sub-departments, the deletion will fail.
            </p>

            <div className={styles.modalFooter} style={{ borderTop: 'none', paddingBottom: 0 }}>
              <button onClick={closeDelete} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button 
                onClick={() => deleteMutation.mutate(selectedDept.departmentId)} 
                disabled={deleteMutation.isPending} 
                className={styles.nmBtnPrimary} 
                style={{ background: 'var(--nm-danger)' }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
