import { Pipe, PipeTransform } from '@angular/core';
import * as heroiconsOutline from '@ng-icons/heroicons/outline';

/**
 * Converts lucide icon names (kebab-case) to ng-icons heroicons Outline ids (camelCase with `hero` prefix).
 *
 * Note: For some lucide names that don't have a 1:1 heroicons semantic match, we keep a small exception map.
 * For unknown icons, we still apply the generic conversion so icons can render when a matching hero icon exists.
 */
@Pipe({
  name: 'lucideToHeroicon',
  standalone: false,
})
export class LucideToHeroiconPipe implements PipeTransform {
  private readonly fallbackIcon = 'heroQuestionMarkCircle';
  private readonly availableIcons = new Set(Object.keys(heroiconsOutline as unknown as Record<string, string>));
  private readonly exceptions: Record<string, string> = {
    'map-pin': 'heroMapPin',
    users: 'heroUsers',
    'user': 'heroUser',
    'check-circle': 'heroCheckCircle',
    clock: 'heroClock',
    'alert-triangle': 'heroExclamationTriangle',
    'triangle-alert': 'heroExclamationTriangle',
    'alert-circle': 'heroExclamationCircle',
    'x-circle': 'heroXCircle',
    'check': 'heroCheck',
    'x': 'heroXMark',
    eye: 'heroEye',
    'eye-off': 'heroEyeSlash',
    edit: 'heroPencilSquare',
    'edit-2': 'heroPencilSquare',
    trash: 'heroTrash',
    'trash-2': 'heroTrash',
    pencil: 'heroPencilSquare',
    'pencil-square': 'heroPencilSquare',
    'arrow-right': 'heroArrowRight',
    search: 'heroMagnifyingGlass',
    download: 'heroArrowDownTray',
    filter: 'heroFunnel',
    'dollar-sign': 'heroCurrencyDollar',
    'file-text': 'heroDocumentText',
    save: 'heroBookmarkSquare',
    send: 'heroPaperAirplane',
    table: 'heroTableCells',
    'pie-chart': 'heroChartPie',
    calculator: 'heroCalculator',
    database: 'heroCircleStack',
    smartphone: 'heroDevicePhoneMobile',
    shield: 'heroShieldCheck',
    lock: 'heroLockClosed',
    unlock: 'heroLockOpen',
    building: 'heroBuildingOffice2',
    map: 'heroMap',
    'hard-drive': 'heroServerStack',
    'user-plus': 'heroUserPlus',
    'user-minus': 'heroUserMinus',
    target: 'heroCursorArrowRays',
    key: 'heroKey',
    zap: 'heroBolt',
    'refresh-cw': 'heroArrowPath',
    'log-out': 'heroArrowRightOnRectangle',
    'layout-dashboard': 'heroSquares2x2',
    languages: 'heroGlobeAlt',
    palette: 'heroPaintBrush',
    sun: 'heroSun',
    moon: 'heroMoon',
    'chevron-right': 'heroChevronRight',
    'chevron-down': 'heroChevronDown',
    'zoom-in': 'heroMagnifyingGlassPlus',
    'zoom-out': 'heroMagnifyingGlassMinus',
    'maximize-2': 'heroArrowsPointingOut',
    play: 'heroPlay',
    plus: 'heroPlus',
    mail: 'heroEnvelope',
    'loader-circle': 'heroArrowPath',
    activity: 'heroChartBar',
    'trending-up': 'heroArrowTrendingUp',
    'trending-down': 'heroArrowTrendingDown',
  };

  transform(value: string | null | undefined): string {
    if (!value) return this.fallbackIcon;

    const v = String(value).trim();
    if (!v) return this.fallbackIcon;
    if (v.startsWith('hero')) {
      return this.availableIcons.has(v) ? v : this.fallbackIcon;
    }

    const direct = this.exceptions[v];
    if (direct) {
      return this.availableIcons.has(direct) ? direct : this.fallbackIcon;
    }

    // Generic conversion: kebab-case -> PascalCase, then prefix with `hero`.
    const normalized = v.replace(/_/g, '-');
    const parts = normalized.split('-').filter(Boolean);
    const camel = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

    const derived = 'hero' + camel;
    return this.availableIcons.has(derived) ? derived : this.fallbackIcon;
  }
}

