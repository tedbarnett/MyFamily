import { useMemo } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Cake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Person } from "@shared/schema";

export default function Birthdays() {
  const { data: allPeople = [] } = useQuery<Person[]>({
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

  const parseBirthDate = (born: string): { month: number; day: number } | null => {
    if (!born) return null;
    const date = new Date(born);
    if (isNaN(date.getTime())) return null;
    return { month: date.getMonth(), day: date.getDate() };
  };

  const getUpcomingBirthdays = useMemo(() => {
    const today = new Date();

    const peopleWithBirthdays = allPeople
      .filter((person) => {
        if (!person.born || person.passed) return false;
        return parseBirthDate(person.born) !== null;
      })
      .map((person) => {
        const birthDate = parseBirthDate(person.born!)!;
        let daysUntil: number;

        const thisYearBirthday = new Date(today.getFullYear(), birthDate.month, birthDate.day);
        const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.month, birthDate.day);

        if (thisYearBirthday >= today) {
          daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          daysUntil = Math.ceil((nextYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        const nextBirthday = thisYearBirthday >= today ? thisYearBirthday : nextYearBirthday;

        return {
          person,
          daysUntil,
          nextBirthday,
          birthdayString: nextBirthday.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);

    return peopleWithBirthdays;
  }, [allPeople]);

  const getDaysUntilText = (days: number) => {
    if (days === 0) return "Today!";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-card-border px-6 py-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 flex-shrink-0"
              data-testid="button-back"
            >
              <ArrowLeft className="w-8 h-8" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            Upcoming Birthdays
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <Cake className="w-16 h-16 mx-auto text-primary mb-4" />
            <p className="text-xl text-muted-foreground">Next 3 celebrations</p>
          </div>

          {getUpcomingBirthdays.length === 0 ? (
            <div className="text-center text-xl text-muted-foreground py-8">
              No upcoming birthdays found
            </div>
          ) : (
            <div className="space-y-4">
              {getUpcomingBirthdays.map(({ person, daysUntil, birthdayString }) => (
                <Link
                  key={person.id}
                  href={`/person/${person.id}`}
                  data-testid={`link-birthday-${person.id}`}
                >
                  <Card className="hover-elevate active-elevate-2 cursor-pointer">
                    <div className="p-6 flex items-center gap-6">
                      <Avatar className="w-20 h-20 flex-shrink-0">
                        {(person.photoData || person.photoUrl) && (
                          <AvatarImage src={person.photoData || person.photoUrl || undefined} alt={person.name} />
                        )}
                        <AvatarFallback className="text-2xl">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                          {person.name}
                        </h3>
                        <p className="text-xl text-muted-foreground">
                          {person.relationship}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Cake className="w-5 h-5 text-primary" />
                          <span className="text-lg font-medium text-primary">
                            {birthdayString}
                          </span>
                          <span className="text-lg text-muted-foreground">
                            • {getDaysUntilText(daysUntil)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
