import { DEFAULT_PREFERENCES, EMPTY_RULES, type EligibilityRules, type Preferences, type Profile } from "@/lib/schemas";

export const NOW = new Date("2026-10-27T12:00:00Z");

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: "Asha Rao",
    email: "asha@example.com",
    phone: "+91 90000 00000",
    location: "Bengaluru, India",
    country: "IN",
    links: ["https://github.com/asha", "https://linkedin.com/in/asha", "https://asha.dev"],
    headline: "Third-year CS student building ML systems",
    education: [{ school: "IIT Example", degree: "B.Tech Computer Science", level: "bachelors", field: "Computer Science", gradYear: 2028, gpa: "9.1" }],
    experience: [
      {
        title: "ML Intern",
        org: "Acme AI",
        start: "2026-05",
        end: "2026-07",
        bullets: ["Built a retrieval pipeline in Python serving 2k daily queries", "Cut inference latency by 30% with batching"],
      },
    ],
    projects: [{ name: "RAG Wiki", description: "Campus search", tech: ["python", "pytorch"], url: null }],
    skills: ["Python", "PyTorch", "React"],
    achievements: ["Smart India Hackathon finalist"],
    interests: ["machine learning", "robotics"],
    ...overrides,
  };
}

export function makePrefs(overrides: Partial<Preferences> = {}): Preferences {
  return { ...DEFAULT_PREFERENCES, ...overrides };
}

export function makeRules(overrides: Partial<EligibilityRules> = {}): EligibilityRules {
  return { ...structuredClone(EMPTY_RULES), ...overrides };
}
