import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Compass, CalendarDays, BookOpenCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SupportedRole = "student" | "coach";

type WelcomeGettingStartedDialogProps = {
  role: SupportedRole;
  firstName?: string | null;
};

const STORAGE_KEY = "ezamu_show_getting_started_modal";

export function queueGettingStartedModal() {
  localStorage.setItem(STORAGE_KEY, "true");
}

export function WelcomeGettingStartedDialog({ role, firstName }: WelcomeGettingStartedDialogProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const shouldOpen = localStorage.getItem(STORAGE_KEY) === "true";
    if (shouldOpen) {
      setOpen(true);
    }
  }, []);

  const content = useMemo(() => {
    const name = firstName?.trim() || "there";

    if (role === "coach") {
      return {
        title: "Getting Started",
        description: `Welcome ${name}! We appreciate you joining Ezamu and providing guidance to students and young adults in need.`,
        steps: [
          {
            icon: CalendarDays,
            title: "Set your availability",
            body: "Head to My Availability at the top and add times students can book with you.",
            ctaLabel: "Go to My Availability",
            ctaPath: "/availability",
          },
          {
            icon: BookOpenCheck,
            title: "Build your profile",
            body: "Keep your profile and expertise areas up to date so students can quickly see how you can help.",
            ctaLabel: "Open Profile",
            ctaPath: "/profile",
          },
        ],
      };
    }

    return {
      title: "Getting Started",
      description: `Welcome ${name}! To get started, we recommend taking the assessment first so Ezamu can better personalize your path.`,
      steps: [
        {
          icon: Compass,
          title: "Take the assessment",
          body: "Open the Assessment tab at the top first to discover your Inner Hero and get more relevant guidance.",
          ctaLabel: "Go to Assessment",
          ctaPath: "/assessment",
        },
        {
          icon: Users,
          title: "Explore your support network",
          body: "Browse coaches under Appointments and peers under Peers to start building support around your goals.",
          ctaLabel: "View Appointments",
          ctaPath: "/appointments",
        },
      ],
    };
  }, [firstName, role]);

  const closeDialog = () => {
    localStorage.removeItem(STORAGE_KEY);
    setOpen(false);
  };

  const handlePrimaryAction = (path: string) => {
    closeDialog();
    setLocation(path);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeDialog();
        else setOpen(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl border-none p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#121c34] to-[#3131d8] px-6 py-5 text-white">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-serif text-white">{content.title}</DialogTitle>
            <DialogDescription className="text-white/80 text-base leading-relaxed">
              {content.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6 space-y-4 bg-white">
          {content.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border border-slate-200 p-5 shadow-sm bg-slate-50/60">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3131d8]/10 text-[#3131d8] shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#121c34] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <h3 className="text-base font-semibold text-[#121c34]">{step.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{step.body}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#3131d8]/30 text-[#121c34] hover:bg-[#3131d8]/5"
                      onClick={() => handlePrimaryAction(step.ctaPath)}
                    >
                      {step.ctaLabel}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 bg-white">
          <Button type="button" className="bg-[#121c34] hover:bg-[#121c34]/90" onClick={closeDialog}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
