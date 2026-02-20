import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService, ShiftTemplateResponse } from '../attendance.service';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';

type EditMode = 'create' | 'edit';

@Component({
  standalone: false,
  selector: 'app-shift-templates',
  templateUrl: './shift-templates.component.html',
  styleUrls: ['./shift-templates.component.scss'],
})
export class ShiftTemplatesComponent implements OnInit, OnDestroy {
  templates: ShiftTemplateResponse[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  // BehaviorSubject emits immediately on subscribe — no startWith needed
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly destroy$ = new Subject<void>();

  filterForm: FormGroup;
  form: FormGroup;

  showForm = false;
  mode: EditMode = 'create';
  selectedId: number | null = null;

  constructor(
    private attendanceService: AttendanceService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.filterForm = this.fb.group({
      q: [''],
      active: [''],
    });

    this.form = this.fb.group({
      shiftCode: ['', [Validators.required, Validators.maxLength(50)]],
      shiftName: ['', [Validators.required, Validators.maxLength(255)]],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      breakMinutes: [0, [Validators.required, Validators.min(0)]],
      graceInMinutes: [0, [Validators.required, Validators.min(0)]],
      graceOutMinutes: [0, [Validators.required, Validators.min(0)]],
      isNightShift: [false, Validators.required],
      minWorkMinutes: [1, [Validators.required, Validators.min(1)]],
      isActive: [true, Validators.required],
    });
  }

  get totalTemplates(): number {
    return this.templates.length;
  }

  get activeCount(): number {
    return this.templates.filter(template => template.isActive).length;
  }

  get inactiveCount(): number {
    return this.templates.filter(template => !template.isActive).length;
  }

  ngOnInit(): void {
    const qControl = this.filterForm.get('q');
    // FIX: debounceTime AFTER valueChanges but BEFORE startWith so the INITIAL
    // emission from startWith is NOT debounced — combineLatest fires immediately.
    const q$ = qControl
      ? qControl.valueChanges.pipe(
        debounceTime(400),
        startWith(qControl.value ?? ''),
        distinctUntilChanged(),
      )
      : of('');

    const activeControl = this.filterForm.get('active');
    const active$ = activeControl
      ? activeControl.valueChanges.pipe(
        startWith(activeControl.value ?? ''),
        distinctUntilChanged(),
      )
      : of('');

    // refresh$ is BehaviorSubject — emits undefined immediately on subscribe
    combineLatest([q$, active$, this.refresh$])
      .pipe(
        // Set loading BEFORE switchMap so Angular CD picks it up in the same tick
        tap(() => {
          this.isLoading = true;
          this.errorMessage = null;
          this.cdr.markForCheck();
        }),
        switchMap(([q, active]) => {
          const activeParam = active === '' ? undefined : active === 'true';
          return this.attendanceService.getShiftTemplates(activeParam, q || undefined).pipe(
            catchError(() => {
              this.errorMessage = 'Unable to load shift templates.';
              return of([] as ShiftTemplateResponse[]);
            }),
            finalize(() => {
              this.isLoading = false;
              this.cdr.markForCheck();
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((data) => {
        this.templates = data;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplates(): void {
    this.refresh$.next();
  }

  openCreate(): void {
    this.mode = 'create';
    this.selectedId = null;
    this.errorMessage = null;
    this.form.reset({
      shiftCode: '',
      shiftName: '',
      startTime: '',
      endTime: '',
      breakMinutes: 0,
      graceInMinutes: 0,
      graceOutMinutes: 0,
      isNightShift: false,
      minWorkMinutes: 1,
      isActive: true,
    });
    this.showForm = true;
  }

  openEdit(id: number): void {
    this.mode = 'edit';
    this.selectedId = id;
    this.errorMessage = null;
    this.attendanceService.getShiftTemplateById(id).subscribe({
      next: (data) => {
        this.form.reset({
          shiftCode: data.shiftCode,
          shiftName: data.shiftName,
          startTime: this.toTimeInput(data.startTime),
          endTime: this.toTimeInput(data.endTime),
          breakMinutes: data.breakMinutes,
          graceInMinutes: data.graceInMinutes,
          graceOutMinutes: data.graceOutMinutes,
          isNightShift: data.isNightShift,
          minWorkMinutes: data.minWorkMinutes,
          isActive: data.isActive,
        });
        this.showForm = true;
        this.errorMessage = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Unable to load shift template.';
        this.cdr.markForCheck();
      },
    });
  }

  cancelForm(): void {
    this.showForm = false;
  }

  submitForm(): void {
    if (this.form.invalid) return;
    const payload = this.form.value;
    if (this.mode === 'create') {
      this.attendanceService.createShiftTemplate(payload).subscribe({
        next: () => {
          this.showForm = false;
          this.errorMessage = null;
          this.loadTemplates();
        },
        error: () => {
          this.errorMessage = 'Unable to create shift template.';
          this.cdr.markForCheck();
        },
      });
      return;
    }

    if (!this.selectedId) return;
    this.attendanceService.updateShiftTemplate(this.selectedId, payload).subscribe({
      next: () => {
        this.showForm = false;
        this.errorMessage = null;
        this.loadTemplates();
      },
      error: () => {
        this.errorMessage = 'Unable to update shift template.';
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive(template: ShiftTemplateResponse, active: boolean): void {
    this.attendanceService.setShiftTemplateActive(template.shiftId, active).subscribe({
      next: () => {
        this.errorMessage = null;
        this.loadTemplates();
      },
      error: () => {
        this.errorMessage = 'Unable to update active status.';
        this.cdr.markForCheck();
      },
    });
  }

  deleteTemplate(template: ShiftTemplateResponse): void {
    const confirmed = window.confirm(`Delete shift template ${template.shiftCode}?`);
    if (!confirmed) return;
    this.attendanceService.deleteShiftTemplate(template.shiftId).subscribe({
      next: () => {
        this.errorMessage = null;
        this.loadTemplates();
      },
      error: () => {
        this.errorMessage = 'Unable to delete shift template.';
        this.cdr.markForCheck();
      },
    });
  }

  private toTimeInput(value: string): string {
    if (!value) return '';
    return value.substring(0, 5);
  }
}
