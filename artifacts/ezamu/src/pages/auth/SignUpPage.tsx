import { useState } from "react";
import { SignUp } from "@clerk/react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, BookOpen, Heart, Users } from "lucide-react";

type Role = "student" | "peer" | "coach" | "guardian";

const ROLES: {
  value: Role;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "student",
    label: "Student",
    description: "I'm a student looking for guidance, coaching, and a plan for my future.",
    icon: <GraduationCap className="w-8 h-8" />,
    color: "from-[#3131d8] to-[#5b5be8]",
  },
  {
    value: "peer",
    label: "Peer",
    description: "I'm here to support students alongside coaches and be part of a triad.",
    icon: <Users className="w-8 h-8" />,
    color: "from-[#4a6365] to-[#607b7d]",
  },
  {
    value: "coach",
    label: "Coach",
    description: "I'm a mentor or counselor who wants to guide students.",
    icon: <BookOpen className="w-8 h-8" />,
    color: "from-[#121c34] to-[#2a3a6e]",
  },
  {
    value: "guardian",
    label: "Guardian",
    description: "I'm a parent or guardian who wants to stay involved.",
    icon: <Heart className="w-8 h-8" />,
    color: "from-[#607b7d] to-[#4a6365]",
  },
];

type Step = "role" | "name" | "clerk";

export function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameError, setNameError] = useState("");

  const handleRoleConfirm = () => {
    if (!selectedRole) return;
    localStorage.setItem("ezamu_pending_role", selectedRole);
    setStep("name");
  };

  const handleNameConfirm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setNameError("Please enter both your first and last name.");
      return;
    }
    setNameError("");
    localStorage.setItem("ezamu_pending_firstName", firstName.trim());
    localStorage.setItem("ezamu_pending_lastName", lastName.trim());
    setStep("clerk");
  };

  const gradient = "linear-gradient(180deg, #121c34 0%, #3131d8 55%, #add8e6 100%)";

  if (step === "clerk") {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center p-4" style={{ background: gradient }}>
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

  if (step === "name") {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center p-6" style={{ background: gradient }}>
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">What's your name?</h1>
              <p className="text-white/75 text-base">We'll use this to personalise your experience.</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-white/90 font-medium">First name</Label>
                <Input
                  id="firstName"
                  autoFocus
                  placeholder="e.g. Alex"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); setNameError(""); }}
                  onKeyDown={e => e.key === "Enter" && document.getElementById("lastName")?.focus()}
                  className="h-12 bg-white/10 border-white/25 text-white placeholder:text-white/40 focus-visible:ring-white focus-visible:border-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-white/90 font-medium">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Johnson"
                  value={lastName}
                  onChange={e => { setLastName(e.target.value); setNameError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleNameConfirm()}
                  className="h-12 bg-white/10 border-white/25 text-white placeholder:text-white/40 focus-visible:ring-white focus-visible:border-white"
                />
              </div>
              {nameError && (
                <p className="text-sm text-red-300">{nameError}</p>
              )}
            </div>

            <button
              onClick={handleNameConfirm}
              className="w-full h-14 rounded-full font-semibold text-base bg-white text-[#3131d8] hover:bg-white/90 shadow-xl transition-all duration-200"
            >
              Continue
            </button>

            <button
              onClick={() => setStep("role")}
              className="w-full mt-3 text-center text-white/60 text-sm hover:text-white/80 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: gradient }}>
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
                  className={`w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all duration-200 text-left ${isSelected
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
            onClick={handleRoleConfirm}
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
