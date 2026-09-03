"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircleIcon, ArrowLeftIcon, Loader2Icon, MailIcon } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

const forgotSchema = z.object({
  email: z.email("Enter a valid email address"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotValues) => {
    setServerError(null);
    try {
      await api.post("/auth/forgot-password", { email: values.email });
      toast.success("We've sent a verification code to your email.");
      router.push(`/verify-otp?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      const message = getErrorMessage(error, "Could not send the code.");
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <div>
      <div className="mb-8 text-center lg:text-left">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 lg:mx-0">
          <MailIcon className="size-6" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email tied to your account and we&apos;ll send you a 6-digit
          verification code.
        </p>
      </div>

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
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@nub.edu.bd"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full bg-brand-600 text-white hover:bg-brand-700"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Sending code…
              </>
            ) : (
              "Send verification code"
            )}
          </Button>
        </FieldGroup>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}
