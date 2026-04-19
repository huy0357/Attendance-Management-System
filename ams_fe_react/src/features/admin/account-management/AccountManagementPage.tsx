import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Users, CheckCircle, ShieldAlert } from 'lucide-react';
import { adminApi, UserAccountRecord } from '../api/admin.api';
import { employeeApi } from '../../hrm/api/hrm.api';
import { CreateAccountRequest, UpdateAccountRequest } from '../../../shared/models/account.model';
import styles from './AccountManagementPage.module.scss';
import { cn } from '../../../shared/utils/cn';

const AccountManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'accountId' | 'username' | 'isActive' | 'createdAt' | 'lastLoginAt'>('accountId');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccountRecord | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    username: '',
    roleId: '',
    password: '',
    status: 'active'
  });

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['accountsPage', currentPage, pageSize, sortBy, sortDir, filterStatus, debouncedSearch],
    queryFn: () => {
      let isActive: boolean | undefined = undefined;
      if (filterStatus === 'active') isActive = true;
      if (filterStatus === 'inactive') isActive = false;

      if (debouncedSearch.trim()) {
         return adminApi.searchAccounts(debouncedSearch.trim(), currentPage, pageSize, sortBy, sortDir);
      }
      return adminApi.getAccountsPage(currentPage, pageSize, sortBy, sortDir, isActive);
    }
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['accountRoles'],
    queryFn: adminApi.getAccountRoles
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['allAccounts'],
    queryFn: adminApi.getAccounts
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.getAll
  });

  const userAccounts = useMemo(() => (pageData?.items || []).map(adminApi.mapAccountDtoToRecord), [pageData]);
  const totalItems = pageData?.totalItems || 0;
  const totalPages = pageData?.totalPages || Math.ceil(totalItems / pageSize) || 1;

  // Stats derived from allAccounts
  const mappedAllAccounts = useMemo(() => allAccounts.map(adminApi.mapAccountDtoToRecord), [allAccounts]);
  const totalUsers = mappedAllAccounts.length;
  const activeUserCount = mappedAllAccounts.filter(u => u.status === 'active').length;
  const inactiveUserCount = mappedAllAccounts.filter(u => u.status === 'inactive').length;
  const adminUserCount = mappedAllAccounts.filter(u => u.role === 'admin').length;

  const filteredUsers = useMemo(() => {
    return userAccounts.filter(user => filterRole === 'all' || user.role === filterRole);
  }, [userAccounts, filterRole]);

  const assignedEmployeeIds = new Set(allAccounts.map(a => a.employeeId).filter(e => e));
  const availableEmployees = employees.filter(e => !assignedEmployeeIds.has(e.employeeId));

  const getUserInitials = (name: string) => {
    return name.split(' ').filter(p => p.length > 0).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const createMutation = useMutation({
    mutationFn: (req: CreateAccountRequest) => adminApi.createAccount(req),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['accountsPage'] });
       queryClient.invalidateQueries({ queryKey: ['allAccounts'] });
       setShowAddUser(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number, req: UpdateAccountRequest }) => adminApi.updateAccount(id, req),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['accountsPage'] });
       queryClient.invalidateQueries({ queryKey: ['allAccounts'] });
       setShowEditUser(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteAccount(id),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['accountsPage'] });
       queryClient.invalidateQueries({ queryKey: ['allAccounts'] });
       setShowDeleteModal(false);
       if (userAccounts.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    }
  });

  const openAddUser = () => {
    const defaultRoleId = roles.find(r => r.code === 'ROLE_EMPLOYEE')?.id || roles[0]?.id || '';
    const defaultEmpId = availableEmployees[0]?.employeeId || '';
    setFormData({
      employeeId: String(defaultEmpId),
      username: '',
      roleId: String(defaultRoleId),
      password: '',
      status: 'active'
    });
    setShowAddUser(true);
  };

  const submitAddUser = () => {
    const { employeeId, username, roleId, password, status } = formData;
    if (!employeeId || !username.trim() || !roleId || password.length < 6) return;
    createMutation.mutate({
      employeeId: Number(employeeId),
      username: username.trim(),
      password,
      roleId: Number(roleId),
      isActive: status === 'active'
    });
  };

  const openEditUser = (user: UserAccountRecord) => {
    setSelectedUser(user);
    setFormData({
      employeeId: String(user.employeeId),
      username: user.username,
      roleId: String(user.roleId || roles[0]?.id),
      password: '',
      status: user.status
    });
    setShowEditUser(true);
  };

  const submitEditUser = () => {
    const { username, roleId, status } = formData;
    if (!username.trim() || !roleId || !selectedUser) return;
    updateMutation.mutate({
      id: Number(selectedUser.id),
      req: {
        username: username.trim(),
        roleId: Number(roleId),
        isActive: status === 'active'
      }
    });
  };

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, req }: { id: number, req: UpdateAccountRequest }) => adminApi.updateAccount(id, req),
    onMutate: async ({ id, req }) => {
      await queryClient.cancelQueries({ queryKey: ['accountsPage'] });
      const previousPageData = queryClient.getQueryData(['accountsPage', currentPage, pageSize, sortBy, sortDir, filterStatus, debouncedSearch]);
      
      queryClient.setQueryData(['accountsPage', currentPage, pageSize, sortBy, sortDir, filterStatus, debouncedSearch], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: any) => 
            item.accountId === id ? { ...item, isActive: req.isActive } : item
          )
        };
      });

      return { previousPageData };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['accountsPage', currentPage, pageSize, sortBy, sortDir, filterStatus, debouncedSearch], context?.previousPageData);
    },
    onSettled: () => {
       queryClient.invalidateQueries({ queryKey: ['accountsPage'] });
       queryClient.invalidateQueries({ queryKey: ['allAccounts'] });
    }
  });

  const confirmDelete = () => {
    if (selectedUser) deleteMutation.mutate(Number(selectedUser.id));
  };

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className={styles.pageTitle}>Account Management</h1>
          <p className={styles.pageSubtitle}>Manage system access and authentication</p>
        </div>
        <button onClick={openAddUser} className={styles.nmBtnPrimary}>
          <Plus className="h-4 w-4 shrink-0" />
          Add User
        </button>
      </div>
      
      {isError && (
        <div style={{ padding: '16px', background: 'var(--nm-surface)', borderRadius: 'var(--nm-radius-md)', color: 'var(--nm-danger)', fontWeight: 'bold', boxShadow: 'var(--nm-shadow-in)' }}>
          Unable to load account data. Please try again.
        </div>
      )}

      {/* STATS CARDS */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--nm-surface-deep)', boxShadow: 'var(--nm-shadow-in)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-info)' }}>
              <Users className="h-5 w-5" />
            </div>
            <p className={styles.kpiLabel}>Total Users</p>
          </div>
          <p className={styles.kpiValue} style={{ paddingLeft: '8px' }}>{totalUsers}</p>
        </div>
        <div className={styles.kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--nm-surface-deep)', boxShadow: 'var(--nm-shadow-in)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-success)' }}>
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className={styles.kpiLabel}>Active</p>
          </div>
          <p className={styles.kpiValue} style={{ paddingLeft: '8px' }}>{activeUserCount}</p>
        </div>
        <div className={styles.kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--nm-surface-deep)', boxShadow: 'var(--nm-shadow-in)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-text-muted)' }}>
              <X className="h-5 w-5" />
            </div>
            <p className={styles.kpiLabel}>Inactive</p>
          </div>
          <p className={styles.kpiValue} style={{ paddingLeft: '8px' }}>{inactiveUserCount}</p>
        </div>
        <div className={styles.kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--nm-surface-deep)', boxShadow: 'var(--nm-shadow-in)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-danger)' }}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className={styles.kpiLabel}>Admins</p>
          </div>
          <p className={styles.kpiValue} style={{ paddingLeft: '8px' }}>{adminUserCount}</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search className="h-4 w-4" />
          <input type="text" placeholder="Search by username..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className={styles.nmInput} />
        </div>
        <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }} className={styles.nmInput} style={{ width: 'auto', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>
          <option value="all">ALL ROLES</option>
          <option value="admin">ADMIN</option>
          <option value="employee">EMPLOYEE</option>
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className={styles.nmInput} style={{ width: 'auto', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>
          <option value="all">ALL STATUS</option>
          <option value="active">ACTIVE</option>
          <option value="inactive">INACTIVE</option>
        </select>
        <select value={sortBy} onChange={e => { setSortBy(e.target.value as any); setCurrentPage(1); }} className={styles.nmInput} style={{ width: 'auto', fontSize: '12px' }}>
          <option value="accountId">Sort: Account ID</option>
          <option value="username">Sort: Username</option>
          <option value="isActive">Sort: Status</option>
          <option value="createdAt">Sort: Created At</option>
          <option value="lastLoginAt">Sort: Last Login</option>
        </select>
        <select value={sortDir} onChange={e => { setSortDir(e.target.value as any); setCurrentPage(1); }} className={styles.nmInput} style={{ width: 'auto', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>
          <option value="desc">DESC</option>
          <option value="asc">ASC</option>
        </select>
        <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className={styles.nmInput} style={{ width: 'auto', fontSize: '12px' }}>
          {[10, 20, 50].map(sz => <option key={sz} value={sz}>{sz} / page</option>)}
        </select>
      </div>

      {/* TABLE */}
      <div className={styles.nmTableWrapper}>
        <table className={styles.nmTable}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} style={{ padding: '16px' }}>
                  <style>{`
                    @keyframes nm-pulse-skeleton {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                  `}</style>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: '48px', background: 'var(--nm-surface)', boxShadow: 'var(--nm-shadow-in)', borderRadius: 'var(--nm-radius-md)', marginBottom: '8px', animation: 'nm-pulse-skeleton 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
                  ))}
                </td>
              </tr>
            )}
            {!isLoading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '48px', opacity: 0.6, fontWeight: 'bold' }}>
                  No users found matching your criteria.
                </td>
              </tr>
            )}
            {!isLoading && filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--nm-surface)', color: 'var(--nm-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: 'var(--nm-shadow-out)' }}>
                      {getUserInitials(user.username)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                      <div style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>Emp ID: {user.employeeId}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={styles.nmBadge} style={{ color: user.role === 'admin' ? 'var(--nm-danger)' : 'var(--nm-info)' }}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{
                      width: '36px', height: '20px', borderRadius: '10px',
                      background: user.status === 'active' ? 'var(--nm-success)' : 'var(--nm-surface-deep)',
                      boxShadow: 'var(--nm-shadow-in)',
                      position: 'relative',
                      transition: 'background 0.3s'
                    }}>
                      <div style={{
                         width: '16px', height: '16px', borderRadius: '50%', background: 'var(--nm-surface)',
                         position: 'absolute', top: '2px', left: user.status === 'active' ? '18px' : '2px',
                         transition: 'left 0.3s', boxShadow: 'var(--nm-shadow-out)'
                      }} />
                    </div>
                    <input type="checkbox" hidden checked={user.status === 'active'} disabled={toggleStatusMutation.isPending}
                      onChange={() => toggleStatusMutation.mutate({ 
                        id: Number(user.id), 
                        req: { roleId: user.roleId, isActive: user.status !== 'active' }
                      })} 
                    />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', marginLeft: '8px', color: user.status === 'active' ? 'var(--nm-success)' : 'var(--nm-text-muted)' }}>
                      {user.status.toUpperCase()}
                    </span>
                  </label>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>
                  {user.lastLogin}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => openEditUser(user)} className={styles.nmBtnIcon} title="Edit User">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }} className={cn(styles.nmBtnIcon, 'danger')} title="Delete User">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className={styles.nmPagination} style={{ padding: '16px' }}>
          <div>Showing {filteredUsers.length} of {totalItems} users</div>
          <div className={styles.paginationActions}>
            <button 
              disabled={currentPage <= 1 || isLoading} 
              onClick={() => setCurrentPage(currentPage - 1)} 
              className={styles.nmBtnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Prev
            </button>
            <span style={{ fontSize: '12px', padding: '0 8px' }}>Page {currentPage} / {totalPages}</span>
            <button 
              disabled={currentPage >= totalPages || isLoading} 
              onClick={() => setCurrentPage(currentPage + 1)} 
              className={styles.nmBtnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* --- ADD MODAL --- */}
      {showAddUser && (
        <div className={styles.modalBackdrop} onClick={() => setShowAddUser(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Add New User</h2>
                <p>Create a secure access account for an employee.</p>
              </div>
              <button onClick={() => setShowAddUser(false)} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className={styles.formGrid}>
              <div className={cn(styles.fieldGroup, styles.fullWidth)}>
                <label>Select Employee (Without Account)</label>
                <select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className={styles.nmInput}>
                  <option value="">Select an employee</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeCode} - {emp.fullName}</option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>Username</label>
                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="e.g. john.doe" className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Role</label>
                <select value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} className={styles.nmInput}>
                  <option value="">Select role</option>
                  {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>Password</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Min 6 characters" className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={styles.nmInput}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setShowAddUser(false)} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button onClick={submitAddUser} disabled={!formData.employeeId || !formData.username || !formData.roleId || formData.password.length < 6 || createMutation.isPending} className={styles.nmBtnPrimary}>
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {showEditUser && selectedUser && (
        <div className={styles.modalBackdrop} onClick={() => setShowEditUser(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Edit User Account</h2>
                <p>Modify role or access status for {selectedUser.username}</p>
              </div>
              <button onClick={() => setShowEditUser(false)} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label>Employee ID</label>
                <input type="text" disabled value={formData.employeeId} className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Username</label>
                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className={styles.nmInput} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Role</label>
                <select value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} className={styles.nmInput}>
                  {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={styles.nmInput}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setShowEditUser(false)} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button onClick={submitEditUser} disabled={!formData.username || updateMutation.isPending} className={styles.nmBtnPrimary}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {showDeleteModal && selectedUser && (
        <div className={styles.modalBackdrop} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className={styles.modalHeader} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--nm-danger)' }}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h2>Delete User</h2>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className={styles.nmBtnIcon}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p style={{ color: 'var(--nm-text)', fontSize: 'var(--fs-sm)', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <span style={{ fontWeight: 'bold' }}>{selectedUser.username}</span>? All data associated with this account will be permanently removed.
            </p>

            <div className={styles.modalFooter} style={{ borderTop: 'none', paddingBottom: 0 }}>
              <button onClick={() => setShowDeleteModal(false)} className={styles.nmBtnSecondary}>
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleteMutation.isPending} className={styles.nmBtnPrimary} style={{ background: 'var(--nm-danger)' }}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagementPage;
