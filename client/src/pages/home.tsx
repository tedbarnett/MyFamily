import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Users, Heart, Baby, UserCircle, Stethoscope } from "lucide-react";
import type { PersonCategory } from "@shared/schema";

interface CategoryCard {
  id: PersonCategory;
  label: string;
  description: string;
  icon: typeof Users;
  color: string;
}

const categories: CategoryCard[] = [
  {
    id: "husband",
    label: "Husband",
    description: "Neil",
    icon: Heart,
    color: "text-red-600",
  },
  {
    id: "children",
    label: "Children",
    description: "4 Sons",
    icon: Users,
    color: "text-blue-600",
  },
  {
    id: "grandchildren",
    label: "Grandchildren",
    description: "8 Grandchildren",
    icon: Baby,
    color: "text-purple-600",
  },
  {
    id: "friends",
    label: "Friends",
    description: "2 Friends",
    icon: UserCircle,
    color: "text-green-600",
  },
  {
    id: "caregivers",
    label: "Caregivers",
    description: "6 Caregivers",
    icon: Stethoscope,
    color: "text-orange-600",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-card-border px-6 py-8">
        <h1 className="text-4xl font-bold text-center text-foreground">
          Judy's Family
        </h1>
        <p className="text-xl text-center text-muted-foreground mt-2">
          Tap to see your family and friends
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
                data-testid={`link-category-${category.id}`}
              >
                <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all">
                  <div className="p-8 flex items-center gap-6">
                    <div className={`${category.color} flex-shrink-0`}>
                      <Icon className="w-16 h-16" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-3xl font-bold text-foreground mb-1">
                        {category.label}
                      </h2>
                      <p className="text-xl text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
