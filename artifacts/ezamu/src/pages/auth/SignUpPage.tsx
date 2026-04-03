import { SignUp } from "@clerk/react";
import { MainLayout } from "@/components/layout/MainLayout";

export function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center p-4 ezamu-gradient">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </MainLayout>
  );
}
