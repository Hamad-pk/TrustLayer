import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import { cn } from '../lib/cn'

export function SpotlightCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      className={cn("group relative overflow-hidden rounded-[18px] border border-[#273043]/80 bg-[#101521]", className)}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[18px] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(113,140,255,0.1),
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  )
}