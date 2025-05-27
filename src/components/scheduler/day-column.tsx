
import type { DayData, ScheduleSettings } from '@/types/scheduler';
import JobCard from './job-card';
import CapacityBar from './capacity-bar';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react'; // Added useEffect and useState

interface DayColumnProps {
  dayData?: DayData; 
  date: string; 
  settings: ScheduleSettings;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetDate: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onJobClick: (jobId: string) => void;
  onJobDragStart: (e: React.DragEvent<HTMLDivElement>, jobId: string) => void;
  widthClass: string; 
}

export default function DayColumn({ 
  dayData, 
  date, 
  settings, 
  onDrop, 
  onDragOver, 
  onJobClick,
  onJobDragStart,
  widthClass,
}: DayColumnProps) {
  const [isClientToday, setIsClientToday] = useState(false);
  const [parsedDisplayDate, setParsedDisplayDate] = useState<Date | null>(null);

  useEffect(() => {
    if (date && isValid(parseISO(date))) {
      setParsedDisplayDate(parseISO(date));
      // This calculation now only runs on the client after mount
      setIsClientToday(format(new Date(), 'yyyy-MM-dd') === date);
    } else {
      // Handle invalid or missing date prop if necessary, though parent should ensure valid dates
      setParsedDisplayDate(null); 
      setIsClientToday(false);
    }
  }, [date]);

  if (!parsedDisplayDate) {
    // Render a placeholder or basic skeleton for the column while date is parsing or if date is invalid
    return (
      <div 
        className={cn(
          "flex-none min-h-[400px] p-3 border-r border-border bg-card rounded-lg shadow-sm",
          widthClass
        )}
        aria-label="Loading day"
      >
        <div className="animate-pulse h-full">
          <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-muted rounded w-full mb-4"></div>
          <div className="space-y-2 mt-2">
            <div className="h-16 bg-muted/50 rounded"></div>
            <div className="h-10 bg-muted/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const displayDate = parsedDisplayDate; // Use the state variable
  const dayCapacity = settings.capacityOverrides?.find(o => o.date === date)?.hours || settings.dailyCapacityHours;
  const bookedHours = dayData?.totalHoursAssigned || 0;
  
  return (
    <div
      className={cn(
        "flex-none min-h-[400px] p-3 border-r border-border rounded-lg shadow-sm",
        widthClass, 
        isClientToday ? "bg-primary/5 border-primary/20" : "bg-card" // Use isClientToday
      )}
      onDrop={(e) => onDrop(e, date)}
      onDragOver={onDragOver}
      aria-label={`Schedule for ${format(displayDate, 'EEEE, MMM d')}`}
    >
      <div className="flex flex-col h-full">
        <div className="mb-3">
          <h3 className={cn("font-semibold text-lg truncate", isClientToday ? "text-primary" : "text-foreground")}> {/* Use isClientToday */}
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
