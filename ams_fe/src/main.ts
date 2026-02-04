import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

console.log('Bootstrap starting...');

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('Application bootstrapped successfully');
  })
  .catch((err) => {
    console.error('Bootstrap error:', err);
  });
