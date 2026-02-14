import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard("jwt")', () => {
    // JwtAuthGuard inherits from AuthGuard('jwt') which is a mixin.
    // The actual JWT validation is tested via e2e/integration tests.
    // Here we verify the guard is instantiable and has the expected shape.
    expect(guard).toBeInstanceOf(JwtAuthGuard);
    expect(typeof guard.canActivate).toBe('function');
  });
});
