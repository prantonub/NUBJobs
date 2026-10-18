/**
 * FAQ content shared by /faq (and available to any page that wants to link
 * into it via /faq#<id>). Categories drive the section grouping on the page.
 */
export type FaqCategory = "Students" | "Employers" | "Account and safety";

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  "Students",
  "Employers",
  "Account and safety",
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "is-nubjobs-free",
    category: "Students",
    question: "Is NUBJobs free for students?",
    answer:
      "Yes. NUBJobs is completely free for students and graduates — creating a profile, applying to jobs, messaging employers, and using the community all cost nothing.",
  },
  {
    id: "who-can-use-nubjobs",
    category: "Students",
    question: "Who can use NUBJobs?",
    answer:
      "NUBJobs is built for Northern University Bangladesh students and graduates, plus employers who want to hire them. Anyone can browse jobs, but you need an account to apply, save jobs, or post openings.",
  },
  {
    id: "how-employers-post",
    category: "Employers",
    question: "How do employers post a job?",
    answer:
      "Create an employer account, complete your company profile, then open Post a Job from your dashboard. Fill in the title, description, skills, and salary, and submit it for review.",
  },
  {
    id: "job-approval-time",
    category: "Employers",
    question: "How long does job approval take?",
    answer:
      "Most jobs are reviewed within one working day. Our admin team checks each posting for accuracy and safety, and you can track the status from your dashboard while you wait.",
  },
  {
    id: "trustworthy-employer",
    category: "Employers",
    question: "How do I know an employer is trustworthy?",
    answer:
      "Look for the verified badge on the company profile — verified employers have submitted documents to our admin team. Always review the job description carefully and report anything suspicious from the contact page.",
  },
  {
    id: "messaging-filter",
    category: "Account and safety",
    question: "What is the Professional and Community messaging filter?",
    answer:
      "Your inbox separates Professional messages — job-related chats with employers — from Community messages, such as study groups and forum replies. The filter keeps job conversations from getting lost in social chatter.",
  },
  {
    id: "personal-information-safe",
    category: "Account and safety",
    question: "Is my personal information safe?",
    answer:
      "Yes. Your contact details are never shown publicly, and your profile only appears in employer search if you switch on visibility. You decide what employers can see from your profile settings.",
  },
  {
    id: "report-a-problem",
    category: "Account and safety",
    question: "How do I report a problem or a fake job post?",
    answer:
      "Send us the details through the contact page, including the job link and what looks wrong. Our admin team reviews every report and removes suspicious listings quickly.",
  },
];
