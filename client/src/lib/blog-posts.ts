/**
 * Career blog content — static data for /blog and /blog/[slug].
 *
 * Each body is an array of paragraph strings (one string = one paragraph)
 * so article pages render semantic <p> elements without any CMS.
 */
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** Display date, e.g. "October 6, 2026". */
  date: string;
  category: string;
  readingTime: string;
  body: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "first-job-interview",
    title: "How to prepare for your first job interview",
    excerpt:
      "A calm, practical checklist for interview day — from researching the company to sending a thank-you note.",
    date: "October 6, 2026",
    category: "Interviews",
    readingTime: "5 min read",
    body: [
      "Start with the job advertisement and the company website. Read the role twice and note the three skills they mention most. When you can explain what the company does, who it serves, and why this role exists, your answers stop sounding generic and start sounding prepared.",
      "Prepare two or three short stories from your studies, projects, or part-time work. Use a simple structure: the situation, what you did, and the result. Stories about solving a problem, meeting a deadline, or working in a team are easy to reuse for many different questions.",
      "Practice saying your answers out loud, not just in your head. Rehearse with a friend or record yourself on your phone. Aim for answers that are about one minute long. Practice also lowers nerves, because your brain has already said the words once before.",
      "Plan the practical details the day before. Choose your outfit, check the route, and charge your phone. If the interview is online, test your camera and microphone early. Being ten minutes early — or five minutes early online — shows respect for the interviewer's time.",
      "After the interview, send a short thank-you message within a day. Mention one specific thing you discussed to make it memorable. If you do not get the role, ask for feedback. Every interview is practice, and each one makes the next one easier.",
    ],
  },
  {
    slug: "resume-that-gets-shortlisted",
    title: "Writing a resume that gets shortlisted",
    excerpt:
      "Simple rules for a resume that survives a quick scan: clear sections, strong action verbs, and real results.",
    date: "September 24, 2026",
    category: "Resumes",
    readingTime: "6 min read",
    body: [
      "Keep your resume to one page while you are a student or fresh graduate. Recruiters spend only a few seconds on each resume, so a short, focused document wins over a long one. Put your name and contact details at the top, then only the sections that match the job.",
      "Start every bullet point with a strong action verb such as built, led, organised, improved, or delivered. Avoid repeating the same verb twice in a row. Verbs make you sound active and capable, while phrases like responsible for sound like a list of duties instead of achievements.",
      "Wherever you can, add numbers. Instead of helped with sales, write helped increase weekly sales by 15 percent. Numbers give proof and make your claims believable. Grades, team sizes, event attendance, and deadlines all work as measurable results.",
      "Match your resume to each job. Read the advertisement and reuse its key words in your skills and experience sections. Many companies use software that scans for these words, so mirroring the advertisement's language helps your resume reach a human reader.",
      "Finally, check for mistakes. Typos and wrong dates make a bad first impression, so read your resume backwards to catch errors, and ask a friend to review it. Save and upload it as a PDF so the layout never shifts on another device.",
    ],
  },
  {
    slug: "internships-build-career",
    title: "Using internships to build your career",
    excerpt:
      "Internships are more than resume filler — they are a low-risk way to test a career and build real contacts.",
    date: "September 10, 2026",
    category: "Career growth",
    readingTime: "4 min read",
    body: [
      "An internship lets you test a career before committing to it. You learn what a normal workday really feels like, whether you enjoy the tasks, and which parts of the job drain you. That clarity is valuable long before you accept a full-time offer.",
      "Treat every task as a learning opportunity, even the small ones. Small assignments build trust, and trust leads to bigger projects. Ask questions, take notes, and volunteer for work outside your comfort zone. Supervisors remember interns who show curiosity and energy.",
      "Build relationships while you are there. Introduce yourself to people in other teams, eat lunch with colleagues, and ask your supervisor for a short chat at the end. These contacts become your professional network and often lead to references and job tips later.",
      "Document your results before the internship ends. Save numbers, examples of your work, and any positive feedback. These details turn into strong bullet points on your resume, because you can describe exactly what you achieved instead of vaguely listing your duties.",
      "Finish by asking for feedback and a reference. A short message after you leave keeps the relationship warm. Even if the internship does not offer a job, the skills, contacts, and confidence you gain make your next application much stronger.",
    ],
  },
];
