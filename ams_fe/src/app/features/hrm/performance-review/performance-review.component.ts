import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  HrmService,
  KpiDefinition,
  PerformanceReviewRecord,
  ReviewStats,
  ReviewTemplate,
  ReviewStatus,
} from '../hrm.service';

interface TabOption {
  id: 'kpis' | 'reviews' | 'templates';
  label: string;
  icon: string;
}

interface EmployeeOption {
  id: string;
  label: string;
}

@Component({
  standalone: false,
  selector: 'app-performance-review',
  templateUrl: './performance-review.component.html',
  styleUrls: ['./performance-review.component.scss'],
})
export class PerformanceReviewComponent implements OnInit {
  activeTab: 'kpis' | 'reviews' | 'templates' = 'kpis';
  showAddKpi = false;
  showReviewModal = false;
  selectedReview: PerformanceReviewRecord | null = null;

  kpis: KpiDefinition[] = [];
  reviews: PerformanceReviewRecord[] = [];
  templates: ReviewTemplate[] = [];
  reviewStats: ReviewStats = {
    completed: 0,
    pending: 0,
    avgScore: 0,
    totalBonusImpact: 0,
  };

  reviewKpis: KpiDefinition[] = [];

  readonly tabs: TabOption[] = [
    { id: 'kpis', label: 'KPI Definitions', icon: 'target' },
    { id: 'reviews', label: 'Performance Reviews', icon: 'award' },
    { id: 'templates', label: 'Review Templates', icon: 'file-text' },
  ];

  readonly categories: string[] = ['Sales', 'Customer Service', 'Operations', 'Quality', 'Teamwork'];
  readonly frequencies: string[] = ['Monthly', 'Quarterly', 'Semi-Annually', 'Annually'];
  readonly reviewPeriods: string[] = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
  readonly employeeOptions: EmployeeOption[] = [
    { id: 'E001', label: 'Sarah Chen (E001)' },
    { id: 'E002', label: 'Michael Ross (E002)' },
    { id: 'E003', label: 'Emma Wilson (E003)' },
    { id: 'E004', label: 'James Kim (E004)' },
  ];

  readonly categoryColors: Record<string, string> = {
    Sales: 'bg-blue-100 text-blue-700',
    'Customer Service': 'bg-green-100 text-green-700',
    Operations: 'bg-purple-100 text-purple-700',
    Quality: 'bg-orange-100 text-orange-700',
    Teamwork: 'bg-pink-100 text-pink-700',
  };

  kpiForm: FormGroup;
  reviewForm: FormGroup;

  constructor(private hrmService: HrmService, private fb: FormBuilder) {
    this.kpiForm = this.fb.group({
      name: ['', Validators.required],
      category: ['Sales', Validators.required],
      target: ['', Validators.required],
      weight: ['', Validators.required],
      unit: ['', Validators.required],
      frequency: ['Monthly', Validators.required],
    });

    this.reviewForm = this.fb.group({
      employeeId: ['E001', Validators.required],
      reviewPeriod: ['Q1 2025', Validators.required],
      overallScore: [92],
      salaryImpact: [''],
      bonusImpact: [''],
      comments: [''],
      kpiScores: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.hrmService.getKpiDefinitions().subscribe((data) => {
      this.kpis = data;
      this.reviewKpis = this.getReviewKpis();
      this.buildKpiScoreArray();
    });

    this.hrmService.getPerformanceReviews().subscribe((data) => {
      this.reviews = data;
      this.refreshReviewStats();
    });

    this.hrmService.getReviewTemplates().subscribe((data) => {
      this.templates = data;
    });

    this.hrmService.getReviewStats().subscribe((stats) => {
      this.reviewStats = stats;
    });
  }

  setActiveTab(tab: 'kpis' | 'reviews' | 'templates'): void {
    this.activeTab = tab;
  }

  isActiveTab(tab: 'kpis' | 'reviews' | 'templates'): boolean {
    return this.activeTab === tab;
  }

  toggleAddKpi(): void {
    this.showAddKpi = !this.showAddKpi;
  }

  closeAddKpi(): void {
    this.showAddKpi = false;
  }

  saveKpi(): void {
    if (this.kpiForm.invalid) return;

    const value = this.kpiForm.value as {
      name: string;
      category: string;
      target: number;
      weight: number;
      unit: string;
      frequency: string;
    };

    const newKpi: KpiDefinition = {
      id: String(this.kpis.length + 1),
      name: value.name,
      category: value.category,
      target: Number(value.target),
      weight: Number(value.weight),
      unit: value.unit,
      frequency: value.frequency,
    };

    this.hrmService.createKpiDefinition(newKpi).subscribe(() => {
      this.kpis = [...this.kpis, newKpi];
      this.reviewKpis = this.getReviewKpis();
      this.buildKpiScoreArray();
      this.kpiForm.reset({
        name: '',
        category: 'Sales',
        target: '',
        weight: '',
        unit: '',
        frequency: 'Monthly',
      });
      this.showAddKpi = false;
    });
  }

  getCategoryBadgeClass(category: string): string {
    return this.categoryColors[category] || 'bg-gray-100 text-gray-700';
  }

  getKpiTotalWeight(): number {
    let total = 0;
    for (const kpi of this.kpis) {
      total += kpi.weight;
    }
    return total;
  }

  getKpiCategoryCount(): number {
    const set = new Set<string>();
    for (const kpi of this.kpis) {
      set.add(kpi.category);
    }
    return set.size;
  }

  getActiveReviewCount(): number {
    let count = 0;
    for (const review of this.reviews) {
      if (review.status !== 'completed') {
        count += 1;
      }
    }
    return count;
  }

  getReviewStatusLabel(status: ReviewStatus): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'draft':
        return 'Draft';
      default:
        return 'Draft';
    }
  }

  getReviewStatusClass(status: ReviewStatus): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getScoreWidth(review: PerformanceReviewRecord): string {
    return `${review.overallScore}%`;
  }

  getSalaryImpactLabel(review: PerformanceReviewRecord): string {
    return review.salaryImpact > 0 ? `+${review.salaryImpact}%` : '-';
  }

  getBonusImpactLabel(review: PerformanceReviewRecord): string {
    return review.bonusImpact > 0 ? `$${review.bonusImpact.toLocaleString()}` : '-';
  }

  getBonusImpactSummary(): string {
    if (!this.reviewStats.totalBonusImpact) return '$0K';
    const value = this.reviewStats.totalBonusImpact / 1000;
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
    return `$${formatted}K`;
  }

  openReviewModal(review?: PerformanceReviewRecord): void {
    this.selectedReview = review || null;
    this.reviewKpis = this.getReviewKpis();
    this.buildKpiScoreArray();
    this.reviewForm.patchValue({
      employeeId: review ? review.employeeId : 'E001',
      reviewPeriod: review ? review.reviewPeriod : 'Q1 2025',
      overallScore: review && review.overallScore > 0 ? review.overallScore : 92,
      salaryImpact: review ? review.salaryImpact : '',
      bonusImpact: review ? review.bonusImpact : '',
      comments: '',
    });
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedReview = null;
  }

  saveReviewAsDraft(): void {
    this.saveReview('draft');
  }

  submitReview(): void {
    this.saveReview('pending');
  }

  saveReview(status: ReviewStatus): void {
    const formValue = this.reviewForm.value as {
      employeeId: string;
      reviewPeriod: string;
      overallScore: number;
      salaryImpact: number;
      bonusImpact: number;
      comments: string;
    };

    const existing = this.selectedReview;
    const employeeLabel = this.getEmployeeLabel(formValue.employeeId);
    const payload: PerformanceReviewRecord = {
      id: existing ? existing.id : `REV-${String(this.reviews.length + 1).padStart(3, '0')}`,
      employeeId: formValue.employeeId,
      employeeName: employeeLabel.name,
      department: employeeLabel.department,
      reviewPeriod: formValue.reviewPeriod,
      status,
      overallScore: Number(formValue.overallScore || 0),
      salaryImpact: Number(formValue.salaryImpact || 0),
      bonusImpact: Number(formValue.bonusImpact || 0),
    };

    this.hrmService.createOrUpdateReview(payload).subscribe(() => {
      if (existing) {
        this.reviews = this.reviews.map((reviewItem) =>
          reviewItem.id === payload.id ? payload : reviewItem,
        );
      } else {
        this.reviews = [payload, ...this.reviews];
      }
      this.refreshReviewStats();
      this.closeReviewModal();
    });
  }

  getReviewModalSubtitle(): string {
    if (this.selectedReview) {
      return `${this.selectedReview.employeeName} - ${this.selectedReview.reviewPeriod}`;
    }
    return 'New Review';
  }

  getReviewKpis(): KpiDefinition[] {
    return this.kpis.slice(0, 3);
  }

  getReviewKpi(index: number): KpiDefinition | null {
    if (index < 0 || index >= this.reviewKpis.length) return null;
    return this.reviewKpis[index];
  }

  getKpiScoreControls(): FormGroup[] {
    return (this.reviewForm.get('kpiScores') as FormArray).controls as FormGroup[];
  }

  updateWeightedScore(index: number): void {
    const kpi = this.getReviewKpi(index);
    const scores = this.reviewForm.get('kpiScores') as FormArray;
    const group = scores.at(index) as FormGroup | null;
    if (!kpi || !group) return;

    const scoreValue = Number(group.get('score')?.value || 0);
    const weighted = Math.round((scoreValue * kpi.weight) / 100);
    group.patchValue({ weightedScore: weighted }, { emitEvent: false });
  }

  getWeightedScoreValue(index: number): number {
    const scores = this.reviewForm.get('kpiScores') as FormArray;
    const group = scores.at(index) as FormGroup | null;
    if (!group) return 0;
    return Number(group.get('weightedScore')?.value || 0);
  }

  private buildKpiScoreArray(): void {
    const array = this.reviewForm.get('kpiScores') as FormArray;
    while (array.length > 0) {
      array.removeAt(0);
    }

    for (const kpi of this.reviewKpis) {
      array.push(
        this.fb.group({
          kpiId: [kpi.id],
          actual: [''],
          score: [''],
          weightedScore: [0],
        }),
      );
    }
  }

  private getEmployeeLabel(employeeId: string): { name: string; department: string } {
    switch (employeeId) {
      case 'E001':
        return { name: 'Sarah Chen', department: 'Operations' };
      case 'E002':
        return { name: 'Michael Ross', department: 'Sales' };
      case 'E003':
        return { name: 'Emma Wilson', department: 'Customer Service' };
      case 'E004':
        return { name: 'James Kim', department: 'Operations' };
      default:
        return { name: 'Employee', department: 'General' };
    }
  }

  private refreshReviewStats(): void {
    const completed = this.reviews.filter((review) => review.status === 'completed').length;
    const pending = this.reviews.filter((review) => review.status === 'pending').length;
    const scored = this.reviews.filter((review) => review.overallScore > 0);
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((sum, review) => sum + review.overallScore, 0) / scored.length)
        : 0;
    const totalBonusImpact = this.reviews.reduce((sum, review) => sum + review.bonusImpact, 0);

    this.reviewStats = {
      completed,
      pending,
      avgScore,
      totalBonusImpact,
    };
  }
}
