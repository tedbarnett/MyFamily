import { type Person, type InsertPerson, type PersonCategory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAllPeople(): Promise<Person[]>;
  getPeopleByCategory(category: PersonCategory): Promise<Person[]>;
  getPersonById(id: string): Promise<Person | undefined>;
}

export class MemStorage implements IStorage {
  private people: Map<string, Person>;

  constructor() {
    this.people = new Map();
    this.initializeData();
  }

  private initializeData() {
    const familyData: Omit<Person, "id">[] = [
      // Husband
      {
        name: "Neil Barnett",
        category: "husband",
        relationship: "Husband",
        photoUrl: null,
        born: "September 22, 1935",
        age: null,
        passed: "April 24, 2025",
        location: "Potsdam, New York (originally)",
        spouse: null,
        children: ["Ted", "Jon", "Chris", "Mark"],
        summary: "Sailor, former director at Procter & Gamble, devoted husband and father",
        sortOrder: 1,
      },
      
      // Children (4 sons)
      {
        name: "Ted Barnett",
        category: "children",
        relationship: "Son",
        photoUrl: null,
        born: "June 10, 1962",
        age: 63,
        passed: null,
        location: "New York City",
        spouse: "Melanie Craft (fiancée)",
        children: ["Olivia", "Willa", "Ryan"],
        summary: "Computer developer building a 3D reconstruction of New York City",
        sortOrder: 1,
      },
      {
        name: "Jon Barnett",
        category: "children",
        relationship: "Son",
        photoUrl: null,
        born: "April 2, 1964",
        age: 61,
        passed: null,
        location: "Flathead Lake, Montana",
        spouse: "Denae Barnett",
        children: null,
        summary: "Superyacht designer",
        sortOrder: 2,
      },
      {
        name: "Chris Barnett",
        category: "children",
        relationship: "Son",
        photoUrl: null,
        born: "July 31, 1967",
        age: 58,
        passed: null,
        location: "Bainbridge Island, Washington",
        spouse: "Mary Beth Barnett",
        children: ["Sam", "Audrey"],
        summary: "Top salesman for StruXure (luxury outdoor pergolas)",
        sortOrder: 3,
      },
      {
        name: "Mark Barnett",
        category: "children",
        relationship: "Son",
        photoUrl: null,
        born: "May 31, 1970",
        age: 55,
        passed: null,
        location: "Loveland, Ohio",
        spouse: "Jill Barnett",
        children: ["Jack", "Charlie", "Nicholas"],
        summary: "Set designer for films, manages Loveland bar 'Hops & Berry' with Jill",
        sortOrder: 4,
      },

      // Grandchildren (8)
      {
        name: "Olivia Barnett",
        category: "grandchildren",
        relationship: "Granddaughter (Ted's daughter)",
        photoUrl: null,
        born: "June 22, 1996",
        age: 29,
        passed: null,
        location: "Porto, Portugal",
        spouse: "Blaine Malone (partner, programmer)",
        children: null,
        summary: "Software developer",
        sortOrder: 1,
      },
      {
        name: "Willa Barnett",
        category: "grandchildren",
        relationship: "Granddaughter (Ted's daughter)",
        photoUrl: null,
        born: "January 29, 1999",
        age: 26,
        passed: null,
        location: "Brooklyn, New York",
        spouse: "Leo (partner, NYU Law School)",
        children: null,
        summary: "Improv and stand-up comedian; web developer",
        sortOrder: 2,
      },
      {
        name: "Ryan Barnett",
        category: "grandchildren",
        relationship: "Grandson (Ted's son)",
        photoUrl: null,
        born: "January 10, 2001",
        age: 24,
        passed: null,
        location: "Brooklyn, New York",
        spouse: "Alyssa (girlfriend, photographer)",
        children: null,
        summary: "Filmmaker; editor at HBO",
        sortOrder: 3,
      },
      {
        name: "Jack Barnett",
        category: "grandchildren",
        relationship: "Grandson (Mark's son)",
        photoUrl: null,
        born: "April 24, 2001",
        age: null,
        passed: null,
        location: "Tampa, Florida",
        spouse: null,
        children: null,
        summary: "Software engineer, Chi Psi fraternity",
        sortOrder: 4,
      },
      {
        name: "Nicholas Barnett",
        category: "grandchildren",
        relationship: "Grandson (Mark's son)",
        photoUrl: null,
        born: "July 16, 2006",
        age: null,
        passed: null,
        location: "University of Kentucky",
        spouse: null,
        children: null,
        summary: "Freshman at University of Kentucky, Chi Psi fraternity",
        sortOrder: 5,
      },
      {
        name: "Charlie Barnett",
        category: "grandchildren",
        relationship: "Grandson (Mark's son)",
        photoUrl: null,
        born: "July 16, 2006",
        age: null,
        passed: null,
        location: "University of Kentucky",
        spouse: null,
        children: null,
        summary: "Freshman at University of Kentucky, Chi Psi fraternity",
        sortOrder: 6,
      },
      {
        name: "Sam Barnett",
        category: "grandchildren",
        relationship: "Grandson (Chris's son)",
        photoUrl: null,
        born: "May 31, 2001",
        age: null,
        passed: null,
        location: "Bainbridge Island, Washington",
        spouse: null,
        children: null,
        summary: "Supply Chain manager for Lockheed",
        sortOrder: 7,
      },
      {
        name: "Audrey Barnett",
        category: "grandchildren",
        relationship: "Granddaughter (Chris's daughter)",
        photoUrl: null,
        born: "August 29, 2003",
        age: null,
        passed: null,
        location: "Columbus, Ohio",
        spouse: null,
        children: null,
        summary: "Student at Ohio State University, studying Nursing",
        sortOrder: 8,
      },

      // Friends (2)
      {
        name: "Weezy Allen",
        category: "friends",
        relationship: "Friend",
        photoUrl: null,
        born: null,
        age: null,
        passed: null,
        location: null,
        spouse: "Widow of Tom Gougeon",
        children: null,
        summary: null,
        sortOrder: 1,
      },
      {
        name: "Lynn Murray",
        category: "friends",
        relationship: "Friend",
        photoUrl: null,
        born: null,
        age: null,
        passed: null,
        location: null,
        spouse: "Widow of Jack Murray",
        children: null,
        summary: null,
        sortOrder: 2,
      },

      // Caregivers (6)
      {
        name: "Paige",
        category: "caregivers",
        relationship: "Caregiver",
        photoUrl: null,
        born: null,
        age: null,
        passed: null,
        location: null,
        spouse: null,
        children: null,
        summary: null,
        sortOrder: 1,
      },
      {
        name: "Lei",
        category: "caregivers",
        relationship: "Caregiver",
        photoUrl: null,
        born: null,
        age: null,
        passed: null,
        location: null,
        spouse: null,
        children: null,
        summary: null,
        sortOrder: 2,
      },
      {
        name: "Kirstin",
        category: "caregivers",
        relationship: "Caregiver",
        photoUrl: null,
        born: null,
        age: null,
        passed: null,
        location: null,
        spouse: null,
        children: null,
        summary: null,
        sortOrder: 3,
      },
      {
        name: "Deborah",
        category: "caregivers",
        relationship: "Caregiver",
        photoUrl: null,
        born: null,
        age: null,
        passed: null,
        location: null,
        spouse: null,
        children: null,
        summary: null,
        sortOrder: 4,
      },
      {
        name: "Trish",
        category: "caregivers",
        relationship: "Caregiver",
        photoUrl: null,
        born: null,
        age: null,
        passed: null,
        location: null,
        spouse: null,
        children: null,
        summary: null,
        sortOrder: 5,
      },
      {
        name: "Barbara",
        category: "caregivers",
        relationship: "Caregiver",
        photoUrl: null,
        born: null,
        age: null,
        passed: null,
        location: null,
        spouse: null,
        children: null,
        summary: null,
        sortOrder: 6,
      },
    ];

    familyData.forEach((personData) => {
      const id = randomUUID();
      const person: Person = { ...personData, id };
      this.people.set(id, person);
    });
  }

  async getAllPeople(): Promise<Person[]> {
    return Array.from(this.people.values()).sort((a, b) => {
      if (a.category !== b.category) {
        const categoryOrder = ["husband", "children", "grandchildren", "friends", "caregivers"];
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      }
      return a.sortOrder - b.sortOrder;
    });
  }

  async getPeopleByCategory(category: PersonCategory): Promise<Person[]> {
    return Array.from(this.people.values())
      .filter((person) => person.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPersonById(id: string): Promise<Person | undefined> {
    return this.people.get(id);
  }
}

export const storage = new MemStorage();
