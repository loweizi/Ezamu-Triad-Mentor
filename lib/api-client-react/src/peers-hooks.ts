import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface PeerStudent {
  id: number;
  firstName: string;
  lastName: string;
  profilePicUrl: string | null;
  innerHeroArchetype: string | null;
  fieldsOfInterest: string[];
  bio: string | null;
  age: number | null;
  requestId: number | null;
  requestStatus: "pending" | "accepted" | "rejected" | null;
  requestDirection: "sent" | "received" | null;
}

export interface PeerRequest {
  id: number;
  fromUserId: number;
  toUserId: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  direction: "sent" | "received";
  createdAt: string;
  updatedAt: string;
  fromUser: { id: number; firstName: string; lastName: string; email?: string; profilePicUrl: string | null; innerHeroArchetype: string | null; fieldsOfInterest: string[]; bio: string | null } | null;
  toUser: { id: number; firstName: string; lastName: string; email?: string; profilePicUrl: string | null; innerHeroArchetype: string | null; fieldsOfInterest: string[]; bio: string | null } | null;
}

export const STUDENTS_QUERY_KEY = ["students"];
export const PEER_REQUESTS_QUERY_KEY = ["peer-requests"];

export function useGetStudents() {
  return useQuery<PeerStudent[]>({
    queryKey: STUDENTS_QUERY_KEY,
    queryFn: () => customFetch<PeerStudent[]>("/api/students"),
  });
}

export function useGetPeerRequests() {
  return useQuery<PeerRequest[]>({
    queryKey: PEER_REQUESTS_QUERY_KEY,
    queryFn: () => customFetch<PeerRequest[]>("/api/peer-requests"),
  });
}

export function useSendPeerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toUserId: number) =>
      customFetch<PeerRequest>("/api/peer-requests", {
        method: "POST",
        body: JSON.stringify({ toUserId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PEER_REQUESTS_QUERY_KEY });
    },
  });
}

export interface PeerActionItem {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
}

export interface PeerGoal {
  id: number;
  title: string;
  status: "pending" | "approved" | "denied";
  timeBound: string;
}

export interface PeerSummary {
  peer: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicUrl: string | null;
    innerHeroArchetype: string | null;
    fieldsOfInterest: string[];
    bio: string | null;
  };
  actionItems: PeerActionItem[];
  smartGoals: PeerGoal[];
}

export const PEER_SUMMARY_QUERY_KEY = ["peer-summary"];

export function useGetPeerSummary() {
  return useQuery<PeerSummary | null>({
    queryKey: PEER_SUMMARY_QUERY_KEY,
    queryFn: () => customFetch<PeerSummary | null>("/api/peer/summary"),
  });
}

export function useSendNudge() {
  return useMutation({
    mutationFn: (taskTitle?: string) =>
      customFetch<{ id: number }>("/api/peer/nudge", {
        method: "POST",
        body: JSON.stringify({ taskTitle }),
      }),
  });
}

export function useRespondPeerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "accepted" | "rejected" | "cancelled" }) =>
      customFetch<PeerRequest>(`/api/peer-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PEER_REQUESTS_QUERY_KEY });
    },
  });
}
