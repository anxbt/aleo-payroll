import * as React from "react"
import { cn } from "@/lib/utils"

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    status: "success" | "pending" | "error" | "neutral"
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
    ({ className, status, children, ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    {
                        "bg-green-900/30 text-green-400 border border-green-800": status === "success",
                        "bg-yellow-900/30 text-yellow-400 border border-yellow-800": status === "pending",
                        "bg-red-900/30 text-red-400 border border-red-800": status === "error",
                        "bg-surface-hover text-text-secondary border border-border": status === "neutral",
                    },
                    className
                )}
                {...props}
            >
                {children}
            </span>
        )
    }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge }
