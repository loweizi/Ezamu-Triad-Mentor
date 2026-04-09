import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CoachDashboardPage } from "./CoachDashboardPage";
import { StudentDashboardPage } from "./StudentDashboardPage";

export function DashboardPage() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: { enabled: isLoaded && isSignedIn === true },
  });

  useEffect(() => {
    if (!isUserLoading && user && !user.onboardingCompleted) {
      setLocation("/onboarding");
    }
  }, [user, isUserLoading, setLocation]);

  if (isUserLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Loading your dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  if (user?.role === "coach") {
    return <CoachDashboardPage />;
  }

  return <StudentDashboardPage />;
}
