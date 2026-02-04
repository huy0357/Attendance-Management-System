import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currency',
  standalone: true,
})
export class CurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency: string = 'VND'): string {
    if (value === null || value === undefined) {
      return '0 ₫';
    }

    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(value);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  }
}
