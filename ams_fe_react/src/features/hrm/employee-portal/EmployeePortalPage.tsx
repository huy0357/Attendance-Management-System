import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Edit2, Save, X, Mail, Phone, Calendar, MapPin, Building2, Briefcase, Clock, Shield } from 'lucide-react';
import { profileApi } from '../api/hrm.api';
import { useAuth } from '../../../core/auth/AuthContext';
import styles from './EmployeePortalPage.module.scss';
import { cn } from '../../../shared/utils/cn';

const EmployeePortalPage: React.FC = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => profileApi.getMyProfile(),
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => profileApi.updateMyProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['myProfile'], data);
      setIsEditing(false);
    },
    onError: () => alert('Failed to update profile.')
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadMyAvatar(file),
    onSuccess: (data) => {
      queryClient.setQueryData(['myProfile'], data);
    },
    onError: () => alert('Failed to upload avatar.')
  });

  const handleEditToggle = () => {
    if (!isEditing && profile) {
      setFormData({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        dob: profile.dob || '',
        gender: profile.gender || '',
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      avatarMutation.mutate(file);
    }
  };

  if (isLoading) return <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6, fontWeight: 'bold' }}>Loading profile data...</div>;
  if (isError || !profile) return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--nm-danger)', fontWeight: 'bold' }}>Failed to load profile.</div>;

  return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '24px' }}>
      {/* HERO SECTION */}
      <div className={styles.portalHero}>
        <div className={styles.portalHero__banner}></div>
        <div className={styles.portalHero__content}>
          <div className={styles.portalHero__avatarWrapper}>
            <div className={styles.portalHero__avatar}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" />
              ) : (
                profile.avatarLabel
              )}
            </div>
            <label className={styles.portalHero__avatarUpload} title="Update Avatar">
              <Camera className="h-5 w-5" />
              <input type="file" ref={fileInputRef} accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} disabled={avatarMutation.isPending} />
            </label>
          </div>
          
          <div className={styles.portalHero__info}>
            <div>
              <h1 className={styles.portalHero__name}>{profile.fullName || profile.username || 'Employee'}</h1>
              <div className={styles.portalHero__role}>
                <Briefcase className="h-4 w-4" />
                <span>{profile.positionId ? `Position ID: ${profile.positionId}` : 'No Position Assigned'}</span>
                <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
                <span className={styles.portalHero__roleBadge}>{profile.roleCode || 'EMPLOYEE'}</span>
              </div>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              {isEditing ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleEditToggle} className={styles.nmBtnSecondary}>
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={updateMutation.isPending} className={styles.nmBtnPrimary}>
                    {updateMutation.isPending ? 'Saving...' : <><Save className="h-4 w-4" /> Save</>}
                  </button>
                </div>
              ) : (
                <button onClick={handleEditToggle} className={styles.nmBtnSecondary}>
                  <Edit2 className="h-4 w-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', '@media (min-width: 768px)': { gridTemplateColumns: '1fr 2fr' } } as any}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Contact INFO */}
          <div className={styles.nmCard}>
            <h2 className={styles.cardTitle}>Contact Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.contactItem}>
                <Mail className="h-5 w-5" />
                <div>
                  <p className={styles.label}>Email Address</p>
                  <p className={styles.value}>{profile.email || '-'}</p>
                </div>
              </div>
              <div className={styles.contactItem}>
                <Phone className="h-5 w-5" />
                <div style={{ width: '100%' }}>
                  <p className={styles.label}>Phone Number</p>
                  {isEditing ? (
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={styles.nmInput} style={{ marginTop: '4px' }} />
                  ) : (
                    <p className={styles.value}>{profile.phone || '-'}</p>
                  )}
                </div>
              </div>
              <div className={styles.contactItem}>
                <MapPin className="h-5 w-5" />
                <div>
                  <p className={styles.label}>Employee Code</p>
                  <p className={styles.value}>{profile.employeeCode || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className={styles.nmCard}>
            <h2 className={styles.cardTitle}>Account Security</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ padding: '8px', background: 'var(--nm-surface-deep)', borderRadius: '50%', boxShadow: 'var(--nm-shadow-in)', color: 'var(--nm-text-muted)' }}>
                     <Shield className="h-5 w-5" />
                   </div>
                   <div>
                     <p className={styles.value}>Account Status</p>
                     <p className={styles.label} style={{ marginTop: '2px', marginBottom: 0 }}>{profile.isActive ? 'Active Member' : 'Inactive'}</p>
                   </div>
                 </div>
                 <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: profile.isActive ? 'var(--nm-success)' : 'var(--nm-danger)', boxShadow: 'var(--nm-shadow-out)' }}></span>
               </div>
               <div style={{ paddingTop: '16px', borderTop: '2px solid rgba(0,0,0,0.05)' }}>
                  <p style={{ fontSize: '10px', color: 'var(--nm-text-muted)', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Contact HR to change your account linked email or password.
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* PERSONAL INFO */}
          <div className={styles.nmCard}>
            <h2 className={styles.cardTitle}>Personal Information</h2>
            <div className={styles.personalGrid}>
              <div className={styles.fieldGroup}>
                <label>Full Name</label>
                {isEditing ? (
                  <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className={styles.nmInput} />
                ) : (
                  <p>{profile.fullName || '-'}</p>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Gender</label>
                {isEditing ? (
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className={styles.nmInput}>
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                ) : (
                  <p style={{ textTransform: 'capitalize' }}>{profile.gender ? profile.gender.toLowerCase() : '-'}</p>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Date of Birth</label>
                {isEditing ? (
                  <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={styles.nmInput} />
                ) : (
                  <p>{profile.dob ? profile.dob.slice(0, 10) : '-'}</p>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Username</label>
                <p className={styles.readOnlyValue} style={{ fontFamily: 'var(--font-mono)' }}>{profile.username || '-'}</p>
              </div>
            </div>
          </div>

          {/* EMPLOYMENT INFO */}
          {hasRole('ADMIN') && (
            <div className={styles.nmCard}>
              <h2 className={styles.cardTitle}>Employment Details (Admin View)</h2>
              <div className={styles.personalGrid}>
                <div className={styles.contactItem} style={{ marginBottom: 0 }}>
                  <Building2 className="h-5 w-5" style={{ color: 'var(--nm-info)' }} />
                  <div>
                    <p className={styles.label}>Department</p>
                    <p className={styles.value}>{profile.departmentId ? `Dept ID: ${profile.departmentId}` : 'Not assigned'}</p>
                  </div>
                </div>
                <div className={styles.contactItem} style={{ marginBottom: 0 }}>
                  <Briefcase className="h-5 w-5" style={{ color: 'var(--nm-info)' }} />
                  <div>
                    <p className={styles.label}>Manager</p>
                    <p className={styles.value}>{profile.managerId ? `Manager ID: ${profile.managerId}` : 'Direct Report to Admin'}</p>
                  </div>
                </div>
                <div className={styles.contactItem} style={{ marginBottom: 0 }}>
                  <Calendar className="h-5 w-5" style={{ color: 'var(--nm-info)' }} />
                  <div>
                    <p className={styles.label}>Hire Date</p>
                    <p className={styles.value}>{profile.hireDate ? profile.hireDate.slice(0,10) : '-'}</p>
                  </div>
                </div>
                <div className={styles.contactItem} style={{ marginBottom: 0 }}>
                  <Clock className="h-5 w-5" style={{ color: 'var(--nm-info)' }} />
                  <div>
                    <p className={styles.label}>Status</p>
                    <span className={cn(styles.employmentBadge, profile.status === 'ACTIVE' ? 'active' : 'inactive')} style={{ marginTop: '4px' }}>
                      {profile.status || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.noticeBox}>
                <p>
                  Notice: Employment details are managed by HR. If you see any discrepancies, please contact your administrator.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePortalPage;
