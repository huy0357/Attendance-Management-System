import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="breadcrumb" *ngIf="breadcrumbs.length > 0">
      <ol class="breadcrumb-list">
        <li *ngFor="let breadcrumb of breadcrumbs; let last = last" class="breadcrumb-item">
          <a
            *ngIf="!last; else lastItem"
            [routerLink]="breadcrumb.url"
            class="breadcrumb-link">
            {{ breadcrumb.label }}
          </a>
          <ng-template #lastItem>
            <span class="breadcrumb-current">{{ breadcrumb.label }}</span>
          </ng-template>
        </li>
      </ol>
    </nav>
  `,
  styles: [
    `
      .breadcrumb {
        padding: 0.75rem 1.5rem;
        background-color: #fff;
        border-bottom: 1px solid #e0e0e0;
      }
      .breadcrumb-list {
        display: flex;
        list-style: none;
        padding: 0;
        margin: 0;
        gap: 0.5rem;
      }
      .breadcrumb-item {
        display: flex;
        align-items: center;
      }
      .breadcrumb-item:not(:last-child)::after {
        content: '/';
        margin-left: 0.5rem;
        color: #999;
      }
      .breadcrumb-link {
        color: #007bff;
        text-decoration: none;
      }
      .breadcrumb-link:hover {
        text-decoration: underline;
      }
      .breadcrumb-current {
        color: #666;
        font-weight: 500;
      }
    `,
  ],
})
export class BreadcrumbComponent {
  breadcrumbs: Array<{ label: string; url: string }> = [];

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        })
      )
      .subscribe((route) => {
        this.breadcrumbs = this.buildBreadcrumbs(route);
      });
  }

  private buildBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Array<{ label: string; url: string }> = []
  ): Array<{ label: string; url: string }> {
    const routeConfig = route.routeConfig;
    if (!routeConfig) {
      return breadcrumbs;
    }

    const path = routeConfig.path;
    if (path) {
      url += `/${path}`;
      const label = routeConfig.data?.['breadcrumb'] || path;
      breadcrumbs.push({ label, url });
    }

    if (route.firstChild) {
      return this.buildBreadcrumbs(route.firstChild, url, breadcrumbs);
    }

    return breadcrumbs;
  }
}
