import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useGetMe, useGetAppointments, useGetMyStudents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Calendar, Users, ArrowRight, Loader2, Clock, UserCircle } from "lucide-react";
import { format, isPast } from "date-fns";

export function CoachDashboardPage() {
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: appointments, isLoading: isApptLoading } = useGetAppointments();
  const { data: students, isLoading: isStudentsLoading } = useGetMyStudents();

  const isLoading = isUserLoading || isApptLoading || isStudentsLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#3131d8]" />
          <p>Loading your dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  const now = new Date();
  const upcomingAppts = (appointments || [])
    .filter(a => new Date(a.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const recentStudents = (students || []).sort((a, b) => {
    const aNext = a.nextAppointmentAt ? new Date(a.nextAppointmentAt).getTime() : 0;
    const bNext = b.nextAppointmentAt ? new Date(b.nextAppointmentAt).getTime() : 0;
    if (aNext && bNext) return aNext - bNext;
    if (aNext) return -1;
    if (bNext) return 1;
    const aLast = a.lastAppointmentAt ? new Date(a.lastAppointmentAt).getTime() : 0;
    const bLast = b.lastAppointmentAt ? new Date(b.lastAppointmentAt).getTime() : 0;
    return bLast - aLast;
  });

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        {/* Welcome Header */}
        <div className="bg-[#121c34] text-white pt-10 pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-5">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarImage src={user?.profilePicUrl || undefined} />
                <AvatarFallback className="bg-[#3131d8] text-xl text-white">
                  {user?.firstName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-serif font-bold mb-1">
                  Welcome back, {user?.firstName}
                </h1>
                <p className="text-white/70 text-sm">Coach Dashboard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="container mx-auto max-w-6xl px-4 -mt-16">

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <Card className="shadow-md border-none overflow-hidden">
              <div className="h-1 bg-[#3131d8]"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#3131d8]" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#121c34]">{upcomingAppts.length}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none overflow-hidden">
              <div className="h-1 bg-[#607b7d]"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#607b7d]" />
                  Total Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#121c34]">{students?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upcoming Appointments - full width on left */}
            <div className="col-span-1 md:col-span-2">
              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl font-serif text-[#121c34]">Upcoming Sessions</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Your scheduled appointments</p>
                  </div>
                  <Link href="/my-appointments">
                    <Button variant="outline" size="sm" className="text-[#3131d8] border-[#3131d8]/30 hover:bg-[#3131d8]/5">
                      View all <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  {upcomingAppts.length > 0 ? (
                    <div className="divide-y">
                      {upcomingAppts.slice(0, 5).map(appt => (
                        <div key={appt.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#3131d8]/10 flex flex-col items-center justify-center flex-shrink-0 text-[#3131d8]">
                            <span className="text-xs font-bold">{format(new Date(appt.scheduledAt), "MMM").toUpperCase()}</span>
                            <span className="text-lg font-bold leading-none">{format(new Date(appt.scheduledAt), "d")}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#121c34]">{appt.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(appt.scheduledAt), "h:mm a")}
                              </span>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <UserCircle className="w-3 h-3" />
                                {appt.studentName}
                              </span>
                            </div>
                          </div>
                          <Badge
                            className={`text-xs capitalize ${
                              appt.status === "confirmed"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            } border`}
                            variant="outline"
                          >
                            {appt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-[#121c34] font-medium">No upcoming sessions</p>
                      <p className="text-sm text-muted-foreground mt-1">Your scheduled sessions will appear here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Students sidebar */}
            <div className="col-span-1">
              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <CardTitle className="text-lg font-serif text-[#121c34]">Your Students</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {recentStudents.length > 0 ? (
                    <div className="divide-y">
                      {recentStudents.map(student => (
                        <Link key={student.id} href={`/coach/student/${student.id}`}>
                          <div className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              <AvatarImage src={student.profilePicUrl || undefined} />
                              <AvatarFallback className="bg-[#607b7d]/20 text-[#607b7d] text-sm font-semibold">
                                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#121c34] text-sm truncate">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {student.nextAppointmentAt
                                  ? `Next: ${format(new Date(student.nextAppointmentAt), "MMM d")}`
                                  : student.lastAppointmentAt
                                  ? `Last met: ${format(new Date(student.lastAppointmentAt), "MMM d")}`
                                  : `${student.totalAppointments} session${student.totalAppointments !== 1 ? "s" : ""}`}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No students yet. Students will appear here once you have booked sessions.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
