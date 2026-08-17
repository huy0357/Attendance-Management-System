import React from 'react';
import { Palette, Sun, Moon, LayoutDashboard, RefreshCw, Globe, Shield, Clock } from 'lucide-react';
import styles from './SettingsPage.module.scss';
import { cn } from '../../../shared/utils/cn';
import { useSettings, GracePeriod, AutoAbsentThreshold, RoundingRule } from '../../../shared/hooks/useSettings';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTranslation } from 'react-i18next';

const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    compactSidebar,
    setCompactSidebar,
    reduceMotion,
    setReduceMotion,
    language,
    setLanguage,
    gracePeriod,
    setGracePeriod,
    autoAbsentThreshold,
    setAutoAbsentThreshold,
    reset,
  } = useSettings();
  const { hasRole } = useAuth();
  const { t } = useTranslation();

  const isSuperAdmin = hasRole('ADMIN');

  const handleResetDefaults = () => {
    reset();
  };

  return (
    <div className="space-y-6 pb-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className={styles.settingsHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t('settings.title')}</h1>
          <p className={styles.pageSubtitle}>{t('settings.subtitle')}</p>
        </div>
        <button className={styles.nmBtnSecondary} onClick={handleResetDefaults}>
          <RefreshCw className="h-4 w-4" />
          {t('settings.reset')}
        </button>
      </div>

      <div className={styles.settingsGrid}>
        {/* === NHÓM 0: ATTENDANCE POLICY (SUPER ADMIN ONLY) === */}
        {isSuperAdmin && (
          <section className={styles.nmCard} style={{ border: '1px solid rgba(0, 102, 102, 0.2)' }}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper} style={{ color: 'var(--nm-primary, #006666)' }}>
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2>{t('settings.attendancePolicy')}</h2>
                  <span className={styles.adminBadge}>
                    <Shield className="w-3.5 h-3.5" />
                    {t('settings.superAdminBadge')}
                  </span>
                </div>
                <p>{t('settings.attendancePolicyDesc')}</p>
              </div>
            </div>

            {/* 1. Grace Period */}
            <div className={styles.settingsBlock}>
              <h3>{t('settings.gracePeriodTitle')}</h3>
              <p>{t('settings.gracePeriodDesc')}</p>
              <div className={styles.segmentedControl}>
                {[5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={cn(styles.option, gracePeriod === mins ? styles.active : '')}
                    onClick={() => setGracePeriod(mins as GracePeriod)}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{mins} {t('settings.minutes')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Auto Absent Threshold */}
            <div className={styles.settingsBlock}>
              <h3>{t('settings.autoAbsentTitle')}</h3>
              <p>{t('settings.autoAbsentDesc')}</p>
              <div className={styles.segmentedControl}>
                {[30, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={cn(styles.option, autoAbsentThreshold === mins ? styles.active : '')}
                    onClick={() => setAutoAbsentThreshold(mins as AutoAbsentThreshold)}
                  >
                    <span>{mins} {t('settings.minutes')}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* === NHÓM 1: APPEARANCE (THEME) === */}
        <section className={styles.nmCard}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper} style={{ color: 'var(--nm-warning)' }}>
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h2>{t('settings.appearance')}</h2>
              <p>{t('settings.appearanceDesc')}</p>
            </div>
          </div>

          <div className={styles.settingsBlock}>
            <h3>{t('settings.themeMode')}</h3>
            <p>{t('settings.themeDesc')}</p>

            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={cn(styles.option, theme === 'light' ? styles.active : '')}
                onClick={() => setTheme('light')}
              >
                <Sun className="w-4 h-4" />
                <span>{t('settings.lightMode')}</span>
              </button>

              <button
                type="button"
                className={cn(styles.option, theme === 'dark' ? styles.active : '')}
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-4 h-4" />
                <span>{t('settings.darkMode')}</span>
              </button>
            </div>
          </div>
        </section>

        {/* === NHÓM 2: LANGUAGE === */}
        <section className={styles.nmCard}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper} style={{ color: 'var(--nm-success)' }}>
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2>{t('settings.language')}</h2>
              <p>{t('settings.languageDesc')}</p>
            </div>
          </div>

          <div className={styles.settingsBlock}>
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={cn(styles.option, language === 'en' ? styles.active : '')}
                onClick={() => setLanguage('en')}
              >
                <span>{t('settings.langEn')}</span>
              </button>

              <button
                type="button"
                className={cn(styles.option, language === 'vi' ? styles.active : '')}
                onClick={() => setLanguage('vi')}
              >
                <span>{t('settings.langVi')}</span>
              </button>
            </div>
          </div>
        </section>

        {/* === NHÓM 3: LAYOUT OPTIONS === */}
        <section className={styles.nmCard}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper} style={{ color: 'var(--nm-info)' }}>
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h2>{t('settings.layout')}</h2>
              <p>{t('settings.layoutDesc')}</p>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '14px', fontWeight: 'bold' }}>{t('settings.compactSidebar')}</h3>
              <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)', maxWidth: '300px' }}>
                {t('settings.compactDesc')}
              </p>
            </div>
            
            <label className={styles.nmSwitch}>
              <input
                type="checkbox"
                checked={compactSidebar}
                onChange={(e) => setCompactSidebar(e.target.checked)}
              />
              <span className={styles.track}></span>
              <span className={styles.label}>{compactSidebar ? t('settings.statusOn') : t('settings.statusOff')}</span>
            </label>
          </div>

          <div className={styles.toggleRow}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '14px', fontWeight: 'bold' }}>{t('settings.reduceMotion')}</h3>
              <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)', maxWidth: '300px' }}>
                {t('settings.reduceMotionDesc')}
              </p>
            </div>
            
            <label className={styles.nmSwitch}>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
              />
              <span className={styles.track}></span>
              <span className={styles.label}>{reduceMotion ? t('settings.statusOn') : t('settings.statusOff')}</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
