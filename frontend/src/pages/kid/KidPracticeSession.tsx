import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "../../features/handwriting/HandwritingCanvas";
import { fetchPractice, submitAnswer, completePractice } from "../../api/practice";
import { fetchChild } from "../../api/children";
import { useSpeak } from "../../hooks/useSpeak";
import type { AnswerResult, Question } from "../../types/practice";

type Phase = "writing" | "feedback" | "complete";

function answerPhrase(question: Question): string {
  switch (question.type) {
    case "letter":
      return `The letter is ${question.target}`;
    case "number":
      return `The number is ${question.target}`;
    case "math":
      return `The answer is ${question.target}`;
    case "shape":
      return `That's a ${question.target}`;
    default:
      return `The answer is ${question.target}`;
  }
}

export function KidPracticeSession() {
  const { childId, sessionId } = useParams<{ childId: string; sessionId: string }>();
  const navigate = useNavigate();
  const speak = useSpeak();
  const canvasRef = useRef<HandwritingCanvasHandle>(null);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("writing");
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [tally, setTally] = useState({ correct: 0, tryAgain: 0 });
  const [summary, setSummary] = useState<{ correct_count: number; total_questions: number; score: number | null } | null>(
    null,
  );

  const { data: session } = useQuery({
    queryKey: ["practice", sessionId],
    queryFn: () => fetchPractice(Number(sessionId)),
    enabled: Boolean(sessionId),
  });
  const { data: child } = useQuery({
    queryKey: ["child", childId],
    queryFn: () => fetchChild(Number(childId)),
    enabled: Boolean(childId),
  });

  const answerMutation = useMutation({
    mutationFn: () =>
      submitAnswer(Number(sessionId), {
        question_id: question!.id,
        image_data_url: canvasRef.current?.toDataURL(),
      }),
    onSuccess: (result) => {
      setLastResult(result);
      setTally((prev) => ({
        correct: prev.correct + (result.is_correct ? 1 : 0),
        tryAgain: prev.tryAgain + (result.is_correct ? 0 : 1),
      }));
      setPhase("feedback");
      speak(answerPhrase(question));
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completePractice(Number(sessionId)),
    onSuccess: (result) => {
      setSummary({
        correct_count: result.correct_count ?? tally.correct,
        total_questions: result.total_questions,
        score: result.score,
      });
      setPhase("complete");
    },
  });

  if (!session || !child) return <p className="text-center text-ink-soft">Loading...</p>;

  const question = session.questions[index];
  const isLastQuestion = index === session.questions.length - 1;

  const handleTryAgain = () => {
    canvasRef.current?.clear();
    setPhase("writing");
  };

  const handleNext = () => {
    canvasRef.current?.clear();
    if (isLastQuestion) {
      completeMutation.mutate();
    } else {
      setIndex((i) => i + 1);
      setPhase("writing");
    }
  };

  if (phase === "complete" && summary) {
    const accuracy = summary.total_questions
      ? Math.round((summary.correct_count / summary.total_questions) * 100)
      : 0;
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="max-w-md p-10 text-center">
          <div className="text-6xl">🏆</div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">Great Job, {child.name}!</h1>
          <p className="mt-2 text-ink-soft">You completed {summary.total_questions} questions!</p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-brand-green-light p-4">
              <p className="text-3xl font-extrabold text-brand-green">{summary.correct_count}</p>
              <p className="text-sm font-semibold text-ink-soft">Correct</p>
            </div>
            <div className="rounded-2xl bg-brand-yellow-light p-4">
              <p className="text-3xl font-extrabold text-ink">{summary.total_questions - summary.correct_count}</p>
              <p className="text-sm font-semibold text-ink-soft">Try Again</p>
            </div>
          </div>
          <p className="mt-4 text-lg font-bold text-ink">{accuracy}% Accuracy</p>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => navigate(`/practice/create/${childId}`)}>
              Play Again
            </Button>
            <Button fullWidth onClick={() => navigate(`/practice/${sessionId}/summary`)}>
              I'm Done
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "feedback" && lastResult) {
    const correct = Boolean(lastResult.is_correct);
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="max-w-md p-10 text-center">
          <div className="text-6xl">{correct ? "⭐" : "💪"}</div>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">
            {correct ? "Great Job!" : "Almost there!"}
          </h1>
          <p className="mt-2 text-ink-soft">
            {lastResult.feedback || (correct ? "That's correct!" : "Let's try that one again.")}
          </p>
          <div className="mt-6 flex gap-3">
            {!correct && (
              <Button variant="secondary" fullWidth onClick={handleTryAgain}>
                Try Again
              </Button>
            )}
            <Button fullWidth onClick={handleNext} disabled={completeMutation.isPending}>
              {isLastQuestion ? "Finish" : "Next Question"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-soft">
          {index + 1} / {session.questions.length}
        </p>
        <button
          onClick={() => speak(question.prompt)}
          aria-label="Play instructions"
          className="kid-tap-target flex items-center justify-center rounded-full bg-white text-2xl shadow"
        >
          🔊
        </button>
      </div>

      <h1 className="mt-4 text-center font-display text-2xl font-bold text-ink">{question.prompt}</h1>

      <div className="mt-6">
        <HandwritingCanvas
          ref={canvasRef}
          guideText={question.type === "letter" || question.type === "number" ? question.target : undefined}
          guideShape={
            question.type === "shape"
              ? (question.target as "circle" | "square" | "triangle" | "rectangle")
              : undefined
          }
        />
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" fullWidth onClick={() => canvasRef.current?.clear()}>
          Clear
        </Button>
        <Button fullWidth onClick={() => answerMutation.mutate()} disabled={answerMutation.isPending}>
          {answerMutation.isPending ? "Checking..." : "Next"}
        </Button>
      </div>
    </div>
  );
}
