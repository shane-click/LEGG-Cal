import type { DailyAssignment } from '@/types/scheduler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';

interface JobCardProps {
  assignment: DailyAssignment;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, jobId: string) => void;
  onClick?: () => void;
}

export default function JobCard({ assignment, onDragStart, onClick }: JobCardProps) {
  return (
    <Card
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, assignment.jobId)}
      onClick={onClick}
      className={cn(
        "mb-2 cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow",
        assignment.color,
        onDragStart ? "cursor-grab" : "cursor-pointer"
      )}
    >
      <CardHeader className="p-2">
        <CardTitle className="text-sm font-medium text-primary-foreground truncate">
          {assignment.jobName}
        </CardTitle>
        {assignment.isUrgent && (
          <CardDescription className="text-xs text-primary-foreground/80 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Urgent
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className="text-xs text-primary-foreground/90 flex items-center gap-1">
          <Clock className="h-3 w-3" /> {assignment.hoursAssigned} hrs
        </div>
      </CardContent>
    </Card>
  );
}
