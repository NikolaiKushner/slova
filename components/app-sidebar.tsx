"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronsUpDown,
  ClipboardPlus,
  LayoutDashboard,
  Library,
  LogOut,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSearch } from "@/components/app-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const learnItems = [
  { title: "Today", href: "/home", icon: LayoutDashboard },
  { title: "Study", href: "/study", icon: BookOpen },
  { title: "Lists", href: "/home#lists", icon: Library },
] as const;

const toolItems = [
  { title: "Add words", href: "/import", icon: ClipboardPlus },
] as const;

function userInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function SidebarBrandHeader() {
  return (
    <SidebarHeader className="h-14 justify-center px-3">
      <div className="flex h-9 items-center gap-1.5">
        <Link
          href="/home"
          className="min-w-0 flex-1 font-display text-2xl tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden"
        >
          <span className="truncate">Slova</span>
        </Link>
        <div className="ml-auto flex items-center gap-0.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:ml-0">
          <AppSearch className="group-data-[collapsible=icon]:hidden" />
          <SidebarTrigger className="size-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground [&_svg]:size-4 [&_svg]:stroke-[2]" />
        </div>
      </div>
    </SidebarHeader>
  );
}

function SidebarUserMenu() {
  const { data } = useSession();
  const { isMobile } = useSidebar();
  const email = data?.user?.email ?? "";
  const name = data?.user?.name || email.split("@")[0] || "Account";
  const initials = userInitials(data?.user?.name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2 rounded-lg p-2 text-left outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-sidebar-ring data-popup-open:bg-sidebar-hover group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0!"
      >
        <Avatar className="size-7 bg-foreground text-background after:border-transparent group-data-[collapsible=icon]:size-7">
          <AvatarFallback className="bg-foreground text-xs font-medium text-background">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {name}
          </p>
          {email ? (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          ) : null}
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={isMobile ? "bottom" : "top"}
        align="start"
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-xs text-muted-foreground">
              {email || "Signed in"}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  function itemActive(href: string) {
    if (href === "/home#lists") {
      return (
        (pathname === "/home" && hash === "#lists") ||
        pathname.startsWith("/decks/")
      );
    }
    if (href === "/home") {
      return pathname === "/home" && hash !== "#lists";
    }
    if (href === "/study") {
      return pathname === "/study" || pathname.startsWith("/study/");
    }
    if (href === "/import") {
      return pathname === "/import";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarBrandHeader />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.7rem] tracking-[0.14em] text-brand-soft">
            Learn
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {learnItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={itemActive(item.href)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.7rem] tracking-[0.14em] text-brand-soft">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={itemActive(item.href)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 px-3 pb-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <SidebarUserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
