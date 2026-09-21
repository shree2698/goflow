import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuthStore } from '../stores/auth-store';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
    });
  });

  it('renders loading spinner when state is not hydrated', () => {
    useAuthStore.setState({ hasHydrated: false, isAuthenticated: false });
    const { container } = render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects unauthenticated hydrated user to /login', () => {
    useAuthStore.setState({ hasHydrated: true, isAuthenticated: false });
    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('renders child content when user is authenticated and hydrated', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isAuthenticated: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'member',
        created_at: '',
        updated_at: '',
      },
    });

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects employee to /projects when allowedRoles requires admin', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isAuthenticated: true,
      user: {
        id: 'user-456',
        email: 'emp@example.com',
        full_name: 'Regular Employee',
        role: 'employee',
      },
    });

    render(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Admin Only Module</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Admin Only Module')).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/projects');
  });

  it('allows access when user has the allowed role', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isAuthenticated: true,
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        full_name: 'Admin User',
        role: 'admin',
      },
    });

    render(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Admin Only Module</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Admin Only Module')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
