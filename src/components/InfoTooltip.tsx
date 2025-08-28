'use client'

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

type Placement = 'top' | 'bottom' | 'left' | 'right'

export default function InfoTooltip({
  children,
  label = 'More info',
  placement = 'top',             // preferred placement; will auto-flip if needed
  className = '',
  triggerClassName = '',
  iconClassName = 'h-4 w-4',
}: {
  children: React.ReactNode
  label?: string
  placement?: Placement
  className?: string
  triggerClassName?: string
  iconClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [actualPlacement, setActualPlacement] = useState<Placement>(placement)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const id = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  // Close on outside click / ESC
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open || !wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  // Recompute placement when opened or window resizes
  useLayoutEffect(() => {
    if (!open) return

    const compute = () => {
      const trigger = wrapperRef.current?.getBoundingClientRect()
      const tipEl = tipRef.current
      if (!trigger || !tipEl) return

      // Make sure we have the tooltip's size (it might be transitioning)
      const tipRect = tipEl.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const gap = 8 // space between trigger and tooltip

      // Available space around trigger
      const topSpace = trigger.top
      const bottomSpace = vh - trigger.bottom
      const leftSpace = trigger.left
      const rightSpace = vw - trigger.right

      // Preferred order with auto-flip
      const order: Placement[] = (() => {
        switch (placement) {
          case 'bottom': return ['bottom', 'top', 'right', 'left']
          case 'left':   return ['left', 'right', 'top', 'bottom']
          case 'right':  return ['right', 'left', 'top', 'bottom']
          default:       return ['top', 'bottom', 'right', 'left']
        }
      })()

      let chosen: Placement = order[0]

      // Check feasibility quickly
      for (const p of order) {
        const fits =
          (p === 'top'    && topSpace    >= tipRect.height + gap) ||
          (p === 'bottom' && bottomSpace >= tipRect.height + gap) ||
          (p === 'left'   && leftSpace   >= tipRect.width  + gap) ||
          (p === 'right'  && rightSpace  >= tipRect.width  + gap)
        if (fits) { chosen = p; break }
      }

      setActualPlacement(chosen)

      // Compute nudge (offset) to keep inside viewport horizontally/vertically
      let x = 0, y = 0
      if (chosen === 'top' || chosen === 'bottom') {
        // Center horizontally over trigger; nudge within viewport
        const centerX = trigger.left + trigger.width / 2
        let tipLeft = centerX - tipRect.width / 2
        const minLeft = 8
        const maxLeft = vw - tipRect.width - 8
        if (tipLeft < minLeft) x = minLeft - tipLeft
        else if (tipLeft > maxLeft) x = maxLeft - tipLeft

        // Vertical offset: we rely on CSS positioning (top/bottom) + gap; y is 0
        y = 0
      } else {
        // Left/Right: center vertically; nudge within viewport
        const centerY = trigger.top + trigger.height / 2
        let tipTop = centerY - tipRect.height / 2
        const minTop = 8
        const maxTop = vh - tipRect.height - 8
        if (tipTop < minTop) y = minTop - tipTop
        else if (tipTop > maxTop) y = maxTop - tipTop
      }

      setOffset({ x, y })
    }

    // Measure now and on resize/scroll (e.g., layout shifts)
    compute()
    const ro = new ResizeObserver(() => compute())
    if (tipRef.current) ro.observe(tipRef.current)
    const onResize = () => compute()
    const onScroll = () => compute()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, placement, children])

  // Utility to map placement to positional classes
  const posClass =
    actualPlacement === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : actualPlacement === 'bottom'
      ? 'top-full left-1/2 -translate-x-1/2 mt-2'
      : actualPlacement === 'left'
      ? 'right-full top-1/2 -translate-y-1/2 mr-2'
      : 'left-full top-1/2 -translate-y-1/2 ml-2'

  // Caret placement
  const caretClass =
    actualPlacement === 'top'
      ? 'left-1/2 -translate-x-1/2 top-full border-t-0 border-l-0'
      : actualPlacement === 'bottom'
      ? 'left-1/2 -translate-x-1/2 bottom-full border-b-0 border-r-0'
      : actualPlacement === 'left'
      ? 'top-1/2 -translate-y-1/2 left-full border-l-0 border-b-0'
      : 'top-1/2 -translate-y-1/2 right-full border-r-0 border-t-0'

  return (
    <div ref={wrapperRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`inline-flex items-center justify-center rounded-full text-slate-300 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${triggerClassName}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className={iconClassName}>
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16Zm-.75-9.75a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5ZM10 6.5a1 1 0 100-2 1 1 0 000 2Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Tooltip */}
      <div
        id={id}
        ref={tipRef}
        role="tooltip"
        className={`absolute z-50 min-w-[16rem] whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-xl transition-opacity duration-150 ${posClass} ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {children}
        <span
          className={`absolute block h-2 w-2 rotate-45 border border-slate-700 bg-slate-900/95 ${caretClass}`}
        />
      </div>
    </div>
  )
}