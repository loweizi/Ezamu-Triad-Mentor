import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Compass, CalendarDays, BookOpenCheck, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SupportedRole = "student" | "coach" | "peer";

type WelcomeGettingStartedDialogProps = {
  role: SupportedRole;
  firstName?: string | null;
};

const STORAGE_KEY = "ezamu_show_getting_started_modal";

export function queueGettingStartedModal() {
  localStorage.setItem(STORAGE_KEY, "true");
}

export function WelcomeGettingStartedDialog({
  role,
  firstName,
}: WelcomeGettingStartedDialogProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const shouldShowGettingStarted =
      localStorage.getItem(STORAGE_KEY) === "true" && role !== "peer";

    if (shouldShowGettingStarted) {
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
            icon: Users,
            title: "Manage your students and peers",
            body: "Use your dashboard to review your students and assign available peers to the right student triads.",
            ctaLabel: "Open Dashboard",
            ctaPath: "/dashboard",
          },
        ],
      };
    }

    if (role === "peer") {
      return {
        title: "Getting Started",
        description: `Welcome ${name}! Your peer account is now set up.`,
        steps: [
          {
            icon: Clock,
            title: "Wait for assignment",
            body: "A coach will pair you with a student once they are ready to place you in a triad.",
            ctaLabel: "Go to Peer Dashboard",
            ctaPath: "/peer-dashboard",
          },
          {
            icon: Compass,
            title: "Complete your profile",
            body: "Keep your profile up to date so coaches and students know who you are when you are assigned.",
            ctaLabel: "Open Profile",
            ctaPath: "/profile",
          },
        ],
      };
    }

    return {
      title: "Getting Started",
      description: `Welcome ${name}! We recommend starting with your assessment so your experience can be tailored to your goals.`,
      steps: [
        {
          icon: BookOpenCheck,
          title: "Take your assessment",
          body: "Start with the assessment so Ezamu can better understand your interests, needs, and goals.",
          ctaLabel: "Go to Assessment",
          ctaPath: "/assessment",
        },
        {
          icon: Compass,
          title: "Explore coaches",
          body: "Browse available coaches, book a session, and begin building your plan.",
          ctaLabel: "View Coaches",
          ctaPath: "/coaches",
        },
      ],
    };
  }, [firstName, role]);

  const closeDialog = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("ezamu_show_role_select");
    localStorage.removeItem("ezamu_dashboard_mode");
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
            <DialogTitle className="text-2xl font-serif text-white">
              {content.title}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-base leading-relaxed">
              {content.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6 space-y-4 bg-white">
          {content.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-200 p-5 shadow-sm bg-slate-50/60"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3131d8]/10 text-[#3131d8] shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#121c34] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <h3 className="text-base font-semibold text-[#121c34]">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {step.body}
                    </p>
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
          <Button
            type="button"
            className="bg-[#121c34] hover:bg-[#121c34]/90 text-white"
            onClick={closeDialog}
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}