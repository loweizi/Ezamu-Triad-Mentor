import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGetCoach, useGetCoachAvailability, useCreateAppointment, getGetCoachQueryKey, getGetCoachAvailabilityQueryKey, getGetAppointmentsQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, ChevronLeft, Loader2, Info } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

function formatSlotTime(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

export function CoachProfilePage() {
  const { coachId } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const id = parseInt(coachId || "0");
  
  const { data: coach, isLoading: isCoachLoading } = useGetCoach(id, { query: { enabled: !!id, queryKey: getGetCoachQueryKey(id) } });
  const { data: availability, isLoading: isAvailLoading } = useGetCoachAvailability({ coachId: id }, { query: { enabled: !!id, queryKey: getGetCoachAvailabilityQueryKey({ coachId: id }) } });
  
  const createAppointment = useCreateAppointment();

  // Group availability by date
  const availabilityByDate = availability?.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, typeof availability>) || {};

  const availableDates = Object.keys(availabilityByDate).sort();
  
  // Select first available date by default
  if (!selectedDate && availableDates.length > 0) {
    setSelectedDate(availableDates[0]);
  }

  const handleBook = (slot: any) => {
    createAppointment.mutate({
      data: {
        coachId: id,
        title: `Mentorship Session with ${coach?.firstName}`,
        scheduledAt: new Date(`${slot.date}T${slot.startTime.substring(0, 5)}`).toISOString()
      }
    }, {
      onSuccess: () => {
        toast.success("Appointment booked successfully!");
        queryClient.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
        setLocation("/dashboard");
      },
      onError: () => {
        toast.error("Failed to book appointment. Please try again.");
      }
    });
  };

  if (isCoachLoading || isAvailLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!coach) {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Info className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Coach not found</h2>
          <Link href="/appointments">
            <Button variant="outline">Back to Coaches</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50">
        {/* Profile Header */}
        <div className="bg-[#121c34] pt-8 pb-32 px-4 relative">
          <div className="container mx-auto max-w-4xl">
            <Link href="/appointments" className="inline-flex items-center text-white/70 hover:text-white mb-6 text-sm font-medium transition-colors">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to all coaches
            </Link>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 -mt-24 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Profile Info */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-none shadow-md overflow-hidden">
                <CardContent className="p-8 pt-8">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-sm ring-1 ring-slate-100">
                      <AvatarImage src={coach.profilePicUrl || undefined} />
                      <AvatarFallback className="bg-[#607b7d] text-white text-2xl">
                        {coach.firstName.charAt(0)}{coach.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <h1 className="text-3xl font-serif font-bold text-[#121c34] mb-2">
                        {coach.firstName} {coach.lastName}
                      </h1>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {coach.fieldsOfExpertise.map(field => (
                          <Badge key={field} variant="secondary" className="bg-[#acedff]/30 text-[#121c34] hover:bg-[#acedff]/40 border-none">
                            {field}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="prose prose-slate max-w-none text-muted-foreground">
                        <p>{coach.bio || "This coach hasn't provided a bio yet, but they are ready to help you discover your inner hero."}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Section */}
              <Card className="border-none shadow-sm">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <CardTitle className="text-xl font-serif text-[#121c34] flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-[#3131d8]" />
                    Book a Session
                  </CardTitle>
                  <CardDescription>Select an available time slot below</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {availableDates.length > 0 ? (
                    <div className="space-y-6">
                      {/* Date Selection */}
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                        {availableDates.map(date => {
                          const dateObj = parseISO(date);
                          const isSelected = selectedDate === date;
                          return (
                            <button
                              key={date}
                              onClick={() => setSelectedDate(date)}
                              className={`flex flex-col items-center min-w-[80px] p-3 rounded-xl border-2 transition-colors ${
                                isSelected 
                                  ? "border-[#121c34] bg-[#121c34] text-white" 
                                  : "border-slate-200 hover:border-[#121c34]/30 bg-white"
                              }`}
                            >
                              <span className={`text-xs font-medium uppercase ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                {format(dateObj, "MMM")}
                              </span>
                              <span className="text-xl font-bold my-1">{format(dateObj, "d")}</span>
                              <span className={`text-xs font-medium ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                {format(dateObj, "EEE")}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Time Slots */}
                      {selectedDate && availabilityByDate[selectedDate] && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                            <Clock className="w-4 h-4 mr-1.5" />
                            Available times for {format(parseISO(selectedDate), "MMMM d, yyyy")}
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {availabilityByDate[selectedDate].map(slot => (
                              <Button
                                key={slot.id}
                                variant="outline"
                                className="h-12 border-slate-200 hover:border-[#3131d8] hover:text-[#3131d8] font-medium"
                                onClick={() => handleBook(slot)}
                                disabled={createAppointment.isPending}
                              >
                                {formatSlotTime(slot.startTime)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      <p className="text-[#121c34] font-medium mb-1">No availability right now</p>
                      <p className="text-sm text-muted-foreground">Check back later for open slots.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
                    Coach Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Students Mentored</span>
                    <span className="font-bold text-[#121c34]">{coach.studentCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Age</span>
                    <span className="font-bold text-[#121c34]">{coach.age || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
