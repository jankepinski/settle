import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useRegister hook
const mockMutate = vi.fn();
vi.mock('@/hooks/use-register', () => ({
  useRegister: () => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockPush.mockClear();
  });

  it('should render email, password, confirm password fields', () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('should validate password match', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'differentpass',
    );
    await user.click(
      screen.getByRole('button', { name: /create account/i }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      /passwords do not match/i,
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should validate minimum password length', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(
      screen.getByRole('button', { name: /create account/i }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      /at least 8 characters/i,
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should call mutate on submit with valid data', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), 'new@test.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'password123',
    );
    await user.click(
      screen.getByRole('button', { name: /create account/i }),
    );

    expect(mockMutate).toHaveBeenCalledWith(
      {
        email: 'new@test.com',
        password: 'password123',
        displayName: undefined,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('should have link to login page', () => {
    render(<RegisterPage />);

    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });
});
