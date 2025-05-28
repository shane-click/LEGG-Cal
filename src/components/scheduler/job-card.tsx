
import type { DailyAssignment } from '@/types/scheduler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, FileText, ClipboardList } from 'lucide-react';

interface JobCardProps {
  assignment: DailyAssignment;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, jobId: string) => void;
  onClick?: () => void;
}

export default function JobCard({ assignment, onDragStart, onClick }: JobCardProps) {
  const activityDisplay = assignment.activityType === 'Other' && assignment.activityOther
    ? `Other: ${assignment.activityOther}`
    : assignment.activityType;

  return (
    <Card
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, assignment.jobId)}
      onClick={onClick}
      className={cn(
        "mb-2 shadow-md hover:shadow-lg transition-shadow text-primary-foreground", // Base text color for the card
        assignment.color, // This applies the background color like 'bg-red-500'
        onDragStart ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      )}
    >
      <CardHeader className="p-2 pb-1">
        <CardTitle className="text-sm font-medium truncate text-primary-foreground"> {/* Title text color */}
          {assignment.jobName}
        </CardTitle>
        <div className="flex flex-col gap-0.5">
            {assignment.isUrgent && (
              <CardDescription className="text-xs flex items-center gap-1 text-primary-foreground/80"> {/* Lighter text for description */}
                <AlertTriangle className="h-3 w-3" /> Urgent
              </CardDescription>
            )}
            {assignment.quoteNumber && (
              <CardDescription className="text-xs flex items-center gap-1 truncate text-primary-foreground/80"> {/* Lighter text */}
                <FileText className="h-3 w-3" /> {assignment.quoteNumber}
              </CardDescription>
            )}
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 space-y-1">
        <div className="text-xs flex items-center gap-1 truncate text-primary-foreground/90"> {/* Slightly less light text for details */}
          <ClipboardList className="h-3 w-3 flex-shrink-0" /> {activityDisplay}
        </div>
        <div className="text-xs flex items-center gap-1 text-primary-foreground/90"> {/* Slightly less light text */}
          <Clock className="h-3 w-3" /> {assignment.hoursAssigned} hrs
        </div>
      </CardContent>
    </Card>
  );
}
