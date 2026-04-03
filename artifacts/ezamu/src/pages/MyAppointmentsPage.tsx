import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetAppointments, useGetMe } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Calendar, Clock, User, ChevronRight, Loader2, CalendarOff } from "lucide-react";
import { Link } from "wouter";

function statusColor(status: string) {
  if (status === "confirmed") return "bg-green-50 text-green-700 border-green-200";
  if (status === "cancelled") return "bg-red-50 text-red-700 border-red-200";
  return "bg-yellow-50 text-yellow-700 border-yellow-200";
}

export function MyAppointmentsPage() {
  const { data: user } = useGetMe();
  const { data: appointments = [], isLoading } = useGetAppointments();

  const now = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past = appointments
    .filter(a => new Date(a.scheduledAt) < now)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const isCoach = user?.role === "coach";

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        <div className="bg-[#121c34] text-white pt-10 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-7 h-7 text-[#add8e6]" />
              <h1 className="text-3xl font-serif font-bold">My Appointments</h1>
            </div>
            <p className="text-white/70 text-sm ml-10">
              {isCoach
                ? "All sessions booked by your students."
                : "All your booked mentorship sessions."}
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 -mt-10 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#3131d8]" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-16 flex flex-col items-center text-center">
              <CalendarOff className="w-14 h-14 text-slate-300 mb-4" />
              <h2 className="text-xl font-serif font-bold text-[#121c34] mb-2">No appointments yet</h2>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                {isCoach
                  ? "Students will appear here once they book a session with you."
                  : "Browse coaches and book your first mentorship session."}
              </p>
              {!isCoach && (
                <Link href="/dashboard">
                  <Button className="bg-[#3131d8] hover:bg-[#3131d8]/90 text-white">
                    Find a Coach
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section>
                  <h2 className="text-lg font-serif font-bold text-[#121c34] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3131d8] inline-block" />
                    Upcoming ({upcoming.length})
                  </h2>
                  <div className="space-y-3">
                    {upcoming.map(appt => (
                      <AppointmentCard key={appt.id} appt={appt} isCoach={isCoach} />
                    ))}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section>
                  <h2 className="text-lg font-serif font-bold text-[#121c34] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    Past ({past.length})
                  </h2>
                  <div className="space-y-3 opacity-75">
                    {past.map(appt => (
                      <AppointmentCard key={appt.id} appt={appt} isCoach={isCoach} isPast />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function AppointmentCard({
  appt,
  isCoach,
  isPast = false,
}: {
  appt: any;
  isCoach: boolean;
  isPast?: boolean;
}) {
  const scheduledDate = new Date(appt.scheduledAt);
  const otherPerson = isCoach ? appt.studentName : appt.coachName;
  const initials = otherPerson
    ? otherPerson.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-5 ${isPast ? "" : "hover:shadow-md transition-shadow"}`}>
      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isPast ? "bg-slate-100" : "bg-[#3131d8]/10"}`}>
        <span className={`text-[10px] font-bold uppercase ${isPast ? "text-slate-500" : "text-[#3131d8]"}`}>
          {format(scheduledDate, "MMM")}
        </span>
        <span className={`text-lg font-bold leading-none ${isPast ? "text-slate-600" : "text-[#3131d8]"}`}>
          {format(scheduledDate, "d")}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#121c34] truncate">{appt.title}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {format(scheduledDate, "h:mm a")}
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {otherPerson}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Badge className={`text-xs capitalize border ${statusColor(appt.status)}`}>
          {appt.status}
        </Badge>
        {isCoach && appt.studentId && (
          <Link href={`/coach/student/${appt.studentId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#3131d8]">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
