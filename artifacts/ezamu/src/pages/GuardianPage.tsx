import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useGetMe,
  useGetGuardianStudentDetail,
  useSendMessage,
} from "@workspace/api-client-react";
import {
  User,
  Loader2,
  Target,
  ListChecks,
  TrendingUp,
  AlertCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type GuardianTriad = {
  studentName: string;
  coachName: string;
  peerName: string;
  guardianName: string;
};

type GuardianStudentDetailWithTriad = {
  triad?: GuardianTriad;
};

type GuardianRequest = {
  id: number;
  studentId: number;
  guardianEmail: string;
  guardianUserId: number | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
  updatedAt: string;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    profilePicUrl: string | null;
  } | null;
};

export function GuardianPage() {
  const { toast } = useToast();
  const { data: me, isLoading: isMeLoading } = useGetMe();
  const sendMessage = useSendMessage();

  const [studentId, setStudentId] = useState<number | null>(null);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [requests, setRequests] = useState<GuardianRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isRespondingId, setIsRespondingId] = useState<number | null>(null);
  const [expandedGoalIds, setExpandedGoalIds] = useState<number[]>([]);
  const {
    data: studentData,
    isLoading: isFetchingStudent,
  } = useGetGuardianStudentDetail(studentId);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isRemovingSelf, setIsRemovingSelf] = useState(false);
  const toggleGoal = (goalId: number) => {
    setExpandedGoalIds((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };
  useEffect(() => {
    const loadGuardianRequests = async () => {
      if (!me || me.role !== "guardian") return;

      setIsLoadingRequests(true);
      try {
        const response = await fetch("/api/users/guardian-requests", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load guardian requests");
        }

        const data: GuardianRequest[] = await response.json();
        setRequests(data);

        const acceptedRequest = data.find(
          (request) => request.status === "accepted" && request.student,
        );

        if (acceptedRequest?.student) {
          setStudentId(acceptedRequest.student.id);
          setLinkedEmail(acceptedRequest.student.email);
          return;
        }

        setStudentId(null);
        setLinkedEmail(null);
      } catch {
        toast({
          title: "Could not load guardian requests",
          description: "Please refresh and try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingRequests(false);
      }
    };

    loadGuardianRequests();
  }, [me, toast]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  const actionProgress = useMemo(() => {
    if (!studentData || studentData.actionItems.length === 0) return 0;
    const completed = studentData.actionItems.filter((i) => i.completed).length;
    return Math.round((completed / studentData.actionItems.length) * 100);
  }, [studentData]);

  const approvedGoals =
    studentData?.smartGoals.filter((g) => g.status === "approved") ?? [];

  const handleRespondToRequest = async (
    requestId: number,
    status: "accepted" | "rejected",
  ) => {
    setIsRespondingId(requestId);

    try {
      const response = await fetch(`/api/users/guardian-requests/${requestId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to respond to request");
      }

      toast({
        title:
          status === "accepted" ? "Guardian request accepted" : "Guardian request rejected",
        description:
          status === "accepted"
            ? "You are now connected to the student."
            : "The request has been rejected.",
      });

      const refreshed = await fetch("/api/users/guardian-requests", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!refreshed.ok) {
        throw new Error("Failed to refresh guardian requests");
      }

      const refreshedData: GuardianRequest[] = await refreshed.json();
      setRequests(refreshedData);

      const acceptedRequest = refreshedData.find(
        (request) => request.status === "accepted" && request.student,
      );

      if (acceptedRequest?.student) {
        setStudentId(acceptedRequest.student.id);
        setLinkedEmail(acceptedRequest.student.email);
      } else {
        setStudentId(null);
        setLinkedEmail(null);
      }
    } catch (error) {
      toast({
        title: "Could not update request",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRespondingId(null);
    }
  };
  const handleRemoveSelfFromTriad = async () => {
    setIsRemovingSelf(true);

    try {
      const response = await fetch("/api/users/remove-self-guardian", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to remove guardian from triad");
      }

      toast({
        title: "Removed from triad",
        description: "You have been disconnected from this student.",
      });

      setRemoveDialogOpen(false);
      setStudentId(null);
      setLinkedEmail(null);

      const refreshed = await fetch("/api/users/guardian-requests", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (refreshed.ok) {
        const refreshedData: GuardianRequest[] = await refreshed.json();
        setRequests(refreshedData);
      } else {
        setRequests([]);
      }
    } catch (error) {
      toast({
        title: "Could not remove guardian",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingSelf(false);
    }
  };
  const handleNudgeStudent = () => {
    if (!studentData?.student?.id) {
      toast({
        title: "Student not loaded",
        description: "Please try again.",
        variant: "destructive",
      });
      return;
    }

    const firstActionItem = studentData.actionItems[0];
    if (!firstActionItem) {
      toast({
        title: "No action items",
        description: "Your student has no action items to nudge yet.",
        variant: "destructive",
      });
      return;
    }

    const guardianFirstName = me?.firstName?.trim() || "Your guardian";
    const message = `${guardianFirstName} has nudged you to work on ${firstActionItem.title}`;

    sendMessage.mutate(
      {
        data: {
          receiverId: studentData.student.id,
          content: message,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Nudge sent",
            description: "Your student has been nudged in chat.",
          });
        },
        onError: () => {
          toast({
            title: "Failed to send nudge",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
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

  const studentDataWithTriad =
    studentData as typeof studentData & GuardianStudentDetailWithTriad;

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        <div className="bg-[#121c34] text-white pt-8 pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold">
                  Guardian View
                </h1>
                <p className="text-white/70 mt-1 text-sm">
                  Read-only progress dashboard for your child
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl px-4 -mt-16 space-y-6">
          {isLoadingRequests ? (
            <Card className="border-none shadow-sm">
              <CardContent className="py-10 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading guardian requests...
              </CardContent>
            </Card>
          ) : !studentId ? (
            <>
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif text-[#121c34]">
                    Guardian Invitations
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Accept a student invitation to view their progress dashboard.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No pending guardian invitations right now.
                    </p>
                  ) : (
                    pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-xl border bg-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 ring-2 ring-[#3131d8]/10">
                            <AvatarImage
                              src={request.student?.profilePicUrl ?? undefined}
                            />
                            <AvatarFallback className="bg-[#121c34] text-white font-semibold">
                              {request.student?.firstName?.[0] ?? "S"}
                              {request.student?.lastName?.[0] ?? "T"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-[#121c34]">
                              {request.student
                                ? `${request.student.firstName} ${request.student.lastName}`
                                : "Student"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.student?.email ?? request.guardianEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              handleRespondToRequest(request.id, "accepted")
                            }
                            disabled={isRespondingId === request.id}
                            className="bg-[#121c34] hover:bg-[#121c34]/90"
                          >
                            {isRespondingId === request.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Working...
                              </>
                            ) : (
                              "Accept"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleRespondToRequest(request.id, "rejected")
                            }
                            disabled={isRespondingId === request.id}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          ) : isFetchingStudent ? (
            <Card className="border-none shadow-sm">
              <CardContent className="py-10 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading student data...
              </CardContent>
            </Card>
          ) : !studentData ? (
            <Card className="border-none shadow-sm">
              <CardContent className="py-10 text-center">
                <p className="text-[#121c34] font-medium">
                  No linked student profile could be loaded.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please refresh and try again.
                </p>
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
                      <span className="text-muted-foreground text-xl font-normal">
                        {" "}
                        / {studentData.smartGoals.length}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      approved
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-md border-none overflow-hidden">
                  <div className="h-1 bg-[#607b7d]" />
                  <CardContent className="pt-5">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <ListChecks className="w-4 h-4" /> Action Items Progress
                    </div>
                    <div className="text-3xl font-bold text-[#121c34]">
                      {actionProgress}%
                    </div>
                    <Progress value={actionProgress} className="h-2 mt-2" />
                  </CardContent>
                </Card>

                <Card className="shadow-md border-none overflow-hidden">
                  <div className="h-1 bg-[#bb7e5d]" />
                  <CardContent className="pt-5">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Linked Email
                    </div>
                    <div className="text-lg font-semibold text-[#121c34] break-all">
                      {linkedEmail ?? studentData.student.email}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      read-only access
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <CardTitle className="text-lg font-serif text-[#121c34] flex items-center gap-2">
                    <User className="w-5 h-5 text-[#3131d8]" />
                    Triad Team
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    View the current student, coach, guardian, and assigned peer
                    for this triad.
                  </p>
                </CardHeader>

                <CardContent className="pt-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-slate-50/50 p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Student
                      </p>
                      <p className="font-medium text-[#121c34]">
                        {studentDataWithTriad.triad?.studentName ||
                          "No student is connected"}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-slate-50/50 p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Coach
                      </p>
                      <p className="font-medium text-[#121c34]">
                        {studentDataWithTriad.triad?.coachName ||
                          "No coach is connected"}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-slate-50/50 p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Peer
                      </p>
                      <p className="font-medium text-[#121c34]">
                        {studentDataWithTriad.triad?.peerName ||
                          "No peer is connected"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                        <AvatarImage
                          src={studentData.student.profilePicUrl ?? undefined}
                        />
                        <AvatarFallback className="bg-[#121c34] text-white font-semibold">
                          {studentData.student.firstName[0]}
                          {studentData.student.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-[#121c34]">
                          {studentData.student.firstName}{" "}
                          {studentData.student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {studentData.student.email}
                        </p>
                      </div>
                    </div>

                    {studentData.student.innerHeroArchetype && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Inner Hero
                        </p>
                        <Badge className="bg-[#3131d8]/10 text-[#121c34] border-[#3131d8]/20 border">
                          {ARCHETYPE_LABELS[
                            studentData.student.innerHeroArchetype
                          ] || studentData.student.innerHeroArchetype}
                        </Badge>
                      </div>
                    )}

                    {studentData.student.bio && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Bio
                        </p>
                        <p className="text-sm text-[#121c34]">
                          {studentData.student.bio}
                        </p>
                      </div>
                    )}

                    {studentData.student.fieldsOfInterest.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Fields of Interest
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {studentData.student.fieldsOfInterest.map((f) => (
                            <Badge
                              key={f}
                              variant="secondary"
                              className="text-xs bg-[#add8e6]/30 text-[#121c34]"
                            >
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
                          Completed on{" "}
                          {format(
                            new Date(studentData.assessment.dateTaken),
                            "MMMM d, yyyy",
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {studentData.assessment.summary}
                        </p>
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
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={
                                    label === "thinker"
                                      ? "h-full bg-[#3131d8]"
                                      : label === "helper"
                                        ? "h-full bg-[#607b7d]"
                                        : label === "planner"
                                          ? "h-full bg-[#dbb68f]"
                                          : "h-full bg-[#bb7e5d]"
                                  }
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Assessment not completed yet.
                        </p>
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

                <CardContent className="p-4">
                  {studentData.smartGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">No SMART goals yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {studentData.smartGoals.map((goal) => {
                        const expanded = expandedGoalIds.includes(goal.id);

                        return (
                          <div
                            key={goal.id}
                            className="rounded-xl border bg-slate-50 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => toggleGoal(goal.id)}
                              className="w-full p-4 flex items-start justify-between gap-3 text-left hover:bg-slate-100/70 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-[#121c34]">{goal.title}</p>
                                {goal.timeBound && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Due {format(new Date(goal.timeBound), "MMM d, yyyy")}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className="capitalize">{goal.status}</Badge>
                                {expanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                            </button>

                            {expanded && (
                              <div className="border-t px-4 py-4 text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <p className="font-semibold text-[#3131d8] mb-1">S: Specific</p>
                                  <p>{goal.specific || "—"}</p>
                                </div>

                                <div>
                                  <p className="font-semibold text-[#607b7d] mb-1">M: Measurable</p>
                                  <p>{goal.measurable || "—"}</p>
                                </div>

                                <div>
                                  <p className="font-semibold text-[#bb7e5d] mb-1">A: Achievable</p>
                                  <p>{goal.achievable || "—"}</p>
                                </div>

                                <div>
                                  <p className="font-semibold text-[#dbb68f] mb-1">R: Relevant</p>
                                  <p>{goal.relevant || "—"}</p>
                                </div>

                                <div className="md:col-span-2">
                                  <p className="font-semibold text-[#121c34] mb-1">T: Time-bound</p>
                                  <p>
                                    {goal.timeBound
                                      ? format(new Date(goal.timeBound), "MMM d, yyyy")
                                      : "—"}
                                  </p>
                                </div>

                                {goal.coachFeedback && (
                                  <div className="md:col-span-2">
                                    <p className="font-semibold text-[#121c34] mb-1">
                                      Coach Feedback
                                    </p>
                                    <p>{goal.coachFeedback}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-xl font-serif text-[#121c34] flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-[#607b7d]" />
                        Action Items
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Read-only task list
                      </p>
                    </div>
                    <Button
                      onClick={handleNudgeStudent}
                      disabled={
                        sendMessage.isPending || studentData.actionItems.length === 0
                      }
                      className="bg-[#3131d8] hover:bg-[#3131d8]/90"
                    >
                      {sendMessage.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Nudge Student"
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {studentData.actionItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">
                      No action items yet.
                    </p>
                  ) : (
                    studentData.actionItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${item.completed
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-slate-200"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#121c34]">
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              item.completed
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }
                          >
                            {item.completed ? "completed" : "in progress"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Guardian view is read-only. Editing is disabled.
                </p>

                <Button
                  variant="outline"
                  onClick={() => setRemoveDialogOpen(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Remove myself from this triad
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#121c34] font-serif text-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Remove yourself from this triad?
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              This will disconnect you from the student and remove your guardian link.
              You can be invited again later if needed.
            </p>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={handleRemoveSelfFromTriad}
              disabled={isRemovingSelf}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              {isRemovingSelf ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Yes, remove me"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
              disabled={isRemovingSelf}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}