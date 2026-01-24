import { cn } from "@/lib/utils"

type CalendarColumnProps = {
    dayDate: Date
    hours: number[]
    sessions: any[]
    instances: any[]
    getColor: (s: string) => string
    getSessionStyle: (start: string, end: string) => { top: string; height: string }
    hourHeight?: number
    onSelectSession: (session: any, date: Date) => void
}

export function CalendarColumn({
    dayDate,
    hours,
    sessions,
    instances,
    getColor,
    getSessionStyle,
    onSelectSession,
}: CalendarColumnProps) {

    // 1. Collect all valid events for this day (recurring + instances)
    const daySessions = sessions
        .filter(s => {
            const jsDay = dayDate.getDay()
            const backendDay = (jsDay + 6) % 7
            return s.day_of_week === backendDay
        })
        .filter(session => {
            const dateStr = dayDate.toISOString().split('T')[0]
            const instance = instances.find(i =>
                i.class_session === session.id &&
                i.original_date === dateStr
            )
            if (instance && (instance.is_cancelled || instance.is_rescheduled)) return false
            return true
        })
        .map(s => ({ ...s, type: 'recurring' }))

    const dayInstances = instances
        .filter(instance =>
            instance.is_rescheduled &&
            instance.new_date === dayDate.toISOString().split('T')[0]
        )
        .map(i => ({ ...i, type: 'instance' }))

    const allEvents = [
        ...daySessions.map(s => ({
            ...s,
            start: s.start_time,
            end: s.end_time,
            original: s,
        })),
        ...dayInstances.map(i => ({
            ...i,
            start: i.new_start_time,
            end: i.new_end_time,
            original: i,
        })),
    ]

    // 3. Sort
    allEvents.sort((a, b) => {
        if (a.start === b.start) {
            const durA =
                parseInt(a.end.split(':')[0]) * 60 +
                parseInt(a.end.split(':')[1]) -
                (parseInt(a.start.split(':')[0]) * 60 +
                    parseInt(a.start.split(':')[1]))
            const durB =
                parseInt(b.end.split(':')[0]) * 60 +
                parseInt(b.end.split(':')[1]) -
                (parseInt(b.start.split(':')[0]) * 60 +
                    parseInt(b.start.split(':')[1]))
            return durB - durA
        }
        return a.start.localeCompare(b.start)
    })

    // 4. Layout (UNCHANGED)
    const eventsWithLayout = allEvents.map((event, index, array) => {
        const eventStart =
            parseInt(event.start.split(':')[0]) * 60 +
            parseInt(event.start.split(':')[1])
        const eventEnd =
            parseInt(event.end.split(':')[0]) * 60 +
            parseInt(event.end.split(':')[1])

        const overlapping = array.filter((other, otherIdx) => {
            if (index === otherIdx) return false
            const otherStart =
                parseInt(other.start.split(':')[0]) * 60 +
                parseInt(other.start.split(':')[1])
            const otherEnd =
                parseInt(other.end.split(':')[0]) * 60 +
                parseInt(other.end.split(':')[1])
            return eventStart < otherEnd && eventEnd > otherStart
        })

        const totalOverlaps = overlapping.length + 1

        const group = [event, ...overlapping].sort((a, b) => {
            if (a.start === b.start)
                return (a.original.id || 0) - (b.original.id || 0)
            return a.start.localeCompare(b.start)
        })

        const myIndexInGroup = group.findIndex(e => e === event)

        const width = 100 / totalOverlaps
        const left = myIndexInGroup * width

        return { ...event, style: { width: `${width}%`, left: `${left}%` } }
    })

    return (
        <div className="flex-1 border-r relative" style={{ minHeight: '1040px' }}>
            {/* Grid lines */}
            {hours.map(hour => (
                <div key={hour} style={{ height: '80px' }} className="border-b" />
            ))}

            {eventsWithLayout.map(event => {
                const isInstance = event.type === 'instance'
                const data = event.original

                const displayText = isInstance
                    ? data.class_session_details?.course_name
                    : data.course_name

                const displayTeacher = isInstance ? "" : data.teacher_name
                const displayRoom = isInstance ? "" : data.room_name

                return (
                    <div
                        key={`${event.type}-${data.id}`}
                        className={cn(
                            "absolute rounded-md p-1.5 text-xs border-2 overflow-hidden hover:z-30 hover:shadow-xl transition-all cursor-pointer group",
                            getColor(displayText || "Event")
                        )}
                        style={{
                            ...getSessionStyle(event.start, event.end),
                            width: event.style.width,
                            left: event.style.left,
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            onSelectSession(data, dayDate)
                        }}
                    >
                        <div className="font-bold truncate leading-tight text-[11px]">
                            {displayText}
                            {isInstance && <span className="opacity-70"> (Mod)</span>}
                        </div>

                        {!isInstance && (
                            <>
                                <div className="truncate opacity-90 text-[9px] mt-0.5">
                                    {displayTeacher}
                                </div>
                                <div className="truncate opacity-75 text-[9px]">
                                    {displayRoom}
                                </div>
                            </>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
