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
import i18n from '../../core/i18n';

export type ThemeMode = 'light' | 'dark';
export type LanguageCode = 'en' | 'vi';
export type GracePeriod = 5 | 10 | 15;
export type AutoAbsentThreshold = 30 | 60 | 90 | 120;
export type RoundingRule = 0 | 15 | 30;

interface SettingsState {
  theme: ThemeMode;
  compactSidebar: boolean;
  reduceMotion: boolean;
  language: LanguageCode;
  gracePeriod: GracePeriod;
  autoAbsentThreshold: AutoAbsentThreshold;
  roundingRule: RoundingRule;
  requireGps: boolean;
}

interface SettingsContextValue extends SettingsState {
  setTheme: (theme: ThemeMode) => void;
  setCompactSidebar: (compact: boolean) => void;
  setReduceMotion: (reduce: boolean) => void;
  setLanguage: (language: LanguageCode) => void;
  setGracePeriod: (minutes: GracePeriod) => void;
  setAutoAbsentThreshold: (minutes: AutoAbsentThreshold) => void;
  setRoundingRule: (rule: RoundingRule) => void;
  setRequireGps: (require: boolean) => void;
  reset: () => void;
}

const STORAGE_KEY = 'ams.settings.preferences';

const DEFAULT_STATE: SettingsState = {
  theme: 'light',
  compactSidebar: false,
  reduceMotion: false,
  language: 'en',
  gracePeriod: 15,
  autoAbsentThreshold: 60,
  roundingRule: 15,
  requireGps: false,
};

function readPersistedState(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      theme: parsed.theme === 'dark' ? 'dark' : DEFAULT_STATE.theme,
      compactSidebar:
        typeof parsed.compactSidebar === 'boolean'
          ? parsed.compactSidebar
          : DEFAULT_STATE.compactSidebar,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : DEFAULT_STATE.reduceMotion,
      language: parsed.language === 'vi' ? 'vi' : DEFAULT_STATE.language,
      gracePeriod: [5, 10, 15].includes(parsed.gracePeriod as number) ? (parsed.gracePeriod as GracePeriod) : DEFAULT_STATE.gracePeriod,
      autoAbsentThreshold: [30, 60, 90, 120].includes(parsed.autoAbsentThreshold as number) ? (parsed.autoAbsentThreshold as AutoAbsentThreshold) : DEFAULT_STATE.autoAbsentThreshold,
      roundingRule: [0, 15, 30].includes(parsed.roundingRule as number) ? (parsed.roundingRule as RoundingRule) : DEFAULT_STATE.roundingRule,
      requireGps: typeof parsed.requireGps === 'boolean' ? parsed.requireGps : DEFAULT_STATE.requireGps,
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
  root.dataset.sidebar = state.compactSidebar ? 'compact' : 'default';
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
    if (i18n.language !== state.language) {
      i18n.changeLanguage(state.language);
    }
  }, [state]);

  const setTheme = useCallback((theme: ThemeMode) => persist({ ...state, theme }), [state, persist]);
  const setCompactSidebar = useCallback(
    (compactSidebar: boolean) => persist({ ...state, compactSidebar }),
    [state, persist],
  );
  const setReduceMotion = useCallback(
    (reduceMotion: boolean) => persist({ ...state, reduceMotion }),
    [state, persist],
  );
  const setLanguage = useCallback((language: LanguageCode) => {
    i18n.changeLanguage(language);
    persist({ ...state, language });
  }, [state, persist]);

  const setGracePeriod = useCallback(
    (gracePeriod: GracePeriod) => persist({ ...state, gracePeriod }),
    [state, persist],
  );
  const setAutoAbsentThreshold = useCallback(
    (autoAbsentThreshold: AutoAbsentThreshold) => persist({ ...state, autoAbsentThreshold }),
    [state, persist],
  );
  const setRoundingRule = useCallback(
    (roundingRule: RoundingRule) => persist({ ...state, roundingRule }),
    [state, persist],
  );
  const setRequireGps = useCallback(
    (requireGps: boolean) => persist({ ...state, requireGps }),
    [state, persist],
  );

  const reset = useCallback(() => {
    i18n.changeLanguage(DEFAULT_STATE.language);
    persist(DEFAULT_STATE);
  }, [persist]);

  const value = useMemo(
    () => ({
      ...state,
      setTheme,
      setCompactSidebar,
      setReduceMotion,
      setLanguage,
      setGracePeriod,
      setAutoAbsentThreshold,
      setRoundingRule,
      setRequireGps,
      reset,
    }),
    [
      state,
      setTheme,
      setCompactSidebar,
      setReduceMotion,
      setLanguage,
      setGracePeriod,
      setAutoAbsentThreshold,
      setRoundingRule,
      setRequireGps,
      reset,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
};
