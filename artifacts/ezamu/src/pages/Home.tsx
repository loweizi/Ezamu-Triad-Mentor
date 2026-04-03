import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Quote } from "lucide-react";

const steps = [
  {
    step: "STEP 1",
    title: "Tell Us About You",
    description:
      "Tell us who you are. Share your interests, goals, and background information so we can understand where you are in your college and career journey.",
  },
  {
    step: "STEP 2",
    title: "Meet Your Team",
    description:
      "Book an appointment with suggested coaches and peers who understand your background so you're never planning alone.",
  },
  {
    step: "STEP 3",
    title: "Take Action",
    description:
      "Work through clear actionable goals, scholarship searches, and application milestones with regular check-ins from your Ezamu team.",
  },
];

const testimonials = [
  {
    quote:
      "Ezamu helped me go from feeling completely lost about my future to having a real plan. My coach understood exactly where I was coming from.",
    name: "Aaliyah M.",
    role: "High School Senior",
    initial: "A",
  },
  {
    quote:
      "As a first-gen student, I had no idea where to start. Ezamu gave me the structure and support I needed to apply to college confidently.",
    name: "Marcus T.",
    role: "College Freshman",
    initial: "M",
  },
  {
    quote:
      "I love being able to see my son's progress and stay involved without hovering. Ezamu keeps our whole family on the same page.",
    name: "Patricia W.",
    role: "Parent / Guardian",
    initial: "P",
  },
];

export function Home() {
  return (
    <MainLayout>
      {/* Hero Section — two-column layout */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(180deg, #121c34 0%, #3131d8 55%, #add8e6 100%)",
          minHeight: "calc(100vh - 72px)",
        }}
      >
        {/* Decorative blur orbs */}
        <div className="absolute top-1/4 -left-24 w-80 h-80 bg-[#acedff] rounded-full mix-blend-screen filter blur-[80px] opacity-15 pointer-events-none" />
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-[#acedff] rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none" />

        <div className="container mx-auto px-6 py-20 md:py-28 flex flex-col md:flex-row items-center gap-14 relative z-10">
          {/* Left — Text */}
          <div className="flex-1 max-w-xl">
            <h1 className="font-sans text-4xl md:text-5xl font-bold leading-tight mb-6 tracking-tight">
              <span className="text-white">Ezamu</span>
              <span className="text-white/80 font-normal">: The All-In-One Career &amp; College Guidance Platform</span>
            </h1>
            <p className="text-base md:text-lg text-white/75 mb-10 leading-relaxed">
              Connect with verified mentors, counsellors, and peers to discover majors best for you, explore career paths,
              and build a plan for life after high school — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="bg-[#121c34] text-white hover:bg-[#121c34]/80 border border-white/20 rounded-full h-14 px-8 text-base font-semibold w-full sm:w-auto shadow-xl"
                >
                  Get Evaluated Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 rounded-full h-14 px-8 text-base font-semibold w-full sm:w-auto backdrop-blur-sm"
                >
                  Already Have an Account?
                </Button>
              </Link>
            </div>
          </div>

          {/* Right — Dashboard preview card */}
          <div className="flex-1 flex justify-center md:justify-end w-full max-w-md">
            <div className="bg-white rounded-[28px] shadow-2xl w-full aspect-[4/3] flex flex-col overflow-hidden">
              {/* Mock browser bar */}
              <div className="bg-[#f4f5f7] px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                <div className="flex-1 ml-3 h-5 rounded bg-white border border-slate-200 flex items-center px-3">
                  <span className="text-[10px] text-slate-400">ezamu.app/dashboard</span>
                </div>
              </div>
              {/* Mock dashboard content */}
              <div className="flex-1 bg-[#f8fafd] p-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  {["Appointments", "Action Items", "Progress"].map((label) => (
                    <div key={label} className="flex-1 bg-white rounded-xl shadow-sm p-3 border border-slate-100">
                      <div className="w-8 h-1.5 rounded bg-[#3131d8]/30 mb-2" />
                      <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                      <div className="w-6 h-5 mt-1 rounded bg-[#3131d8]/20" />
                    </div>
                  ))}
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#3131d8] to-[#acedff]" />
                    <div className="h-2 w-24 bg-slate-100 rounded" />
                  </div>
                  {[100, 75, 55, 90].map((w, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <div className="h-1.5 bg-[#3131d8]/20 rounded" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How Can Ezamu Help You? */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-[#121c34] mb-6">
            How Can Ezamu Help You?
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">
            If you're feeling overwhelmed, you've found the best platform that has all the tools to help relieve the stress
            and anxiety. Students can get tailored advice specific for their interests and financial backgrounds. Ezamu
            connects you to coaches who help students create a college and career plan with actionable items to accomplish.
          </p>
        </div>
      </section>

      {/* How Ezamu Works — 3 step cards */}
      <section
        className="py-20"
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #e8f0fe 40%, #c9dff6 100%)" }}
        id="how-it-works"
      >
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-[#121c34] mb-4">
            How Ezamu Works
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mb-12 leading-relaxed">
            In just a few steps, students move from feeling overwhelmed about college and careers to having a clear,
            guided plan and a supportive team behind them.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map(({ step, title, description }) => (
              <div
                key={step}
                className="rounded-[28px] p-7 flex flex-col border border-white/60 hover:shadow-lg transition-shadow"
                style={{ background: "linear-gradient(160deg, #ffffff 0%, #add8e6 100%)" }}
              >
                <span className="font-sans text-2xl font-bold text-[#3131d8] mb-2">{step}</span>
                <h3 className="font-sans text-xl font-bold text-[#121c34] mb-3">{title}</h3>
                <p className="text-slate-700 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-[#121c34] mb-12">
            Trusted By Students, Mentors, and Parents...
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, name, role, initial }) => (
              <div
                key={name}
                className="rounded-[24px] p-7 border border-slate-100 bg-[#f8fafd] hover:shadow-md transition-shadow flex flex-col gap-4"
              >
                <Quote className="w-6 h-6 text-[#3131d8]/50" />
                <p className="text-slate-700 text-sm leading-relaxed flex-1">"{quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#3131d8] to-[#acedff] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {initial}
                  </div>
                  <div>
                    <p className="font-semibold text-[#121c34] text-sm">{name}</p>
                    <p className="text-xs text-slate-500">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section
        className="py-20 text-white text-center"
        style={{ background: "linear-gradient(135deg, #121c34 0%, #3131d8 100%)" }}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="font-sans text-3xl md:text-4xl font-bold mb-8">
            Ready To Start Planning Your Career Path?
          </h2>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-white text-[#3131d8] hover:bg-white/90 rounded-full h-14 px-10 text-base font-semibold shadow-xl"
            >
              Get Evaluated Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
