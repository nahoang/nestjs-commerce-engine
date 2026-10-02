import { INestApplication } from '@nestjs/common';

/**
 * Configures global pipes, filters, interceptors, CORS, etc.
 * This is the SINGLE SOURCE OF TRUTH for application-wide configuration,
 * invoked identically by main.ts (bootstrap) and e2e test helpers (test-app.ts).
 */
export function configureApp(app: INestApplication): INestApplication {
  // Global pipes, filters, and interceptors will be registered here in subsequent steps
  return app;
}
