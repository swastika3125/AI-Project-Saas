"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Info, AlertTriangle, ShieldCheck } from "lucide-react";

interface RiskGaugeProps {
  score: number;
  uncertainty: number;
  size?: number;
  showDetails?: boolean;
}

export function RiskGauge({ score, uncertainty, size = 180, showDetails = true }: RiskGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);

  // Animated count-up
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = score / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(start * 10) / 10);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  // SVG calculations for radial circular meter
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Sweep arc: 260 degrees
  const arcLength = circumference * 0.75;
  const progressOffset = arcLength - (score / 100) * arcLength;

  // Determine stroke color
  const getColor = (val: number) => {
    if (val >= 75) return "#EF4444"; // Critical Red
    if (val >= 50) return "#F97316"; // High Orange
    if (val >= 30) return "#F59E0B"; // Medium Amber
    return "#10B981"; // Safe Green
  };

  const currentColor = getColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-135">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            className="text-border/40"
          />

          {/* Uncertainty Range Band (Subtle translucent halo behind current score) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={currentColor}
            strokeOpacity={0.2}
            strokeWidth={strokeWidth + 6}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={Math.max(0, progressOffset - ((uncertainty * 2) / 100) * arcLength)}
            strokeLinecap="round"
          />

          {/* Animated Active Score Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={currentColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: progressOffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>

        {/* Inner Score Badge */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2">
          <div className="flex items-baseline">
            <span className="text-4xl font-extrabold tracking-tight font-mono" style={{ color: currentColor }}>
              {displayScore.toFixed(0)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground ml-1">/100</span>
          </div>

          <div className="flex items-center gap-1 mt-0.5 text-xs font-mono text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full border border-border/50">
            <span>± {uncertainty.toFixed(1)}</span>
            <span className="text-[10px] opacity-75">range</span>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground group relative cursor-help">
            <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
            <span className="underline decoration-dotted underline-offset-4">Prioritization aid, not proof of safety</span>

            {/* Hover Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-2.5 rounded-lg bg-popover border border-border text-[11px] leading-relaxed text-popover-foreground shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 glass-panel">
              <p className="font-semibold text-foreground mb-1">Product Principle:</p>
              Risk scores guide review prioritization and automated gating thresholds. A low score indicates lack of detected signals, never guaranteed absence of defects.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
