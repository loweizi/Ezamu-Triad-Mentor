import { SignIn } from "@clerk/react";
import { MainLayout } from "@/components/layout/MainLayout";

export function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center p-4 ezamu-gradient">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </MainLayout>
  );
}
