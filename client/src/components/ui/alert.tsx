import * as React from "react"

import { cn } from "@/lib/utils"

const Alert = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    variant?: "default" | "destructive" | "success"
  }
>(function Alert({ className, variant = "default", ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
        variant === "default" &&
          "bg-card text-card-foreground border-border",
        variant === "destructive" &&
          "text-destructive border-destructive/50 bg-destructive/10 [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
        variant === "success" &&
          "text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700/60 dark:bg-emerald-950/40 [&>svg]:text-current",
        className
      )}
      {...props}
    />
  )
})

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }