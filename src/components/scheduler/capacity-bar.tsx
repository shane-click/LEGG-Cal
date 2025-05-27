import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CapacityBarProps {
  bookedHours: number;
  totalCapacityHours: number;
}

export default function CapacityBar({ bookedHours, totalCapacityHours }: CapacityBarProps) {
  const utilization = totalCapacityHours > 0 ? (bookedHours / totalCapacityHours) * 100 : 0;
  const isOverCapacity = bookedHours > totalCapacityHours;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className={cn("font-medium", isOverCapacity ? "text-destructive" : "text-muted-foreground")}>
          {bookedHours.toFixed(1)}h / {totalCapacityHours}h
        </span>
        <span className={cn(isOverCapacity ? "text-destructive font-semibold" : "text-foreground")}>
          {utilization.toFixed(0)}%
          {isOverCapacity && " (Over!)"}
        </span>
      </div>
      <Progress 
        value={Math.min(utilization, 100)} 
        className={cn("h-2", isOverCapacity ? "[&>div]:bg-destructive" : "")} 
        aria-label={`Capacity utilization: ${bookedHours} of ${totalCapacityHours} hours booked`}
      />
    </div>
  );
}
