import { generateInviteCode, randomCode } from './invite-code.util';

const VALID_CHARSET = /^[A-Z0-9]{6}$/;

describe('randomCode', () => {
  it('generates a 6-character string', () => {
    const code = randomCode();
    expect(code).toHaveLength(6);
  });

  it('only contains characters A-Z and 0-9', () => {
    const code = randomCode();
    expect(code).toMatch(VALID_CHARSET);
  });

  it('generates different codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => randomCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('generateInviteCode', () => {
  it('returns a valid code when no collision occurs', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any;

    const code = await generateInviteCode(prisma);

    expect(code).toMatch(VALID_CHARSET);
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('retries once on a single collision then succeeds', async () => {
    // Simulate: first generated code already exists in DB, second is unique
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'existing-user' }) // first code collides
          .mockResolvedValueOnce(null), // second code is unique
      },
    } as any;

    const code = await generateInviteCode(prisma);

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    expect(code).toMatch(VALID_CHARSET);
  });

  it('throws after exhausting all retries', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'always-exists' }),
      },
    } as any;

    await expect(generateInviteCode(prisma, 3)).rejects.toThrow(
      'Failed to generate unique invite code after 4 attempts',
    );
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(4);
  });
});
