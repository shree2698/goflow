"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { TaskAssistantDrawer } from "@/components/assistant/TaskAssistantDrawer";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Detect active project id if navigating inside a project
  const projectMatch = pathname ? pathname.match(/^\/projects\/([a-zA-Z0-9-]+)/) : null;
  const activeProjectId = projectMatch ? projectMatch[1] : undefined;

  const isAuthPage = pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/password-reset";

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  if (isAuthPage) {
    return <main className="flex-1 overflow-auto w-full min-h-screen">{children}</main>;
  }

  return (
    <div className="flex w-full min-h-screen bg-canvas overflow-x-hidden">
      <Sidebar 
        isOpenMobile={isMobileSidebarOpen} 
        onCloseMobile={() => setIsMobileSidebarOpen(false)} 
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Header 
          onOpenAssistant={() => setIsAssistantOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />
        <main className="p-3 sm:p-4 md:p-6 flex-1 overflow-x-hidden overflow-y-auto w-full">
          {children}
        </main>
      </div>
      <CommandPalette />
      <TaskAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onOpen={() => setIsAssistantOpen(true)}
        activeProjectId={activeProjectId}
      />
    </div>
  );
}
