import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetMyStudentDetail,
  useGetSmartGoals,
  useUpdateSmartGoal,
  useGetCoachNote,
  useSaveCoachNote,
  useCreateActionItem,
  useGetActionItems,
  type SmartGoal,
} from "@workspace/api-client-react";
import {
  ArrowLeft, Loader2, User, Calendar, Target, FileText,
  Check, X, ChevronDown, ChevronUp, Clock, BookOpen, Save,
  ListChecks, Plus,
} from "lucide-react";
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
};

const COACH_GUIDANCE: Record<string, string> = {
  thinker: "Knowing a student is a Thinker helps coaches understand that they may need time to process ideas before committing to a goal. Coaches can support them by giving clear explanations, encouraging confidence in decision-making, and helping them avoid getting stuck in overanalysis. Thinkers often respond well to detailed guidance, logic, and step-by-step planning.",
  doer: "If a student is a Doer, coaches can focus on hands-on opportunities, short-term action steps, and practical goal setting. These students usually benefit from active learning, internships, shadowing, and real-world experiences. Coaches may also need to help them slow down, reflect, and build long-term planning skills.",
  helper: "Knowing a student is a Helper allows coaches to guide them toward careers and goals that align with service, teamwork, and meaningful relationships. Coaches can also help them build confidence in prioritizing their own needs, making independent decisions, and recognizing that their caring nature is a real strength, not just a personality trait.",
  planner: "When coaches know a student is a Planner, they can use structured goal setting, timelines, and measurable steps to keep them motivated. Planners often do well when expectations are clear. Coaches can also help them build flexibility, manage perfectionism, and stay resilient when plans change.",
};

function SmartGoalCard({ goal, onUpdate }: { goal: SmartGoal; onUpdate: (goalId: number, status: "approved" | "denied", feedback?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(goal.coachFeedback || "");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const updateGoal = useUpdateSmartGoal();
  const { toast } = useToast();

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-green-100 text-green-700 border-green-200",
    denied: "bg-red-100 text-red-700 border-red-200",
  };

  const handleAction = async (status: "approved" | "denied") => {
    try {
      await updateGoal.mutateAsync({ goalId: goal.id, status, coachFeedback: feedback || undefined });
      onUpdate(goal.id, status, feedback);
      toast({ title: status === "approved" ? "Goal approved" : "Goal denied", description: `SMART goal has been ${status}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update goal.", variant: "destructive" });
    }
  };

  const handleSaveFeedback = async () => {
    setIsSavingFeedback(true);
    try {
      await updateGoal.mutateAsync({ goalId: goal.id, coachFeedback: feedback });
      toast({ title: "Feedback saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save feedback.", variant: "destructive" });
    } finally {
      setIsSavingFeedback(false);
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left"
      >
        <Target className="w-5 h-5 text-[#3131d8] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-[#121c34]">{goal.title}</p>
            <Badge className={`text-xs capitalize border ${statusColors[goal.status] || ""}`} variant="outline">
              {goal.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(goal.createdAt), "MMM d, yyyy")}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t bg-slate-50/50 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Specific", value: goal.specific },
              { label: "Measurable", value: goal.measurable },
              { label: "Achievable", value: goal.achievable },
              { label: "Relevant", value: goal.relevant },
              { label: "Time-Bound", value: goal.timeBound },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg p-3 border">
                <p className="text-xs font-semibold text-[#3131d8] uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm text-[#121c34]">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Coach Feedback
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Add feedback for this goal..."
              rows={3}
              className="w-full text-sm border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#3131d8]/30 focus:border-[#3131d8]"
            />
            <button
              onClick={handleSaveFeedback}
              disabled={isSavingFeedback || feedback === (goal.coachFeedback || "")}
              className="mt-1.5 text-xs text-[#3131d8] hover:underline disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              {isSavingFeedback ? "Saving..." : "Save feedback"}
            </button>
          </div>

          {goal.status === "pending" && (
            <div className="flex items-center gap-3 pt-1">
              <Button
                size="sm"
                onClick={() => handleAction("approved")}
                disabled={updateGoal.isPending}
                className="bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("denied")}
                disabled={updateGoal.isPending}
                className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Deny
              </Button>
            </div>
          )}

          {goal.status !== "pending" && (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => handleAction(goal.status === "approved" ? "denied" : "approved")}
                disabled={updateGoal.isPending}
                className="text-xs text-muted-foreground hover:text-[#3131d8] underline"
              >
                Change to {goal.status === "approved" ? "denied" : "approved"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CoachStudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = parseInt(params.studentId, 10);
  const { toast } = useToast();

  const { data: student, isLoading: isStudentLoading } = useGetMyStudentDetail(isNaN(studentId) ? null : studentId);
  const { data: goals, isLoading: isGoalsLoading } = useGetSmartGoals(isNaN(studentId) ? undefined : studentId);
  const { data: noteData, isLoading: isNoteLoading } = useGetCoachNote(isNaN(studentId) ? null : studentId);
  const { data: existingItems } = useGetActionItems();
  const saveNote = useSaveCoachNote();
  const createActionItem = useCreateActionItem();

  const [noteContent, setNoteContent] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemGoalId, setNewItemGoalId] = useState<number | null>(null);

  useEffect(() => {
    if (noteData?.content !== undefined) {
      setNoteContent(noteData.content);
    }
  }, [noteData]);

  const handleSaveNote = async () => {
    try {
      await saveNote.mutateAsync({ studentId, content: noteContent });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    }
  };

  const handleCreateActionItem = async () => {
    if (!newItemTitle.trim()) {
      toast({ title: "Title required", description: "Please enter a title for the action item.", variant: "destructive" });
      return;
    }
    try {
      await createActionItem.mutateAsync({
        data: {
          studentId,
          title: newItemTitle.trim(),
          description: newItemDescription.trim() || undefined,
          smartGoalId: newItemGoalId ?? undefined,
        },
      });
      setNewItemTitle("");
      setNewItemDescription("");
      setNewItemGoalId(null);
      toast({ title: "Action item assigned!", description: "The student will see it on their dashboard." });
    } catch {
      toast({ title: "Error", description: "Failed to assign action item.", variant: "destructive" });
    }
  };

  const isLoading = isStudentLoading || isGoalsLoading || isNoteLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#3131d8]" />
          <p>Loading student profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (!student) {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-muted-foreground">Student not found.</p>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const pendingGoals = (goals || []).filter(g => g.status === "pending");
  const approvedGoals = (goals || []).filter(g => g.status === "approved");
  const deniedGoals = (goals || []).filter(g => g.status === "denied");

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        {/* Header */}
        <div className="bg-[#121c34] text-white pt-8 pb-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <Link href="/dashboard">
              <button className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </Link>
            <div className="flex items-center gap-5">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarImage src={student.profilePicUrl || undefined} />
                <AvatarFallback className="bg-[#3131d8] text-xl text-white">
                  {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-serif font-bold">
                  {student.firstName} {student.lastName}
                </h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {student.innerHeroArchetype && (
                    <Badge className="bg-[#3131d8]/30 text-white border-white/20 border text-xs">
                      {ARCHETYPE_LABELS[student.innerHeroArchetype] || student.innerHeroArchetype}
                    </Badge>
                  )}
                  {student.age && (
                    <span className="text-white/60 text-sm">{student.age} years old</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl px-4 -mt-16 space-y-6">
          {/* Info row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="shadow-md border-none overflow-hidden">
              <div className="h-1 bg-[#3131d8]"></div>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" /> Total Sessions
                </div>
                <div className="text-3xl font-bold text-[#121c34]">{student.totalAppointments}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none overflow-hidden">
              <div className="h-1 bg-[#607b7d]"></div>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Target className="w-4 h-4" /> SMART Goals
                </div>
                <div className="text-3xl font-bold text-[#121c34]">
                  {approvedGoals.length}
                  <span className="text-muted-foreground text-xl font-normal"> / {(goals || []).length}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">approved</p>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none overflow-hidden">
              <div className="h-1 bg-[#bb7e5d]"></div>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" /> Next Session
                </div>
                <div className="text-lg font-bold text-[#121c34]">
                  {student.nextAppointmentAt
                    ? format(new Date(student.nextAppointmentAt), "MMM d, h:mm a")
                    : <span className="text-muted-foreground text-base font-normal">Not scheduled</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Info + Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-none">
              <CardHeader className="border-b bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-serif text-[#121c34] flex items-center gap-2">
                  <User className="w-5 h-5 text-[#3131d8]" />
                  Student Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {student.bio && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bio</p>
                    <p className="text-sm text-[#121c34]">{student.bio}</p>
                  </div>
                )}
                {student.fieldsOfInterest.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fields of Interest</p>
                    <div className="flex flex-wrap gap-2">
                      {student.fieldsOfInterest.map(f => (
                        <Badge key={f} variant="secondary" className="text-xs bg-[#add8e6]/30 text-[#121c34]">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {student.assessmentResult && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Inner Hero Assessment</p>
                    <p className="text-sm text-[#121c34] font-medium capitalize">
                      {ARCHETYPE_LABELS[student.assessmentResult.archetype] || student.assessmentResult.archetype}
                    </p>
                    {student.assessmentResult.completedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Completed {format(new Date(student.assessmentResult.completedAt), "MMMM d, yyyy")}
                      </p>
                    )}
                  </div>
                )}
                {student.email && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                    <p className="text-sm text-[#121c34]">{student.email}</p>
                  </div>
                )}
                {student.assessmentResult && COACH_GUIDANCE[student.assessmentResult.archetype] && (
                  <div className="mt-2 p-4 rounded-xl bg-[#3131d8]/5 border border-[#3131d8]/15">
                    <p className="text-xs font-semibold text-[#3131d8] uppercase tracking-wide mb-1.5">How to Guide This Student</p>
                    <p className="text-sm text-[#121c34] leading-relaxed">{COACH_GUIDANCE[student.assessmentResult.archetype]}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Appointments */}
            <Card className="shadow-sm border-none">
              <CardHeader className="border-b bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-serif text-[#121c34] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#607b7d]" />
                  Session History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {student.appointments.length > 0 ? (
                  <div className="divide-y">
                    {student.appointments.map(appt => (
                      <div key={appt.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#121c34]">{appt.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(appt.scheduledAt), "MMM d, yyyy · h:mm a")}
                          </p>
                        </div>
                        <Badge
                          className={`text-xs capitalize border ${
                            appt.status === "confirmed" ? "bg-green-100 text-green-700 border-green-200" :
                            appt.status === "cancelled" ? "bg-red-100 text-red-700 border-red-200" :
                            "bg-amber-100 text-amber-700 border-amber-200"
                          }`}
                          variant="outline"
                        >
                          {appt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SMART Goals */}
          <Card className="shadow-sm border-none">
            <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl font-serif text-[#121c34] flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#3131d8]" />
                  SMART Goals
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Review, approve, or deny student goals</p>
              </div>
              <div className="flex items-center gap-2">
                {pendingGoals.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">
                    {pendingGoals.length} pending review
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {(goals || []).length === 0 ? (
                <div className="py-8 text-center">
                  <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-[#121c34] font-medium">No SMART goals yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.firstName} hasn't submitted any SMART goals yet.
                  </p>
                </div>
              ) : (
                <>
                  {pendingGoals.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Pending Review</p>
                      <div className="space-y-2">
                        {pendingGoals.map(goal => (
                          <SmartGoalCard key={goal.id} goal={goal} onUpdate={() => {}} />
                        ))}
                      </div>
                    </div>
                  )}
                  {approvedGoals.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 mt-4">Approved</p>
                      <div className="space-y-2">
                        {approvedGoals.map(goal => (
                          <SmartGoalCard key={goal.id} goal={goal} onUpdate={() => {}} />
                        ))}
                      </div>
                    </div>
                  )}
                  {deniedGoals.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 mt-4">Denied</p>
                      <div className="space-y-2">
                        {deniedGoals.map(goal => (
                          <SmartGoalCard key={goal.id} goal={goal} onUpdate={() => {}} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Assign Action Items */}
          <Card className="shadow-sm border-none">
            <CardHeader className="border-b bg-slate-50/50 flex flex-row items-start justify-between pb-4">
              <div>
                <CardTitle className="text-xl font-serif text-[#121c34] flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-[#607b7d]" />
                  Action Items
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Assign tasks to help {student.firstName} work toward their SMART goals</p>
              </div>
              {(existingItems || []).filter(i => i.studentId === studentId && !i.completed).length > 0 && (
                <Badge className="bg-[#607b7d]/10 text-[#607b7d] border-[#607b7d]/20 border text-xs mt-1">
                  {(existingItems || []).filter(i => i.studentId === studentId && !i.completed).length} active
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-5 space-y-5">

              {/* Existing items */}
              {(existingItems || []).filter(i => i.studentId === studentId).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned items</p>
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {(existingItems || []).filter(i => i.studentId === studentId).map(item => (
                      <div key={item.id} className="px-4 py-3 flex items-start gap-3 bg-white">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${item.completed ? "bg-green-500 border-green-500" : "border-slate-300"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : "text-[#121c34]"}`}>
                            {item.title}
                          </p>
                          {item.smartGoalTitle && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#3131d8] mt-0.5">
                              <Target className="w-2.5 h-2.5" />
                              {item.smartGoalTitle}
                            </span>
                          )}
                        </div>
                        {item.completed && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs flex-shrink-0">Done</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new item form */}
              <div className="border rounded-xl p-4 bg-slate-50/50 space-y-4">
                <p className="text-sm font-semibold text-[#121c34]">Assign a new task</p>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Title <span className="text-red-500">*</span></Label>
                  <Input
                    value={newItemTitle}
                    onChange={e => setNewItemTitle(e.target.value)}
                    placeholder="e.g. Research meditation techniques"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                  <textarea
                    value={newItemDescription}
                    onChange={e => setNewItemDescription(e.target.value)}
                    placeholder="Add more context or instructions..."
                    rows={3}
                    className="w-full text-sm border rounded-lg p-3 resize-none bg-white focus:outline-none focus:ring-2 focus:ring-[#3131d8]/30 focus:border-[#3131d8]"
                  />
                </div>
                {approvedGoals.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Link to an approved SMART goal (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setNewItemGoalId(null)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${newItemGoalId === null ? "bg-[#121c34] text-white border-[#121c34]" : "bg-white text-[#121c34]/60 border-slate-200 hover:border-[#121c34]/40"}`}
                      >
                        No goal link
                      </button>
                      {approvedGoals.map(goal => (
                        <button
                          key={goal.id}
                          onClick={() => setNewItemGoalId(goal.id)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${newItemGoalId === goal.id ? "bg-[#3131d8] text-white border-[#3131d8]" : "bg-white text-[#121c34]/60 border-slate-200 hover:border-[#3131d8]/40"}`}
                        >
                          <Target className="w-3 h-3" />
                          {goal.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreateActionItem}
                    disabled={createActionItem.isPending || !newItemTitle.trim()}
                    className="bg-[#3131d8] hover:bg-[#3131d8]/90 text-white border-none flex items-center gap-2"
                    size="sm"
                  >
                    {createActionItem.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Assign Task
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Private Coach Notes */}
          <Card className="shadow-sm border-none">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <div>
                <CardTitle className="text-xl font-serif text-[#121c34] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#607b7d]" />
                  Private Notes
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Only visible to you — keep track of anything important for your next sessions.</p>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <textarea
                value={noteContent}
                onChange={e => { setNoteContent(e.target.value); setNoteSaved(false); }}
                placeholder={`Write private notes about ${student.firstName}...`}
                rows={6}
                className="w-full text-sm border rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#3131d8]/30 focus:border-[#3131d8] bg-white"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">These notes are private and will never be shared with the student.</p>
                <Button
                  onClick={handleSaveNote}
                  disabled={saveNote.isPending || noteSaved}
                  className="bg-[#121c34] hover:bg-[#121c34]/90 text-white border-none flex items-center gap-2"
                  size="sm"
                >
                  {saveNote.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : noteSaved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {noteSaved ? "Saved!" : "Save Notes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
