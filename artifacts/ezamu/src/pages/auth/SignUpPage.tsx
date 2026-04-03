import { useState } from "react";
import { SignUp } from "@clerk/react";
import { MainLayout } from "@/components/layout/MainLayout";
import { GraduationCap, BookOpen, Heart } from "lucide-react";

type Role = "student" | "coach" | "guardian";

const ROLES: { value: Role; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "student",
    label: "Student",
    description: "I'm a student looking for guidance, coaching, and a plan for my future.",
    icon: <GraduationCap className="w-8 h-8" />,
    color: "from-[#3131d8] to-[#5b5be8]",
  },
  {
    value: "coach",
    label: "Coach",
    description: "I'm a mentor or counsellor who wants to guide students on their journey.",
    icon: <BookOpen className="w-8 h-8" />,
    color: "from-[#121c34] to-[#2a3a6e]",
  },
  {
    value: "guardian",
    label: "Guardian",
    description: "I'm a parent or guardian who wants to stay involved in my student's progress.",
    icon: <Heart className="w-8 h-8" />,
    color: "from-[#607b7d] to-[#4a6365]",
  },
];

export function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!selectedRole) return;
    localStorage.setItem("ezamu_pending_role", selectedRole);
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <MainLayout>
        <div
          className="flex-1 flex items-center justify-center p-4"
          style={{ background: "linear-gradient(180deg, #121c34 0%, #3131d8 55%, #add8e6 100%)" }}
        >
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
            forceRedirectUrl={`${basePath}/onboarding`}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: "linear-gradient(180deg, #121c34 0%, #3131d8 55%, #add8e6 100%)" }}
      >
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Join Ezamu</h1>
            <p className="text-white/75 text-base">Who are you creating an account as?</p>
          </div>

          <div className="space-y-4 mb-8">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? "border-white bg-white/15 shadow-lg scale-[1.01]"
                      : "border-white/25 bg-white/8 hover:bg-white/12 hover:border-white/50"
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center text-white flex-shrink-0 shadow-md`}>
                    {role.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-lg">{role.label}</span>
                      {isSelected && (
                        <span className="inline-flex w-5 h-5 rounded-full bg-white items-center justify-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#3131d8]" />
                        </span>
                      )}
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{role.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedRole}
            className="w-full h-14 rounded-full font-semibold text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-[#3131d8] hover:bg-white/90 shadow-xl"
          >
            Continue as {selectedRole ? ROLES.find(r => r.value === selectedRole)?.label : "..."}
          </button>

          <p className="text-center text-white/60 text-sm mt-5">
            Already have an account?{" "}
            <a href={`${basePath}/sign-in`} className="text-white font-medium hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
