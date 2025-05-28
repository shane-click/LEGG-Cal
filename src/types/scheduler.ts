
export interface Job {
  id: string;
  name: string;
  requiredHours: number;
  isUrgent: boolean;
  color: string; // Tailwind background color class e.g., 'bg-blue-500'
  activityType: string; // e.g., "Cut & Prep", "Fab", "Screens", "Other"
  activityOther?: string; // Details if activityType is "Other"
  quoteNumber?: string;
  scheduledSegments?: { date: string; hours: number }[];
  preferredStartDate?: string; // YYYY-MM-DD
}

export interface DailyAssignment {
  date: string; // YYYY-MM-DD
  jobId: string;
  jobName: string;
  hoursAssigned: number;
  color: string;
  isUrgent: boolean;
  activityType: string;
  activityOther?: string;
  quoteNumber?: string;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  assignments: DailyAssignment[];
  totalHoursAssigned: number;
}

export interface ScheduleSettings {
  dailyCapacityByDay: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
  };
  capacityOverrides?: { date: string; hours: number }[];
}

// For AI Optimization input
export interface AIScheduleJobInput {
  id: string;
  name: string;
  requiredHours: number;
  isUrgent: boolean;
  activityType: string;
  activityOther?: string;
  quoteNumber?: string;
  currentAssignments?: { date: string; hours: number }[]; // Optional: current state if re-optimizing
  preferredStartDate?: string;
}

export interface AIResourceInfo {
  dailyCapacityByDay: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
  };
  capacityOverrides?: { date: string; hours: number }[];
  // Could be expanded for staff/machines
  // staff: { id: string, name: string, availableHoursPerDay: { date: string, hours: number }[] }[];
  // machines: { id: string, name: string, capacityHoursPerDay: { date: string, hours: number }[] }[];
}

export interface AIScheduleDataInput {
  jobs: AIScheduleJobInput[];
  resources: AIResourceInfo;
  currentDate: string; // Planning start date YYYY-MM-DD
}

// Expected output structure from AI (adapt if AI returns something different)
export interface AIOptimizedJobOutput {
  id: string;
  name: string; // Name might not be returned by AI, can map back
  scheduledSegments: { date: string; hours: number }[];
}

export interface AIOptimizedScheduleOutput {
  jobs: AIOptimizedJobOutput[];
  // Potentially other info like utilization rates, warnings etc.
}
