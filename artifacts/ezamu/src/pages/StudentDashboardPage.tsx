import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetDashboardSummary, useGetActionItems, useGetAppointments, useGetMe, useGetSmartGoals, useCreateSmartGoal, useUpdateActionItem, getGetActionItemsQueryKey, getGetDashboardSummaryQueryKey, type SmartGoal, type ActionItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, Calendar, CheckCircle2, MessageCircle, ArrowRight, Loader2, Plus, Target, Clock, CheckCheck, XCircle, ChevronDown, ChevronUp, Check } from "lucide-react";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const SMART_FIELDS = [
  {
    key: "specific" as const,
    label: "Specific",
    letter: "S",
    question: "What exactly do you want to achieve?",
    placeholder: "e.g. I want to improve my algebra grade from a C to a B+",
    color: "#3131d8",
  },
  {
    key: "measurable" as const,
    label: "Measurable",
    letter: "M",
    question: "How will you know when you've achieved it?",
    placeholder: "e.g. My next test score will be 80% or above, and I'll track weekly quiz results",
    color: "#607b7d",
  },
  {
    key: "achievable" as const,
    label: "Achievable",
    letter: "A",
    question: "Why is this goal realistic for you right now?",
    placeholder: "e.g. I already attend tutoring twice a week and can add 30 minutes of daily practice",
    color: "#bb7e5d",
  },
  {
    key: "relevant" as const,
    label: "Relevant",
    letter: "R",
    question: "Why does this matter to your bigger goals?",
    placeholder: "e.g. Strong math skills are required for the engineering programme I want to apply to",
    color: "#dbb68f",
  },
];

const STATUS_CONFIG = {
  pending: { label: "Awaiting Review", icon: Clock, className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", icon: CheckCheck, className: "bg-green-50 text-green-700 border-green-200" },
  denied: { label: "Needs Revision", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" },
};

function GoalCard({ goal }: { goal: SmartGoal }) {
  const [expanded, setExpanded] = useState(false);
  const { label, icon: Icon, className } = STATUS_CONFIG[goal.status];
  const isPastDue = isPast(parseISO(goal.timeBound)) && goal.status !== "approved";

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="p-4 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#121c34] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Target className="w-5 h-5 text-[#add8e6]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="font-semibold text-[#121c34] text-base">{goal.title}</p>
            <Badge variant="outline" className={`text-xs flex items-center gap-1 flex-shrink-0 ${className}`}>
              <Icon className="w-3 h-3" />
              {label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`text-xs flex items-center gap-1 ${isPastDue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              <Calendar className="w-3 h-3" />
              Due {format(parseISO(goal.timeBound), "MMM d, yyyy")}
              {isPastDue && " · Overdue"}
            </span>
            <span className="text-xs text-muted-foreground">
              Created {formatDistanceToNow(parseISO(goal.createdAt), { addSuffix: true })}
            </span>
          </div>

          {goal.status === "denied" && goal.coachFeedback && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-xs font-semibold text-red-700 mb-1">Coach Feedback</p>
              <p className="text-sm text-red-800">{goal.coachFeedback}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-shrink-0 text-muted-foreground hover:text-[#121c34] transition-colors mt-0.5"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SMART_FIELDS.map(f => (
            <div key={f.key} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: f.color }}
                >
                  {f.letter}
                </span>
                <p className="text-xs font-semibold text-[#121c34]">{f.label}</p>
              </div>
              <p className="text-sm text-muted-foreground pl-6.5 leading-relaxed">{goal[f.key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewGoalDialog({
  open,
  onOpenChange,
  coachId,
  coachOptions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coachId: number | null;
  coachOptions: { id: number; name: string }[];
}) {
  const { toast } = useToast();
  const createGoal = useCreateSmartGoal();

  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(coachId);
  const [title, setTitle] = useState("");
  const [timeBound, setTimeBound] = useState("");
  const [fields, setFields] = useState({ specific: "", measurable: "", achievable: "", relevant: "" });

  const resetForm = () => {
    setTitle("");
    setTimeBound("");
    setFields({ specific: "", measurable: "", achievable: "", relevant: "" });
    setSelectedCoachId(coachId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoachId) { toast({ title: "Select a coach first", variant: "destructive" }); return; }
    if (!title.trim()) { toast({ title: "Please add a title", variant: "destructive" }); return; }
    if (!timeBound) { toast({ title: "Please set a target date", variant: "destructive" }); return; }
    for (const f of SMART_FIELDS) {
      if (!fields[f.key].trim()) { toast({ title: `Please fill in the "${f.label}" field`, variant: "destructive" }); return; }
    }

    try {
      await createGoal.mutateAsync({
        coachId: selectedCoachId,
        title: title.trim(),
        specific: fields.specific.trim(),
        measurable: fields.measurable.trim(),
        achievable: fields.achievable.trim(),
        relevant: fields.relevant.trim(),
        timeBound: new Date(timeBound).toISOString(),
      });
      toast({ title: "Goal submitted!", description: "Your coach will review it soon." });
      resetForm();
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to create goal", variant: "destructive" });
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-[#121c34] flex items-center gap-2">
            <Target className="w-6 h-6 text-[#3131d8]" />
            New SMART Goal
          </DialogTitle>
          <DialogDescription>
            SMART goals are <strong>Specific</strong>, <strong>Measurable</strong>, <strong>Achievable</strong>, <strong>Relevant</strong>, and <strong>Time-bound</strong>. Fill in each section to create a well-structured goal your coach can review and approve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Coach selector */}
          {coachOptions.length > 1 && (
            <div className="space-y-1.5">
              <Label>Which coach is this goal for?</Label>
              <select
                value={selectedCoachId ?? ""}
                onChange={e => setSelectedCoachId(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3131d8]/30 focus:border-[#3131d8] bg-white"
              >
                <option value="">Select a coach…</option>
                {coachOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">Goal Title</Label>
            <Input
              id="goal-title"
              placeholder="e.g. Improve algebra grade to B+"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <Label htmlFor="time-bound" className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center"
                style={{ backgroundColor: "#121c34" }}
              >
                T
              </span>
              Target Completion Date
            </Label>
            <p className="text-xs text-muted-foreground">When do you aim to have this goal completed by?</p>
            <Input
              id="time-bound"
              type="date"
              min={today}
              value={timeBound}
              onChange={e => setTimeBound(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Divider */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-[#121c34] mb-4">Break it down with SMART criteria</p>
            <div className="space-y-4">
              {SMART_FIELDS.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={`field-${f.key}`} className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ backgroundColor: f.color }}
                    >
                      {f.letter}
                    </span>
                    {f.label} — <span className="text-muted-foreground font-normal">{f.question}</span>
                  </Label>
                  <Textarea
                    id={`field-${f.key}`}
                    placeholder={f.placeholder}
                    value={fields[f.key]}
                    onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="min-h-[80px] resize-none text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createGoal.isPending}
              className="bg-[#3131d8] hover:bg-[#3131d8]/90 text-white border-none"
            >
              {createGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Submit Goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StudentDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: actionItems, isLoading: isItemsLoading } = useGetActionItems();
  const { data: appointments, isLoading: isAppointmentsLoading } = useGetAppointments();
  const { data: smartGoals = [], isLoading: isGoalsLoading } = useGetSmartGoals();
  const updateActionItem = useUpdateActionItem();
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalsFilter, setGoalsFilter] = useState<"all" | "pending" | "approved" | "denied">("all");
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const handleMarkComplete = async (itemId: number) => {
    setCompletingId(itemId);
    try {
      await updateActionItem.mutateAsync({ itemId, data: { completed: true } });
      queryClient.invalidateQueries({ queryKey: getGetActionItemsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      setSelectedItem(null);
      toast({ title: "Task completed!", description: "Great work — keep it up." });
    } catch {
      toast({ title: "Error", description: "Failed to mark item as complete.", variant: "destructive" });
    } finally {
      setCompletingId(null);
    }
  };

  const isLoading = isSummaryLoading || isItemsLoading || isAppointmentsLoading;

  const coachOptions = useMemo(() => {
    if (!appointments) return [];
    const seen = new Set<number>();
    const coaches: { id: number; name: string }[] = [];
    for (const a of appointments) {
      const id = (a as any).coachId as number;
      if (id && !seen.has(id)) {
        seen.add(id);
        coaches.push({ id, name: (a as any).coachName as string ?? "Your Coach" });
      }
    }
    return coaches;
  }, [appointments]);

  const defaultCoachId = coachOptions.length === 1 ? coachOptions[0].id : null;

  const filteredGoals = useMemo(() => {
    if (goalsFilter === "all") return smartGoals;
    return smartGoals.filter(g => g.status === goalsFilter);
  }, [smartGoals, goalsFilter]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Loading your dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  const pendingItems = actionItems?.filter(i => !i.completed) || [];
  const completedItems = actionItems?.filter(i => i.completed) || [];
  const upcomingAppointments = appointments?.filter(a => new Date(a.scheduledAt) > new Date()).slice(0, 3) || [];

  const goalCounts = {
    pending: smartGoals.filter(g => g.status === "pending").length,
    approved: smartGoals.filter(g => g.status === "approved").length,
    denied: smartGoals.filter(g => g.status === "denied").length,
  };

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        {/* Welcome Header */}
        <div className="bg-[#121c34] text-white pt-10 pb-10 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <Avatar className="h-16 w-16 border-2 border-white/20">
                  <AvatarImage src={user?.profilePicUrl || undefined} />
                  <AvatarFallback className="bg-[#607b7d] text-xl">
                    {user?.firstName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-serif font-bold mb-1">
                    Welcome back, {user?.firstName}
                  </h1>
                  <p className="text-white/80">
                    {user?.innerHeroArchetype
                      ? `Your inner hero is the ${user.innerHeroArchetype.charAt(0).toUpperCase() + user.innerHeroArchetype.slice(1)}.`
                      : "Discover your inner hero today."}
                  </p>
                </div>
              </div>

              {!user?.innerHeroArchetype && (
                <Link href="/assessment">
                  <Button className="bg-[#dbb68f] text-[#121c34] hover:bg-[#dbb68f]/90 rounded-full border-none">
                    <Activity className="w-4 h-4 mr-2" />
                    Take Assessment
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="container mx-auto max-w-6xl px-4 -mt-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Quick Stats Row */}
            <Card className="shadow-md border-none overflow-hidden col-span-1">
              <div className="h-1 bg-[#3131d8]"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-[#3131d8]" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#121c34]">{summary?.upcomingAppointmentsCount || 0}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none overflow-hidden col-span-1">
              <div className="h-1 bg-[#607b7d]"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-[#607b7d]" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#121c34]">
                  {summary?.completedActionItemsCount || 0}{" "}
                  <span className="text-muted-foreground text-xl font-normal">
                    / {(summary?.pendingActionItemsCount || 0) + (summary?.completedActionItemsCount || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none overflow-hidden col-span-1">
              <div className="h-1 bg-[#bb7e5d]"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Target className="w-4 h-4 mr-2 text-[#bb7e5d]" />
                  SMART Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#121c34]">
                  {goalCounts.approved}{" "}
                  <span className="text-muted-foreground text-xl font-normal">
                    / {smartGoals.length} approved
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="col-span-1 md:col-span-2 space-y-6">

              {/* Action Items */}
              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl font-serif text-[#121c34]">Your Action Plan</CardTitle>
                    <CardDescription>Tasks assigned by your coach</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-[#121c34]/5 text-[#121c34] border-[#121c34]/20">
                    {completedItems.length}/{(actionItems?.length || 0)} done
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {(actionItems?.length || 0) === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-[#121c34] font-medium">No tasks yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Your coach will assign action items here.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {/* Pending items */}
                      {pendingItems.map(item => (
                        <div
                          key={item.id}
                          className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                        >
                          {/* Checkbox button */}
                          <button
                            onClick={() => handleMarkComplete(item.id)}
                            disabled={completingId === item.id}
                            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 hover:border-[#3131d8] transition-colors flex items-center justify-center disabled:opacity-50"
                            title="Mark as complete"
                          >
                            {completingId === item.id && (
                              <Loader2 className="w-3 h-3 animate-spin text-[#3131d8]" />
                            )}
                          </button>
                          {/* Content — click opens detail dialog */}
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="font-medium text-[#121c34] truncate">{item.title}</p>
                            {item.smartGoalTitle && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#3131d8] bg-[#3131d8]/8 rounded px-1.5 py-0.5 mt-1">
                                <Target className="w-2.5 h-2.5" />
                                {item.smartGoalTitle}
                              </span>
                            )}
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                            )}
                          </button>
                          <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1 cursor-pointer" onClick={() => setSelectedItem(item)} />
                        </div>
                      ))}

                      {/* Completed items */}
                      {completedItems.length > 0 && (
                        <>
                          {pendingItems.length > 0 && (
                            <div className="px-4 py-2 bg-slate-50 border-y">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed</p>
                            </div>
                          )}
                          {completedItems.map(item => (
                            <div key={item.id} className="p-4 flex items-start gap-3 opacity-60">
                              <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#121c34] line-through truncate">{item.title}</p>
                                {item.smartGoalTitle && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#3131d8] bg-[#3131d8]/8 rounded px-1.5 py-0.5 mt-1">
                                    <Target className="w-2.5 h-2.5" />
                                    {item.smartGoalTitle}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* All done state */}
                      {pendingItems.length === 0 && completedItems.length > 0 && (
                        <div className="p-6 text-center">
                          <p className="text-sm font-medium text-green-600">🎉 All tasks completed!</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── SMART Goals Section ── */}
              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-serif text-[#121c34] flex items-center gap-2">
                        <Target className="w-5 h-5 text-[#3131d8]" />
                        My SMART Goals
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Set structured goals for your coach to review and approve
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        if (coachOptions.length === 0) {
                          toast({ title: "No coach connected yet", description: "Book a session with a coach first, then you can set SMART goals." });
                          return;
                        }
                        setGoalDialogOpen(true);
                      }}
                      className="flex-shrink-0 bg-[#3131d8] hover:bg-[#3131d8]/90 text-white border-none"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      New Goal
                    </Button>
                  </div>

                  {/* Status Filter Pills */}
                  {smartGoals.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {(["all", "pending", "approved", "denied"] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => setGoalsFilter(status)}
                          className={`text-xs px-3 py-1 rounded-full border transition-colors font-medium ${
                            goalsFilter === status
                              ? "bg-[#121c34] text-white border-[#121c34]"
                              : "bg-white text-[#121c34]/60 border-slate-200 hover:border-[#121c34]/40"
                          }`}
                        >
                          {status === "all" ? `All (${smartGoals.length})` :
                           status === "pending" ? `Awaiting Review (${goalCounts.pending})` :
                           status === "approved" ? `Approved (${goalCounts.approved})` :
                           `Needs Revision (${goalCounts.denied})`}
                        </button>
                      ))}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4">
                  {isGoalsLoading ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#3131d8]" />
                    </div>
                  ) : filteredGoals.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center">
                      <div className="w-14 h-14 bg-[#3131d8]/5 rounded-2xl flex items-center justify-center mb-4">
                        <Target className="w-7 h-7 text-[#3131d8]" />
                      </div>
                      <p className="text-[#121c34] font-semibold text-lg font-serif">
                        {goalsFilter === "all" ? "No goals yet" : `No ${goalsFilter} goals`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        {goalsFilter === "all"
                          ? "SMART goals help you set clear targets. Create your first one and share it with your coach."
                          : "Try switching the filter above to see other goals."}
                      </p>
                      {goalsFilter === "all" && coachOptions.length > 0 && (
                        <Button
                          onClick={() => setGoalDialogOpen(true)}
                          className="mt-4 bg-[#3131d8] hover:bg-[#3131d8]/90 text-white border-none"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Create Your First Goal
                        </Button>
                      )}
                      {goalsFilter === "all" && coachOptions.length === 0 && (
                        <Link href="/my-appointments">
                          <Button variant="outline" size="sm" className="mt-4 border-dashed">
                            Book a Session First
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredGoals
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(goal => <GoalCard key={goal.id} goal={goal} />)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Content */}
            <div className="col-span-1 space-y-6">

              {/* Upcoming Sessions */}
              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <CardTitle className="text-lg font-serif text-[#121c34]">Upcoming Sessions</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {upcomingAppointments.length > 0 ? (
                    <div className="divide-y">
                      {upcomingAppointments.map(apt => (
                        <div key={apt.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className="bg-[#acedff]/30 text-[#121c34] font-medium border-none">
                              {format(new Date(apt.scheduledAt), "MMM d")}
                            </Badge>
                            <span className="text-sm text-muted-foreground font-medium">
                              {format(new Date(apt.scheduledAt), "h:mm a")}
                            </span>
                          </div>
                          <p className="font-medium text-[#121c34] mb-1">{apt.title}</p>
                          <p className="text-sm text-muted-foreground">with {apt.coachName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-muted-foreground text-sm mb-4">No upcoming sessions scheduled.</p>
                      <Link href="/my-appointments">
                        <Button variant="outline" className="w-full border-dashed">
                          Book a Session
                        </Button>
                      </Link>
                    </div>
                  )}
                  {appointments && appointments.length > 3 && (
                    <div className="p-3 border-t bg-slate-50 text-center">
                      <Link href="/my-appointments" className="text-sm font-medium text-[#3131d8] hover:underline flex items-center justify-center">
                        View all <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assessment Teaser */}
              {!user?.innerHeroArchetype && (
                <Card className="shadow-sm border-none bg-gradient-to-br from-[#121c34] to-[#3131d8] text-white">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <SparklesIcon className="w-5 h-5 text-[#acedff]" />
                    </div>
                    <h3 className="font-serif text-xl font-bold mb-2">Discover your Inner Hero</h3>
                    <p className="text-white/80 text-sm mb-4">
                      Take our assessment to find out your mentorship archetype and get matched with the right coach.
                    </p>
                    <Link href="/assessment">
                      <Button className="w-full bg-[#dbb68f] text-[#121c34] hover:bg-[#dbb68f]/90 border-none">
                        Start Assessment
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Goal Progress Card — per SMART Goal */}
              {smartGoals.length > 0 && (
                <Card className="shadow-sm border-none">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base font-serif text-[#121c34] flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#3131d8]" />
                      Goal Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {smartGoals
                      .sort((a, b) => {
                        const order = { approved: 0, pending: 1, denied: 2 };
                        return order[a.status] - order[b.status];
                      })
                      .map(goal => {
                        const linked = (actionItems || []).filter(i => i.smartGoalId === goal.id);
                        const done = linked.filter(i => i.completed).length;
                        const total = linked.length;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        const barColor =
                          goal.status === "approved" ? "bg-[#3131d8]"
                          : goal.status === "denied" ? "bg-red-400"
                          : "bg-amber-400";
                        const statusBadge =
                          goal.status === "approved" ? "text-green-700 bg-green-50 border-green-200"
                          : goal.status === "denied" ? "text-red-700 bg-red-50 border-red-200"
                          : "text-amber-700 bg-amber-50 border-amber-200";

                        return (
                          <div key={goal.id}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-xs font-semibold text-[#121c34] leading-snug flex-1 min-w-0 truncate" title={goal.title}>
                                {goal.title}
                              </p>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 capitalize ${statusBadge}`}>
                                {goal.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                  style={{ width: total > 0 ? `${pct}%` : "0%" }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0 w-12 text-right">
                                {total > 0 ? `${done}/${total}` : "No tasks"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <NewGoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        coachId={defaultCoachId}
        coachOptions={coachOptions}
      />

      {/* Action Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(v) => { if (!v) setSelectedItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#121c34] font-serif text-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#607b7d]" />
              Action Item
            </DialogTitle>
            {selectedItem?.smartGoalTitle && (
              <div className="flex items-center gap-1.5 text-xs text-[#3131d8] font-medium mt-1">
                <Target className="w-3.5 h-3.5" />
                Linked to: {selectedItem.smartGoalTitle}
              </div>
            )}
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 pt-1">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Task</p>
                <p className="text-base font-semibold text-[#121c34]">{selectedItem.title}</p>
              </div>
              {selectedItem.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-[#121c34] whitespace-pre-wrap">{selectedItem.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Assigned</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedItem.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between gap-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                  className="border-[#121c34]/20 text-[#121c34]"
                >
                  Close
                </Button>
                {!selectedItem.completed && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkComplete(selectedItem.id)}
                    disabled={completingId === selectedItem.id}
                    className="bg-[#3131d8] hover:bg-[#3131d8]/90 text-white border-none"
                  >
                    {completingId === selectedItem.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Mark as Complete
                  </Button>
                )}
                {selectedItem.completed && (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <CheckCheck className="w-4 h-4" />
                    Completed
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
