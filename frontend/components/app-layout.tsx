'use client';

import React from "react"

import { AppSidebar } from './app-sidebar';
import { AppTopBar } from './app-topbar';
import type { User } from '@/lib/types';

interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
}

export function AppLayout({ children, user }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar userRole={user.role} />
      <div className="ml-64">
        <AppTopBar user={user} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
