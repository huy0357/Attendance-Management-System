import React from 'react';
import { Palette, Sun, Moon, LayoutDashboard, RefreshCw } from 'lucide-react';
import styles from './SettingsPage.module.scss';
import { cn } from '../../../shared/utils/cn';
import { useSettings } from '../../../shared/hooks/useSettings';

const SettingsPage: React.FC = () => {
  const { theme, setTheme, compactSidebar, setCompactSidebar, reduceMotion, setReduceMotion, reset } = useSettings();

  const handleResetDefaults = () => {
    reset();
  };

  return (
    <div className="space-y-6 pb-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className={styles.settingsHeader}>
        <div>
          <h1 className={styles.pageTitle}>Preferences &amp; Settings</h1>
          <p className={styles.pageSubtitle}>Customize your workspace experience. Saved locally.</p>
        </div>
        <button className={styles.nmBtnSecondary} onClick={handleResetDefaults}>
          <RefreshCw className="h-4 w-4" />
          Reset Defaults
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
              <h2>Appearance</h2>
              <p>Choose how AMS looks and feels in your browser.</p>
            </div>
          </div>

          <div className={styles.settingsBlock}>
            <h3>Theme Mode</h3>
            <p>Switch between day mode and dark canvas.</p>
            
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={cn(styles.option, theme === 'light' ? styles.active : '')}
                onClick={() => setTheme('light')}
              >
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                className={cn(styles.option, theme === 'dark' ? styles.active : '')}
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </section>

        {/* === NHÓM 2: LAYOUT OPTIONS === */}
        <section className={styles.nmCard}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper} style={{ color: 'var(--nm-info)' }}>
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h2>Layout &amp; Animation Options</h2>
              <p>Trim the sidebar down and manage heavy effects.</p>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '14px', fontWeight: 'bold' }}>Compact Sidebar</h3>
              <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)', maxWidth: '300px' }}>
                Hides descriptive text for a denser layout.
              </p>
            </div>
            
            <label className={styles.nmSwitch}>
              <input
                type="checkbox"
                checked={compactSidebar}
                onChange={(e) => setCompactSidebar(e.target.checked)}
              />
              <span className={styles.track}></span>
              <span className={styles.label}>{compactSidebar ? 'ON' : 'OFF'}</span>
            </label>
          </div>

          <div className={styles.toggleRow}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '14px', fontWeight: 'bold' }}>Reduce Motion</h3>
              <p style={{ fontSize: '12px', color: 'var(--nm-text-muted)', maxWidth: '300px' }}>
                Suppress decorative transitions and movement-heavy effects.
              </p>
            </div>
            
            <label className={styles.nmSwitch}>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
              />
              <span className={styles.track}></span>
              <span className={styles.label}>{reduceMotion ? 'ON' : 'OFF'}</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
