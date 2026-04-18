import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shield, Key, Mail, Building2, Save, Lock } from 'lucide-react';
import { profileApi } from '../../hrm/api/hrm.api';
import axiosInstance from '../../../core/api/axiosInstance';
import { useAuth } from '../../../core/auth/AuthContext';
import styles from './ProfilePage.module.scss';
import { cn } from '../../../shared/utils/cn';

const ProfilePage: React.FC = () => {
  const { username, getNormalizedRole } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => profileApi.getMyProfile(),
    refetchOnWindowFocus: false,
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      // Mocking/calling generic endpoint since exact change password may not be defined yet
      await axiosInstance.post('/auth/change-password', data);
    },
    onSuccess: () => {
      setPasswordSuccess('Password updated successfully.');
      setPasswordError('');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errObj = err as any;
      const message = errObj?.response?.data?.message;
      setPasswordError(message || 'Failed to change password. Please try again.');
      setPasswordSuccess('');
    }
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="nm-spinner" />
      </div>
    );
  }

  if (isError || !profile) {
    // Extract real error message from Axios
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errObj = error as any;
    const errorMsg = errObj?.response?.data?.message || errObj?.message || 'Unknown network error';
    const status = errObj?.response?.status ? `(Status: ${errObj.response.status})` : '';

    return (
      <div className="p-8 max-w-2xl mx-auto mt-8">
        <div style={{
          background: 'var(--nm-surface)',
          borderRadius: 'var(--nm-radius-lg)',
          boxShadow: 'var(--nm-shadow-out)',
          padding: '24px',
          borderLeft: '4px solid var(--nm-danger)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h2 style={{ color: 'var(--nm-danger)', fontSize: '18px', fontWeight: 'bold' }}>
            Failed to load profile data {status}
          </h2>
          <div style={{ 
            background: 'var(--nm-surface-deep)', 
            padding: '16px', 
            borderRadius: 'var(--nm-radius-md)', 
            boxShadow: 'var(--nm-shadow-in)',
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            color: 'var(--nm-text)' 
          }}>
            {errorMsg}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)' }}>
            Please check the API endpoint or payload structure. The backend might be offline or returning an unexpected format.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className={styles.pageTitle}>My Profile</h1>
          <p className={styles.pageSubtitle}>Manage your account information and security</p>
        </div>
      </div>

      <div className={styles.profileLayout}>
        {/* LEFT COLUMN: Avatar & Basic Info */}
        <div className={styles.leftCol}>
          <div className={styles.nmCard}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {profile.avatarLabel || getNormalizedRole()?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <h2 className={styles.userName}>{profile.fullName || username}</h2>
              <div className={styles.roleBadge}>
                {getNormalizedRole() || profile.roleCode || 'USER'}
              </div>
            </div>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <Mail className="w-5 h-5" />
                <div>
                  <p className={styles.infoLabel}>Email</p>
                  <p className={styles.infoValue}>{profile.email || '-'}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <Building2 className="w-5 h-5" />
                <div>
                  <p className={styles.infoLabel}>Department</p>
                  <p className={styles.infoValue}>{profile.departmentName || '-'}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <Shield className="w-5 h-5" />
                <div>
                  <p className={styles.infoLabel}>Status</p>
                  <p className={cn(styles.infoValue, profile.isActive ? styles.textSuccess : styles.textDanger)}>
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Details & Change Password */}
        <div className={styles.rightCol}>
          {/* Details Form (Read Only) */}
          <div className={styles.nmCard}>
            <h2 className={styles.cardTitle}>Account Details</h2>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label>Employee Code</label>
                <div className={styles.nmInputReadonly}>
                  {profile.employeeCode || '-'}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label>Username</label>
                <div className={styles.nmInputReadonly}>
                  {username || profile.username || '-'}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label>Position</label>
                <div className={styles.nmInputReadonly}>
                  {profile.position || '-'}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label>Hire Date</label>
                <div className={styles.nmInputReadonly}>
                  {profile.hireDate ? profile.hireDate.slice(0, 10) : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className={styles.nmCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--nm-surface-deep)', boxShadow: 'var(--nm-shadow-in)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-primary)' }}>
                <Key className="w-5 h-5" />
              </div>
              <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>Change Password</h2>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 rounded-md text-sm font-semibold text-[var(--nm-danger)]" style={{ background: 'var(--nm-surface-deep)', boxShadow: 'var(--nm-shadow-in)' }}>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-md text-sm font-semibold text-[var(--nm-success)]" style={{ background: 'var(--nm-surface-deep)', boxShadow: 'var(--nm-shadow-in)' }}>
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className={styles.passwordForm}>
              <div className={styles.fieldGroup}>
                <label>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock className="w-4 h-4" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nm-text-muted)' }} />
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className={styles.nmInput}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock className="w-4 h-4" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nm-text-muted)' }} />
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className={styles.nmInput}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock className="w-4 h-4" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nm-text-muted)' }} />
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className={styles.nmInput}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className={styles.nmBtnPrimary}
                >
                  {changePasswordMutation.isPending ? 'Updating...' : <><Save className="w-4 h-4" /> Update Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
