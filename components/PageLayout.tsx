"use client";

import React from "react";
import { Inter, Roboto_Mono } from "next/font/google";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import '../app/globals.css';

import AppSidebar from "./AppSidebar";
import { Toaster } from "./ui/toaster";
import { Toaster as Sonner } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const publicRoutes = ["/login", "/signup", "/index", "/"];

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname() ?? "/";
  const { auth } = useAuth();

  const showSidebar = auth.user && !publicRoutes.includes(pathname.toLowerCase());

  return (
    <div className={`${inter.variable} ${robotoMono.variable} antialiased flex min-h-screen`}>
      <TooltipProvider>
        {showSidebar ? <AppSidebar /> : null}
        <main className="flex-1">
          <Toaster />
          <Sonner />
          {children}
        </main>
      </TooltipProvider>
    </div>
  );
};

export default PageLayout;
