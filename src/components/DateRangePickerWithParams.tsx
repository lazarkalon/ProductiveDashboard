'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useMemo } from 'react'
import { DateRangePicker, DateRangePickerValue } from '@tremor/react'
import dayjs from 'dayjs'

export interface DateRangePickerWithParamsProps {
  startDateParamName?: string
  endDateParamName?: string
}

function toLocalNoon(ymd?: string | null) {
  if (!ymd) return undefined
  const [y, m, d] = ymd.split('-').map(Number)
  // Construct at LOCAL time (no “Z”), anchored at noon to avoid DST/offset
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0)
}

function formatYmd(dt?: Date | null) {
  return dt ? dayjs(dt).format('YYYY-MM-DD') : ''
}

const DateRangePickerWithParams: React.FC<DateRangePickerWithParamsProps> = ({
  startDateParamName = 'start_date',
  endDateParamName = 'end_date',
}) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const startParam = searchParams.get(startDateParamName)
  const endParam = searchParams.get(endDateParamName)

  // Always derive the picker value from the URL so it stays in sync
  const value: DateRangePickerValue = useMemo(
    () => ({
      from: toLocalNoon(startParam) ?? new Date(), // fallback: today
      to:   toLocalNoon(endParam)   ?? new Date(),
    }),
    [startParam, endParam],
  )

  const handleDateRangeValueChange = (next: DateRangePickerValue) => {
    const params = new URLSearchParams(searchParams.toString())
    const { from, to } = next

    // Write date-only strings (no ISO/UTC!)
    if (from) params.set(startDateParamName, formatYmd(from))
    else params.delete(startDateParamName)

    if (to) params.set(endDateParamName, formatYmd(to))
    else params.delete(endDateParamName)

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <DateRangePicker
      className="max-w-full sm:max-w-md [&>*]:ring-0"
      value={value}
      onValueChange={handleDateRangeValueChange}
      enableSelect={false}
    />
  )
}

export default DateRangePickerWithParams