import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGetMe, useOnboardUser } from "@workspace/api-client-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const INTERESTS = [
  "Science & Math", "Coding & Tech", "Arts & Design", 
  "Writing & Literature", "Business & Finance", "Healthcare",
  "Psychology", "Engineering", "Music & Performance"
];

export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const onboardMutation = useOnboardUser();
  
  const [step, setStep] = useState(1);
  const [age, setAge] = useState<string>("");
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    if (user?.onboardingCompleted) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleNext = () => {
    if (step === 1 && (!age || isNaN(Number(age)))) {
      toast.error("Please enter a valid age.");
      return;
    }
    if (step === 2 && selectedInterests.length === 0) {
      toast.error("Please select at least one interest.");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (!bio.trim()) {
      toast.error("Please write a short bio.");
      return;
    }
    
    onboardMutation.mutate(
      { 
        data: { 
          age: Number(age),
          bio,
          fieldsOfInterest: selectedInterests
        } 
      },
      {
        onSuccess: () => {
          toast.success("Welcome to Ezamu!");
          setLocation("/dashboard");
        },
        onError: () => {
          toast.error("Failed to complete onboarding. Please try again.");
        }
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

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-lg border-none shadow-xl">
          <div className="h-2 w-full bg-slate-100 rounded-t-xl overflow-hidden">
            <div 
              className="h-full bg-[#3131d8] transition-all duration-500 ease-in-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-serif text-[#121c34]">
              {step === 1 && "Let's get started"}
              {step === 2 && "What excites you?"}
              {step === 3 && "Tell us about yourself"}
            </CardTitle>
            <CardDescription className="text-base">
              {step === 1 && "Just a few quick questions to personalize your experience."}
              {step === 2 && "Select the fields you're most interested in exploring."}
              {step === 3 && "Write a short bio so coaches can get to know you."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 pb-8">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="age">How old are you?</Label>
                  <Input 
                    id="age" 
                    type="number" 
                    placeholder="e.g. 16" 
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTERESTS.map(interest => (
                  <div 
                    key={interest}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedInterests.includes(interest) 
                        ? "border-[#3131d8] bg-[#3131d8]/5" 
                        : "border-slate-200 hover:border-[#3131d8]/30"
                    }`}
                    onClick={() => handleInterestToggle(interest)}
                  >
                    <Checkbox 
                      id={`interest-${interest}`} 
                      checked={selectedInterests.includes(interest)}
                      onCheckedChange={() => handleInterestToggle(interest)}
                      className="data-[state=checked]:bg-[#3131d8] data-[state=checked]:border-[#3131d8]"
                    />
                    <Label 
                      htmlFor={`interest-${interest}`}
                      className="cursor-pointer flex-1 font-medium"
                    >
                      {interest}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Your Bio</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="I'm a high school junior interested in..."
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
            
            {step < 3 ? (
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
