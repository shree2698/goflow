import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "../components/layout/Sidebar";
import { useAuthStore } from "../stores/auth-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects",
}));

describe("Sidebar component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all modules for admin users (Dashboard, Projects, Employees Control)", () => {
    useAuthStore.setState({
      user: {
        id: "admin-1",
        email: "admin@goflow.com",
        full_name: "Admin User",
        role: "admin",
      },
      isAuthenticated: true,
      hasHydrated: true,
    });

    render(<Sidebar />);

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Employees Control").length).toBeGreaterThanOrEqual(1);
  });

  it("hides Dashboard and Employees Control modules for employees, showing only assigned projects", () => {
    useAuthStore.setState({
      user: {
        id: "emp-1",
        email: "emp@goflow.com",
        full_name: "Bob Employee",
        role: "employee",
      },
      isAuthenticated: true,
      hasHydrated: true,
    });

    render(<Sidebar />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Employees Control")).not.toBeInTheDocument();
    expect(screen.getAllByText("My Assigned Projects").length).toBeGreaterThanOrEqual(1);
  });
});
