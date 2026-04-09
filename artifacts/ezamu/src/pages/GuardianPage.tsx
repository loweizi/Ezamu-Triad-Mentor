import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  useGetMe,
  searchUsers,
  useGetGuardianStudentDetail,
  type ActionItem,
  type SmartGoal,
} from "@workspace/api-client-react";
import { User, Loader2, Target, ListChecks, TrendingUp, AlertCircle, Mail, Search } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const ARCHETYPE_LABELS: Record<string, string> = {
  hero: "The Hero",
  mentor: "The Mentor",
  explorer: "The Explorer",
  creator: "The Creator",
  sage: "The Sage",
  rebel: "The Rebel",
  lover: "The Lover",
  caregiver: "The Caregiver",
  ruler: "The Ruler",
  magician: "The Magician",
  innocent: "The Innocent",
  jester: "The Jester",
  thinker: "The Thinker",
  doer: "The Doer",
  helper: "The Helper",
  planner: "The Planner",
};

const STORAGE_KEY = "guardian.studentEmail";

export function GuardianPage() {
  const { toast } = useToast();
  const { data: me, isLoading: isMeLoading } = useGetMe();

  const [studentEmailInput, setStudentEmailInput] = useState("");
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setStudentEmailInput(saved);
      setLinkedEmail(saved);
    }
  }, []);

  const {
    data: studentData,
    isLoading: isFetchingStudent,
  } = useGetGuardianStudentDetail(studentId);

  useEffect(() => {
    const load = async () => {
      if (!linkedEmail) return;

      try {
        const matches = await searchUsers({ email: linkedEmail });
        const student = matches.find((u) => u.role === "student");

        if (!student) {
          setStudentId(null);
          toast({ title: "Student not found", description: "No student account was found with that email.", variant: "destructive" });
          return;
        }

        setStudentId(student.id);
      } catch {
        setStudentId(null);
        toast({ title: "Could not load student", description: "Please try again.", variant: "destructive" });
      }
    };

    load();
    // We intentionally re-run when linkedEmail changes.
  }, [linkedEmail, toast]);

  const isReadOnly = true;

  const actionProgress = useMemo(() => {
    if (!studentData || studentData.actionItems.length === 0) return 0;
    const completed = studentData.actionItems.filter((i) => i.completed).length;
    return Math.round((completed / studentData.actionItems.length) * 100);
  }, [studentData]);

  const approvedGoals = studentData?.smartGoals.filter((g) => g.status === "approved") ?? [];
  const pendingGoals = studentData?.smartGoals.filter((g) => g.status === "pending") ?? [];

  const handleLinkStudent = async () => {
    const value = studentEmailInput.trim().toLowerCase();
    if (!value) {
      toast({ title: "Email required", description: "Enter your child's email to continue.", variant: "destructive" });
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, value);
    setLinkedEmail(value);
  };

  const handleChangeStudent = () => {
    setLinkedEmail(null);
    setStudentId(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  if (isMeLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin mr-2" /> Loading...
        </div>
      </MainLayout>
    );
  }

  if (me?.role !== "guardian") {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">This page is for guardians only.</p>
        </div>
      </MainLayout>
    );
  }

  if (!linkedEmail) {
    return (
      <MainLayout>
        <div className="flex-1 bg-slate-50 py-12 px-4">
          <div className="container mx-auto max-w-xl">
            <Card className="shadow-sm border-none">
              <CardHeader>
                <CardTitle className="text-2xl font-serif text-[#121c34]">Connect to Your Child's Profile</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter your child's student email to view their progress, SMART goals, and action plan.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="child-email">Child's Email</Label>
                  <Input
                    id="child-email"
                    type="email"
                    placeholder="student@email.com"
                    value={studentEmailInput}
                    onChange={(e) => setStudentEmailInput(e.target.value)}
                  />
                </div>
                <Button onClick={handleLinkStudent} className="w-full bg-[#121c34] hover:bg-[#121c34]/90">
                  <Search className="w-4 h-4 mr-2" />
                  View Student Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        <div className="bg-[#121c34] text-white pt-8 pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold">Guardian View</h1>
                <p className="text-white/70 mt-1 text-sm">Read-only progress dashboard for your child</p>
              </div>
              <Button variant="outline" className="bg-white text-[#121c34]" onClick={handleChangeStudent}>
                Change Child Email
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl px-4 -mt-16 space-y-6">
          {isFetchingStudent ? (
            <Card className="border-none shadow-sm">
              <CardContent className="py-10 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading student data...
              </CardContent>
            </Card>
          ) : !studentData || !studentId ? (
            <Card className="border-none shadow-sm">
              <CardContent className="py-10 text-center">
                <p className="text-[#121c34] font-medium">No student profile found for {linkedEmail}</p>
                <p className="text-sm text-muted-foreground mt-1">Check the email and try again.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card className="shadow-md border-none overflow-hidden">
                  <div className="h-1 bg-[#3131d8]" />
                  <CardContent className="pt-5">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <Target className="w-4 h-4" /> SMART Goals
                    </div>
                    <div className="text-3xl font-bold text-[#121c34]">
                      {approvedGoals.length}
                      <span className="text-muted-foreground text-xl font-normal"> / {studentData.smartGoals.length}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">approved</p>
                  </CardContent>
                </Card>

                <Card className="shadow-md border-none overflow-hidden">
                  <div className="h-1 bg-[#607b7d]" />
                  <CardContent className="pt-5">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <ListChecks className="w-4 h-4" /> Action Items Progress
                    </div>
                    <div className="text-3xl font-bold text-[#121c34]">{actionProgress}%</div>
                    <Progress value={actionProgress} className="h-2 mt-2" />
                  </CardContent>
                </Card>

                <Card className="shadow-md border-none overflow-hidden">
                  <div className="h-1 bg-[#bb7e5d]" />
                  <CardContent className="pt-5">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Linked Email
                    </div>
                    <div className="text-lg font-semibold text-[#121c34] break-all">{linkedEmail}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">read-only access</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm border-none">
                  <CardHeader className="border-b bg-slate-50/50 pb-4">
                    <CardTitle className="text-lg font-serif text-[#121c34] flex items-center gap-2">
                      <User className="w-5 h-5 text-[#3131d8]" />
                      Student Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-[#3131d8]/10">
                        <AvatarImage src={studentData.student.profilePicUrl ?? undefined} />
                        <AvatarFallback className="bg-[#121c34] text-white font-semibold">
                          {studentData.student.firstName[0]}{studentData.student.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-[#121c34]">
                          {studentData.student.firstName} {studentData.student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{studentData.student.email}</p>
                      </div>
                    </div>

                    {studentData.student.innerHeroArchetype && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Inner Hero</p>
                        <Badge className="bg-[#3131d8]/10 text-[#121c34] border-[#3131d8]/20 border">
                          {ARCHETYPE_LABELS[studentData.student.innerHeroArchetype] || studentData.student.innerHeroArchetype}
                        </Badge>
                      </div>
                    )}

                    {studentData.student.bio && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bio</p>
                        <p className="text-sm text-[#121c34]">{studentData.student.bio}</p>
                      </div>
                    )}

                    {studentData.student.fieldsOfInterest.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fields of Interest</p>
                        <div className="flex flex-wrap gap-2">
                          {studentData.student.fieldsOfInterest.map((f) => (
                            <Badge key={f} variant="secondary" className="text-xs bg-[#add8e6]/30 text-[#121c34]">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-none">
                  <CardHeader className="border-b bg-slate-50/50 pb-4">
                    <CardTitle className="text-lg font-serif text-[#121c34] flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#607b7d]" />
                      Assessment Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {studentData.assessment ? (
                      <div className="space-y-4">
                        <p className="text-sm text-[#121c34]">
                          Completed on {format(new Date(studentData.assessment.dateTaken), "MMMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{studentData.assessment.summary}</p>
                        <div className="space-y-2">
                          {(
                            [
                              ["thinker", studentData.assessment.thinkerScore],
                              ["helper", studentData.assessment.helperScore],
                              ["planner", studentData.assessment.plannerScore],
                              ["doer", studentData.assessment.doerScore],
                            ] as [string, number][]
                          ).map(([label, score]) => (
                            <div key={label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="capitalize text-[#121c34]">{label}</span>
                                <span className="font-medium">{score}%</span>
                              </div>
                              <Progress value={score} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Assessment not completed yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <CardTitle className="text-xl font-serif text-[#121c34] flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#3131d8]" />
                    SMART Goals
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Read-only goal tracker</p>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {studentData.smartGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">No SMART goals yet.</p>
                  ) : (
                    studentData.smartGoals.map((goal) => (
                      <Card key={goal.id} className="border shadow-none">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex justify-between items-start gap-3">
                            <p className="font-semibold text-[#121c34] text-sm">{goal.title}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize border ${
                                goal.status === "approved"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : goal.status === "denied"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                              }`}
                            >
                              {goal.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{goal.timeBound}</p>
                          {goal.coachFeedback && (
                            <p className="text-sm text-[#121c34] bg-slate-50 p-3 rounded-lg">Coach feedback: {goal.coachFeedback}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <CardTitle className="text-xl font-serif text-[#121c34] flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-[#607b7d]" />
                    Action Items
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Read-only task list</p>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {studentData.actionItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">No action items yet.</p>
                  ) : (
                    studentData.actionItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${item.completed ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#121c34]">{item.title}</p>
                            {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                          </div>
                          <Badge
                            variant="outline"
                            className={item.completed ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-700 border-slate-200"}
                          >
                            {item.completed ? "completed" : "in progress"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {isReadOnly && (
                <div className="text-xs text-muted-foreground text-right">Guardian view is read-only. Editing is disabled.</div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
