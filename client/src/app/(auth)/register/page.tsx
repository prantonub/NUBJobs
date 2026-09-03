"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircleIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";
import { cn, getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { PasswordInput } from "@/components/auth/PasswordInput";

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Electrical & Electronic Engineering",
  "Business Administration",
  "Civil Engineering",
  "English",
  "Pharmacy",
  "Law",
  "Architecture",
  "Economics",
  "Textile Engineering",
] as const;

const INDUSTRIES = [
  "Software & IT",
  "Finance & Banking",
  "Marketing & Advertising",
  "E-commerce",
  "Telecommunications",
  "Manufacturing",
  "Consulting",
  "Education",
  "Healthcare",
  "Other",
] as const;

const registerSchema = z
  .object({
    role: z.enum(["STUDENT", "EMPLOYER"]),
    name: z.string().min(2, "Enter your full name"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().optional(),
    nubId: z.string().optional(),
    department: z.string().optional(),
    companyName: z.string().optional(),
    industry: z.string().optional(),
    terms: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (!val.terms) {
      ctx.addIssue({
        code: "custom",
        path: ["terms"],
        message: "You must accept the terms to continue",
      });
    }

    if (val.role === "STUDENT") {
      if (!val.email.toLowerCase().endsWith("@nub.edu.bd")) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Use your NUB email (ending in @nub.edu.bd)",
        });
      }
      if (!val.nubId || val.nubId.trim().length < 3) {
        ctx.addIssue({
          code: "custom",
          path: ["nubId"],
          message: "Enter your NUB ID",
        });
      }
      if (!val.department) {
        ctx.addIssue({
          code: "custom",
          path: ["department"],
          message: "Select your department",
        });
      }
      if (!val.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Confirm your password",
        });
      } else if (val.confirmPassword !== val.password) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Passwords do not match",
        });
      }
    } else {
      if (!val.companyName || val.companyName.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["companyName"],
          message: "Enter your company name",
        });
      }
      if (!val.industry) {
        ctx.addIssue({
          code: "custom",
          path: ["industry"],
          message: "Select your industry",
        });
      }
    }
  });

type RegisterValues = z.infer<typeof registerSchema>;

interface AuthResponse {
  token?: string;
  accessToken?: string;
  data?: { token?: string };
}

const ROLE_OPTIONS = [
  {
    value: "STUDENT" as const,
    label: "Student",
    description: "Find jobs & internships",
    icon: <GraduationCapIcon className="size-5" />,
  },
  {
    value: "EMPLOYER" as const,
    label: "Employer",
    description: "Post jobs & hire talent",
    icon: <BriefcaseIcon className="size-5" />,
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const initialRole =
    searchParams.get("role")?.toLowerCase() === "employer"
      ? "EMPLOYER"
      : "STUDENT";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: initialRole,
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      nubId: "",
      department: "",
      companyName: "",
      industry: "",
      terms: false,
    },
  });

  const role = watch("role");
  const isStudent = role === "STUDENT";

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    try {
      const payload =
        values.role === "STUDENT"
          ? {
              role: "STUDENT",
              name: values.name,
              email: values.email,
              password: values.password,
              nubId: values.nubId,
              department: values.department,
            }
          : {
              role: "EMPLOYER",
              name: values.name,
              email: values.email,
              password: values.password,
              companyName: values.companyName,
              industry: values.industry,
            };

      const res = await api.post<AuthResponse>("/auth/register", payload);
      const token =
        res.data?.token ?? res.data?.accessToken ?? res.data?.data?.token;

      if (token) {
        login(token);
        toast.success("Account created — welcome to NUBJobs!");
        router.push("/dashboard");
      } else {
        toast.success("Account created! Please sign in.");
        router.push("/login");
      }
    } catch (error) {
      const message = getErrorMessage(error, "Could not create your account.");
      setServerError(message);
      toast.error(message);
    }
  };

  const handleGoogle = () => {
    window.location.href = `${
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"
    }/auth/google`;
  };

  return (
    <div>
      <div className="mb-6 text-center lg:text-left">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Role selection */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {ROLE_OPTIONS.map((option) => {
          const selected = role === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue("role", option.value)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                selected
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/30 dark:bg-brand-900/20"
                  : "border-border hover:border-brand-200 hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  selected
                    ? "bg-brand-600 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {option.icon}
              </span>
              <span className="mt-1 font-heading font-semibold text-foreground">
                {option.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      <GoogleAuthButton label="Sign up with Google" onClick={handleGoogle} />

      <FieldSeparator className="my-6">or register with email</FieldSeparator>

      {serverError ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              placeholder="e.g. Tahmid Rahman"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">
              {isStudent ? "NUB email" : "Work email"}
            </FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={isStudent ? "you@nub.edu.bd" : "you@company.com"}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          {/* Student-only fields */}
          {isStudent ? (
            <>
              <Field data-invalid={!!errors.nubId}>
                <FieldLabel htmlFor="nubId">NUB ID</FieldLabel>
                <Input
                  id="nubId"
                  placeholder="e.g. 210101001"
                  aria-invalid={!!errors.nubId}
                  {...register("nubId")}
                />
                <FieldError errors={[errors.nubId]} />
              </Field>

              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <Field data-invalid={!!errors.department}>
                    <FieldLabel htmlFor="department">Department</FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="department"
                        className="h-11 w-full"
                        aria-invalid={!!errors.department}
                      >
                        <SelectValue placeholder="Select your department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[errors.department]} />
                  </Field>
                )}
              />
            </>
          ) : (
            /* Employer-only fields */
            <>
              <Field data-invalid={!!errors.companyName}>
                <FieldLabel htmlFor="companyName">Company name</FieldLabel>
                <Input
                  id="companyName"
                  autoComplete="organization"
                  placeholder="e.g. Brain Station 23"
                  aria-invalid={!!errors.companyName}
                  {...register("companyName")}
                />
                <FieldError errors={[errors.companyName]} />
              </Field>

              <Controller
                control={control}
                name="industry"
                render={({ field }) => (
                  <Field data-invalid={!!errors.industry}>
                    <FieldLabel htmlFor="industry">Industry</FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="industry"
                        className="h-11 w-full"
                        aria-invalid={!!errors.industry}
                      >
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[errors.industry]} />
                  </Field>
                )}
              />
            </>
          )}

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          {/* Confirm password: student flow only */}
          {isStudent ? (
            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirmPassword">
                Confirm password
              </FieldLabel>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              <FieldError errors={[errors.confirmPassword]} />
            </Field>
          ) : null}

          <Field data-invalid={!!errors.terms}>
            <Controller
              control={control}
              name="terms"
              render={({ field }) => (
                <FieldLabel
                  htmlFor="terms"
                  className="flex-row items-start gap-2.5 font-normal"
                >
                  <Checkbox
                    id="terms"
                    className="mt-0.5"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    aria-invalid={!!errors.terms}
                  />
                  <span className="text-sm leading-snug text-muted-foreground">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="font-medium text-brand-600 hover:underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="font-medium text-brand-600 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </FieldLabel>
              )}
            />
            <FieldError errors={[errors.terms]} />
          </Field>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full bg-brand-600 text-white hover:bg-brand-700"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RegisterForm />
    </React.Suspense>
  );
}
