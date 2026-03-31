import { Component, inject } from '@angular/core';
import {
  LanguageMode,
  SettingsService,
  ThemeMode,
  TimeFormatMode,
} from './settings.service';

@Component({
  standalone: false,
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);

  readonly theme$ = this.settingsService.theme$;
  readonly language$ = this.settingsService.language$;
  readonly timeFormat$ = this.settingsService.timeFormat$;
  readonly compactSidebar$ = this.settingsService.compactSidebar$;
  readonly reduceMotion$ = this.settingsService.reduceMotion$;

  setTheme(theme: ThemeMode): void {
    this.settingsService.setTheme(theme);
  }

  setLanguage(language: LanguageMode): void {
    this.settingsService.setLanguage(language);
  }

  setTimeFormat(timeFormat: TimeFormatMode): void {
    this.settingsService.setTimeFormat(timeFormat);
  }

  toggleCompactSidebar(compactSidebar: boolean): void {
    this.settingsService.setCompactSidebar(compactSidebar);
  }

  onCompactSidebarChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.toggleCompactSidebar(target.checked);
  }

  toggleReduceMotion(reduceMotion: boolean): void {
    this.settingsService.setReduceMotion(reduceMotion);
  }

  onReduceMotionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.toggleReduceMotion(target.checked);
  }

  resetPreferences(): void {
    this.settingsService.reset();
  }
}
