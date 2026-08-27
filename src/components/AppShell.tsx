"use client";

import clsx from "clsx";
import {
  Archive,
  Banknote,
  Boxes,
  Bug,
  Building2,
  ClipboardList,
  FileBarChart2,
  FileSearch,
  FileText,
  LayoutDashboard,
  MessageSquareWarning,
  Receipt,
  Settings,
  SlidersHorizontal,
  Tag,
  Truck,
  Upload,
  Users,
} from "lucide-react";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "./AuthProvider";
import { SosetStatusPill } from "./SosetStatusPill";
import { ThemeToggle } from "./ThemeToggle";
import { Spinner } from "./ui";

/**
 * Navigation.
 *
 * The legacy application had a button wall on Form1 plus five menus. Those items are
 * grouped here by the job being done rather than by the screen that used to do it —
 * see DESIGN-NOTES.md for the full mapping.
 */
const navigation = [
  {
    heading: null,
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Order to invoice",
    items: [
      { href: "/orders", label: "Orders", icon: ClipboardList },
      { href: "/invoicing", label: "Invoice run", icon: FileText },
      { href: "/despatch", label: "Despatch", icon: Truck },
      { href: "/imports", label: "Import orders", icon: Upload },
      { href: "/proofs", label: "Proofs", icon: FileSearch },
    ],
  },
  {
    heading: "Money in",
    items: [
      { href: "/receipts", label: "Receipts", icon: Receipt },
      { href: "/deposits", label: "Bank deposits", icon: Banknote },
    ],
  },
  {
    heading: "Reports",
    items: [
      { href: "/reports", label: "Reports", icon: FileBarChart2 },
      { href: "/invoices", label: "Invoice history", icon: FileText },
    ],
  },
  {
    heading: "Reference",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/products", label: "Products", icon: Boxes },
      { href: "/settings/bins", label: "Bins", icon: Archive },
      { href: "/settings/stamp-labels", label: "Stamp labels", icon: Tag },
      { href: "/settings/invoice-states", label: "Invoice states", icon: Building2 },
      { href: "/settings/overdue-messages", label: "Overdue messages", icon: MessageSquareWarning },
      { href: "/settings/pricing", label: "Pricing", icon: Tag },
      { href: "/settings/control", label: "System control", icon: SlidersHorizontal },
      { href: "/system", label: "System", icon: Settings },
      { href: "/reports/debug", label: "Report debug", icon: Bug },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Gates the whole application behind authentication (H2).
 *
 *  * The /login route renders bare — no nav chrome, no auth requirement.
 *  * While the session is being resolved (token validation on load), show a spinner.
 *  * If signed out, redirect to /login (the client guard; the API also enforces this).
 *  * Otherwise render the full shell.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useAuth();

  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");

  // Redirect signed-out users to login (except when already there).
  useEffect(() => {
    if (status === "anonymous" && !isLoginRoute) {
      const returnTo = window.location.pathname + window.location.search;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [status, isLoginRoute, router]);

  // The login page owns its own full-screen layout.
  if (isLoginRoute) return <>{children}</>;

  // Resolving the session, or mid-redirect to login: hold with a spinner rather than flashing
  // the protected UI or an empty frame.
  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <AuthenticatedShell pathname={pathname}>{children}</AuthenticatedShell>;
}

function AuthenticatedShell({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape, and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarBody pathname={pathname} />
      </aside>

      {/* Mobile slide-in drawer + backdrop */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Stamp Orders</p>
                <p className="text-xs text-slate-500">Stead Brothers</p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarBody pathname={pathname} showBrand={false} wideFooter />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar with hamburger */}
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-semibold text-slate-900">Stamp Orders</p>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * The nav + footer shared by the desktop sidebar and the mobile drawer, so both stay in sync.
 */
function SidebarBody({
  pathname,
  showBrand = true,
  wideFooter = false,
}: {
  pathname: string;
  showBrand?: boolean;
  wideFooter?: boolean;
}) {
  const { user, logout } = useAuth();

  return (
    <>
      {showBrand && (
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">Stamp Orders</p>
          <p className="text-xs text-slate-500">Stead Brothers</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navigation.map((group, index) => (
          <div key={group.heading ?? index} className={clsx(index > 0 && "mt-4")}>
            {group.heading && (
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {group.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-sky-50 font-medium text-sky-800"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-slate-200 p-3">
        <ThemeToggle showLabels={wideFooter} />
        <SosetStatusPill />

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-700" title={user?.username}>
              {user?.username}
            </p>
            {user?.roles?.length ? (
              <p className="truncate text-[11px] text-slate-400">{user.roles.join(", ")}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
