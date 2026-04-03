import { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetDashboardSummary, useGetActionItems, useGetAppointments, useGetMe } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Activity, Calendar, CheckCircle2, MessageCircle, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function DashboardPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: actionItems, isLoading: isItemsLoading } = useGetActionItems();
  const { data: appointments, isLoading: isAppointmentsLoading } = useGetAppointments();

  useEffect(() => {
    if (!isUserLoading && user && !user.onboardingCompleted) {
      setLocation("/onboarding");
    }
  }, [user, isUserLoading, setLocation]);

  const isLoading = isUserLoading || isSummaryLoading || isItemsLoading || isAppointmentsLoading;

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
  const upcomingAppointments = appointments?.filter(a => new Date(a.scheduledAt) > new Date()).slice(0, 3) || [];

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        {/* Welcome Header */}
        <div className="bg-[#121c34] text-white pt-10 pb-20 px-4">
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
                  {summary?.completedActionItemsCount || 0} <span className="text-muted-foreground text-xl font-normal">/ {(summary?.pendingActionItemsCount || 0) + (summary?.completedActionItemsCount || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none overflow-hidden col-span-1">
              <div className="h-1 bg-[#bb7e5d]"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2 text-[#bb7e5d]" />
                  Unread Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#121c34]">{summary?.unreadMessagesCount || 0}</div>
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="col-span-1 md:col-span-2 space-y-6">
              
              {/* Action Items */}
              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl font-serif text-[#121c34]">Your Action Plan</CardTitle>
                    <CardDescription>Tasks to complete before your next session</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-[#121c34]/5 text-[#121c34] border-[#121c34]/20">
                    {pendingItems.length} pending
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {pendingItems.length > 0 ? (
                    <div className="divide-y">
                      {pendingItems.map(item => (
                        <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                          <button className="mt-1 flex-shrink-0 text-slate-300 hover:text-[#607b7d] transition-colors">
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#121c34] truncate">{item.title}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-[#121c34] font-medium">All caught up!</p>
                      <p className="text-sm text-muted-foreground mt-1">You have no pending action items.</p>
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
                          <p className="text-sm text-muted-foreground">with {user?.role === 'student' ? apt.coachName : apt.studentName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-muted-foreground text-sm mb-4">No upcoming sessions scheduled.</p>
                      <Link href="/appointments">
                        <Button variant="outline" className="w-full border-dashed">
                          Book a Session
                        </Button>
                      </Link>
                    </div>
                  )}
                  {appointments && appointments.length > 3 && (
                    <div className="p-3 border-t bg-slate-50 text-center">
                      <Link href="/appointments" className="text-sm font-medium text-[#3131d8] hover:underline flex items-center justify-center">
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
                      <Sparkles className="w-5 h-5 text-[#acedff]" />
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

            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function Sparkles(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
