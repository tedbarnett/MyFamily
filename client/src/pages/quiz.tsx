import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, RefreshCw, Trophy, Star, PartyPopper, ThumbsUp, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Person } from "@shared/schema";

const MAX_QUESTIONS = 10;

interface QuizQuestion {
  person: Person;
  options: string[];
  correctAnswer: string;
}

const encouragements = [
  "Great job!",
  "You got it!",
  "Wonderful!",
  "Perfect!",
  "Excellent!",
  "Well done!",
  "That's right!",
  "Fantastic!",
];

const tryAgainMessages = [
  "That's okay, try again!",
  "Almost! Give it another try.",
  "Not quite, but you're doing great!",
  "Keep trying, you'll get it!",
  "No worries, try once more!",
];

export default function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [askedPeople, setAskedPeople] = useState<Set<string>>(new Set());
  const resultSavedRef = useRef(false);

  const { data: allPeople = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const totalQuestions = Math.min(MAX_QUESTIONS, allPeople.length);

  const saveResultMutation = useMutation({
    mutationFn: async ({ score, totalQuestions }: { score: number; totalQuestions: number }) => {
      const response = await apiRequest("POST", "/api/quiz-result", { score, totalQuestions });
      return response.json();
    },
  });

  // Save quiz result when complete
  useEffect(() => {
    if (quizComplete && !resultSavedRef.current && totalQuestions > 0) {
      resultSavedRef.current = true;
      saveResultMutation.mutate({ score, totalQuestions });
    }
  }, [quizComplete, score, totalQuestions]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const generateQuestion = useCallback(() => {
    if (allPeople.length < 4) return null;
    
    if (questionsAsked >= totalQuestions) {
      setQuizComplete(true);
      return null;
    }
    
    const availablePeople = allPeople.filter(p => !askedPeople.has(p.id));
    
    if (availablePeople.length === 0) {
      setQuizComplete(true);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availablePeople.length);
    const correctPerson = availablePeople[randomIndex];
    
    const otherPeople = allPeople.filter((p) => p.id !== correctPerson.id);
    const shuffledOthers = [...otherPeople].sort(() => Math.random() - 0.5);
    const wrongOptions = shuffledOthers.slice(0, 3).map((p) => p.name);
    
    const allOptions = [correctPerson.name, ...wrongOptions];
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

    return {
      person: correctPerson,
      options: shuffledOptions,
      correctAnswer: correctPerson.name,
    };
  }, [allPeople, askedPeople, questionsAsked, totalQuestions]);

  const startNewQuestion = useCallback(() => {
    if (questionsAsked >= totalQuestions) {
      setQuizComplete(true);
      return;
    }
    const question = generateQuestion();
    if (question) {
      setCurrentQuestion(question);
      setFeedback(null);
      setQuestionsAsked((prev) => prev + 1);
    }
  }, [generateQuestion, questionsAsked, totalQuestions]);

  useEffect(() => {
    if (allPeople.length >= 4 && !currentQuestion && !quizComplete) {
      startNewQuestion();
    }
  }, [allPeople, currentQuestion, quizComplete, startNewQuestion]);

  const handleAnswer = (selectedName: string) => {
    if (!currentQuestion || feedback) return;

    const isCorrect = selectedName === currentQuestion.correctAnswer;
    
    if (isCorrect) {
      const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
      setFeedback({ message: randomEncouragement, isCorrect: true });
      setScore((prev) => prev + 1);
      setAskedPeople(prev => new Set([...Array.from(prev), currentQuestion.person.id]));
    } else {
      const randomTryAgain = tryAgainMessages[Math.floor(Math.random() * tryAgainMessages.length)];
      setFeedback({ message: randomTryAgain, isCorrect: false });
    }
  };

  const handleNextQuestion = () => {
    startNewQuestion();
  };

  const handleTryAgain = () => {
    setFeedback(null);
  };

  const handleRestartQuiz = () => {
    setScore(0);
    setQuestionsAsked(0);
    setQuizComplete(false);
    setAskedPeople(new Set());
    setFeedback(null);
    setCurrentQuestion(null);
    resultSavedRef.current = false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-2xl text-muted-foreground">Loading quiz...</p>
      </div>
    );
  }

  if (allPeople.length < 4) {
    return (
      <div className="min-h-screen bg-background">
        <Link href="/">
          <header 
            className="bg-card border-b border-card-border px-6 py-6 cursor-pointer hover-elevate active-elevate-2"
            data-testid="header-back"
          >
            <div className="max-w-lg mx-auto flex items-center gap-4">
              <div
                className="flex-shrink-0 flex items-center gap-1 text-primary mt-0.5"
                data-testid="button-back"
              >
                <ArrowLeft className="w-8 h-8" strokeWidth={2.5} />
                <span className="text-sm font-bold">Back</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground flex-1 ml-2">Memory Quiz</h1>
            </div>
          </header>
        </Link>
        <main className="max-w-lg mx-auto px-3 py-6">
          <Card className="p-6 text-center">
            <p className="text-xl text-muted-foreground">
              Need at least 4 people to start the quiz. Add more people first!
            </p>
            <Link href="/" data-testid="link-go-home">
              <Button className="mt-6 h-14 text-xl px-8">
                Back to Home
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  if (quizComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Link href="/">
          <header 
            className="bg-card border-b border-card-border px-6 py-6 cursor-pointer hover-elevate active-elevate-2"
            data-testid="header-back"
          >
            <div className="max-w-lg mx-auto flex items-center gap-4">
              <div
                className="flex-shrink-0 flex items-center gap-1 text-primary mt-0.5"
                data-testid="button-back"
              >
                <ArrowLeft className="w-8 h-8" strokeWidth={2.5} />
                <span className="text-sm font-bold">Back</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground flex-1 ml-2">Quiz Complete!</h1>
            </div>
          </header>
        </Link>
        <main className="max-w-lg mx-auto px-3 py-6">
          <Card className="p-6 text-center">
            <PartyPopper className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Wonderful Job!
            </h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <span className="text-3xl font-bold text-foreground">
                {score} / {totalQuestions}
              </span>
            </div>
            <p className="text-xl text-muted-foreground mb-6">
              Great memory practice!
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleRestartQuiz}
                className="w-full h-14 text-xl"
                data-testid="button-restart-quiz"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Practice Again
              </Button>
              <Link href="/" data-testid="link-go-home-complete">
                <Button variant="outline" className="w-full h-14 text-xl">
                  Back to Home
                </Button>
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Link href="/">
        <header 
          className="bg-card border-b border-card-border px-6 py-6 cursor-pointer hover-elevate active-elevate-2"
          data-testid="header-back"
        >
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex-shrink-0 flex items-center gap-1 text-primary mt-0.5"
                data-testid="button-back"
              >
                <ArrowLeft className="w-8 h-8" strokeWidth={2.5} />
                <span className="text-sm font-bold">Back</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Memory Quiz</h1>
            </div>
            <div className="flex items-center gap-1 text-xl font-bold text-foreground">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span data-testid="text-score">{score}</span>
            </div>
          </div>
        </header>
      </Link>

      <main className="flex-1 max-w-lg mx-auto px-3 py-4 w-full">
        {currentQuestion && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="text-2xl text-center text-foreground font-bold mb-3">
                Who is this?
              </p>
              <Avatar className="w-40 h-40 mx-auto border-4 border-primary/20">
                {currentQuestion.person.photoData && (
                  <AvatarImage
                    src={currentQuestion.person.photoData}
                    alt="Mystery person"
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-4xl bg-muted">
                  {getInitials(currentQuestion.person.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-lg text-center text-muted-foreground mt-3">
                {currentQuestion.person.relationship}
              </p>
            </Card>

            {feedback && (
              <Card className={`p-4 text-center ${feedback.isCorrect ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"}`}>
                <div className="flex items-center justify-center gap-2">
                  {feedback.isCorrect ? (
                    <ThumbsUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : null}
                  <p className={`text-xl font-bold ${feedback.isCorrect ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {feedback.message}
                  </p>
                </div>
                {feedback.isCorrect && (
                  <>
                    <p className="text-lg text-green-600 dark:text-green-400 mt-1">
                      It's {currentQuestion.correctAnswer}!
                    </p>
                    <Button
                      onClick={handleNextQuestion}
                      className="mt-3 h-12 text-lg px-8"
                      data-testid="button-next-question"
                    >
                      Next
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  </>
                )}
                {!feedback.isCorrect && (
                  <Button
                    onClick={handleTryAgain}
                    className="mt-3 h-10 text-base px-6"
                    data-testid="button-try-again"
                  >
                    Try Again
                  </Button>
                )}
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={!!feedback}
                  className={`h-14 text-2xl font-bold shadow-md ${
                    feedback
                      ? option === currentQuestion.correctAnswer
                        ? "bg-green-600 hover:bg-green-600 text-white border-green-600"
                        : ""
                      : "bg-primary/10 hover:bg-primary/20 text-foreground border-2 border-primary/30"
                  }`}
                  variant={
                    feedback
                      ? option === currentQuestion.correctAnswer
                        ? "default"
                        : "outline"
                      : "outline"
                  }
                  data-testid={`button-option-${index}`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-background px-4 py-3 border-t border-card-border">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleRestartQuiz}
            className="h-10 text-base text-muted-foreground"
            data-testid="button-restart-quiz-inline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
          <p className="text-lg font-medium text-muted-foreground" data-testid="text-progress">
            {questionsAsked} / {totalQuestions}
          </p>
        </div>
      </footer>
    </div>
  );
}
