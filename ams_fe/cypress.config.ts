import { defineConfig } from 'cypress';

const baseUrl = process.env.CYPRESS_BASE_URL || 'http://localhost:4200';
const apiUrl = process.env.CYPRESS_API_URL || 'http://localhost:8080';

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    env: {
      API_URL: apiUrl,
      E2E_USERNAME: process.env.CYPRESS_E2E_USERNAME,
      E2E_PASSWORD: process.env.CYPRESS_E2E_PASSWORD,
    },
    setupNodeEvents(_on, config) {
      return config;
    },
  },
  video: false,
});
