"use client";

import AnimatedRays from "@/components/ui/animated-rays";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AnimatedRays>{children}</AnimatedRays>;
}
