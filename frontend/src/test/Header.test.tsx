import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "../components/layout/Header";
import { useAuthStore } from "../stores/auth-store";
import { apiClient } from "@/lib/api-client";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes("/notifications")) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes("/tasks/search")) {
        return Promise.resolve({
          data: [
            {
              id: "task-101",
              title: "Fix frontend responsive styles",
              description: "Inspect header and sidebar",
              priority: "high",
              status: "in_progress",
              project_id: "proj-1",
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    }),
    patch: vi.fn().mockResolvedValue({ success: true, data: {} }),
    post: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

vi.mock("@/lib/useWebSocket", () => ({
  useWebSocket: () => ({
    status: "connected",
  }),
}));

describe("Header component", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "alex@example.com",
        full_name: "Alex Morgan",
        role: "admin",
        timezone: "UTC",
      },
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
      isAuthenticated: true,
      hasHydrated: true,
    });
  });

  it("renders inline search input directly in the header", () => {
    render(<Header />);
    const searchInput = screen.getByPlaceholderText(/search tasks\.\.\./i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput.tagName).toBe("INPUT");
  });

  it("searches inline and renders results dropdown without popout", async () => {
    render(<Header />);
    const searchInput = screen.getByPlaceholderText(/search tasks\.\.\./i);

    fireEvent.change(searchInput, { target: { value: "responsive" } });

    await waitFor(() => {
      expect(screen.getByText("Fix frontend responsive styles")).toBeInTheDocument();
    }, { timeout: 2000 });

    // Clicking on task navigates to project
    fireEvent.click(screen.getByText("Fix frontend responsive styles"));
    expect(mockPush).toHaveBeenCalledWith("/projects/proj-1");
  });

  it("avatar button opens account menu with profile, password and logout options", () => {
    render(<Header />);
    const avatarBtn = screen.getByRole("button", { name: /user account menu/i });

    // Menu initially not visible
    expect(screen.queryByText(/profile settings/i)).toBeNull();

    // Click avatar to open menu
    fireEvent.click(avatarBtn);

    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByText("Profile Settings")).toBeInTheDocument();
    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("clicking log out opens confirmation warning instead of logging out immediately", () => {
    render(<Header />);
    const avatarBtn = screen.getByRole("button", { name: /user account menu/i });
    fireEvent.click(avatarBtn);

    const logoutBtn = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutBtn);

    // Confirmation warning modal should appear
    expect(screen.getByText("Confirm Logout")).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to log out/i)).toBeInTheDocument();
    // User is not logged out yet
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("cancel button closes logout confirmation without logging out", () => {
    render(<Header />);
    const avatarBtn = screen.getByRole("button", { name: /user account menu/i });
    fireEvent.click(avatarBtn);

    const logoutBtn = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutBtn);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText("Confirm Logout")).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("confirming logout clears authentication and redirects to /login", async () => {
    (apiClient.post as any).mockResolvedValueOnce({ success: true });

    render(<Header />);
    const avatarBtn = screen.getByRole("button", { name: /user account menu/i });
    fireEvent.click(avatarBtn);

    const logoutBtn = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutBtn);

    const confirmBtn = screen.getAllByRole("button", { name: /log out/i })[0];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("opens profile modal for editing profile settings", () => {
    render(<Header />);
    const avatarBtn = screen.getByRole("button", { name: /user account menu/i });
    fireEvent.click(avatarBtn);

    const profileOption = screen.getByRole("button", { name: /profile settings/i });
    fireEvent.click(profileOption);

    expect(screen.getByText("Profile & Settings")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Alex Morgan");
    expect(screen.getByRole("button", { name: /save profile/i })).toBeInTheDocument();
  });

  it("opens profile modal with change password tab", () => {
    render(<Header />);
    const avatarBtn = screen.getByRole("button", { name: /user account menu/i });
    fireEvent.click(avatarBtn);

    const passwordOption = screen.getByRole("button", { name: /change password/i });
    fireEvent.click(passwordOption);

    expect(screen.getByText("Profile & Settings")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter current password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/minimum 6 characters/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/repeat new password/i)).toBeInTheDocument();
  });

  it("saves profile edits and updates auth store", async () => {
    (apiClient.patch as any).mockResolvedValueOnce({
      success: true,
      data: { full_name: "Alexander Morgan", timezone: "America/New_York", avatar_url: null },
    });

    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /user account menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /profile settings/i }));

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: "Alexander Morgan" } });

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/users/me", {
        full_name: "Alexander Morgan",
        timezone: "UTC",
        avatar_url: null,
      });
      expect(useAuthStore.getState().user?.full_name).toBe("Alexander Morgan");
      expect(screen.getByText(/profile settings updated successfully/i)).toBeInTheDocument();
    });
  });

  it("submits password change with matching passwords", async () => {
    (apiClient.patch as any).mockResolvedValueOnce({
      success: true,
    });

    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /user account menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    fireEvent.change(screen.getByPlaceholderText(/enter current password/i), {
      target: { value: "OldPassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/minimum 6 characters/i), {
      target: { value: "NewSecurePassword456" },
    });
    fireEvent.change(screen.getByPlaceholderText(/repeat new password/i), {
      target: { value: "NewSecurePassword456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/users/me", {
        current_password: "OldPassword123",
        new_password: "NewSecurePassword456",
      });
      expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
    });
  });
});
