import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useGetMe, useGetCoachAvailability, useAddAvailability, useDeleteAvailability } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday, isBefore, startOfDay } from "date-fns";
import { Loader2, Plus, Trash2, CalendarDays, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 30]) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    TIME_OPTIONS.push(`${hh}:${mm}`);
  }
}

function formatTime(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr: string) {
  return format(parseISO(dateStr), "EEEE, MMMM d, yyyy");
}

export function AvailabilityPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const coachId = user?.id ?? 0;

  const { data: slots = [], isLoading: isSlotsLoading } = useGetCoachAvailability(
    { coachId },
    { query: { enabled: coachId > 0 } }
  );

  const addSlot = useAddAvailability();
  const deleteSlot = useDeleteAvailability();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAdding, setIsAdding] = useState(false);

  const isLoading = isUserLoading || isSlotsLoading;

  const slotsByDate = useMemo(() => {
    const map: Record<string, typeof slots> = {};
    for (const slot of slots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return map;
  }, [slots]);

  const sortedDates = useMemo(
    () => Object.keys(slotsByDate).sort(),
    [slotsByDate]
  );

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const slotsForSelected = selectedDateStr ? (slotsByDate[selectedDateStr] || []) : [];

  const handleAdd = async () => {
    if (!selectedDate) { toast({ title: "Select a date first", variant: "destructive" }); return; }
    if (startTime >= endTime) { toast({ title: "End time must be after start time", variant: "destructive" }); return; }
    if (isBefore(selectedDate, startOfDay(new Date())) && !isToday(selectedDate)) {
      toast({ title: "Cannot add availability for past dates", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    try {
      await addSlot.mutateAsync({ data: { date: selectedDateStr, startTime, endTime } });
      queryClient.invalidateQueries({ queryKey: [`/api/availability`] });
      toast({ title: "Availability added", description: `${format(selectedDate, "MMM d")} · ${formatTime(startTime)} – ${formatTime(endTime)}` });
    } catch {
      toast({ title: "Failed to add slot", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (slotId: number) => {
    try {
      await deleteSlot.mutateAsync({ slotId });
      queryClient.invalidateQueries({ queryKey: [`/api/availability`] });
      toast({ title: "Slot removed" });
    } catch {
      toast({ title: "Failed to remove slot", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#3131d8]" />
          <p>Loading your schedule...</p>
        </div>
      </MainLayout>
    );
  }

  if (user?.role !== "coach") {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-xl font-serif text-[#121c34]">Coaches only</p>
          <p className="text-muted-foreground text-sm">This page is only available to coaches.</p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const endTimeOptions = TIME_OPTIONS.filter(t => t > startTime);

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        {/* Header */}
        <div className="bg-[#121c34] text-white pt-10 pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-2">
              <CalendarDays className="w-7 h-7 text-[#add8e6]" />
              <h1 className="text-3xl font-serif font-bold">My Availability</h1>
            </div>
            <p className="text-white/70 text-sm ml-10">Set the dates and times you're available for sessions with students.</p>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl px-4 -mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left: Calendar + Add Form */}
            <div className="lg:col-span-2 space-y-5">
              <Card className="shadow-md border-none overflow-hidden">
                <div className="h-1 bg-[#3131d8]"></div>
                <CardHeader className="pb-2 pt-5">
                  <CardTitle className="text-lg font-serif text-[#121c34]">Pick a Date</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center pb-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date())) && !isToday(date)}
                    className="rounded-md"
                    classNames={{
                      day_selected: "bg-[#3131d8] text-white hover:bg-[#3131d8] hover:text-white focus:bg-[#3131d8] focus:text-white",
                      day_today: "border border-[#3131d8] text-[#3131d8] font-bold",
                    }}
                  />
                </CardContent>
              </Card>

              {selectedDate && (
                <Card className="shadow-md border-none overflow-hidden">
                  <div className="h-1 bg-[#607b7d]"></div>
                  <CardHeader className="pb-2 pt-5">
                    <CardTitle className="text-base font-serif text-[#121c34]">
                      Add Slot — {format(selectedDate, "MMM d, yyyy")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                          Start Time
                        </label>
                        <select
                          value={startTime}
                          onChange={e => {
                            setStartTime(e.target.value);
                            if (endTime <= e.target.value) {
                              const next = TIME_OPTIONS.find(t => t > e.target.value);
                              if (next) setEndTime(next);
                            }
                          }}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3131d8]/30 focus:border-[#3131d8] bg-white"
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>{formatTime(t)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                          End Time
                        </label>
                        <select
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3131d8]/30 focus:border-[#3131d8] bg-white"
                        >
                          {endTimeOptions.map(t => (
                            <option key={t} value={t}>{formatTime(t)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {slotsForSelected.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Existing Slots This Day</p>
                        <div className="space-y-1.5">
                          {slotsForSelected
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))
                            .map(s => (
                              <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5">
                                <span className="text-sm text-[#121c34]">{formatTime(s.startTime)} – {formatTime(s.endTime)}</span>
                                <button
                                  onClick={() => handleDelete(s.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleAdd}
                      disabled={isAdding || addSlot.isPending}
                      className="w-full bg-[#3131d8] hover:bg-[#3131d8]/90 text-white border-none flex items-center gap-2"
                    >
                      {isAdding || addSlot.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Plus className="w-4 h-4" />}
                      Add This Slot
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: All Upcoming Availability */}
            <div className="lg:col-span-3">
              <Card className="shadow-sm border-none">
                <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl font-serif text-[#121c34]">Scheduled Availability</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {slots.length > 0 ? `${slots.length} slot${slots.length !== 1 ? "s" : ""} set across ${sortedDates.length} day${sortedDates.length !== 1 ? "s" : ""}` : "No availability set yet"}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-[#3131d8]/5 text-[#3131d8] border-[#3131d8]/20">
                    <Clock className="w-3 h-3 mr-1" />
                    {slots.length} slots
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {sortedDates.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center">
                      <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-[#121c34] font-medium text-lg">No availability set</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Pick a date on the calendar and add time slots so students can book sessions with you.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {sortedDates.map(dateStr => {
                        const daySlots = slotsByDate[dateStr].sort((a, b) => a.startTime.localeCompare(b.startTime));
                        const dateObj = parseISO(dateStr);
                        const isPast = isBefore(startOfDay(dateObj), startOfDay(new Date())) && !isToday(dateObj);

                        return (
                          <div key={dateStr} className={`p-5 ${isPast ? "opacity-50" : ""}`}>
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0 ${
                                isToday(dateObj) ? "bg-[#3131d8]" : isPast ? "bg-slate-400" : "bg-[#121c34]"
                              }`}>
                                <span className="text-[10px] font-bold uppercase">{format(dateObj, "MMM")}</span>
                                <span className="text-base font-bold leading-none">{format(dateObj, "d")}</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-[#121c34] text-sm">
                                  {formatDate(dateStr)}
                                  {isToday(dateObj) && <span className="ml-2 text-[#3131d8] font-bold">· Today</span>}
                                  {isPast && <span className="ml-2 text-slate-400 text-xs">(past)</span>}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <button
                                onClick={() => setSelectedDate(dateObj)}
                                className="text-xs text-[#3131d8] hover:underline font-medium"
                              >
                                + Add slot
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-13 pl-1">
                              {daySlots.map(slot => (
                                <div
                                  key={slot.id}
                                  className="flex items-center gap-1.5 bg-[#add8e6]/20 border border-[#add8e6]/40 rounded-full px-3 py-1 group"
                                >
                                  <Clock className="w-3 h-3 text-[#607b7d]" />
                                  <span className="text-sm text-[#121c34] font-medium">
                                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                                  </span>
                                  {!isPast && (
                                    <button
                                      onClick={() => handleDelete(slot.id)}
                                      className="ml-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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
