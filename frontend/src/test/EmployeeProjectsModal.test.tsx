import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmployeeProjectsModal } from '../components/employees/EmployeeProjectsModal';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockAssignedProjects = [
  { id: 'proj-1', name: 'Alpha Project', description: 'Alpha Desc', status: 'active', color: '#6366F1' },
];

const mockAllProjects = [
  { id: 'proj-1', name: 'Alpha Project', description: 'Alpha Desc', status: 'active' },
  { id: 'proj-2', name: 'Beta Project', description: 'Beta Desc', status: 'active' },
];

const mockEmployee = {
  id: 'user-emp-1',
  full_name: 'John Doe',
  email: 'john@company.com',
  role: 'employee',
};

describe('EmployeeProjectsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/users/user-emp-1/projects') {
        return Promise.resolve({ data: mockAssignedProjects });
      }
      if (url === '/projects') {
        return Promise.resolve({ data: mockAllProjects });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders employee assigned projects', async () => {
    render(
      <EmployeeProjectsModal
        employee={mockEmployee}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    expect(screen.getByText('1 Project')).toBeInTheDocument();
  });

  it('allows admin to assign employee to an unassigned project', async () => {
    (apiClient.post as any).mockResolvedValue({ data: { message: 'Assigned' } });

    render(
      <EmployeeProjectsModal
        employee={mockEmployee}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Assign to Project')).toBeInTheDocument();
      expect(screen.getByText('Beta Project')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'proj-2' } });

    const grantBtn = screen.getByRole('button', { name: /Grant Access/i });
    fireEvent.click(grantBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/projects/proj-2/members', {
        user_id: 'user-emp-1',
        role: 'MEMBER',
      });
    });
  });

  it('allows admin to revoke access to a project', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (apiClient.delete as any).mockResolvedValue({});

    render(
      <EmployeeProjectsModal
        employee={mockEmployee}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });

    const revokeBtn = screen.getByLabelText('Revoke project access');
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/projects/proj-1/members/user-emp-1');
    });
  });
});
