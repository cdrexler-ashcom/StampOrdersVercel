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
  FileText,
  LayoutDashboard,
  MessageSquareWarning,
  Receipt,
  Settings,
  Tag,
  Truck,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SosetStatusPill } from "./SosetStatusPill";

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
      { href: "/invoices", label: "Invoice history", icon: FileText },
      { href: "/despatch", label: "Despatch", icon: Truck },
      { href: "/imports", label: "Import orders", icon: Upload }
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
    items: [{ href: "/reports", label: "Reports", icon: FileBarChart2 }],
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
      { href: "/system", label: "System", icon: Settings },
      { href: "/reports/debug", label: "Report debug", icon: Bug },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="no-print hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">Stamp Orders</p>
          <p className="text-xs text-slate-500">Stead Brothers</p>
        </div>

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

        <div className="border-t border-slate-200 p-3">
          <SosetStatusPill />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center gap-3 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          {navigation.flatMap((group) => group.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "whitespace-nowrap rounded-md px-2 py-1 text-xs",
                isActive(pathname, item.href)
                  ? "bg-sky-50 font-medium text-sky-800"
                  : "text-slate-600",
              )}
            >
              {item.label}
            </Link>
          ))}
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
