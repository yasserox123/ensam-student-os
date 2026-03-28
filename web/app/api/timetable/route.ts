import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Get current week's slots
    const today = new Date()
    const startOfWeek = new Date(today)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const slots = await prisma.timetableSlot.findMany({
      where: {
        userId,
        date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      orderBy: [{ date: 'asc' }, { start: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      slots,
      weekStart: startOfWeek.toISOString().split('T')[0],
    })
  } catch (err) {
    console.error('[API] Failed to fetch timetable:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timetable' },
      { status: 500 }
    )
  }
}
