import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectMembersModal } from '../components/projects/ProjectMembersModal';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockMembers = [
  {
    project_id: 'proj-1',
    user_id: 'user-admin',
    role: 'OWNER',
    joined_at: '2026-01-01',
    user: {
      id: 'user-admin',
      email: 'admin@company.com',
      full_name: 'Admin User',
    },
  },
  {
    project_id: 'proj-1',
    user_id: 'user-emp-1',
    role: 'MEMBER',
    joined_at: '2026-01-02',
    user: {
      id: 'user-emp-1',
      email: 'john@company.com',
      full_name: 'John Doe',
    },
  },
];

const mockCompanyUsers = [
  { id: 'user-admin', full_name: 'Admin User', email: 'admin@company.com', role: 'admin' },
  { id: 'user-emp-1', full_name: 'John Doe', email: 'john@company.com', role: 'employee' },
  { id: 'user-emp-2', full_name: 'Jane Smith', email: 'jane@company.com', role: 'employee' },
];

describe('ProjectMembersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/projects/proj-1/members') {
        return Promise.resolve({ data: mockMembers });
      }
      if (url === '/users') {
        return Promise.resolve({ data: mockCompanyUsers });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders project members list', async () => {
    render(
      <ProjectMembersModal
        projectId="proj-1"
        projectName="Alpha Project"
        isOpen={true}
        onClose={vi.fn()}
        isAdmin={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(screen.getByText('admin@company.com')).toBeInTheDocument();
    expect(screen.getByText('john@company.com')).toBeInTheDocument();
    expect(screen.queryByText('Grant Project Access')).not.toBeInTheDocument();
  });

  it('displays grant access form for admin and allows assigning employee', async () => {
    (apiClient.post as any).mockResolvedValue({ data: { message: 'Member added' } });

    render(
      <ProjectMembersModal
        projectId="proj-1"
        projectName="Alpha Project"
        isOpen={true}
        onClose={vi.fn()}
        isAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Grant Project Access')).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });

    // Select Jane Smith
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'user-emp-2' } });

    const addButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/projects/proj-1/members', {
        user_id: 'user-emp-2',
        role: 'MEMBER',
      });
    });
  });

  it('allows admin to revoke access for non-owner member', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (apiClient.delete as any).mockResolvedValue({});

    render(
      <ProjectMembersModal
        projectId="proj-1"
        projectName="Alpha Project"
        isOpen={true}
        onClose={vi.fn()}
        isAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const revokeButtons = screen.getAllByLabelText('Revoke member access');
    expect(revokeButtons.length).toBe(1); // Only John Doe, not Admin Owner

    fireEvent.click(revokeButtons[0]);

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/projects/proj-1/members/user-emp-1');
    });
  });
});
