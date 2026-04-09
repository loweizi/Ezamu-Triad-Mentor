import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface CoachStudent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePicUrl: string | null;
  innerHeroArchetype: string | null;
  fieldsOfInterest: string[];
  bio: string | null;
  age: number | null;
  nextAppointmentAt: string | null;
  lastAppointmentAt: string | null;
  totalAppointments: number;
}

export interface CoachStudentDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePicUrl: string | null;
  innerHeroArchetype: string | null;
  fieldsOfInterest: string[];
  bio: string | null;
  age: number | null;
  createdAt: string;
  totalAppointments: number;
  nextAppointmentAt: string | null;
  assessmentResult: { archetype: string; completedAt: string | null } | null;
  appointments: { id: number; title: string; scheduledAt: string; status: string }[];
}

export interface SmartGoal {
  id: number;
  studentId: number;
  coachId: number;
  title: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  status: "pending" | "approved" | "denied";
  coachFeedback: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoachNote {
  id?: number;
  coachId?: number;
  studentId?: number;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useGetMyStudents() {
  return useQuery<CoachStudent[]>({
    queryKey: ["coach", "my-students"],
    queryFn: () => customFetch<CoachStudent[]>("/api/coach/students"),
  });
}

export function useGetMyStudentDetail(studentId: number | null) {
  return useQuery<CoachStudentDetail>({
    queryKey: ["coach", "my-students", studentId],
    queryFn: () => customFetch<CoachStudentDetail>(`/api/coach/students/${studentId}`),
    enabled: studentId !== null,
  });
}

export interface GuardianStudentDetail {
  student: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    profilePicUrl: string | null;
    innerHeroArchetype: string | null;
    fieldsOfInterest: string[];
    bio: string | null;
    age: number | null;
  };
  assessment: {
    innerHeroType: string;
    helperScore: number;
    doerScore: number;
    thinkerScore: number;
    plannerScore: number;
    summary: string;
    dateTaken: string;
  } | null;
  smartGoals: SmartGoal[];
  actionItems: {
    id: number;
    studentId: number;
    coachId?: number | null;
    smartGoalId?: number | null;
    title: string;
    description?: string | null;
    completed: boolean;
    createdAt: string;
  }[];
}

export function useGetGuardianStudentDetail(studentId: number | null) {
  return useQuery<GuardianStudentDetail>({
    queryKey: ["guardian", "student", studentId],
    queryFn: () => customFetch<GuardianStudentDetail>(`/api/guardian/student?studentId=${studentId}`),
    enabled: studentId !== null,
  });
}

export function useGetSmartGoals(studentId?: number) {
  const url = studentId ? `/api/smart-goals?studentId=${studentId}` : "/api/smart-goals";
  return useQuery<SmartGoal[]>({
    queryKey: ["smart-goals", studentId ?? "all"],
    queryFn: () => customFetch<SmartGoal[]>(url),
  });
}

export function useCreateSmartGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      coachId: number;
      title: string;
      specific: string;
      measurable: string;
      achievable: string;
      relevant: string;
      timeBound: string;
    }) => customFetch<SmartGoal>("/api/smart-goals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-goals"] });
    },
  });
}

export function useUpdateSmartGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, status, coachFeedback }: { goalId: number; status?: "pending" | "approved" | "denied"; coachFeedback?: string }) =>
      customFetch<SmartGoal>(`/api/smart-goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, coachFeedback }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-goals"] });
    },
  });
}

export function useGetCoachNote(studentId: number | null) {
  return useQuery<CoachNote>({
    queryKey: ["coach-notes", studentId],
    queryFn: () => customFetch<CoachNote>(`/api/coach-notes/${studentId}`),
    enabled: studentId !== null,
  });
}

export function useSaveCoachNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, content }: { studentId: number; content: string }) =>
      customFetch<CoachNote>(`/api/coach-notes/${studentId}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ["coach-notes", studentId] });
    },
  });
}

export function useMarkMessagesRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (withUserId: number) =>
      customFetch<void>("/api/messages/read", {
        method: "PATCH",
        body: JSON.stringify({ withUserId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });
}
