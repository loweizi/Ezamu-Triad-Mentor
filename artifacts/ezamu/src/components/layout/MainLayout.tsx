import { Navbar } from "./Navbar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      
      {/* Simple Footer */}
      <footer className="bg-[#121c34] text-white/60 py-8 border-t border-white/10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#3131d8] to-[#acedff] flex items-center justify-center text-white font-bold text-xs">
              E
            </div>
            <span className="font-serif font-bold text-white tracking-tight">Ezamu</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Ezamu. Discover your Inner Hero.</p>
          <div className="flex gap-4 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
