import { Link } from "wouter";
import { Show, useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Menu, User as UserIcon, LogOut, Activity } from "lucide-react";
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

export function Navbar() {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#121c34]/95 backdrop-blur supports-[backdrop-filter]:bg-[#121c34]/80">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3131d8] to-[#acedff] flex items-center justify-center text-white font-bold text-xl">
            E
          </div>
          <span className="font-serif text-xl font-bold text-white tracking-tight">Ezamu</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Show when="signed-out">
            <Link href="/#how-it-works" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              How it Works
            </Link>
            <Link href="/contact" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Contact Us
            </Link>
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/20">
              <Link href="/sign-in" className="text-sm font-medium text-white hover:text-white/80 transition-colors">
                Log In
              </Link>
              <Link href="/sign-up" className="text-sm font-medium">
                <Button className="bg-[#dbb68f] text-[#121c34] hover:bg-[#dbb68f]/90 border-none rounded-full px-6">
                  Try It Out
                </Button>
              </Link>
            </div>
          </Show>

          <Show when="signed-in">
            <Link href="/dashboard" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/assessment" className="text-sm font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              Assessment
            </Link>
            <Link href="/appointments" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Appointments
            </Link>
            
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/20">
              <Link href="/chat" className="text-white/80 hover:text-white transition-colors">
                <MessageCircle className="w-5 h-5" />
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8 ring-2 ring-white/20">
                      <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
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
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#121c34] border-l-white/10 text-white">
              <div className="flex flex-col gap-6 mt-8">
                <Show when="signed-out">
                  <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    How it Works
                  </Link>
                  <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    Contact Us
                  </Link>
                  <div className="h-px bg-white/10 my-2" />
                  <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white hover:text-white/80 transition-colors">
                    Log In
                  </Link>
                  <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-[#dbb68f]">
                    Try It Out
                  </Link>
                </Show>

                <Show when="signed-in">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10 ring-2 ring-white/20">
                      <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                      <AvatarFallback className="bg-[#607b7d] text-white">
                        {user?.firstName?.charAt(0) || <UserIcon className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.fullName}</span>
                      <span className="text-xs text-white/60">{user?.primaryEmailAddress?.emailAddress}</span>
                    </div>
                  </div>
                  
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/assessment" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    Assessment
                  </Link>
                  <Link href="/appointments" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    Appointments
                  </Link>
                  <Link href="/chat" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    Messages
                  </Link>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80 hover:text-white transition-colors">
                    Profile
                  </Link>
                  
                  <div className="h-px bg-white/10 my-2" />
                  <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="text-left text-lg font-medium text-[#bb7e5d] transition-colors flex items-center gap-2">
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
