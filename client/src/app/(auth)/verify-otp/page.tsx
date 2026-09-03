"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircleIcon, ArrowLeftIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { OtpInput } from "@/components/auth/OtpInput";

const otpSchema = z.object({
  otp: z.string().length(6, "Enter all 6 digits"),
});

type OtpValues = z.infer<typeof otpSchema>;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const onSubmit = async (values: OtpValues) => {
    setServerError(null);
    try {
      await api.post("/auth/verify-otp", { email, otp: values.otp });
      toast.success("Code verified!");
      const params = new URLSearchParams({ email, otp: values.otp });
      router.push(`/reset-password?${params.toString()}`);
    } catch (error) {
      const message = getErrorMessage(error, "Invalid or expired code.");
      setServerError(message);
      toast.error(message);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Missing email — please restart the reset process.");
      return;
    }
    setResending(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("A new code is on its way.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not resend the code."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="mb-8 text-center lg:text-left">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 lg:mx-0">
          <ShieldCheckIcon className="size-6" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Enter verification code
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">
            {email || "your email"}
          </span>
          . Enter it below to continue.
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
          <Field data-invalid={!!errors.otp} className="items-center">
            <Controller
              control={control}
              name="otp"
              render={({ field }) => (
                <OtpInput
                  value={field.value}
                  onChange={field.onChange}
                  autoFocus
                  invalid={!!errors.otp}
                />
              )}
            />
            <FieldError errors={[errors.otp]} className="text-center" />
          </Field>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full bg-brand-600 text-white hover:bg-brand-700"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify code"
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="font-medium text-brand-600 hover:underline disabled:opacity-50"
        >
          {resending ? "Resending…" : "Resend"}
        </button>
      </p>

      <Link
        href="/login"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VerifyOtpForm />
    </React.Suspense>
  );
}
