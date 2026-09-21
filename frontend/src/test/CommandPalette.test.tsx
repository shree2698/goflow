import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommandPalette } from '../components/layout/CommandPalette';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: [
        { id: '1', title: 'Implement Redis Worker', project_id: 'p1', priority: 'high', status: 'in_progress' }
      ]
    }),
  },
}));

describe('CommandPalette', () => {
  it('opens on Ctrl+K and displays search input', () => {
    render(<CommandPalette />);
    
    // Initially closed
    expect(screen.queryByPlaceholderText(/search tasks/i)).toBeNull();

    // Trigger Ctrl+K
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    // Should now be open
    const input = screen.getByPlaceholderText(/search tasks/i);
    expect(input).toBeInTheDocument();
  });

  it('closes when Escape key is pressed', () => {
    render(<CommandPalette />);
    
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/search tasks/i)).toBeNull();
  });
});
