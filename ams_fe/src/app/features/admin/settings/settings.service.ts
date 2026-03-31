import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storageKey = 'ams.settings.preferences';
  private readonly defaultState: SettingsState = {
    theme: 'light',
    language: 'en',
    timeFormat: '24h',
    compactSidebar: false,
    reduceMotion: false,
  };

  private readonly themeSubject = new BehaviorSubject<ThemeMode>(this.defaultState.theme);
  private readonly languageSubject = new BehaviorSubject<LanguageMode>(this.defaultState.language);
  private readonly timeFormatSubject = new BehaviorSubject<TimeFormatMode>(this.defaultState.timeFormat);
  private readonly compactSidebarSubject = new BehaviorSubject<boolean>(this.defaultState.compactSidebar);
  private readonly reduceMotionSubject = new BehaviorSubject<boolean>(this.defaultState.reduceMotion);

  readonly theme$ = this.themeSubject.asObservable();
  readonly language$ = this.languageSubject.asObservable();
  readonly timeFormat$ = this.timeFormatSubject.asObservable();
  readonly compactSidebar$ = this.compactSidebarSubject.asObservable();
  readonly reduceMotion$ = this.reduceMotionSubject.asObservable();

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const savedState = this.readState();
    this.themeSubject.next(savedState.theme);
    this.languageSubject.next(savedState.language);
    this.timeFormatSubject.next(savedState.timeFormat);
    this.compactSidebarSubject.next(savedState.compactSidebar);
    this.reduceMotionSubject.next(savedState.reduceMotion);
    this.applyDomState(savedState);
  }

  get theme(): ThemeMode {
    return this.themeSubject.value;
  }

  get language(): LanguageMode {
    return this.languageSubject.value;
  }

  get timeFormat(): TimeFormatMode {
    return this.timeFormatSubject.value;
  }

  get compactSidebar(): boolean {
    return this.compactSidebarSubject.value;
  }

  get reduceMotion(): boolean {
    return this.reduceMotionSubject.value;
  }

  setTheme(theme: ThemeMode): void {
    this.themeSubject.next(theme);
    this.persistState();
  }

  setLanguage(language: LanguageMode): void {
    this.languageSubject.next(language);
    this.persistState();
  }

  setTimeFormat(timeFormat: TimeFormatMode): void {
    this.timeFormatSubject.next(timeFormat);
    this.persistState();
  }

  setCompactSidebar(compactSidebar: boolean): void {
    this.compactSidebarSubject.next(compactSidebar);
    this.persistState();
  }

  setReduceMotion(reduceMotion: boolean): void {
    this.reduceMotionSubject.next(reduceMotion);
    this.persistState();
  }

  reset(): void {
    this.themeSubject.next(this.defaultState.theme);
    this.languageSubject.next(this.defaultState.language);
    this.timeFormatSubject.next(this.defaultState.timeFormat);
    this.compactSidebarSubject.next(this.defaultState.compactSidebar);
    this.reduceMotionSubject.next(this.defaultState.reduceMotion);
    this.persistState();
  }

  private persistState(): void {
    const state = this.snapshot();
    this.applyDomState(state);

    if (!this.hasLocalStorage()) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private snapshot(): SettingsState {
    return {
      theme: this.themeSubject.value,
      language: this.languageSubject.value,
      timeFormat: this.timeFormatSubject.value,
      compactSidebar: this.compactSidebarSubject.value,
      reduceMotion: this.reduceMotionSubject.value,
    };
  }

  private readState(): SettingsState {
    if (!this.hasLocalStorage()) {
      return this.defaultState;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return this.defaultState;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      return {
        theme: parsed.theme === 'dark' ? 'dark' : this.defaultState.theme,
        language: parsed.language === 'vi' ? 'vi' : this.defaultState.language,
        timeFormat: parsed.timeFormat === '12h' ? '12h' : this.defaultState.timeFormat,
        compactSidebar: typeof parsed.compactSidebar === 'boolean'
          ? parsed.compactSidebar
          : this.defaultState.compactSidebar,
        reduceMotion: typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : this.defaultState.reduceMotion,
      };
    } catch {
      return this.defaultState;
    }
  }

  private applyDomState(state: SettingsState): void {
    const root = this.document.documentElement;
    const body = this.document.body;

    root.classList.toggle('dark', state.theme === 'dark');
    body.classList.toggle('dark', state.theme === 'dark');
    root.classList.toggle('reduced-motion', state.reduceMotion);
    body.classList.toggle('reduced-motion', state.reduceMotion);
    root.dataset['timeFormat'] = state.timeFormat;
    root.dataset['sidebar'] = state.compactSidebar ? 'compact' : 'default';
    root.lang = state.language === 'vi' ? 'vi' : 'en';
  }

  private hasLocalStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
