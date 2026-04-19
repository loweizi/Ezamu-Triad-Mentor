import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGetStudents,
  useGetPeerRequests,
  useSendPeerRequest,
  useRespondPeerRequest,
  useGetMe,
  useGetMyStudents,
  type PeerStudent,
  type PeerRequest,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  Users,
  Search,
  UserPlus,
  Clock,
  Check,
  X,
  Loader2,
  Star,
  BookOpen,
  UserCheck,
  Mail,
} from "lucide-react";
import { format } from "date-fns";

type CoachPeer = {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  profilePicUrl: string | null;
  bio: string;
  age: number | null;
  fieldsOfInterest: string[];
  fieldsOfExpertise: string[];
};

const ARCHETYPE_COLORS: Record<string, string> = {
  hero: "bg-yellow-50 text-yellow-700 border-yellow-200",
  sage: "bg-violet-50 text-violet-700 border-violet-200",
  creator: "bg-pink-50 text-pink-700 border-pink-200",
  explorer: "bg-green-50 text-green-700 border-green-200",
  ruler: "bg-blue-50 text-blue-700 border-blue-200",
  caregiver: "bg-rose-50 text-rose-700 border-rose-200",
  default: "bg-slate-50 text-slate-700 border-slate-200",
};

function archetypeColor(archetype: string | null) {
  if (!archetype) return ARCHETYPE_COLORS.default;
  const key = archetype.toLowerCase();
  return ARCHETYPE_COLORS[key] ?? ARCHETYPE_COLORS.default;
}

export function PeersPage() {
  const { data: me, isLoading: loadingMe } = useGetMe();
  const isCoach = me?.role === "coach";

  const {
    data: students = [],
    isLoading: loadingStudents,
  } = useGetStudents();

  const {
    data: requests = [],
    isLoading: loadingRequests,
  } = useGetPeerRequests();

  const {
    data: coachStudents = [],
    isLoading: loadingCoachStudents,
  } = useGetMyStudents();

  const sendRequest = useSendPeerRequest();
  const respond = useRespondPeerRequest();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "requests">("browse");
  const [profileStudent, setProfileStudent] = useState<PeerStudent | null>(null);

  const [availablePeers, setAvailablePeers] = useState<CoachPeer[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<CoachPeer | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningStudentId, setAssigningStudentId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isCoach) return;

    let isMounted = true;

    const loadPeers = async () => {
      try {
        setLoadingPeers(true);
        const res = await fetch("/api/users/available-peers");

        if (!res.ok) {
          throw new Error("Failed to load available peers");
        }

        const data = await res.json();

        if (isMounted) {
          setAvailablePeers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          setAvailablePeers([]);
          toast.error("Failed to load available peers.");
        }
      } finally {
        if (isMounted) {
          setLoadingPeers(false);
        }
      }
    };

    loadPeers();

    return () => {
      isMounted = false;
    };
  }, [isCoach]);

  if (loadingMe) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#3131d8]" />
        </div>
      </MainLayout>
    );
  }
  const filtered = students.filter((s) => {
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      name.includes(q) ||
      (s.innerHeroArchetype ?? "").toLowerCase().includes(q) ||
      s.fieldsOfInterest.some((f) => f.toLowerCase().includes(q))
    );
  });

  const filteredCoachPeers = availablePeers.filter((p) => {
    const q = search.toLowerCase();
    const name = `${p.firstName} ${p.lastName}`.toLowerCase();
    return (
      name.includes(q) ||
      p.bio.toLowerCase().includes(q) ||
      p.fieldsOfInterest.some((f) => f.toLowerCase().includes(q)) ||
      p.fieldsOfExpertise.some((f) => f.toLowerCase().includes(q))
    );
  });

  const incoming = requests.filter((r) => r.direction === "received" && r.status === "pending");
  const outgoing = requests.filter((r) => r.direction === "sent");
  const accepted = requests.filter((r) => r.status === "accepted");

  const handleSend = async (student: PeerStudent) => {
    try {
      await sendRequest.mutateAsync(student.id);
      toast.success(`Peer request sent to ${student.firstName}!`);
      setProfileStudent(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send request");
    }
  };

  const handleRespond = async (req: PeerRequest, status: "accepted" | "rejected") => {
    try {
      await respond.mutateAsync({ id: req.id, status });
      toast.success(status === "accepted" ? "You are now accountability partners!" : "Request declined.");
    } catch {
      toast.error("Failed to update request");
    }
  };

  const handleCancel = async (req: PeerRequest) => {
    try {
      await respond.mutateAsync({ id: req.id, status: "cancelled" });
      toast.success("Request cancelled.");
    } catch {
      toast.error("Failed to cancel request");
    }
  };

  const handleAssignPeer = async (studentId: number) => {
    if (!selectedPeer) return;

    try {
      setAssigningStudentId(studentId);

      const res = await fetch("/api/users/assign-peer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          peerId: selectedPeer.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to assign peer");
      }

      setSuccessMessage(`${selectedPeer.name} assigned successfully.`);
      setAvailablePeers((prev) => prev.filter((peer) => peer.id !== selectedPeer.id));
      setAssignDialogOpen(false);
      setSelectedPeer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign peer.");
    } finally {
      setAssigningStudentId(null);
    }
  };

  const pendingCount = incoming.length;

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 pb-12">
        <div className="bg-[#121c34] text-white pt-10 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-7 h-7 text-[#add8e6]" />
              <h1 className="text-3xl font-serif font-bold">
                {isCoach ? "Available Peers" : "Find a Peer"}
              </h1>
            </div>
            <p className="text-white/70 text-sm ml-10">
              {isCoach
                ? "Review peer profiles and assign them to one of your students."
                : "Connect with an accountability partner to stay motivated and on track."}
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 -mt-16 space-y-5">
          {successMessage && (
            <div className="bg-green-100 text-green-700 p-3 rounded-xl text-sm border border-green-200">
              {successMessage}
            </div>
          )}
          {!isCoach && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 flex gap-1">
              <button
                onClick={() => setActiveTab("browse")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === "browse"
                  ? "bg-[#121c34] text-white"
                  : "text-slate-500 hover:text-[#121c34]"
                  }`}
              >
                Browse Students
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors relative ${activeTab === "requests"
                  ? "bg-[#121c34] text-white"
                  : "text-slate-500 hover:text-[#121c34]"
                  }`}
              >
                Requests
                {pendingCount > 0 && (
                  <span className="absolute top-1.5 right-6 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isCoach
                  ? "Search available peers by name, bio, or interest..."
                  : "Search by name, archetype, or interest..."
              }
              className="pl-9 bg-white border-slate-200"
            />
          </div>

          {isCoach ? (
            loadingPeers ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#3131d8]" />
              </div>
            ) : filteredCoachPeers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-16 flex flex-col items-center text-center">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p className="font-semibold text-[#121c34]">No available peers found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Any unassigned peer accounts will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredCoachPeers.map((peer) => (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => setSelectedPeer(peer)}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 ring-2 ring-slate-100">
                        <AvatarImage src={peer.profilePicUrl ?? undefined} />
                        <AvatarFallback className="bg-[#121c34] text-white font-semibold">
                          {peer.firstName?.[0] ?? "?"}{peer.lastName?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#121c34]">
                          {peer.firstName} {peer.lastName}
                        </p>
                        {peer.bio?.trim() && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                            {peer.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {(peer.fieldsOfInterest ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {(peer.fieldsOfInterest ?? []).slice(0, 3).map((f) => (
                          <span
                            key={f}
                            className="text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5"
                          >
                            {f}
                          </span>
                        ))}
                        {(peer.fieldsOfInterest ?? []).length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                            +{(peer.fieldsOfInterest ?? []).length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                      <span className="text-xs text-[#3131d8] font-medium">
                        View Profile
                      </span>
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                        Available
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : activeTab === "browse" ? (
            loadingStudents ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#3131d8]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-16 flex flex-col items-center text-center">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p className="font-semibold text-[#121c34]">No students found</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((s) => (
                  <StudentCard
                    key={s.id}
                    student={s}
                    myPeerId={me?.peerId}
                    onViewProfile={() => setProfileStudent(s)}
                    onSend={() => handleSend(s)}
                    isSending={sendRequest.isPending}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-6">
              {loadingRequests ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-[#3131d8]" />
                </div>
              ) : (
                <>
                  {accepted.length > 0 && (
                    <section>
                      <h2 className="text-sm font-bold text-[#121c34] uppercase tracking-wider mb-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-600" /> Accountability Partners
                      </h2>
                      <div className="space-y-3">
                        {accepted.map((r) => {
                          const other = r.direction === "sent" ? r.toUser : r.fromUser;
                          return (
                            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-green-100 p-4 flex items-start gap-4">
                              <Avatar className="h-12 w-12 ring-2 ring-green-200 flex-shrink-0">
                                <AvatarImage src={other?.profilePicUrl ?? undefined} />
                                <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                                  {other?.firstName?.[0]}{other?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#121c34]">{other?.firstName} {other?.lastName}</p>
                                {other?.innerHeroArchetype && (
                                  <Badge className={`text-[10px] mt-0.5 border ${archetypeColor(other.innerHeroArchetype)}`}>
                                    {other.innerHeroArchetype}
                                  </Badge>
                                )}
                                {other?.email && (
                                  <a
                                    href={`mailto:${other.email}`}
                                    className="flex items-center gap-1.5 mt-2 text-xs text-[#3131d8] hover:underline w-fit"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{other.email}</span>
                                  </a>
                                )}
                              </div>
                              <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs flex-shrink-0">Partners</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {incoming.length > 0 && (
                    <section>
                      <h2 className="text-sm font-bold text-[#121c34] uppercase tracking-wider mb-3 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-[#3131d8]" /> Incoming Requests
                      </h2>
                      <div className="space-y-3">
                        {incoming.map((r) => {
                          const sender = r.fromUser;
                          return (
                            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-[#3131d8]/10 p-4 flex items-center gap-4">
                              <Avatar className="h-12 w-12 ring-2 ring-[#3131d8]/20">
                                <AvatarImage src={sender?.profilePicUrl ?? undefined} />
                                <AvatarFallback className="bg-[#3131d8]/10 text-[#3131d8] font-semibold">
                                  {sender?.firstName?.[0]}{sender?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#121c34]">{sender?.firstName} {sender?.lastName}</p>
                                {sender?.innerHeroArchetype && (
                                  <Badge className={`text-[10px] mt-0.5 border ${archetypeColor(sender.innerHeroArchetype)}`}>
                                    {sender.innerHeroArchetype}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-[#3131d8] hover:bg-[#3131d8]/90 text-white h-8 px-3 gap-1"
                                  onClick={() => handleRespond(r, "accepted")}
                                  disabled={respond.isPending}
                                >
                                  <Check className="w-3.5 h-3.5" /> Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 gap-1 text-slate-500"
                                  onClick={() => handleRespond(r, "rejected")}
                                  disabled={respond.isPending}
                                >
                                  <X className="w-3.5 h-3.5" /> Decline
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {outgoing.length > 0 && (
                    <section>
                      <h2 className="text-sm font-bold text-[#121c34] uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" /> Sent Requests
                      </h2>
                      <div className="space-y-3">
                        {outgoing.map((r) => {
                          const receiver = r.toUser;
                          return (
                            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4 opacity-80">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={receiver?.profilePicUrl ?? undefined} />
                                <AvatarFallback className="bg-slate-100 text-slate-600 font-semibold">
                                  {receiver?.firstName?.[0]}{receiver?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#121c34]">{receiver?.firstName} {receiver?.lastName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{r.status}</p>
                              </div>
                              {r.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-3 text-slate-400 hover:text-red-500"
                                  onClick={() => handleCancel(r)}
                                  disabled={respond.isPending}
                                >
                                  Cancel
                                </Button>
                              )}
                              {r.status === "accepted" && <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">Accepted</Badge>}
                              {r.status === "rejected" && <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">Declined</Badge>}
                              {r.status === "cancelled" && <Badge className="bg-slate-100 text-slate-500 border border-slate-200 text-xs">Cancelled</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {incoming.length === 0 && outgoing.length === 0 && accepted.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-16 flex flex-col items-center text-center">
                      <UserPlus className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="font-semibold text-[#121c34]">No requests yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Browse students and send a peer request to get started.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {profileStudent && !isCoach && (
        <Dialog open onOpenChange={() => setProfileStudent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex flex-col items-center gap-3 pt-2">
                <Avatar className="h-20 w-20 ring-4 ring-[#3131d8]/10">
                  <AvatarImage src={profileStudent.profilePicUrl ?? undefined} />
                  <AvatarFallback className="bg-[#121c34] text-white text-2xl">
                    {profileStudent.firstName[0]}{profileStudent.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <DialogTitle className="text-[#121c34]">
                    {profileStudent.firstName} {profileStudent.lastName}
                  </DialogTitle>
                  {profileStudent.innerHeroArchetype && (
                    <Badge className={`mt-1 border ${archetypeColor(profileStudent.innerHeroArchetype)}`}>
                      <Star className="w-3 h-3 mr-1" />
                      {profileStudent.innerHeroArchetype}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>

            {(() => {
              const partnerEmail = profileStudent.requestStatus === "accepted"
                ? (accepted.find((r) =>
                  r.fromUserId === profileStudent.id || r.toUserId === profileStudent.id
                )?.fromUserId === profileStudent.id
                  ? accepted.find((r) => r.fromUserId === profileStudent.id || r.toUserId === profileStudent.id)?.fromUser?.email
                  : accepted.find((r) => r.fromUserId === profileStudent.id || r.toUserId === profileStudent.id)?.toUser?.email)
                : undefined;

              return (
                <div className="space-y-4 py-2">
                  {profileStudent.bio && (
                    <p className="text-sm text-muted-foreground text-center leading-relaxed">{profileStudent.bio}</p>
                  )}

                  {partnerEmail && (
                    <div className="flex items-center justify-center">
                      <a
                        href={`mailto:${partnerEmail}`}
                        className="flex items-center gap-2 text-sm text-[#3131d8] hover:underline bg-[#3131d8]/5 border border-[#3131d8]/20 rounded-full px-4 py-1.5"
                      >
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        {partnerEmail}
                      </a>
                    </div>
                  )}

                  {profileStudent.fieldsOfInterest.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#121c34] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" /> Fields of Interest
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {profileStudent.fieldsOfInterest.map((f) => (
                          <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <DialogFooter>
              <Button variant="outline" onClick={() => setProfileStudent(null)}>Close</Button>
              {profileStudent.requestStatus === null && (
                <Button
                  className="bg-[#3131d8] hover:bg-[#3131d8]/90 text-white gap-2"
                  onClick={() => handleSend(profileStudent)}
                  disabled={sendRequest.isPending}
                >
                  {sendRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Send Peer Request
                </Button>
              )}
              {profileStudent.requestStatus === "pending" && profileStudent.requestDirection === "sent" && (
                <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Request Pending</Badge>
              )}
              {profileStudent.requestStatus === "accepted" && (
                <Badge className="bg-green-50 text-green-700 border border-green-200">Already Partners</Badge>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedPeer && isCoach && (
        <Dialog open onOpenChange={(open) => !open && setSelectedPeer(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex flex-col items-center gap-3 pt-2">
                <Avatar className="h-20 w-20 ring-4 ring-[#3131d8]/10">
                  <AvatarImage src={selectedPeer.profilePicUrl ?? undefined} />
                  <AvatarFallback className="bg-[#121c34] text-white text-2xl">
                    {selectedPeer.firstName?.[0] ?? "?"}{selectedPeer.lastName?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <DialogTitle className="text-[#121c34]">
                    {selectedPeer.firstName} {selectedPeer.lastName}
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {selectedPeer.bio && (
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  {selectedPeer.bio}
                </p>
              )}

              {selectedPeer.email && (
                <div className="flex items-center justify-center">
                  <a
                    href={`mailto:${selectedPeer.email}`}
                    className="flex items-center gap-2 text-sm text-[#3131d8] hover:underline bg-[#3131d8]/5 border border-[#3131d8]/20 rounded-full px-4 py-1.5"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    {selectedPeer.email}
                  </a>
                </div>
              )}

              {(selectedPeer.fieldsOfInterest ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#121c34] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Fields of Interest
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedPeer.fieldsOfInterest ?? []).map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {(selectedPeer.fieldsOfExpertise ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#121c34] uppercase tracking-wider mb-2">
                    Areas of Expertise
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedPeer.fieldsOfExpertise ?? []).map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <div className="w-full flex justify-center gap-3">
                {isCoach && (
                  <Button
                    className="bg-[#121c34] hover:bg-[#121c34]/90 text-white"
                    onClick={() => setAssignDialogOpen(true)}
                  >
                    Assign Peer
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedPeer(null)}>
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedPeer && isCoach && (
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#121c34]">
                Assign {selectedPeer.firstName} {selectedPeer.lastName}
              </DialogTitle>
            </DialogHeader>

            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-3">
              {loadingCoachStudents ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#3131d8]" />
                </div>
              ) : coachStudents.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  You do not have any students to assign yet.
                </div>
              ) : (
                coachStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleAssignPeer(student.id)}
                    disabled={assigningStudentId === student.id}
                    className="w-full text-left rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.profilePicUrl || undefined} />
                        <AvatarFallback className="bg-[#607b7d]/20 text-[#607b7d] text-sm font-semibold">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#121c34]">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {student.nextAppointmentAt
                            ? `Next: ${format(new Date(student.nextAppointmentAt), "MMM d")}`
                            : student.lastAppointmentAt
                              ? `Last met: ${format(new Date(student.lastAppointmentAt), "MMM d")}`
                              : `${student.totalAppointments} session${student.totalAppointments !== 1 ? "s" : ""
                              }`}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-[#3131d8]">
                        {assigningStudentId === student.id ? "Assigning..." : "Assign"}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}

function StudentCard({
  student,
  myPeerId,
  onViewProfile,
  onSend,
  isSending,
}: {
  student: PeerStudent;
  myPeerId?: number | null;
  onViewProfile: () => void;
  onSend: () => void;
  isSending: boolean;
}) {
  const isPeer = myPeerId === student.id;
  const isPending = student.requestStatus === "pending";
  const isAccepted = student.requestStatus === "accepted";

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onViewProfile}
    >
      <div className="flex items-start gap-4">
        <Avatar className={`h-14 w-14 ring-2 ${isAccepted ? "ring-green-300" : "ring-slate-100"}`}>
          <AvatarImage src={student.profilePicUrl ?? undefined} />
          <AvatarFallback className="bg-[#121c34] text-white font-semibold">
            {student.firstName[0]}{student.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#121c34]">{student.firstName} {student.lastName}</p>
          {student.innerHeroArchetype && (
            <Badge className={`text-[10px] mt-1 border ${archetypeColor(student.innerHeroArchetype)}`}>
              {student.innerHeroArchetype}
            </Badge>
          )}
          {student.bio && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{student.bio}</p>
          )}
        </div>
      </div>

      {student.fieldsOfInterest.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {student.fieldsOfInterest.slice(0, 3).map((f) => (
            <span key={f} className="text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{f}</span>
          ))}
          {student.fieldsOfInterest.length > 3 && (
            <span className="text-[10px] text-muted-foreground px-1 py-0.5">+{student.fieldsOfInterest.length - 3} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
        <button
          type="button"
          className="text-xs text-[#3131d8] font-medium hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile();
          }}
        >
          View Profile
        </button>

        {isAccepted || isPeer ? (
          <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs gap-1">
            <UserCheck className="w-3 h-3" /> Partners
          </Badge>
        ) : isPending && student.requestDirection === "sent" ? (
          <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        ) : isPending && student.requestDirection === "received" ? (
          <Badge className="bg-[#3131d8]/10 text-[#3131d8] border border-[#3131d8]/20 text-xs gap-1">
            <UserPlus className="w-3 h-3" /> Wants to connect
          </Badge>
        ) : (
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-[#3131d8] hover:bg-[#3131d8]/90 text-white gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onSend();
            }}
            disabled={isSending}
          >
            {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}