import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

function Spinner({ className, ...props }: Omit<HugeiconsIconProps, "icon">) {
	return (
		<HugeiconsIcon
			icon={Loading03Icon}
			role="status"
			aria-label="Loading"
			className={cn("size-4 animate-spin", className)}
			{...props}
		/>
	);
}

export { Spinner };
