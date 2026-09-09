import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Camera, Edit2, Save, X, Mail, Phone, Calendar, MapPin, Building2, Briefcase, Clock, Shield } from 'lucide-react';
import { profileApi, employeeApi } from '../api/hrm.api';
import { useAuth } from '../../../core/auth/AuthContext';
import { useToast } from '../../../core/toast/ToastContext';
import styles from './EmployeePortalPage.module.scss';
import { cn } from '../../../shared/utils/cn';

const EmployeePortalPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => profileApi.getMyProfile(),
    refetchOnWindowFocus: false,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => employeeApi.getDepartments(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: managerEmployee } = useQuery({
    queryKey: ['managerEmployee', profile?.managerId],
    queryFn: () => (profile?.managerId ? employeeApi.getById(profile.managerId) : null),
    enabled: !!profile?.managerId && !profile?.managerName,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => profileApi.updateMyProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['myProfile'], data);
      setIsEditing(false);
      toast.success('Cập nhật hồ sơ cá nhân thành công!');
    },
    onError: () => toast.error('Không thể cập nhật hồ sơ cá nhân.')
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadMyAvatar(file),
    onSuccess: (data) => {
      queryClient.setQueryData(['myProfile'], data);
      toast.success('Tải lên ảnh đại diện mới thành công!');
    },
    onError: () => toast.error('Tải lên ảnh đại diện thất bại.')
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
        toast.warning('Kích thước tập tin hình ảnh phải nhỏ hơn 5MB!');
        return;
      }
      avatarMutation.mutate(file);
    }
  };

  if (isLoading) return <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6, fontWeight: 'bold' }}>Loading profile data...</div>;
  if (isError || !profile) return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--nm-danger)', fontWeight: 'bold' }}>Failed to load profile.</div>;

  const departmentDisplayName =
    profile.departmentName ||
    departments.find((d: any) => d.departmentId === profile.departmentId)?.departmentName ||
    (profile.departmentId ? `Phòng ban #${profile.departmentId}` : (t('profile.notAssigned') || 'Chưa phân bổ'));

  const managerDisplayName =
    profile.managerName ||
    managerEmployee?.fullName ||
    (profile.managerId ? `Quản lý #${profile.managerId}` : (t('profile.directReport') || 'Báo cáo trực tiếp (Không có quản lý)'));

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
            <h2 className={styles.cardTitle}>{t('profile.contactInfo')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.contactItem}>
                <Mail className="h-5 w-5" />
                <div>
                  <p className={styles.label}>{t('profile.email')}</p>
                  <p className={styles.value}>{profile.email || '-'}</p>
                </div>
              </div>
              <div className={styles.contactItem}>
                <Phone className="h-5 w-5" />
                <div style={{ width: '100%' }}>
                  <p className={styles.label}>{t('profile.phone')}</p>
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
                  <p className={styles.label}>{t('profile.employeeCode')}</p>
                  <p className={styles.value}>{profile.employeeCode || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className={styles.nmCard}>
            <h2 className={styles.cardTitle}>{t('profile.accountSecurity')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ padding: '8px', background: 'var(--nm-surface-deep)', borderRadius: '50%', boxShadow: 'var(--nm-shadow-in)', color: 'var(--nm-text-muted)' }}>
                     <Shield className="h-5 w-5" />
                   </div>
                   <div>
                     <p className={styles.value}>{t('profile.accountStatus')}</p>
                     <p className={styles.label} style={{ marginTop: '2px', marginBottom: 0 }}>{profile.isActive ? t('profile.activeMember') : t('accounts.inactive')}</p>
                   </div>
                 </div>
                 <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: profile.isActive ? 'var(--nm-success)' : 'var(--nm-danger)', boxShadow: 'var(--nm-shadow-out)' }}></span>
               </div>
               <div style={{ paddingTop: '16px', borderTop: '2px solid rgba(0,0,0,0.05)' }}>
                  <p style={{ fontSize: '10px', color: 'var(--nm-text-muted)', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {t('profile.contactHrNotice')}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* PERSONAL INFO */}
          <div className={styles.nmCard}>
            <h2 className={styles.cardTitle}>{t('profile.personalInfo')}</h2>
            <div className={styles.personalGrid}>
              <div className={styles.fieldGroup}>
                <label>{t('profile.fullName')}</label>
                {isEditing ? (
                  <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className={styles.nmInput} />
                ) : (
                  <p>{profile.fullName || '-'}</p>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>{t('profile.gender')}</label>
                {isEditing ? (
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className={styles.nmInput}>
                    <option value="">Select Gender</option>
                    <option value="MALE">{t('profile.male')}</option>
                    <option value="FEMALE">{t('profile.female')}</option>
                    <option value="OTHER">Other</option>
                  </select>
                ) : (
                  <p style={{ textTransform: 'capitalize' }}>
                    {(profile.gender || '').toUpperCase() === 'MALE' ? t('profile.male') : (profile.gender || '').toUpperCase() === 'FEMALE' ? t('profile.female') : profile.gender || '-'}
                  </p>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>{t('profile.dateOfBirth')}</label>
                {isEditing ? (
                  <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={styles.nmInput} />
                ) : (
                  <p>{profile.dob ? profile.dob.slice(0, 10) : '-'}</p>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>{t('profile.username')}</label>
                <p className={styles.readOnlyValue} style={{ fontFamily: 'var(--font-mono)' }}>{profile.username || '-'}</p>
              </div>
            </div>
          </div>

          {/* EMPLOYMENT INFO */}
          {hasRole('ADMIN') && (
            <div className={styles.nmCard}>
              <h2 className={styles.cardTitle}>{t('profile.employmentTitle')}</h2>
              <div className={styles.personalGrid}>
                <div className={styles.contactItem} style={{ marginBottom: 0 }}>
                  <Building2 className="h-5 w-5" style={{ color: 'var(--nm-info)' }} />
                  <div>
                    <p className={styles.label}>{t('profile.department')}</p>
                    <p className={styles.value}>{departmentDisplayName}</p>
                  </div>
                </div>
                <div className={styles.contactItem} style={{ marginBottom: 0 }}>
                  <Briefcase className="h-5 w-5" style={{ color: 'var(--nm-info)' }} />
                  <div>
                    <p className={styles.label}>{t('profile.manager')}</p>
                    <p className={styles.value}>{managerDisplayName}</p>
                  </div>
                </div>
                <div className={styles.contactItem} style={{ marginBottom: 0 }}>
                  <Calendar className="h-5 w-5" style={{ color: 'var(--nm-info)' }} />
                  <div>
                    <p className={styles.label}>{t('profile.hireDate')}</p>
                    <p className={styles.value}>{profile.hireDate ? profile.hireDate.slice(0,10) : '-'}</p>
                  </div>
                </div>
                <div className={styles.contactItem} style={{ marginBottom: 0 }}>
                  <Clock className="h-5 w-5" style={{ color: 'var(--nm-info)' }} />
                  <div>
                    <p className={styles.label}>{t('profile.status')}</p>
                    <span className={cn(styles.employmentBadge, profile.status === 'ACTIVE' ? 'active' : 'inactive')} style={{ marginTop: '4px' }}>
                      {profile.status === 'ACTIVE' ? t('accounts.active') : profile.status || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.noticeBox}>
                <p>
                  {t('profile.notice')}
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
