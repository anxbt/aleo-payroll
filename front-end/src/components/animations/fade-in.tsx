"use client"

import { ReactNode, useRef } from "react"
import { motion, useInView } from "framer-motion"

interface FadeInProps {
    children: ReactNode
    className?: string
    delay?: number
    direction?: "up" | "down" | "left" | "right" | "none"
    duration?: number
    once?: boolean
}

export function FadeIn({
    children,
    className = "",
    delay = 0,
    direction = "up",
    duration = 0.5,
    once = true,
}: FadeInProps) {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once, margin: "-50px" })

    const directionOffset = {
        up: { y: 24 },
        down: { y: -24 },
        left: { x: 24 },
        right: { x: -24 },
        none: {},
    }

    return (
        <motion.div
            ref={ref}
            initial={{
                opacity: 0,
                ...directionOffset[direction],
            }}
            animate={
                isInView
                    ? {
                        opacity: 1,
                        x: 0,
                        y: 0,
                    }
                    : {}
            }
            transition={{
                duration,
                delay,
                ease: [0.21, 0.47, 0.32, 0.98],
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
