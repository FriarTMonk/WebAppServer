import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule Rate Limiting', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should compile AppModule with rate limiting enabled', () => {
    expect(module).toBeDefined();
    // If rate limiting config is broken, module compilation will fail
  });

  it('should have required dependencies', () => {
    // Verify the module loads without errors
    // This ensures ThrottlerModule.forRoot() configuration is valid
    expect(module.get(AppModule)).toBeDefined();
  });
});
