import type { DayData, ScheduleSettings } from '@/types/scheduler';
import JobCard from './job-card';
import CapacityBar from './capacity-bar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface DayColumnProps {
  dayData?: DayData; // Undefined if no jobs on this day but still in range
  date: string; // YYYY-MM-DD
  settings: ScheduleSettings;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetDate: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onJobClick: (jobId: string) => void;
  onJobDragStart: (e: React.DragEvent<HTMLDivElement>, jobId: string) => void;
}

export default function DayColumn({ 
  dayData, 
  date, 
  settings, 
  onDrop, 
  onDragOver, 
  onJobClick,
  onJobDragStart
}: DayColumnProps) {
  const displayDate = parseISO(date);
  const dayCapacity = settings.capacityOverrides?.find(o => o.date === date)?.hours || settings.dailyCapacityHours;
  const bookedHours = dayData?.totalHoursAssigned || 0;
  
  const isToday = format(new Date(), 'yyyy-MM-dd') === date;

  return (
    <div
      className={cn(
        "flex-none w-64 min-h-[400px] p-3 border-r border-border bg-card rounded-lg shadow-sm",
        isToday ? "bg-primary/5 border-primary/20" : "bg-card"
      )}
      onDrop={(e) => onDrop(e, date)}
      onDragOver={onDragOver}
      aria-label={`Schedule for ${format(displayDate, 'EEEE, MMM d')}`}
    >
      <div className="flex flex-col h-full">
        <div className="mb-3">
          <h3 className={cn("font-semibold text-lg", isToday ? "text-primary" : "text-foreground")}>
            {format(displayDate, 'EEE, MMM d')}
          </h3>
          <CapacityBar bookedHours={bookedHours} totalCapacityHours={dayCapacity} />
        </div>
        <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
          {dayData?.assignments && dayData.assignments.length > 0 ? (
            dayData.assignments.map((assignment) => (
              <JobCard
                key={`${assignment.jobId}-${assignment.date}`}
                assignment={assignment}
                onDragStart={(e) => onJobDragStart(e, assignment.jobId)}
                onClick={() => onJobClick(assignment.jobId)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center pt-4">No jobs scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
}
