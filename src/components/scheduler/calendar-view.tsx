
import * as React from 'react';
import type { DayData, ScheduleSettings } from '@/types/scheduler';
import DayColumn from './day-column';

interface CalendarViewProps {
  schedule: Map<string, DayData>;
  dateRange: string[]; // Array of YYYY-MM-DD strings
  settings: ScheduleSettings;
  onDropJob: (jobId: string, targetDate: string) => void;
  onJobClick: (jobId: string) => void;
  widthClass: string; // e.g., 'w-64' or 'w-40'
}

export default function CalendarView({
  schedule,
  dateRange,
  settings,
  onDropJob,
  onJobClick,
  widthClass,
}: CalendarViewProps) {
  const draggedJobId = React.useRef<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, jobId: string) => {
    draggedJobId.current = jobId;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', jobId); // Required for Firefox
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetDate: string) => {
    e.preventDefault();
    if (draggedJobId.current) {
      onDropJob(draggedJobId.current, targetDate);
      draggedJobId.current = null;
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
  };

  return (
    <div className="flex overflow-x-auto p-4 space-x-4 bg-background rounded-lg shadow scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
      {dateRange.map((dateStr) => (
        <DayColumn
          key={dateStr}
          date={dateStr}
          dayData={schedule.get(dateStr)}
          settings={settings}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onJobClick={onJobClick}
          onJobDragStart={handleDragStart}
          widthClass={widthClass}
        />
      ))}
    </div>
  );
}
