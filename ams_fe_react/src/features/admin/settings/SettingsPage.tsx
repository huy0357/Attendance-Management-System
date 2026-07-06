import React, { useEffect, useState } from 'react';
import { Palette, Sun, Moon, Languages, LayoutDashboard, RefreshCw } from 'lucide-react';
import styles from './SettingsPage.module.scss';
import { cn } from '../../../shared/utils/cn';

export type ThemeMode = 'light' | 'dark';
export type LanguageMode = 'vi' | 'en';
export type TimeFormatMode = '12h' | '24h';

interface SettingsState {
  theme: ThemeMode;
  language: LanguageMode;
  timeFormat: TimeFormatMode;
  compactSidebar: boolean;
  reduceMotion: boolean;
}

const defaultState: SettingsState = {
  theme: 'light',
  language: 'en',
  timeFormat: '12h',
  compactSidebar: false,
  reduceMotion: false,
};

/**
 * SECURITY NOTE — localStorage usage in this component is INTENTIONAL and safe.
 * This key stores only non-sensitive UI preferences (theme, language, etc.).
 * It NEVER holds authentication tokens or user credentials.
 * ⚠️  DO NOT add auth-related data to this storage key.
 */
const storageKey = 'ams.settings.preferences';

const SettingsPage: React.FC = () => {
  // 1. KHỞI TẠO STATE & ĐỌC TỪ LOCAL STORAGE KHI MOUNT
  const [settings, setSettings] = useState<SettingsState>(() => {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          return {
            theme: parsed.theme === 'dark' ? 'dark' : defaultState.theme,
            language: parsed.language === 'vi' ? 'vi' : defaultState.language,
            timeFormat: parsed.timeFormat === '24h' ? '24h' : defaultState.timeFormat,
            compactSidebar: typeof parsed.compactSidebar === 'boolean' ? parsed.compactSidebar : defaultState.compactSidebar,
            reduceMotion: typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : defaultState.reduceMotion,
          };
        } catch {
          return defaultState;
        }
      }
    }
    return defaultState;
  });

  // 2. EFFECT: ĐỒNG BỘ LOCAL STORAGE VÀ ÁP Class css CHO DARK THEME/DOM
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Gán/khắc class dark vào document
    root.classList.toggle('dark', settings.theme === 'dark');
    body.classList.toggle('dark', settings.theme === 'dark');
    
    // Gán DOM để toàn app nhận diện (tùy chọn)
    root.classList.toggle('reduced-motion', settings.reduceMotion);
    body.classList.toggle('reduced-motion', settings.reduceMotion);
    root.dataset['timeFormat'] = settings.timeFormat;
    root.dataset['sidebar'] = settings.compactSidebar ? 'compact' : 'default';
    root.lang = settings.language;

    // Lưu ngay xuống localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    }
    
    // Bắn event nều các component Header/Sidebar cần lắng nghe
    window.dispatchEvent(new Event('ams:settings-changed'));
  }, [settings]);

  // 3. CÁC HÀM HANDLER RIÊNG BIỆT (XỬ LÝ CLICK TỪNG NHÓM)
  const handleThemeChange = (mode: ThemeMode) => {
    setSettings(prev => ({ ...prev, theme: mode }));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, language: e.target.value as LanguageMode }));
  };

  const handleFormatChange = (format: TimeFormatMode) => {
    setSettings(prev => ({ ...prev, timeFormat: format }));
  };

  const handleCompactSidebarToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, compactSidebar: e.target.checked }));
  };

  const handleReduceMotionToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, reduceMotion: e.target.checked }));
  };

  // 4. RESET DEFAULTS
  const handleResetDefaults = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
    setSettings(defaultState);
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
                className={cn(styles.option, settings.theme === 'light' ? styles.active : '')}
                onClick={() => handleThemeChange('light')}
              >
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                className={cn(styles.option, settings.theme === 'dark' ? styles.active : '')}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </section>

        {/* === NHÓM 2: LOCALE & TIME === */}
        <section className={styles.nmCard}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper} style={{ color: 'var(--nm-success)' }}>
              <Languages className="w-6 h-6" />
            </div>
            <div>
              <h2>Language &amp; Region</h2>
              <p>Keep labels and time displays aligned with your preferences.</p>
            </div>
          </div>

          <div className={styles.settingsBlock} style={{ paddingBottom: '16px', borderBottom: '2px solid rgba(0,0,0,0.02)' }}>
            <h3>Display Language</h3>
            <p>Select your interface language.</p>
            <select
              className={styles.nmInput}
              value={settings.language}
              onChange={handleLanguageChange}
            >
              <option value="en">English (US)</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>

          <div className={styles.settingsBlock}>
            <h3>Time Format</h3>
            <p>Timestamps can be shown with AM/PM labels or 24-hour style.</p>
            
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={cn(styles.option, settings.timeFormat === '12h' ? styles.active : '')}
                onClick={() => handleFormatChange('12h')}
              >
                <span>12-hour (08:15 PM)</span>
              </button>

              <button
                type="button"
                className={cn(styles.option, settings.timeFormat === '24h' ? styles.active : '')}
                onClick={() => handleFormatChange('24h')}
              >
                <span>24-hour (20:15)</span>
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
                checked={settings.compactSidebar}
                onChange={handleCompactSidebarToggle}
              />
              <span className={styles.track}></span>
              <span className={styles.label}>{settings.compactSidebar ? 'ON' : 'OFF'}</span>
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
                checked={settings.reduceMotion}
                onChange={handleReduceMotionToggle}
              />
              <span className={styles.track}></span>
              <span className={styles.label}>{settings.reduceMotion ? 'ON' : 'OFF'}</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
