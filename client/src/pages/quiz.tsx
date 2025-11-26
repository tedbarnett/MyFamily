import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, RefreshCw, Trophy, Star, PartyPopper, ThumbsUp, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Person } from "@shared/schema";

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

  const { data: allPeople = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

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
  }, [allPeople, askedPeople]);

  const startNewQuestion = useCallback(() => {
    const question = generateQuestion();
    if (question) {
      setCurrentQuestion(question);
      setFeedback(null);
      setQuestionsAsked((prev) => prev + 1);
    }
  }, [generateQuestion]);

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
        <header className="bg-card border-b border-card-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <Link href="/" data-testid="link-back-home">
              <Button size="icon" variant="ghost" className="h-14 w-14">
                <ArrowLeft className="w-8 h-8" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Memory Quiz</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-8">
          <Card className="p-8 text-center">
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
        <header className="bg-card border-b border-card-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <Link href="/" data-testid="link-back-home">
              <Button size="icon" variant="ghost" className="h-14 w-14">
                <ArrowLeft className="w-8 h-8" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Quiz Complete!</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <PartyPopper className="w-20 h-20 mx-auto text-yellow-500 mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Wonderful Job!
            </h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Trophy className="w-10 h-10 text-yellow-500" />
              <span className="text-4xl font-bold text-foreground">
                {score}
              </span>
            </div>
            <p className="text-2xl text-muted-foreground mb-8">
              You remembered all {allPeople.length} people!
            </p>
            <div className="space-y-4">
              <Button
                onClick={handleRestartQuiz}
                className="w-full h-16 text-xl"
                data-testid="button-restart-quiz"
              >
                <RefreshCw className="w-6 h-6 mr-3" />
                Practice Again
              </Button>
              <Link href="/" data-testid="link-go-home-complete">
                <Button variant="outline" className="w-full h-16 text-xl">
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
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-card-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" data-testid="link-back-home">
              <Button size="icon" variant="ghost" className="h-14 w-14">
                <ArrowLeft className="w-8 h-8" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Memory Quiz</h1>
          </div>
          <div className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            <span data-testid="text-score">{score}</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {currentQuestion && (
          <div className="space-y-8">
            <div className="text-center">
              <p className="text-lg text-muted-foreground" data-testid="text-progress">
                Question {questionsAsked} of {allPeople.length}
              </p>
            </div>
            <Card className="p-8">
              <p className="text-xl text-center text-muted-foreground mb-6">
                Who is this?
              </p>
              <Avatar className="w-48 h-48 mx-auto border-4 border-primary/20">
                {currentQuestion.person.photoData && (
                  <AvatarImage
                    src={currentQuestion.person.photoData}
                    alt="Mystery person"
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-5xl bg-muted">
                  {getInitials(currentQuestion.person.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-lg text-center text-muted-foreground mt-4">
                {currentQuestion.person.relationship}
              </p>
            </Card>

            {feedback && (
              <Card className={`p-6 text-center ${feedback.isCorrect ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"}`}>
                <div className="flex items-center justify-center gap-3">
                  {feedback.isCorrect ? (
                    <ThumbsUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                  ) : null}
                  <p className={`text-2xl font-bold ${feedback.isCorrect ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {feedback.message}
                  </p>
                </div>
                {feedback.isCorrect && (
                  <>
                    <p className="text-xl text-green-600 dark:text-green-400 mt-2">
                      It's {currentQuestion.correctAnswer}!
                    </p>
                    <Button
                      onClick={handleNextQuestion}
                      className="mt-4 h-14 text-xl px-10"
                      data-testid="button-next-question"
                    >
                      Next
                      <ChevronRight className="w-6 h-6 ml-2" />
                    </Button>
                  </>
                )}
                {!feedback.isCorrect && (
                  <Button
                    onClick={handleTryAgain}
                    className="mt-4 h-12 text-lg px-8"
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
                  className="h-20 text-2xl font-medium"
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

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={handleRestartQuiz}
                className="h-12 text-lg text-muted-foreground"
                data-testid="button-restart-quiz-inline"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Start Over
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
