import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Deduction, PayrollService, TaxBracket, TaxCalculationExample } from '../payroll.service';

@Component({
  standalone: false,
  selector: 'app-tax-configuration',
  templateUrl: './tax-configuration.component.html',
  styleUrls: ['./tax-configuration.component.scss'],
})
export class TaxConfigurationComponent implements OnInit {
  activeTab: 'brackets' | 'deductions' | 'calculator' = 'brackets';
  showAddBracketModal = false;
  showAddDeductionModal = false;

  taxBrackets: TaxBracket[] = [];
  deductions: Deduction[] = [];

  calculatorForm: FormGroup;
  addBracketForm: FormGroup;
  addDeductionForm: FormGroup;

  calculatedTax: TaxCalculationExample = {
    grossPay: 0,
    federalTax: 0,
    stateTax: 0,
    socialSecurity: 0,
    medicare: 0,
    otherDeductions: 0,
    netPay: 0,
  };

  constructor(private payrollService: PayrollService, private fb: FormBuilder) {
    this.calculatorForm = this.fb.group({
      grossPay: [7083.33, [Validators.required]],
    });

    this.addBracketForm = this.fb.group({
      name: ['', Validators.required],
      minIncome: ['', Validators.required],
      maxIncome: [''],
      rate: ['', Validators.required],
      fixedAmount: ['', Validators.required],
    });

    this.addDeductionForm = this.fb.group({
      name: ['', Validators.required],
      type: ['percentage', Validators.required],
      value: ['', Validators.required],
      category: ['federal', Validators.required],
      mandatory: [false],
    });
  }

  ngOnInit(): void {
    this.payrollService.getTaxBrackets().subscribe((data) => {
      this.taxBrackets = data;
      this.recalculateTax();
    });
    this.payrollService.getDeductions().subscribe((data) => {
      this.deductions = data;
      this.recalculateTax();
    });

    this.calculatorForm.valueChanges.subscribe(() => this.recalculateTax());
  }

  setActiveTab(tab: 'brackets' | 'deductions' | 'calculator'): void {
    this.activeTab = tab;
  }

  openAddBracketModal(): void {
    this.showAddBracketModal = true;
  }

  closeAddBracketModal(): void {
    this.showAddBracketModal = false;
    this.addBracketForm.reset({ name: '', minIncome: '', maxIncome: '', rate: '', fixedAmount: '' });
  }

  openAddDeductionModal(): void {
    this.showAddDeductionModal = true;
  }

  closeAddDeductionModal(): void {
    this.showAddDeductionModal = false;
    this.addDeductionForm.reset({ name: '', type: 'percentage', value: '', category: 'federal', mandatory: false });
  }

  toggleBracketStatus(id: string): void {
    this.taxBrackets = this.taxBrackets.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b));
    this.recalculateTax();
  }

  toggleDeductionStatus(id: string): void {
    this.deductions = this.deductions.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d));
    this.recalculateTax();
  }

  handleDeleteBracket(id: string): void {
    this.taxBrackets = this.taxBrackets.filter((b) => b.id !== id);
    this.recalculateTax();
  }

  handleDeleteDeduction(id: string): void {
    this.deductions = this.deductions.filter((d) => d.id !== id);
    this.recalculateTax();
  }

  handleAddBracket(): void {
    if (this.addBracketForm.invalid) return;
    const value = this.addBracketForm.value as {
      name: string;
      minIncome: string;
      maxIncome: string;
      rate: string;
      fixedAmount: string;
    };
    const bracket: TaxBracket = {
      id: `TB-${String(this.taxBrackets.length + 1).padStart(3, '0')}`,
      name: value.name,
      minIncome: parseFloat(value.minIncome),
      maxIncome: value.maxIncome ? parseFloat(value.maxIncome) : null,
      rate: parseFloat(value.rate),
      fixedAmount: parseFloat(value.fixedAmount),
      enabled: true,
    };
    this.taxBrackets = [...this.taxBrackets, bracket];
    this.closeAddBracketModal();
    this.recalculateTax();
  }

  handleAddDeduction(): void {
    if (this.addDeductionForm.invalid) return;
    const value = this.addDeductionForm.value as {
      name: string;
      type: 'fixed' | 'percentage';
      value: string;
      category: 'federal' | 'state' | 'local' | 'benefits';
      mandatory: boolean;
    };
    const deduction: Deduction = {
      id: `DED-${String(this.deductions.length + 1).padStart(3, '0')}`,
      name: value.name,
      type: value.type,
      value: parseFloat(value.value),
      category: value.category,
      mandatory: value.mandatory,
      enabled: true,
    };
    this.deductions = [...this.deductions, deduction];
    this.closeAddDeductionModal();
    this.recalculateTax();
  }

  recalculateTax(): void {
    const grossPay = (this.calculatorForm.value as { grossPay: number }).grossPay || 0;
    this.calculatedTax = this.calculateTax(grossPay);
  }

  calculateTax(income: number): TaxCalculationExample {
    let federalTax = 0;
    const sortedBrackets = [...this.taxBrackets].sort((a, b) => a.minIncome - b.minIncome);

    for (const bracket of sortedBrackets) {
      if (!bracket.enabled) continue;
      if (income > bracket.minIncome) {
        const taxableInThisBracket = bracket.maxIncome
          ? Math.min(income - bracket.minIncome, bracket.maxIncome - bracket.minIncome)
          : income - bracket.minIncome;
        if (taxableInThisBracket > 0) {
          federalTax = bracket.fixedAmount + (taxableInThisBracket * bracket.rate) / 100;
        }
      }
    }

    let socialSecurity = 0;
    let medicare = 0;
    let stateTax = 0;
    let otherDeductions = 0;

    this.deductions
      .filter((d) => d.enabled)
      .forEach((ded) => {
        const amount = ded.type === 'percentage' ? income * (ded.value / 100) : ded.value;
        if (ded.name === 'Social Security') socialSecurity = amount;
        else if (ded.name === 'Medicare') medicare = amount;
        else if (ded.category === 'state') stateTax += amount;
        else otherDeductions += amount;
      });

    const netPay = income - federalTax - stateTax - socialSecurity - medicare - otherDeductions;

    return {
      grossPay: income,
      federalTax,
      stateTax,
      socialSecurity,
      medicare,
      otherDeductions,
      netPay,
    };
  }

  getCategoryClass(category: Deduction['category']): string {
    switch (category) {
      case 'federal':
        return 'bg-red-100 text-red-700';
      case 'state':
        return 'bg-blue-100 text-blue-700';
      case 'local':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-purple-100 text-purple-700';
    }
  }
}

