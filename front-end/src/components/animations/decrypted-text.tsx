"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"

interface DecryptedTextProps {
    text: string
    speed?: number
    className?: string
    revealDirection?: "start" | "end" | "center"
    characters?: string
}

export function DecryptedText({
    text,
    speed = 50,
    className = "",
    revealDirection = "start",
    characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*",
}: DecryptedTextProps) {
    const [displayText, setDisplayText] = useState("")
    const [isAnimating, setIsAnimating] = useState(true)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        let iteration = 0
        const targetText = text

        setIsAnimating(true)

        intervalRef.current = setInterval(() => {
            setDisplayText(() => {
                return targetText
                    .split("")
                    .map((char, index) => {
                        if (char === " ") return " "

                        let revealIndex: number
                        if (revealDirection === "start") {
                            revealIndex = index
                        } else if (revealDirection === "end") {
                            revealIndex = targetText.length - 1 - index
                        } else {
                            const center = Math.floor(targetText.length / 2)
                            revealIndex = Math.abs(center - index)
                        }

                        if (revealIndex < iteration) {
                            return char
                        }

                        return characters[Math.floor(Math.random() * characters.length)]
                    })
                    .join("")
            })

            iteration += 1 / 3

            if (iteration >= targetText.length) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                }
                setDisplayText(targetText)
                setIsAnimating(false)
            }
        }, speed)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [text, speed, revealDirection, characters])

    return (
        <motion.span
            className={className}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {displayText}
        </motion.span>
    )
}
