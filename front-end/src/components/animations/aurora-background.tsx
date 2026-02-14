"use client"

import { cn } from "@/lib/utils"

interface AuroraBackgroundProps {
    className?: string
    children?: React.ReactNode
}

export function AuroraBackground({ className, children }: AuroraBackgroundProps) {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute -inset-[10px] opacity-50"
                    style={{
                        background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.3), transparent),
              radial-gradient(ellipse 60% 40% at 80% 50%, rgba(16, 185, 129, 0.15), transparent),
              radial-gradient(ellipse 50% 30% at 20% 80%, rgba(16, 185, 129, 0.1), transparent)
            `,
                    }}
                />
                <div
                    className="absolute inset-0 animate-pulse"
                    style={{
                        animationDuration: "8s",
                        background: `
              radial-gradient(ellipse 40% 40% at 60% 40%, rgba(16, 185, 129, 0.1), transparent)
            `,
                    }}
                />
            </div>
            <div className="relative">{children}</div>
        </div>
    )
}
