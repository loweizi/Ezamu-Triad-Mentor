import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGetMe, useOnboardUser, getGetMeQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Check } from "lucide-react";

const STUDENT_INTERESTS = [
  "Science & Math", "Coding & Tech", "Arts & Design",
  "Writing & Literature", "Business & Finance", "Healthcare",
  "Psychology", "Engineering", "Music & Performance",
];

const COACH_EXPERTISE = [
  "STEM & Technology", "Arts & Creative Design", "Business & Entrepreneurship",
  "Health & Wellness", "Writing & Communication", "College Preparation",
  "Leadership & Personal Growth", "Career Coaching", "Social & Emotional Skills",
  "Engineering", "Law & Advocacy", "Music & Performing Arts",
];

export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const onboardMutation = useOnboardUser();

  const pendingRole = (localStorage.getItem("ezamu_pending_role") as "student" | "coach" | "guardian" | null)
    ?? user?.role
    ?? "student";
  const pendingFirstName = localStorage.getItem("ezamu_pending_firstName") || user?.firstName || "";
  const pendingLastName = localStorage.getItem("ezamu_pending_lastName") || user?.lastName || "";

  const isCoach = pendingRole === "coach";

  const [step, setStep] = useState(1);
  const [age, setAge] = useState<string>("");
  const [bio, setBio] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  useEffect(() => {
    if (user?.onboardingCompleted) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const fieldOptions = isCoach ? COACH_EXPERTISE : STUDENT_INTERESTS;

  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!isCoach && (!age || isNaN(Number(age)))) {
        toast.error("Please enter a valid age.");
        return;
      }
      if (isCoach && age && isNaN(Number(age))) {
        toast.error("Age must be a number.");
        return;
      }
    }
    if (step === 2 && selectedFields.length === 0) {
      toast.error(isCoach ? "Please select at least one area of expertise." : "Please select at least one interest.");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    if (!bio.trim()) {
      toast.error("Please write a short bio.");
      return;
    }

    const data: Record<string, unknown> = {
      ...(pendingFirstName ? { firstName: pendingFirstName } : {}),
      ...(pendingLastName ? { lastName: pendingLastName } : {}),
      bio,
      ...(pendingRole ? { role: pendingRole } : {}),
    };

    if (age && !isNaN(Number(age))) {
      data.age = Number(age);
    }

    if (isCoach) {
      data.fieldsOfExpertise = selectedFields;
    } else {
      data.fieldsOfInterest = selectedFields;
    }

    onboardMutation.mutate(
      { data: data as Parameters<typeof onboardMutation.mutate>[0]["data"] },
      {
        onSuccess: (updatedUser) => {
          queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
          localStorage.removeItem("ezamu_pending_role");
          localStorage.removeItem("ezamu_pending_firstName");
          localStorage.removeItem("ezamu_pending_lastName");
          toast.success("Welcome to Ezamu!");
          setLocation("/dashboard");
        },
        onError: () => {
          toast.error("Failed to complete onboarding. Please try again.");
        },
      }
    );
  };

  if (isUserLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  const TOTAL_STEPS = 3;

  const stepTitles = isCoach
    ? ["Let's set up your profile", "Your areas of expertise", "Introduce yourself"]
    : ["Let's get started", "What excites you?", "Tell us about yourself"];

  const stepDescriptions = isCoach
    ? [
        "Just a few quick questions to personalise your coaching profile.",
        "Select the areas you coach or specialise in.",
        "Write a short bio so students can get to know you.",
      ]
    : [
        "Just a few quick questions to personalise your experience.",
        "Select the fields you're most interested in exploring.",
        "Write a short bio so coaches can get to know you.",
      ];

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-lg border-none shadow-xl">
          <div className="h-2 w-full bg-slate-100 rounded-t-xl overflow-hidden">
            <div
              className="h-full bg-[#3131d8] transition-all duration-500 ease-in-out"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>

          <CardHeader className="text-center pb-2">
            {pendingFirstName && (
              <p className="text-sm text-muted-foreground mb-1">
                Welcome, <span className="font-medium text-[#121c34]">{pendingFirstName}</span>!
                {isCoach && (
                  <span className="ml-1 text-[#3131d8] font-medium">(Coach)</span>
                )}
              </p>
            )}
            <CardTitle className="text-2xl font-serif text-[#121c34]">
              {stepTitles[step - 1]}
            </CardTitle>
            <CardDescription className="text-base">
              {stepDescriptions[step - 1]}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 pb-8">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="age">
                    How old are you?
                    {isCoach && <span className="ml-1 text-muted-foreground text-xs font-normal">(optional)</span>}
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder={isCoach ? "e.g. 34 (optional)" : "e.g. 16"}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fieldOptions.map(field => {
                  const selected = selectedFields.includes(field);
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => handleFieldToggle(field)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors w-full ${
                        selected
                          ? "border-[#3131d8] bg-[#3131d8]/5"
                          : "border-slate-200 hover:border-[#3131d8]/30"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                        selected
                          ? "bg-[#3131d8] border-[#3131d8]"
                          : "bg-white border-slate-300"
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <span className="flex-1 font-medium text-sm text-[#121c34]">{field}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Your Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder={
                      isCoach
                        ? "I'm a coach with 5 years of experience helping students in..."
                        : "I'm a high school junior interested in..."
                    }
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-[150px] resize-none text-base"
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t p-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || onboardMutation.isPending}
              className="text-muted-foreground"
            >
              Back
            </Button>

            {step < TOTAL_STEPS ? (
              <Button
                onClick={handleNext}
                className="bg-[#121c34] hover:bg-[#121c34]/90 px-8"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={onboardMutation.isPending}
                className="bg-[#dbb68f] text-[#121c34] hover:bg-[#dbb68f]/90 px-8"
              >
                {onboardMutation.isPending ? "Saving..." : "Complete"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
}
