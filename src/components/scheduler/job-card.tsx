
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
        "mb-2 shadow-md hover:shadow-lg transition-shadow",
        assignment.color,
        onDragStart ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      )}
    >
      <CardHeader className="p-2 pb-1">
        <CardTitle className="text-sm font-medium text-primary-foreground truncate">
          {assignment.jobName}
        </CardTitle>
        <div className="flex flex-col gap-0.5">
            {assignment.isUrgent && (
              <CardDescription className="text-xs text-primary-foreground/80 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Urgent
              </CardDescription>
            )}
            {assignment.quoteNumber && (
              <CardDescription className="text-xs text-primary-foreground/80 flex items-center gap-1 truncate">
                <FileText className="h-3 w-3" /> {assignment.quoteNumber}
              </CardDescription>
            )}
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 space-y-1">
        <div className="text-xs text-primary-foreground/90 flex items-center gap-1 truncate">
          <ClipboardList className="h-3 w-3 flex-shrink-0" /> {activityDisplay}
        </div>
        <div className="text-xs text-primary-foreground/90 flex items-center gap-1">
          <Clock className="h-3 w-3" /> {assignment.hoursAssigned} hrs
        </div>
      </CardContent>
    </Card>
  );
}
