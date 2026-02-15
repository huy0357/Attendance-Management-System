import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Density = 'compact' | 'comfortable' | 'spacious';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private densitySubject = new BehaviorSubject<Density>('comfortable');
  density$ = this.densitySubject.asObservable();

  setDensity(density: Density): void {
    this.densitySubject.next(density);
  }

  getDensity(): Density {
    return this.densitySubject.value;
  }
}
