import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
}

const Loader = ({ className }: LoaderProps) => (
  <span
    className={cn(
      "inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
      className
    )}
  />
);

export { Loader };
