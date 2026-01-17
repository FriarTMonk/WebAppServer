import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Test the rate limiting configuration directly from the module definition
describe('AppModule Rate Limiting Configuration', () => {
  // Import the module metadata to test configuration
  const appModuleMetadata = require('./app.module');
  const AppModule = appModuleMetadata.AppModule;

  // Get the @Module decorator metadata
  const moduleDecorator = Reflect.getMetadata('imports', AppModule) || [];
  const providers = Reflect.getMetadata('providers', AppModule) || [];

  describe('ThrottlerModule Configuration', () => {
    it('should configure default throttle profile with production limits', () => {
      // Find ThrottlerModule in imports
      const throttlerModule = moduleDecorator.find((mod: any) =>
        mod && mod.module && mod.module.name === 'ThrottlerModule'
      );

      // Check if ThrottlerModule.forRoot was called with correct configuration
      expect(throttlerModule).toBeDefined();

      // Test by verifying the source code has production limits
      const fs = require('fs');
      const path = require('path');
      const appModulePath = path.join(__dirname, 'app.module.ts');
      const appModuleSource = fs.readFileSync(appModulePath, 'utf8');

      // Verify default profile has 100 limit
      expect(appModuleSource).toContain('limit: 100,');
      expect(appModuleSource).toContain('Production limit: 100 requests per minute per IP');
    });

    it('should configure strict throttle profile for auth endpoints', () => {
      const fs = require('fs');
      const path = require('path');
      const appModulePath = path.join(__dirname, 'app.module.ts');
      const appModuleSource = fs.readFileSync(appModulePath, 'utf8');

      // Verify strict profile has 20 limit
      expect(appModuleSource).toContain('limit: 20,');
      expect(appModuleSource).toContain('Auth endpoints: 20 requests per minute per IP');
    });

    it('should configure webhook throttle profile', () => {
      const fs = require('fs');
      const path = require('path');
      const appModulePath = path.join(__dirname, 'app.module.ts');
      const appModuleSource = fs.readFileSync(appModulePath, 'utf8');

      // Verify webhook profile exists with 50 limit
      expect(appModuleSource).toContain("name: 'webhook',");
      expect(appModuleSource).toContain('limit: 50,');
      expect(appModuleSource).toContain('Webhooks: 50 requests per minute per IP');
    });
  });

  describe('ThrottlerGuard Registration', () => {
    it('should have ThrottlerGuard registered as APP_GUARD', () => {
      const fs = require('fs');
      const path = require('path');
      const appModulePath = path.join(__dirname, 'app.module.ts');
      const appModuleSource = fs.readFileSync(appModulePath, 'utf8');

      // Verify ThrottlerGuard is enabled (not commented out)
      expect(appModuleSource).toContain('provide: APP_GUARD,');
      expect(appModuleSource).toContain('useClass: ThrottlerGuard,');

      // Verify it's NOT commented out
      expect(appModuleSource).not.toContain('// {');
      expect(appModuleSource).not.toContain('//   provide: APP_GUARD,');
      expect(appModuleSource).not.toContain('//   useClass: ThrottlerGuard,');

      // Find the section and verify it's uncommented
      const throttlerGuardSection = appModuleSource.match(
        /{\s*provide:\s*APP_GUARD,\s*useClass:\s*ThrottlerGuard,.*?}/s
      );
      expect(throttlerGuardSection).toBeTruthy();
    });

    it('should not have the "temporarily disabled" comment', () => {
      const fs = require('fs');
      const path = require('path');
      const appModulePath = path.join(__dirname, 'app.module.ts');
      const appModuleSource = fs.readFileSync(appModulePath, 'utf8');

      // Verify the "temporarily disabled" comment is removed
      expect(appModuleSource).not.toContain('Temporarily disabled for development - re-enable for production!');
    });
  });
});
