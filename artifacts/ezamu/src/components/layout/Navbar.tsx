import { Link, useLocation } from "wouter";
import { Show, useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Menu, User as UserIcon, LogOut, Activity, CalendarDays } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useGetMe, useGetDashboardSummary } from "@workspace/api-client-react";

export function Navbar() {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const { data: appUser } = useGetMe();
  const { data: dashboardSummary } = useGetDashboardSummary();
  const unreadCount = dashboardSummary?.unreadMessagesCount || 0;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const isHome = location === "/";

  const navClass = isHome
    ? "sticky top-0 z-50 w-full bg-white border-b border-[#121c34]/10 shadow-sm"
    : "sticky top-0 z-50 w-full border-b border-white/10 bg-[#121c34]/95 backdrop-blur supports-[backdrop-filter]:bg-[#121c34]/80";

  const logoTextClass = isHome ? "text-[#121c34]" : "text-white";
  const linkClass = isHome
    ? "text-sm font-medium text-[#121c34]/70 hover:text-[#121c34] transition-colors"
    : "text-sm font-medium text-white/80 hover:text-white transition-colors";

  const getNavLinkClass = (href: string, extra = "") => {
    const isActive = location === href || (href !== "/" && location.startsWith(href));
    if (isHome) {
      return `text-sm font-medium transition-colors ${isActive ? "text-[#121c34] font-bold" : "text-[#121c34]/70 hover:text-[#121c34]"} ${extra}`;
    }
    return `text-sm font-medium transition-colors ${isActive ? "text-white font-bold" : "text-white/80 hover:text-white"} ${extra}`;
  };

  const getMobileNavLinkClass = (href: string) => {
    const isActive = location === href || (href !== "/" && location.startsWith(href));
    return `text-lg transition-colors ${isActive ? "text-white font-bold" : "font-medium text-white/80 hover:text-white"}`;
  };
  const loginClass = isHome
    ? "text-sm font-medium text-[#121c34] hover:text-[#3131d8] transition-colors"
    : "text-sm font-medium text-white hover:text-white/80 transition-colors";
  const dividerClass = isHome ? "border-l border-[#121c34]/20" : "border-l border-white/20";

  return (
    <nav className={navClass}>
      <div className="container mx-auto px-4 h-[72px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <span className={`font-sans text-2xl font-bold tracking-tight ${logoTextClass}`}>Ezamu</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Show when="signed-out">
            <Link href="/assessment" className={linkClass}>
              Assessment
            </Link>
            <Link href="/contact" className={linkClass}>
              Contact Us
            </Link>
            <div className={`flex items-center gap-4 ml-4 pl-4 ${dividerClass}`}>
              <Link href="/sign-in" className={loginClass}>
                Login
              </Link>
              <Link href="/sign-up">
                <Button className="bg-[#3131d8] text-white hover:bg-[#3131d8]/90 border-none rounded-full px-6">
                  Sign Up
                </Button>
              </Link>
            </div>
          </Show>

          <Show when="signed-in">
            <Link href="/dashboard" className={getNavLinkClass("/dashboard")}>
              Dashboard
            </Link>
            {appUser?.role === "coach" ? (
              <Link href="/availability" className={getNavLinkClass("/availability", "flex items-center gap-1.5")}>
                <CalendarDays className="w-4 h-4" />
                My Availability
              </Link>
            ) : (
              <Link href="/assessment" className={getNavLinkClass("/assessment", "flex items-center gap-1.5")}>
                <Activity className="w-4 h-4" />
                Assessment
              </Link>
            )}
            <Link href="/appointments" className={getNavLinkClass("/appointments")}>
              Appointments
            </Link>

            <div className={`flex items-center gap-4 ml-4 pl-4 ${dividerClass}`}>
              <Link href="/chat" className={`relative ${isHome ? "text-[#121c34]/70 hover:text-[#121c34] transition-colors" : "text-white/80 hover:text-white transition-colors"}`}>
                <MessageCircle className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className={`h-8 w-8 ring-2 ${isHome ? "ring-[#121c34]/20" : "ring-white/20"}`}>
                      <AvatarImage src={appUser?.profilePicUrl ?? user?.imageUrl ?? undefined} alt={user?.fullName || "User"} />
                      <AvatarFallback className="bg-[#607b7d] text-white">
                        {user?.firstName?.charAt(0) || <UserIcon className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="w-full cursor-pointer">Profile Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Show>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={isHome ? "text-[#121c34]" : "text-white"}>
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#121c34] border-l-white/10 text-white">
              <div className="flex flex-col gap-6 mt-8">
                <Show when="signed-out">
                  <Link href="/assessment" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    Assessment
                  </Link>
                  <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    Contact Us
                  </Link>
                  <div className="h-px bg-white/10 my-2" />
                  <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white hover:text-white/80 transition-colors">
                    Login
                  </Link>
                  <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-[#acedff]">
                    Sign Up
                  </Link>
                </Show>

                <Show when="signed-in">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10 ring-2 ring-white/20">
                      <AvatarImage src={appUser?.profilePicUrl ?? user?.imageUrl ?? undefined} alt={user?.fullName || "User"} />
                      <AvatarFallback className="bg-[#607b7d] text-white">
                        {user?.firstName?.charAt(0) || <UserIcon className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.fullName}</span>
                      <span className="text-xs text-white/60">{user?.primaryEmailAddress?.emailAddress}</span>
                    </div>
                  </div>

                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className={getMobileNavLinkClass("/dashboard")}>
                    Dashboard
                  </Link>
                  {appUser?.role === "coach" ? (
                    <Link href="/availability" onClick={() => setMobileMenuOpen(false)} className={`${getMobileNavLinkClass("/availability")} flex items-center gap-2`}>
                      <CalendarDays className="w-5 h-5" />
                      My Availability
                    </Link>
                  ) : (
                    <Link href="/assessment" onClick={() => setMobileMenuOpen(false)} className={getMobileNavLinkClass("/assessment")}>
                      Assessment
                    </Link>
                  )}
                  <Link href="/appointments" onClick={() => setMobileMenuOpen(false)} className={getMobileNavLinkClass("/appointments")}>
                    Appointments
                  </Link>
                  <Link href="/chat" onClick={() => setMobileMenuOpen(false)} className={getMobileNavLinkClass("/chat")}>
                    Messages
                  </Link>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className={getMobileNavLinkClass("/profile")}>
                    Profile
                  </Link>

                  <div className="h-px bg-white/10 my-2" />
                  <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="text-left text-lg font-medium text-[#acedff] transition-colors flex items-center gap-2">
                    <LogOut className="w-5 h-5" />
                    Log out
                  </button>
                </Show>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
