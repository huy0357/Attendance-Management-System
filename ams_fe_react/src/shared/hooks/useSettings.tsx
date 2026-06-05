/**
 * SECURITY NOTE — localStorage usage in this file is INTENTIONAL and safe.
 *
 * Storage key: `ams.settings.preferences`
 * Contents:    Non-sensitive UI preferences only:
 *              { theme, language, timeFormat, compactSidebar, reduceMotion }
 *
 * This key NEVER holds authentication tokens, API keys, or user PII.
 *
 * These preferences intentionally SURVIVE logout — wiping them on logout would
 * degrade UX with zero security benefit. The AuthContext.logout() function
 * deliberately does NOT call localStorage.clear() for this reason.
 *
 * ⚠️  DO NOT store auth tokens (accessToken, refreshToken) in this hook.
 * ⚠️  DO NOT read from this key in any authentication flow.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ── Types (mirrors Angular SettingsService) ───────────────────────────────────
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

interface SettingsContextValue extends SettingsState {
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: LanguageMode) => void;
  setTimeFormat: (timeFormat: TimeFormatMode) => void;
  setCompactSidebar: (compact: boolean) => void;
  setReduceMotion: (reduce: boolean) => void;
  reset: () => void;
}

const STORAGE_KEY = 'ams.settings.preferences';

const DEFAULT_STATE: SettingsState = {
  theme: 'light',
  language: 'en',
  timeFormat: '24h',
  compactSidebar: false,
  reduceMotion: false,
};

function readPersistedState(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      theme: parsed.theme === 'dark' ? 'dark' : DEFAULT_STATE.theme,
      language: parsed.language === 'vi' ? 'vi' : DEFAULT_STATE.language,
      timeFormat: parsed.timeFormat === '12h' ? '12h' : DEFAULT_STATE.timeFormat,
      compactSidebar:
        typeof parsed.compactSidebar === 'boolean'
          ? parsed.compactSidebar
          : DEFAULT_STATE.compactSidebar,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : DEFAULT_STATE.reduceMotion,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function applyDomState(state: SettingsState): void {
  const root = document.documentElement;
  const body = document.body;
  root.classList.toggle('dark', state.theme === 'dark');
  body.classList.toggle('dark', state.theme === 'dark');
  root.classList.toggle('reduced-motion', state.reduceMotion);
  body.classList.toggle('reduced-motion', state.reduceMotion);
  root.dataset.timeFormat = state.timeFormat;
  root.dataset.sidebar = state.compactSidebar ? 'compact' : 'default';
  root.lang = state.language === 'vi' ? 'vi' : 'en';
}

// ── Context ───────────────────────────────────────────────────────────────────
export const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SettingsState>(() => {
    const s = readPersistedState();
    applyDomState(s);
    return s;
  });

  const persist = useCallback((next: SettingsState) => {
    applyDomState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  }, []);

  useEffect(() => {
    applyDomState(state);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((theme: ThemeMode) => persist({ ...state, theme }), [state, persist]);
  const setLanguage = useCallback((language: LanguageMode) => persist({ ...state, language }), [state, persist]);
  const setTimeFormat = useCallback((timeFormat: TimeFormatMode) => persist({ ...state, timeFormat }), [state, persist]);
  const setCompactSidebar = useCallback((compactSidebar: boolean) => persist({ ...state, compactSidebar }), [state, persist]);
  const setReduceMotion = useCallback((reduceMotion: boolean) => persist({ ...state, reduceMotion }), [state, persist]);
  const reset = useCallback(() => persist(DEFAULT_STATE), [persist]);

  const value = useMemo<SettingsContextValue>(
    () => ({ ...state, setTheme, setLanguage, setTimeFormat, setCompactSidebar, setReduceMotion, reset }),
    [state, setTheme, setLanguage, setTimeFormat, setCompactSidebar, setReduceMotion, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
};
