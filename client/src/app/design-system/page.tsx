"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  FileTextIcon,
  InboxIcon,
  InfoIcon,
  MoonIcon,
  SunIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";

// import shadcn primitives
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// custom NUBJobs components
import { JobCard } from "@/components/ui/JobCard";
import { StatCard } from "@/components/ui/StatCard";
import {
  ApplicationStatusBadge,
  type ApplicationStatus,
} from "@/components/ui/ApplicationStatusBadge";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { SkillTag } from "@/components/ui/SkillTag";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

// layout components (previewed)
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

/* ─── local helpers ──────────────────────────────────────────────────────── */

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
    </Button>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <SectionHeader title={title} subtitle={description} />
      <div className="rounded-xl border border-border bg-card p-6">{children}</div>
    </section>
  );
}

function Swatch({
  label,
  value,
  className,
  style,
  textClassName = "text-white",
}: {
  label: string;
  value: string;
  className?: string;
  style?: React.CSSProperties;
  textClassName?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div
        className={cn("flex h-16 items-end p-2", className, textClassName)}
        style={style}
      >
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="bg-card px-2 py-1.5">
        <p className="font-mono text-[11px] text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

/* ─── sample data ────────────────────────────────────────────────────────── */

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "destructive",
  "ghost",
] as const;

const STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "REVIEWED",
  "SHORTLISTED",
  "INTERVIEWED",
  "HIRED",
  "REJECTED",
];

interface Applicant {
  id: string;
  name: string;
  role: string;
  status: ApplicationStatus;
  applied: string;
}

const APPLICANTS: Applicant[] = [
  { id: "1", name: "Ayesha Rahman", role: "Frontend Intern", status: "SHORTLISTED", applied: "2026-08-25" },
  { id: "2", name: "Tanvir Hasan", role: "Backend Developer", status: "APPLIED", applied: "2026-08-24" },
  { id: "3", name: "Nusrat Jahan", role: "UI/UX Designer", status: "INTERVIEWED", applied: "2026-08-22" },
  { id: "4", name: "Rakib Islam", role: "Data Analyst", status: "HIRED", applied: "2026-08-18" },
  { id: "5", name: "Sadia Akter", role: "QA Engineer", status: "REVIEWED", applied: "2026-08-17" },
  { id: "6", name: "Mahmudul Karim", role: "DevOps Intern", status: "REJECTED", applied: "2026-08-15" },
  { id: "7", name: "Farhana Yasmin", role: "Product Manager", status: "APPLIED", applied: "2026-08-14" },
  { id: "8", name: "Imran Chowdhury", role: "Mobile Developer", status: "SHORTLISTED", applied: "2026-08-12" },
  { id: "9", name: "Sabrina Sultana", role: "Marketing Intern", status: "REVIEWED", applied: "2026-08-10" },
  { id: "10", name: "Zahid Hossain", role: "Full-stack Developer", status: "INTERVIEWED", applied: "2026-08-08" },
  { id: "11", name: "Mitu Barua", role: "Content Writer", status: "APPLIED", applied: "2026-08-06" },
  { id: "12", name: "Arif Mahmud", role: "Cloud Engineer", status: "HIRED", applied: "2026-08-01" },
];

const APPLICANT_COLUMNS: DataTableColumn<Applicant>[] = [
  {
    header: "Candidate",
    cell: (row) => (
      <div className="flex items-center gap-2">
        <CompanyLogo name={row.name} size="sm" />
        <span className="font-medium text-foreground">{row.name}</span>
      </div>
    ),
  },
  { header: "Applied For", accessor: "role" },
  {
    header: "Status",
    cell: (row) => <ApplicationStatusBadge status={row.status} />,
  },
  {
    header: "Applied",
    className: "text-muted-foreground",
    cell: (row) => formatDate(row.applied),
  },
];

/* ─── page ───────────────────────────────────────────────────────────────── */

export default function DesignSystemPage() {
  const [saved, setSaved] = React.useState<Record<string, boolean>>({ "1": true });
  const [tableLoading, setTableLoading] = React.useState(false);

  const toggleSave = (id: string) =>
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <PageContainer className="flex h-16 items-center justify-between">
          <div>
            <h1 className="font-heading text-lg font-bold tracking-tight">
              NUB<span className="text-brand-600">Jobs</span> Design System
            </h1>
            <p className="text-xs text-muted-foreground">
              Components, tokens & patterns · Phase 3
            </p>
          </div>
          <ThemeToggle />
        </PageContainer>
      </div>

      <PageContainer className="space-y-12 py-10">
        {/* Colors */}
        <Section
          id="colors"
          title="Colors"
          description="Brand palette, semantic tokens, and neutral surfaces."
        >
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Brand
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <Swatch label="50" value="#eff6ff" className="bg-brand-50" textClassName="text-brand-900" />
                <Swatch label="100" value="#dbeafe" className="bg-brand-100" textClassName="text-brand-900" />
                <Swatch label="500" value="#3b82f6" className="bg-brand-500" />
                <Swatch label="600" value="#1a56db" className="bg-brand-600" />
                <Swatch label="700" value="#1d4ed8" className="bg-brand-700" />
                <Swatch label="900" value="#1e3a5f" className="bg-brand-900" />
                <Swatch label="navy" value="#1e293b" className="bg-navy" />
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Semantic
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Swatch label="primary" value="var(--brand-primary)" style={{ backgroundColor: "var(--brand-primary)" }} />
                <Swatch label="navy" value="var(--brand-navy)" style={{ backgroundColor: "var(--brand-navy)" }} />
                <Swatch label="success" value="var(--success)" style={{ backgroundColor: "var(--success)" }} />
                <Swatch label="warning" value="var(--warning)" style={{ backgroundColor: "var(--warning)" }} />
                <Swatch label="error" value="var(--error)" style={{ backgroundColor: "var(--error)" }} />
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Surfaces (theme-aware)
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Swatch label="background" value="--background" className="bg-background" textClassName="text-foreground" />
                <Swatch label="card" value="--card" className="bg-card" textClassName="text-card-foreground" />
                <Swatch label="muted" value="--muted" className="bg-muted" textClassName="text-muted-foreground" />
                <Swatch label="primary" value="--primary" className="bg-primary" textClassName="text-primary-foreground" />
                <Swatch label="accent" value="--accent" className="bg-accent" textClassName="text-accent-foreground" />
              </div>
            </div>
          </div>
        </Section>

        {/* Typography */}
        <Section
          id="typography"
          title="Typography"
          description="Inter (self-hosted via next/font). Headings use font-heading."
        >
          <div className="space-y-3">
            <p className="font-heading text-4xl font-bold tracking-tight">
              Display / 4xl bold
            </p>
            <p className="font-heading text-2xl font-semibold">
              Heading / 2xl semibold
            </p>
            <p className="text-lg font-medium">Subtitle / lg medium</p>
            <p className="text-base text-foreground">
              Body / base — Find jobs and internships tailored to NUB students.
            </p>
            <p className="text-sm text-muted-foreground">
              Muted / sm — supporting text and metadata.
            </p>
            <p className="font-mono text-sm">Mono / code · const cgpa = 3.75;</p>
          </div>
        </Section>

        {/* Buttons */}
        <Section
          id="buttons"
          title="Buttons"
          description="All variants across sizes, plus icon and disabled states."
        >
          <div className="space-y-6">
            {BUTTON_VARIANTS.map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-medium capitalize text-muted-foreground">
                  {variant}
                </span>
                {BUTTON_SIZES.map((size) => (
                  <Button key={size} variant={variant} size={size}>
                    Button
                  </Button>
                ))}
                <Button variant={variant} size="icon" aria-label="Briefcase">
                  <BriefcaseIcon />
                </Button>
                <Button variant={variant} disabled>
                  Disabled
                </Button>
              </div>
            ))}
          </div>
        </Section>

        {/* Badges & tags */}
        <Section
          id="badges"
          title="Badges, Status & Skill Tags"
          description="shadcn Badge variants, application-status colors, and skill pills."
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {BADGE_VARIANTS.map((variant) => (
                <Badge key={variant} variant={variant} className="capitalize">
                  {variant}
                </Badge>
              ))}
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-2">
              {STATUSES.map((status) => (
                <ApplicationStatusBadge key={status} status={status} />
              ))}
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-2">
              <SkillTag>React</SkillTag>
              <SkillTag variant="primary">TypeScript</SkillTag>
              <SkillTag proficiency="Expert">Node.js</SkillTag>
              <SkillTag proficiency="Intermediate">PostgreSQL</SkillTag>
              <SkillTag proficiency="Beginner">Go</SkillTag>
              <SkillTag variant="primary" onRemove={() => toast("Removed skill")}>
                Removable
              </SkillTag>
            </div>
          </div>
        </Section>

        {/* Stat cards */}
        <Section
          id="stats"
          title="Stat Cards"
          description="Animated count-up metrics with colored icons and trends."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<BriefcaseIcon />}
              value={1284}
              label="Active jobs"
              color="blue"
              trend={{ value: 12, isUp: true }}
            />
            <StatCard
              icon={<FileTextIcon />}
              value={342}
              label="Applications"
              color="green"
              trend={{ value: 8, isUp: true }}
            />
            <StatCard
              icon={<UsersIcon />}
              value={87}
              label="Interviews"
              color="amber"
              trend={{ value: 3, isUp: false }}
            />
            <StatCard
              icon={<TrendingUpIcon />}
              value="68%"
              label="Match rate"
              color="purple"
            />
          </div>
        </Section>

        {/* Job cards */}
        <Section
          id="job-cards"
          title="Job Cards"
          description="Listing card with match score, salary, skills, deadline and save toggle."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <JobCard
              id="1"
              title="Senior Frontend Engineer"
              companyName="Grameenphone"
              type="FULL_TIME"
              location="Dhaka, Bangladesh"
              salaryMin={80000}
              salaryMax={120000}
              skills={["React", "TypeScript", "Next.js", "Tailwind", "GraphQL"]}
              deadline="2026-08-29"
              matchScore={92}
              minCgpa={3.5}
              postedAt="2026-08-25"
              isSaved={!!saved["1"]}
              onSave={toggleSave}
            />
            <JobCard
              id="2"
              title="Backend Intern"
              companyName="Pathao"
              type="INTERNSHIP"
              location="Remote"
              skills={["Node.js", "Express", "PostgreSQL"]}
              deadline="2026-09-20"
              matchScore={64}
              postedAt="2026-08-22"
              isSaved={!!saved["2"]}
              onSave={toggleSave}
            />
            <JobCard
              id="3"
              title="Product Designer"
              companyName="ShopUp"
              type="HYBRID"
              location="Banani, Dhaka"
              salaryMin={60000}
              skills={["Figma", "Prototyping"]}
              deadline="2026-10-05"
              postedAt="2026-08-19"
              isSaved={!!saved["3"]}
              onSave={toggleSave}
            />
          </div>
        </Section>

        {/* Company logos */}
        <Section
          id="company-logos"
          title="Company Logos"
          description="Image logos with initial-based fallbacks in three sizes."
        >
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex items-end gap-3">
              <CompanyLogo name="Grameenphone" size="sm" />
              <CompanyLogo name="Pathao" size="md" />
              <CompanyLogo name="ShopUp" size="lg" />
            </div>
            <Separator orientation="vertical" className="h-16" />
            <div className="flex items-end gap-3">
              <CompanyLogo name="Brac Bank" size="sm" />
              <CompanyLogo name="bKash" size="md" />
              <CompanyLogo name="Robi Axiata" size="lg" />
            </div>
          </div>
        </Section>

        {/* Forms */}
        <Section
          id="forms"
          title="Form Inputs"
          description="Input states, textarea, select, checkbox, radio, and switch."
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ds-email">Email</Label>
                <Input id="ds-email" type="email" placeholder="you@nub.edu.bd" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-disabled">Disabled</Label>
                <Input id="ds-disabled" placeholder="Disabled input" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-invalid">Invalid</Label>
                <Input
                  id="ds-invalid"
                  placeholder="Invalid input"
                  aria-invalid
                  defaultValue="not-an-email"
                />
                <p className="text-xs text-destructive">
                  Please enter a valid email address.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-bio">Cover note</Label>
                <Textarea
                  id="ds-bio"
                  placeholder="Tell the employer why you're a great fit…"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cse">Computer Science & Engineering</SelectItem>
                    <SelectItem value="eee">Electrical & Electronic Engineering</SelectItem>
                    <SelectItem value="bba">Business Administration</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Job type</Label>
                <RadioGroup defaultValue="full" className="flex flex-wrap gap-4">
                  {[
                    ["full", "Full-time"],
                    ["part", "Part-time"],
                    ["intern", "Internship"],
                  ].map(([value, label]) => (
                    <div key={value} className="flex items-center gap-2">
                      <RadioGroupItem value={value} id={`ds-${value}`} />
                      <Label htmlFor={`ds-${value}`} className="font-normal">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="ds-remote" defaultChecked />
                  <Label htmlFor="ds-remote" className="font-normal">
                    Remote only
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ds-cgpa" />
                  <Label htmlFor="ds-cgpa" className="font-normal">
                    Meets my CGPA
                  </Label>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="ds-alerts">Email alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    New jobs matching your profile.
                  </p>
                </div>
                <Switch id="ds-alerts" defaultChecked />
              </div>
            </div>
          </div>
        </Section>

        {/* Data table */}
        <Section
          id="data-table"
          title="Data Table"
          description="Generic table with custom cells, pagination, and a loading state."
        >
          <div className="mb-4 flex items-center gap-2">
            <Switch
              id="ds-table-loading"
              checked={tableLoading}
              onCheckedChange={setTableLoading}
            />
            <Label htmlFor="ds-table-loading" className="font-normal">
              Show loading state
            </Label>
          </div>
          <DataTable
            columns={APPLICANT_COLUMNS}
            data={APPLICANTS}
            isLoading={tableLoading}
            pageSize={5}
            rowKey={(row) => row.id}
          />
        </Section>

        {/* Feedback & overlays */}
        <Section
          id="feedback"
          title="Feedback & Overlays"
          description="Toasts, tooltip, dropdown, progress, skeleton, tabs, spinner and empty state."
        >
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => toast.success("Application submitted!")}>
                <CheckCircle2Icon /> Success toast
              </Button>
              <Button variant="outline" onClick={() => toast.error("Something went wrong.")}>
                Error toast
              </Button>
              <Button variant="outline" onClick={() => toast.info("Deadline in 3 days.")}>
                <InfoIcon /> Info toast
              </Button>
              <Button variant="outline" onClick={() => toast.warning("Profile incomplete.")}>
                Warning toast
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary">Hover for tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>Saved to your list</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">Open menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Save job</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">Report</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Profile completeness</Label>
                <Progress value={68} />
                <p className="text-xs text-muted-foreground">68% complete</p>
              </div>
              <div className="space-y-2">
                <Label>Skeleton</Label>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="applicants">Applicants</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="pt-4 text-sm text-muted-foreground">
                Job overview and description content goes here.
              </TabsContent>
              <TabsContent value="applicants" className="pt-4 text-sm text-muted-foreground">
                A list of candidates who applied.
              </TabsContent>
              <TabsContent value="settings" className="pt-4 text-sm text-muted-foreground">
                Posting settings and visibility.
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border">
                <LoadingSpinner label="Loading jobs…" />
              </div>
              <EmptyState
                icon={<InboxIcon />}
                title="No applications yet"
                description="When you apply to jobs, they'll show up here so you can track their status."
                action={{ label: "Browse jobs", href: "/jobs" }}
              />
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section
          id="cards"
          title="Cards"
          description="The shadcn Card composition used across the app."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Complete your profile</CardTitle>
                <CardDescription>
                  A complete profile gets 3× more employer views.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={40} />
              </CardContent>
              <CardFooter>
                <Button size="sm">Finish setup</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Job alert created</CardTitle>
                <CardDescription>Frontend · Dhaka · Full-time</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                We&apos;ll email you when matching roles are posted.
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Layout previews */}
        <Section
          id="layout"
          title="Layout Components"
          description="Navbar, DashboardLayout, and Footer previews."
        >
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Navbar
              </p>
              <div className="overflow-hidden rounded-xl border border-border">
                <Navbar />
                <div className="h-16 bg-muted/30" />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                DashboardLayout
              </p>
              <div className="relative h-[460px] overflow-hidden rounded-xl border border-border">
                <DashboardLayout
                  title="Overview"
                  breadcrumbs={[
                    { label: "Home", href: "/" },
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Overview" },
                  ]}
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard icon={<BriefcaseIcon />} value={12} label="Applied" color="blue" />
                    <StatCard icon={<UsersIcon />} value={3} label="Interviews" color="amber" />
                    <StatCard icon={<CheckCircle2Icon />} value={1} label="Offers" color="green" />
                  </div>
                </DashboardLayout>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Footer
              </p>
              <div className="overflow-hidden rounded-xl border border-border">
                <Footer />
              </div>
            </div>
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
