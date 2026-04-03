import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Star, Target, Users, Sparkles } from "lucide-react";

export function Home() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden ezamu-gradient text-white py-24 md:py-32">
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-8 text-sm font-medium text-[#acedff]">
            <Sparkles className="w-4 h-4" />
            <span>Discover your Inner Hero</span>
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-tight mb-6">
            Guidance for the <span className="text-[#dbb68f] italic">journey ahead.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mb-10 leading-relaxed">
            Ezamu connects high school and college students with experienced coaches and peers to form a triad of support. Build S.M.A.R.T goals, discover your archetype, and take action.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="bg-[#dbb68f] text-[#121c34] hover:bg-[#dbb68f]/90 border-none rounded-full h-14 px-8 text-lg font-medium w-full sm:w-auto shadow-xl">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/#how-it-works">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full h-14 px-8 text-lg font-medium w-full sm:w-auto backdrop-blur-sm">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#acedff] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-[#dbb68f] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </section>

      {/* Triad Section */}
      <section className="py-24 bg-white" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#121c34] mb-4">The Power of Three</h2>
            <p className="text-lg text-muted-foreground">
              Mentorship works best when it's not a one-way street. The Ezamu triad creates a complete support system.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Student */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center relative hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-[#121c34] text-white flex items-center justify-center mb-6 shadow-md rotate-3">
                <Star className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#121c34] mb-3">The Student</h3>
              <p className="text-muted-foreground">
                You are the hero of this story. Bring your goals, your questions, and your ambition.
              </p>
            </div>

            {/* Coach */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center relative hover:shadow-lg transition-shadow mt-4 md:-mt-4">
              <div className="w-16 h-16 rounded-2xl bg-[#607b7d] text-white flex items-center justify-center mb-6 shadow-md -rotate-3">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#121c34] mb-3">The Coach</h3>
              <p className="text-muted-foreground">
                Experienced mentors who provide perspective, help you set S.M.A.R.T goals, and hold you accountable.
              </p>
            </div>

            {/* Peer */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center relative hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-[#bb7e5d] text-white flex items-center justify-center mb-6 shadow-md rotate-3">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#121c34] mb-3">The Peer</h3>
              <p className="text-muted-foreground">
                Someone walking a similar path. Share notes, encourage each other, and grow together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#f8f9fa]">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-4xl font-serif font-bold text-[#121c34] mb-6">Ready to find your path?</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Take the Inner Hero assessment today to discover your archetype and start matching with coaches who fit your style.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-[#121c34] text-white hover:bg-[#121c34]/90 rounded-full h-14 px-10 text-lg font-medium shadow-xl">
              Start Your Journey
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
