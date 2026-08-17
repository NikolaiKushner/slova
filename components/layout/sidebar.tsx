"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  ChartNoAxesColumn,
  ChevronsUpDown,
  LibraryBig,
  LogOut,
  PenLine,
  Repeat2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

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
import { BrandWordmark } from "@/components/brand-mark";
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

import { NAV_SECTIONS, isNavItemActive } from "@/lib/nav";
import { SIGNED_IN_HOME } from "@/lib/auth.config";
import { LocaleSwitcher } from "@/components/locale-switcher";

/**
 * Icons are keyed by href instead of living in `lib/nav.ts`, so the nav model
 * stays free of `lucide-react` and can be tested in a plain node env.
 */
const NAV_ICONS: Record<string, LucideIcon> = {
  "/practice": Repeat2,
  "/courses/grammar": PenLine,
  "/dictionary": LibraryBig,
  "/dictionary/sets": Bookmark,
};

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
    <SidebarHeader className="min-h-16 justify-center border-b border-sidebar-border px-3 pt-[env(safe-area-inset-top)] group-data-[collapsible=icon]:min-h-16 group-data-[collapsible=icon]:pt-4">
      <div className="flex h-10 items-center gap-1.5">
        <Link
          href={SIGNED_IN_HOME}
          className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"
        >
          <BrandWordmark className="text-2xl" />
        </Link>
        <div className="ml-auto flex items-center gap-0.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:ml-0">
          <AppSearch className="size-9 rounded-sm group-data-[collapsible=icon]:hidden [&_svg]:size-5" />
          <SidebarTrigger className="size-9 shrink-0 rounded-sm text-sidebar-foreground hover:bg-secondary hover:text-foreground group-data-[collapsible=icon]:size-8! [&_svg]:size-5 group-data-[collapsible=icon]:[&_svg]:size-4 [&_svg]:stroke-[2]" />
        </div>
      </div>
    </SidebarHeader>
  );
}

function SidebarUserMenu() {
  const { data } = useSession();
  const { isMobile } = useSidebar();
  const t = useTranslations("chrome");
  const nav = useTranslations("nav");
  const email = data?.user?.email ?? "";
  const name = data?.user?.name || email.split("@")[0] || t("account");
  const initials = userInitials(data?.user?.name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-sidebar-ring data-popup-open:bg-muted group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0!"
      >
        <Avatar className="size-8 bg-foreground text-background after:border-transparent group-data-[collapsible=icon]:size-7">
          <AvatarFallback className="bg-foreground text-sm font-medium text-background group-data-[collapsible=icon]:text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-base leading-tight font-medium text-sidebar-foreground">
            {name}
          </p>
          {email ? (
            <p className="truncate text-xs leading-tight text-muted-foreground">{email}</p>
          ) : null}
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
        className="min-w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2.5 px-1 py-1.5 text-left">
              <Avatar className="size-8 bg-foreground text-background after:border-transparent">
                <AvatarFallback className="bg-foreground text-sm font-medium text-background">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-medium text-foreground">
                  {name}
                </span>
                {email ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                ) : null}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="px-1 py-1">
          <LocaleSwitcher variant="plain" />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/progress" />}>
          <ChartNoAxesColumn />
          {nav("myProgress")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut />
          {t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <Sidebar collapsible="icon" className="h-dvh border-sidebar-border">
      <SidebarBrandHeader />

      <SidebarContent>
        {NAV_SECTIONS.map((section) => {
          const sectionTitle = t(section.titleKey);
          return (
            <SidebarGroup
              key={section.titleKey}
              className="py-2 first:pt-2 last:pb-2"
            >
              <SidebarGroupLabel className="text-caption mb-1 h-6 font-medium text-eyebrow group-data-[collapsible=icon]:-mt-6">
                {sectionTitle}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5">
                  {section.items.map((item) => {
                    const Icon = NAV_ICONS[item.href];
                    const itemTitle = t(item.titleKey);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={isNavItemActive(pathname, item.href)}
                          tooltip={t("sectionItem", {
                            section: sectionTitle,
                            item: itemTitle,
                          })}
                          className="text-body-sm h-9 gap-2.5 rounded-sm px-2.5 py-2 leading-none [&_svg]:size-[17px]"
                        >
                          {Icon ? <Icon strokeWidth={1.7} /> : null}
                          <span>{itemTitle}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="gap-1 border-t border-sidebar-border px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <SidebarUserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
