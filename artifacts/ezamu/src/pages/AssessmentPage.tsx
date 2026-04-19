import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useSaveAssessmentResult,
  useGetMe,
  useGetLatestAssessmentResult,
  SaveAssessmentBodyInnerHeroType,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Sparkles, Loader2, TrendingUp, AlertCircle, Briefcase, History } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const ARCHETYPE_INFO: Record<string, {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  careers: string[];
  /** Not shown to students — used by coaches only */
  coachGuidance: string;
}> = {
  thinker: {
    summary: "Thinkers are reflective, curious, and analytical. They like to understand how things work before taking action and often enjoy solving problems, researching ideas, and thinking deeply about decisions.",
    strengths: [
      "Strong critical thinking and problem-solving skills",
      "Thoughtful and careful decision-making",
      "Good at analyzing information and seeing patterns",
      "Often independent and self-motivated learners",
    ],
    weaknesses: [
      "May overthink or hesitate before acting",
      "Can struggle with quick decisions",
      "May seem quiet or less expressive in group settings",
      "Sometimes spends too much time planning instead of doing",
    ],
    careers: ["Engineer", "Researcher", "Data analyst", "Software developer", "Scientist", "Architect", "Financial analyst"],
    coachGuidance: "Knowing a student is a Thinker helps coaches understand that they may need time to process ideas before committing to a goal. Coaches can support them by giving clear explanations, encouraging confidence in decision-making, and helping them avoid getting stuck in overanalysis. Thinkers often respond well to detailed guidance, logic, and step-by-step planning.",
  },
  doer: {
    summary: "Doers are action-oriented, energetic, and motivated by progress. They like to jump in, try things out, and learn through experience rather than spending too much time thinking about possibilities.",
    strengths: [
      "Takes initiative and gets things done",
      "Learns well by doing and practicing",
      "Adaptable and energetic",
      "Often confident in taking action and solving immediate problems",
    ],
    weaknesses: [
      "May act too quickly without enough planning",
      "Can become impatient with slow processes",
      "May overlook details",
      "Sometimes needs help thinking through long-term consequences",
    ],
    careers: ["Entrepreneur", "Nurse", "Sales professional", "Skilled trades worker", "Event coordinator", "Emergency responder", "Project-based technical roles"],
    coachGuidance: "If a student is a Doer, coaches can focus on hands-on opportunities, short-term action steps, and practical goal setting. These students usually benefit from active learning, internships, shadowing, and real-world experiences. Coaches may also need to help them slow down, reflect, and build long-term planning skills.",
  },
  helper: {
    summary: "Helpers are caring, supportive, and people-centered. They are often motivated by relationships, teamwork, and making a positive difference in the lives of others.",
    strengths: [
      "Empathetic and supportive",
      "Strong communication and listening skills",
      "Good team players",
      "Motivated by helping people succeed",
      "Often dependable and encouraging",
    ],
    weaknesses: [
      "May put others' needs before their own",
      "Can struggle with boundaries",
      "May avoid conflict or difficult decisions",
      "Sometimes chooses paths based on pleasing others rather than personal goals",
    ],
    careers: ["Teacher", "Counselor", "Social worker", "Nurse", "Human resources specialist", "Community outreach coordinator", "Healthcare or service-oriented roles"],
    coachGuidance: "Knowing a student is a Helper allows coaches to guide them toward careers and goals that align with service, teamwork, and meaningful relationships. Coaches can also help them build confidence in prioritizing their own needs, making independent decisions, and recognizing that their caring nature is a real strength, not just a personality trait.",
  },
  planner: {
    summary: "Planners are organized, responsible, and future-focused. They like structure, clear goals, and a sense of direction. They often feel most comfortable when they know what comes next and how to get there.",
    strengths: [
      "Organized and dependable",
      "Strong at setting goals and following through",
      "Good time management and preparation",
      "Often responsible and detail-oriented",
      "Can create structure for themselves and others",
    ],
    weaknesses: [
      "May be uncomfortable with uncertainty or sudden change",
      "Can become overly rigid or perfectionistic",
      "May stress over mistakes or incomplete plans",
      "Sometimes focuses so much on structure that flexibility becomes difficult",
    ],
    careers: ["Project manager", "Accountant", "Operations specialist", "Business administrator", "Logistician", "Teacher", "Healthcare administration or planning roles"],
    coachGuidance: "When coaches know a student is a Planner, they can use structured goal setting, timelines, and measurable steps to keep them motivated. Planners often do well when expectations are clear. Coaches can also help them build flexibility, manage perfectionism, and stay resilient when plans change.",
  },
};

const QUESTIONS = [
  { id: 1, type: "single", title: "A school event is coming up. What role sounds most like you?", subtitle: "Choose the one that feels most natural.", options: [{ text: "I want to brainstorm new ideas and improve the event.", hero: "thinker" }, { text: "I want to make everyone feel included and supported.", hero: "helper" }, { text: "I want to organize the schedule and keep everything on track.", hero: "planner" }, { text: "I want to jump in, help out, and make things happen.", hero: "doer" }] },
  { id: 2, type: "single", title: "When you are learning something new, what helps most?", subtitle: "Pick the style that sounds best.", options: [{ text: "Understanding the big idea and why it works", hero: "thinker" }, { text: "Talking it through with people and hearing real stories", hero: "helper" }, { text: "A step-by-step structure I can follow", hero: "planner" }, { text: "Trying it myself and learning hands-on", hero: "doer" }] },
  { id: 3, type: "single", title: "What kind of content grabs your attention fastest?", subtitle: "Think TikTok, YouTube, Netflix, or class projects.", options: [{ text: "Deep ideas, science, psychology, or strategy", hero: "thinker" }, { text: "Human stories, relationships, and personal growth", hero: "helper" }, { text: "Real-life advice, productivity, and practical tips", hero: "planner" }, { text: "Adventure, action, energy, and exciting experiences", hero: "doer" }] },
  { id: 4, type: "single", title: "You have a big decision to make. What do you trust first?", subtitle: "Go with your instinct.", options: [{ text: "Logic, facts, and patterns", hero: "thinker" }, { text: "How it will affect people emotionally", hero: "helper" }, { text: "What has worked before and what is realistic", hero: "planner" }, { text: "What feels right in the moment and what gets movement", hero: "doer" }] },
  { id: 5, type: "single", title: "In a group project, friends usually see you as...", subtitle: "Pick the role you naturally become.", options: [{ text: "The idea person", hero: "thinker" }, { text: "The encourager", hero: "helper" }, { text: "The organizer", hero: "planner" }, { text: "The action person", hero: "doer" }] },
  { id: 6, type: "single", title: "What would make a future career feel exciting to you?", subtitle: "Choose the best fit.", options: [{ text: "It challenges my mind and lets me solve hard problems", hero: "thinker" }, { text: "It helps people grow, heal, or succeed", hero: "helper" }, { text: "It gives me clear goals, stability, and responsibility", hero: "planner" }, { text: "It has variety, movement, and hands-on work", hero: "doer" }] },
  { id: 7, type: "multi", title: "Pick TWO school subjects or spaces you enjoy most", subtitle: "This helps us connect your strengths to pathways.", maxSelections: 2, options: [{ text: "Science / Math / Coding", hero: "thinker" }, { text: "Psychology / Language / Community work", hero: "helper" }, { text: "History / Government / Business", hero: "planner" }, { text: "Art / Media / Performance / Design", hero: "doer" }] },
  { id: 8, type: "card-select", title: "Choose the vibe that feels most like you", subtitle: "Pick the description that sounds most natural to you.", options: [{ text: "Curious, independent, and always asking why", hero: "thinker" }, { text: "Warm, supportive, and focused on people", hero: "helper" }, { text: "Reliable, prepared, and comfortable with structure", hero: "planner" }, { text: "Bold, energetic, and excited to try things", hero: "doer" }] },
  { id: 9, type: "ranking", title: "Final round: rank your Inner Heroes", subtitle: "Read the four Inner Heroes below, then rank them from most like you to least like you.", options: [{ text: "Thinker", hero: "thinker" }, { text: "Helper", hero: "helper" }, { text: "Planner", hero: "planner" }, { text: "Doer", hero: "doer" }] }
];

function ArchetypeResultPanel({ type, scores, showHeader = true }: {
  type: string;
  scores: Record<string, number>;
  showHeader?: boolean;
}) {
  const info = ARCHETYPE_INFO[type];
  if (!info) return null;
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="text-center pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your Inner Hero</p>
          <h3 className="text-2xl font-black capitalize text-transparent bg-clip-text bg-gradient-to-r from-[#121c34] to-[#3131d8]">
            The {type}
          </h3>
        </div>
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm text-[#121c34] leading-relaxed">{info.summary}</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-[#3131d8]" />
            <h4 className="text-sm font-semibold text-[#121c34]">Strengths</h4>
          </div>
          <ul className="space-y-1.5">
            {info.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#121c34]">
                <span className="mt-1 w-1 h-1 rounded-full bg-[#3131d8] flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-3.5 h-3.5 text-[#bb7e5d]" />
            <h4 className="text-sm font-semibold text-[#121c34]">Areas to Watch</h4>
          </div>
          <ul className="space-y-1.5">
            {info.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#121c34]">
                <span className="mt-1 w-1 h-1 rounded-full bg-[#bb7e5d] flex-shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-3.5 h-3.5 text-[#607b7d]" />
            <h4 className="text-sm font-semibold text-[#121c34]">Career Paths</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {info.careers.map((c, i) => (
              <span key={i} className="text-[11px] bg-[#607b7d]/10 text-[#121c34] px-2.5 py-1 rounded-full font-medium">{c}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Score Breakdown</p>
          <div className="space-y-3">
            {(Object.entries(scores) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([t, score]) => (
                <div key={t}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium capitalize text-[#121c34]">{t}</span>
                    <span className="text-xs font-bold text-muted-foreground">{score}%</span>
                  </div>
                  <Progress
                    value={score}
                    className="h-1.5"
                    indicatorClassName={
                      t === 'thinker' ? 'bg-[#3131d8]' :
                        t === 'helper' ? 'bg-[#607b7d]' :
                          t === 'planner' ? 'bg-[#dbb68f]' :
                            'bg-[#bb7e5d]'
                    }
                  />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AssessmentPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: latestResult, isLoading: isLatestLoading } = useGetLatestAssessmentResult();
  const saveAssessment = useSaveAssessmentResult();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState<any>(null);

  const [isRetaking, setIsRetaking] = useState(false);

  // For multi-select
  const [currentMultiSelection, setCurrentMultiSelection] = useState<number[]>([]);

  // For ranking
  const [rankingOrder, setRankingOrder] = useState<number[]>([0, 1, 2, 3]);

  // Timeout ref for single-select auto-advance
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore multi/ranking state when navigating between questions
  useEffect(() => {
    const q = QUESTIONS[currentStep];
    if (q.type === "multi") {
      setCurrentMultiSelection(answers[q.id] ?? []);
    }
    if (q.type === "ranking") {
      setRankingOrder(answers[q.id] ?? [0, 1, 2, 3]);
    }
  }, [currentStep]);

  useEffect(() => {
    if (user?.role === "guardian") {
      setLocation("/guardian");
    }
  }, [user, setLocation]);

  if (isUserLoading || isLatestLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (user?.role === "guardian") {
    return null;
  }

  const question = QUESTIONS[currentStep];
  const progress = ((currentStep) / QUESTIONS.length) * 100;

  const goBack = () => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSingleSelect = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [question.id]: [optionIndex] }));
    advanceTimeoutRef.current = setTimeout(() => advanceStep(), 400);
  };

  const handleMultiSelect = (optionIndex: number) => {
    setCurrentMultiSelection(prev => {
      if (prev.includes(optionIndex)) {
        return prev.filter(i => i !== optionIndex);
      }
      if (prev.length < (question.maxSelections || 2)) {
        return [...prev, optionIndex];
      }
      return prev;
    });
  };

  const submitMultiSelect = () => {
    if (currentMultiSelection.length !== question.maxSelections) {
      toast.error(`Please select exactly ${question.maxSelections} options.`);
      return;
    }
    setAnswers(prev => ({ ...prev, [question.id]: currentMultiSelection }));
    setCurrentMultiSelection([]);
    advanceStep();
  };

  const moveRanking = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === rankingOrder.length - 1)) return;

    setRankingOrder(prev => {
      const newOrder = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
      return newOrder;
    });
  };

  const submitRanking = () => {
    setAnswers(prev => ({ ...prev, [question.id]: rankingOrder }));
    finishAssessment({ ...answers, [question.id]: rankingOrder });
  };

  const advanceStep = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finishAssessment(answers);
    }
  };

  const finishAssessment = (finalAnswers: Record<number, any>) => {
    let scores = { thinker: 0, helper: 0, planner: 0, doer: 0 };

    // Tally scores
    QUESTIONS.forEach(q => {
      const ans = finalAnswers[q.id];
      if (!ans) return;

      if (q.type === 'single' || q.type === 'card-select') {
        const hero = q.options[ans[0]].hero as keyof typeof scores;
        scores[hero] += 2; // Base weight for single answers
      } else if (q.type === 'multi') {
        ans.forEach((optIndex: number) => {
          const hero = q.options[optIndex].hero as keyof typeof scores;
          scores[hero] += 1;
        });
      } else if (q.type === 'ranking') {
        // ans is array of original indices, ordered by preference
        ans.forEach((originalIndex: number, rankPosition: number) => {
          const hero = q.options[originalIndex].hero as keyof typeof scores;
          // Rank 0 (top) gets 4 pts, Rank 3 (bottom) gets 1 pt
          scores[hero] += (4 - rankPosition);
        });
      }
    });

    // Normalize to 100
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const normalized = {
      thinker: Math.round((scores.thinker / totalScore) * 100),
      helper: Math.round((scores.helper / totalScore) * 100),
      planner: Math.round((scores.planner / totalScore) * 100),
      doer: Math.round((scores.doer / totalScore) * 100),
    };

    // Find winner
    const winner = Object.entries(normalized).reduce((a, b) => a[1] > b[1] ? a : b)[0] as SaveAssessmentBodyInnerHeroType;

    const descriptions = {
      thinker: "You are driven by curiosity and understanding. You excel at problem-solving and seeing the big picture.",
      helper: "You are driven by empathy and connection. You excel at supporting others and building strong relationships.",
      planner: "You are driven by structure and reliability. You excel at organizing chaos and executing reliable strategies.",
      doer: "You are driven by action and experience. You excel at jumping in, trying things out, and making real movement happen."
    };

    setResults({
      type: winner,
      scores: normalized,
      summary: descriptions[winner]
    });

    setIsFinished(true);
  };

  const handleSaveToProfile = () => {
    if (!results) return;

    saveAssessment.mutate({
      data: {
        innerHeroType: results.type,
        helperScore: results.scores.helper,
        doerScore: results.scores.doer,
        thinkerScore: results.scores.thinker,
        plannerScore: results.scores.planner,
        summary: results.summary
      }
    }, {
      onSuccess: () => {
        toast.success("Assessment saved to profile!");
        setIsRetaking(false);
        setLocation("/dashboard");
      },
      onError: () => {
        toast.error("Failed to save results. Please try again.");
      }
    });
  };
  const startRetake = () => {
    setAnswers({});
    setCurrentStep(0);
    setCurrentMultiSelection([]);
    setRankingOrder([0, 1, 2, 3]);
    setResults(null);
    setIsFinished(false);
    setIsRetaking(true);
  };
  if (latestResult && !isRetaking && !isFinished) {
    const latestScores = {
      thinker: latestResult.thinkerScore,
      helper: latestResult.helperScore,
      planner: latestResult.plannerScore,
      doer: latestResult.doerScore,
    };

    return (
      <MainLayout>
        <div className="flex-1 bg-slate-50 py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#121c34] text-white mb-6 shadow-xl">
                <History className="w-10 h-10" />
              </div>
              <h1 className="text-4xl font-serif font-bold text-[#121c34] mb-2">
                {latestResult ? "Assessment Result" : "Your Latest Assessment Result"}
              </h1>
              <h2 className="text-5xl font-black capitalize text-transparent bg-clip-text bg-gradient-to-r from-[#121c34] to-[#3131d8]">
                The {latestResult.innerHeroType}
              </h2>
            </div>
            <h3 className="text-lg font-semibold text-[#121c34] mb-2 text-center">
              What this means for you
            </h3>
            <Card className="border-none shadow-lg mb-8">
              <CardContent className="p-8 md:p-10">
                <div className="space-y-8">
                  <div className="max-w-4xl mx-auto text-center space-y-3">
                    <p className="text-xl md:text-2xl font-medium text-[#121c34] leading-relaxed">
                      {ARCHETYPE_INFO[latestResult.innerHeroType].summary}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Taken on {new Date(latestResult.dateTaken).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-lg text-[#121c34] mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-[#3131d8]" />
                          Strengths
                        </h3>
                        <ul className="space-y-3">
                          {ARCHETYPE_INFO[latestResult.innerHeroType].strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-[#121c34]">
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-[#3131d8] flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-lg text-[#121c34] mb-4 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-[#bb7e5d]" />
                          Areas to Watch
                        </h3>
                        <ul className="space-y-3">
                          {ARCHETYPE_INFO[latestResult.innerHeroType].weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-[#121c34]">
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-[#bb7e5d] flex-shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-lg text-[#121c34] mb-4 flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-[#607b7d]" />
                          Career Paths
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {ARCHETYPE_INFO[latestResult.innerHeroType].careers.map((c, i) => (
                            <span
                              key={i}
                              className="text-sm bg-[#607b7d]/10 text-[#121c34] px-3 py-1.5 rounded-full font-medium"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-lg text-[#121c34] mb-4">
                          Score Breakdown
                        </h3>
                        <div className="space-y-4">
                          {(Object.entries(latestScores) as [string, number][])
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, score]) => (
                              <div key={type}>
                                <div className="flex justify-between mb-1.5">
                                  <span className="text-sm font-medium capitalize text-[#121c34]">
                                    {type}
                                  </span>
                                  <span className="text-sm font-bold text-muted-foreground">
                                    {score}%
                                  </span>
                                </div>
                                <Progress
                                  value={score}
                                  className="h-2"
                                  indicatorClassName={
                                    type === "thinker"
                                      ? "bg-[#3131d8]"
                                      : type === "helper"
                                        ? "bg-[#607b7d]"
                                        : type === "planner"
                                          ? "bg-[#dbb68f]"
                                          : "bg-[#bb7e5d]"
                                  }
                                />
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-center pt-2">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button
                        onClick={startRetake}
                        className="bg-[#121c34] hover:bg-[#121c34]/90 text-white"
                      >
                        Retake Assessment
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => setLocation("/dashboard")}
                      >
                        Back to Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }
  if (isFinished && results) {
    const info = ARCHETYPE_INFO[results.type];
    return (
      <MainLayout>
        <div className="flex-1 bg-slate-50 py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#121c34] text-white mb-6 shadow-xl">
                <Sparkles className="w-10 h-10" />
              </div>
              <h1 className="text-4xl font-serif font-bold text-[#121c34] mb-2">Your Inner Hero is...</h1>
              <h2 className="text-5xl font-black capitalize text-transparent bg-clip-text bg-gradient-to-r from-[#121c34] to-[#3131d8]">
                The {results.type}
              </h2>
            </div>

            {/* 2×3 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Row 1 — Score Breakdown */}
              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
                  <h3 className="font-bold text-base text-muted-foreground uppercase tracking-wider mb-6">Score Breakdown</h3>
                  <div className="space-y-6">
                    {(Object.entries(results.scores) as [string, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, score]) => (
                        <div key={type}>
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold text-lg capitalize text-[#121c34]">{type}</span>
                            <span className="font-bold text-lg text-muted-foreground">{score}%</span>
                          </div>
                          <Progress
                            value={score}
                            className="h-3"
                            indicatorClassName={
                              type === 'thinker' ? 'bg-[#3131d8]' :
                                type === 'helper' ? 'bg-[#607b7d]' :
                                  type === 'planner' ? 'bg-[#dbb68f]' :
                                    'bg-[#bb7e5d]'
                            }
                          />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Row 1 — Summary */}
              <Card className="border-none shadow-lg">
                <CardContent className="p-8 flex flex-col justify-center h-full">
                  <p className="text-xl text-[#121c34] leading-relaxed font-medium mb-6">
                    {results.summary}
                  </p>
                  <p className="text-base text-[#121c34]/80 leading-relaxed">{info.summary}</p>
                </CardContent>
              </Card>

              {/* Row 2 — Strengths */}
              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp className="w-5 h-5 text-[#3131d8]" />
                    <h3 className="font-bold text-lg text-[#121c34]">Strengths</h3>
                  </div>
                  <ul className="space-y-3">
                    {info.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-base text-[#121c34]">
                        <span className="mt-2 w-2 h-2 rounded-full bg-[#3131d8] flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Row 2 — Areas to Watch */}
              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <AlertCircle className="w-5 h-5 text-[#bb7e5d]" />
                    <h3 className="font-bold text-lg text-[#121c34]">Areas to Watch</h3>
                  </div>
                  <ul className="space-y-3">
                    {info.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-3 text-base text-[#121c34]">
                        <span className="mt-2 w-2 h-2 rounded-full bg-[#bb7e5d] flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Row 3 — Career Paths (spans full width) */}
              <Card className="border-none shadow-lg md:col-span-2">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <Briefcase className="w-5 h-5 text-[#607b7d]" />
                    <h3 className="font-bold text-lg text-[#121c34]">Best-Suited Career Paths</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {info.careers.map((c, i) => (
                      <span key={i} className="text-base bg-[#607b7d]/10 text-[#121c34] px-4 py-2 rounded-full font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-lg bg-[#121c34] hover:bg-[#121c34]/90 rounded-xl"
              onClick={handleSaveToProfile}
              disabled={saveAssessment.isPending}
            >
              {saveAssessment.isPending ? "Saving..." : "Save to Profile & Continue"}
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isCurrentAnswered = answers[question?.id] !== undefined;

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col bg-white">
        {/* Progress header */}
        <div className="sticky top-0 z-10 bg-white border-b p-4">
          <div className="container mx-auto max-w-5xl flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#121c34]/60 hover:text-[#121c34] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <span className="text-sm font-medium text-muted-foreground">
                Question {currentStep + 1} of {QUESTIONS.length}
              </span>
            </div>
            <span className="text-sm font-bold text-[#121c34]">{Math.round(progress)}%</span>
          </div>
          <div className="container mx-auto max-w-5xl">
            <Progress value={progress} className="h-2" indicatorClassName="bg-[#3131d8]" />
          </div>
        </div>

        <div className="flex-1 container mx-auto max-w-5xl p-6 py-12 flex gap-10">
          <div className="max-w-3xl mx-auto flex flex-col min-w-0">
            {/* Quiz content */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="mb-12">
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#121c34] mb-3 leading-tight">
                  {question.title}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {question.subtitle}
                </p>
              </div>

              <div className="flex-1">
                {question.type === "single" && (
                  <div className="space-y-4">
                    {question.options.map((opt, idx) => {
                      const isSelected = answers[question.id]?.[0] === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSingleSelect(idx)}
                          className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${isSelected
                            ? "border-[#3131d8] bg-[#3131d8]/5 shadow-md scale-[1.01]"
                            : "border-slate-200 hover:border-[#3131d8]/40 hover:bg-slate-50"
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "border-[#3131d8]" : "border-slate-300"
                            }`}>
                            {isSelected && <div className="w-3 h-3 rounded-full bg-[#3131d8]" />}
                          </div>
                          <span className="text-lg font-medium text-[#121c34]">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {question.type === "card-select" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((opt, idx) => {
                      const isSelected = answers[question.id]?.[0] === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSingleSelect(idx)}
                          className={`w-full text-left p-8 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center gap-4 h-48 ${isSelected
                            ? "border-[#3131d8] bg-[#3131d8]/5 shadow-md scale-[1.02]"
                            : "border-slate-200 hover:border-[#3131d8]/40 hover:bg-slate-50"
                            }`}
                        >
                          <span className="text-xl font-medium text-[#121c34] leading-snug">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {question.type === "multi" && (
                  <>
                    <div className="space-y-4 mb-8">
                      {question.options.map((opt, idx) => {
                        const isSelected = currentMultiSelection.includes(idx);
                        const isDisabled = !isSelected && currentMultiSelection.length >= (question.maxSelections || 2);

                        return (
                          <button
                            key={idx}
                            onClick={() => handleMultiSelect(idx)}
                            disabled={isDisabled}
                            className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${isSelected
                              ? "border-[#607b7d] bg-[#607b7d]/5 shadow-md"
                              : isDisabled
                                ? "border-slate-100 opacity-50 cursor-not-allowed"
                                : "border-slate-200 hover:border-[#607b7d]/40 hover:bg-slate-50"
                              }`}
                          >
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "border-[#607b7d] bg-[#607b7d]" : "border-slate-300"
                              }`}>
                              {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                            </div>
                            <span className="text-lg font-medium text-[#121c34]">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg bg-[#121c34] hover:bg-[#121c34]/90 rounded-xl"
                      onClick={submitMultiSelect}
                      disabled={currentMultiSelection.length !== question.maxSelections}
                    >
                      Continue <ChevronRight className="ml-2" />
                    </Button>
                  </>
                )}

                {question.type === "ranking" && (
                  <>
                    <div className="space-y-3 mb-8">
                      {rankingOrder.map((originalIndex, currentRank) => {
                        const opt = question.options[originalIndex];
                        return (
                          <div
                            key={originalIndex}
                            className="flex items-center p-4 rounded-xl border-2 border-slate-200 bg-white shadow-sm"
                          >
                            <div className="flex flex-col gap-1 mr-4">
                              <button
                                onClick={() => moveRanking(currentRank, 'up')}
                                disabled={currentRank === 0}
                                className="p-1 text-slate-400 hover:text-[#121c34] disabled:opacity-30 transition-colors"
                              >
                                <ArrowUp className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => moveRanking(currentRank, 'down')}
                                disabled={currentRank === rankingOrder.length - 1}
                                className="p-1 text-slate-400 hover:text-[#121c34] disabled:opacity-30 transition-colors"
                              >
                                <ArrowDown className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 mr-4">
                              {currentRank + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-lg font-medium text-[#121c34]">{opt.text}</p>
                              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                {ARCHETYPE_INFO[opt.hero].summary}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg bg-[#dbb68f] text-[#121c34] hover:bg-[#dbb68f]/90 rounded-xl font-bold"
                      onClick={submitRanking}
                    >
                      See My Results
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
