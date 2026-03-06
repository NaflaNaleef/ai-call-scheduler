import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Play,
  PhoneCall,
  UserCircle,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Menu,
  List,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; icon: React.ElementType; path: string }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  {
    label: "Contacts",
    icon: Users,
    children: [
      { label: "All Contacts", icon: List, path: "/contacts" },
      { label: "Groups", icon: FolderOpen, path: "/contacts/groups" },
    ],
  },
  { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { label: "Campaign Runs", icon: Play, path: "/campaign-runs" },
  { label: "Call Logs", icon: PhoneCall, path: "/call-logs" },
  { label: "Profile", icon: UserCircle, path: "/profile" },
  { label: "Settings", icon: Settings, path: "/settings" },
  { label: "Subscriptions", icon: CreditCard, path: "/subscriptions" },
];

function SidebarItem({
  item,
  collapsed,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasChildren = !!item.children;
  const isChildActive = hasChildren && item.children!.some((c) => pathname === c.path);
  const [open, setOpen] = useState(isChildActive);

  if (!hasChildren) {
    const isActive = pathname === item.path;
    return (
      <Link
        to={item.path!}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative group",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary-foreground rounded-r-full" />
        )}
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  // Collapsible parent
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full relative",
          isChildActive
            ? "text-sidebar-accent-foreground bg-sidebar-accent/50"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                !open && "-rotate-90"
              )}
            />
          </>
        )}
      </button>
      {!collapsed && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            open ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="ml-4 pl-3 border-l border-sidebar-border space-y-0.5 py-1">
            {item.children!.map((child) => {
              const isActive = pathname === child.path;
              return (
                <Link
                  key={child.path}
                  to={child.path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 relative",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-sidebar-primary-foreground rounded-r-full" />
                  )}
                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-lg font-semibold text-sidebar-accent-foreground tracking-tight">
            SaaSDash
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-sidebar-accent transition-colors duration-150 text-sidebar-muted hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarItem
            key={item.label}
            item={item}
            collapsed={collapsed}
            pathname={location.pathname}
          />
        ))}
      </nav>
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/40 z-40 md:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-0 h-full w-60 bg-sidebar text-sidebar-foreground z-50 md:hidden flex flex-col animate-fade-in">
        <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
          <span className="text-lg font-semibold text-sidebar-accent-foreground tracking-tight">
            SaaSDash
          </span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem
              key={item.label}
              item={item}
              collapsed={false}
              pathname={location.pathname}
              onNavigate={onClose}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
