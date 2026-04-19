import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2, Clock, UserCheck, Calendar, CheckCircle2, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type PeerTask = {
  id: number;
  title: string;
  description?: string | null;
  completed?: boolean;
};

type PeerGoal = {
  id: number;
  title: string;
  status?: string;
};

type PeerAppointment = {
  id: number;
  scheduledAt: string;
  title?: string;
  coachName?: string;
};

type PeerDashboardResponse = {
  assigned: boolean;
  student?: {
    id: number;
    name: string;
    bio?: string | null;
  };
  tasks?: PeerTask[];
  goals?: PeerGoal[];
  appointments?: PeerAppointment[];
  triad?: {
    studentName: string;
    coachName?: string | null;
    peerName?: string | null;
  };
};

export function PeerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState(false);
  const [student, setStudent] = useState<PeerDashboardResponse["student"] | null>(null);
  const [tasks, setTasks] = useState<PeerTask[]>([]);
  const [goals, setGoals] = useState<PeerGoal[]>([]);
  const [appointments, setAppointments] = useState<PeerAppointment[]>([]);
  const [triad, setTriad] = useState<PeerDashboardResponse["triad"] | null>(null);

  useEffect(() => {
    fetch("/api/users/peer-dashboard")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load peer dashboard");
        }
        return res.json();
      })
      .then((data: PeerDashboardResponse) => {
        setAssigned(Boolean(data.assigned));
        setStudent(data.student ?? null);
        setTasks(data.tasks ?? []);
        setGoals(data.goals ?? []);
        setAppointments(data.appointments ?? []);
        setTriad(data.triad ?? null);
      })
      .catch((error) => {
        console.error("Peer dashboard error:", error);
        setAssigned(false);
        setStudent(null);
        setTasks([]);
        setGoals([]);
        setAppointments([]);
        setTriad(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const upcomingAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [appointments]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-[#3131d8] mb-3" />
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          {!assigned ? (
            <Card className="shadow-sm border-none">
              <CardHeader className="text-center pb-3">
                <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-slate-400" />
                </div>
                <CardTitle className="text-2xl font-serif text-[#121c34]">
                  You're almost ready
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Your account has been created and your onboarding is complete.
                </p>
                <p className="text-muted-foreground">
                  You are currently waiting for a coach to pair you with a student.
                </p>
                <p className="text-muted-foreground">
                  Once that happens, your dashboard will automatically populate with
                  your assigned student’s information.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-white border p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-[#3131d8]" />
                      <h3 className="font-semibold text-[#121c34]">What happens next</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      A coach will assign you to a student they work with. After that,
                      your role in the triad becomes active.
                    </p>
                  </div>

                  <div className="rounded-xl bg-white border p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-4 h-4 text-[#3131d8]" />
                      <h3 className="font-semibold text-[#121c34]">Once assigned</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You’ll be able to view your assigned student’s details and take
                      part in the triad flow with the student and coach.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-2xl border bg-slate-100/70 p-4 md:p-6">
              <div className="space-y-6">
                <div className="rounded-xl bg-white border p-5">
                  <h2 className="text-2xl font-serif text-[#121c34] mb-3">Assigned Student</h2>
                  <h3 className="text-xl font-semibold text-[#121c34]">
                    {student?.name}
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {student?.bio?.trim()
                      ? student.bio
                      : "No student bio is available yet."}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-xl bg-white border p-5">
                    <h3 className="text-[#121c34] font-semibold flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-[#3131d8]" />
                      Assigned Tasks
                    </h3>
                    <div className="space-y-3">
                      {tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
                      ) : (
                        tasks.map((t) => (
                          <div key={t.id} className="rounded-lg border bg-slate-50 p-3">
                            <p className="font-medium text-[#121c34]">{t.title}</p>
                            {t.description && (
                              <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border p-5">
                    <h3 className="text-[#121c34] font-semibold flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-[#3131d8]" />
                      Upcoming Appointments
                    </h3>
                    <div className="space-y-3">
                      {upcomingAppointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No upcoming appointments yet.</p>
                      ) : (
                        upcomingAppointments.map((a) => (
                          <div key={a.id} className="rounded-lg border bg-slate-50 p-3">
                            <p className="font-medium text-[#121c34]">
                              {a.title || "Mentorship Session"}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(a.scheduledAt), "MMM d, yyyy • h:mm a")}
                            </p>
                            {a.coachName && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Coach: {a.coachName}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white border p-5">
                  <h3 className="text-[#121c34] font-semibold flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-[#3131d8]" />
                    SMART Goals
                  </h3>
                  <div className="space-y-3">
                    {goals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No SMART goals yet.</p>
                    ) : (
                      goals.map((g) => (
                        <div
                          key={g.id}
                          className="rounded-lg border bg-slate-50 p-3 flex items-center justify-between gap-3"
                        >
                          <p className="font-medium text-[#121c34]">{g.title}</p>
                          {g.status && <Badge variant="outline">{g.status}</Badge>}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white border p-5">
                  <h3 className="text-[#121c34] font-semibold flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-[#3131d8]" />
                    Triad Team
                  </h3>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Student</p>
                      <p className="font-medium text-[#121c34] mt-1">
                        {triad?.studentName ?? student?.name ?? "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Coach</p>
                      <p className="font-medium text-[#121c34] mt-1">
                        {triad?.coachName ?? "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Peer</p>
                      <p className="font-medium text-[#121c34] mt-1">
                        {triad?.peerName ?? "You"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}