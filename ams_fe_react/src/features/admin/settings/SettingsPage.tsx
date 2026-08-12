import React from 'react';
import { Palette, Sun, Moon, LayoutDashboard, RefreshCw, Globe } from 'lucide-react';
import styles from './SettingsPage.module.scss';
import { cn } from '../../../shared/utils/cn';
import { useSettings } from '../../../shared/hooks/useSettings';
import { useTranslation } from 'react-i18next';

const SettingsPage: React.FC = () => {
  const { theme, setTheme, compactSidebar, setCompactSidebar, reduceMotion, setReduceMotion, language, setLanguage, reset } = useSettings();
  const { t } = useTranslation();

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
