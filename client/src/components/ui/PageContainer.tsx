import { cn } from "@/lib/utils";

export interface PageContainerProps extends React.ComponentProps<"div"> {
  /** Render as a different element (e.g. "main", "section"). */
  as?: React.ElementType;
}

/**
 * Standard page width wrapper: centered, max-w-7xl, responsive gutters.
 */
export function PageContainer({
  as: Comp = "div",
  className,
  ...props
}: PageContainerProps) {
  return (
    <Comp
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
