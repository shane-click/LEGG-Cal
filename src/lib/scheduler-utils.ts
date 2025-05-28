
import type { Job, ScheduleSettings, DayData, DailyAssignment, AIScheduleJobInput, AIResourceInfo, AIScheduleDataInput } from '@/types/scheduler';
import { format, addDays, eachDayOfInterval, parseISO, isValid, isWeekend, nextMonday, getDay, subDays, addYears, startOfMonth } from 'date-fns';

export const DATE_FORMAT = 'yyyy-MM-dd';

export function generateDateRange(startDate: Date, numDaysInPeriod: number): string[] {
  if (!isValid(startDate)) {
    console.error("Invalid start date for range generation:", startDate);
    // Default to today, ensuring it's a weekday
    const today = new Date();
    const effectiveStartDate = isWeekend(today) ? nextMonday(today) : today;
    const endDate = addDays(effectiveStartDate, numDaysInPeriod - 1);
    return eachDayOfInterval({ start: effectiveStartDate, end: endDate })
      .filter(date => !isWeekend(date))
      .map(date => format(date, DATE_FORMAT));
  }

  let effectiveStartDate = startDate;
  // If the provided startDate for generating the period is a weekend,
  // we want the period to effectively start from the next Monday for display consistency.
  if (isWeekend(effectiveStartDate)) {
    effectiveStartDate = nextMonday(effectiveStartDate);
  }

  const endDate = addDays(effectiveStartDate, numDaysInPeriod - 1);
  return eachDayOfInterval({ start: effectiveStartDate, end: endDate })
    .filter(date => !isWeekend(date))
    .map(date => format(date, DATE_FORMAT));
}

export function allocateJobs(
  jobsToAllocate: Job[],
  settings: ScheduleSettings,
  planningStartDateString: string // Ensure this is a weekday string from the caller
): { allocatedSchedule: Map<string, DayData>, updatedJobs: Job[] } {
  const allocatedSchedule = new Map<string, DayData>();
  const updatedJobs: Job[] = JSON.parse(JSON.stringify(jobsToAllocate)); // Deep copy

  // Ensure planningStartDate is a valid weekday
  let planningStartDate = parseISO(planningStartDateString);
  if (!isValid(planningStartDate) || isWeekend(planningStartDate)) {
      // Fallback or adjust if somehow a weekend is passed, though page.tsx should prevent this
      planningStartDate = nextMonday(isValid(planningStartDate) ? planningStartDate : new Date());
  }


  updatedJobs.sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    
    let dateA = a.preferredStartDate ? parseISO(a.preferredStartDate) : null;
    if (dateA && isWeekend(dateA)) dateA = nextMonday(dateA);
    
    let dateB = b.preferredStartDate ? parseISO(b.preferredStartDate) : null;
    if (dateB && isWeekend(dateB)) dateB = nextMonday(dateB);

    if (dateA && dateB) {
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
    } else if (dateA) {
      return -1; // Jobs with preferred dates come first
    } else if (dateB) {
      return 1;
    }
    return a.id.localeCompare(b.id); // Fallback sort
  });

  for (const job of updatedJobs) {
    job.scheduledSegments = [];
    let remainingHours = job.requiredHours;
    
    let jobStartDate = planningStartDate; // Default to overall planning start
    if (job.preferredStartDate) {
        let preferred = parseISO(job.preferredStartDate);
        if (isValid(preferred)) {
            jobStartDate = preferred > planningStartDate ? preferred : planningStartDate;
        }
    }
    
    // Ensure job allocation starts on a weekday
    let currentDate = isWeekend(jobStartDate) ? nextMonday(jobStartDate) : jobStartDate;


    let safetyCounter = 0; // Prevent infinite loops
    const maxSchedulingDays = 365 * 2; // Schedule out for a max of 2 years of weekdays

    while (remainingHours > 0 && safetyCounter < maxSchedulingDays) {
      safetyCounter++;
      // Ensure current allocation day is a weekday
      while (isWeekend(currentDate)) {
        currentDate = addDays(currentDate, 1);
      }
      
      const dateStr = format(currentDate, DATE_FORMAT);
      const dayCapacity = settings.capacityOverrides?.find(o => o.date === dateStr)?.hours ?? settings.dailyCapacityHours;
      
      let dayData = allocatedSchedule.get(dateStr);
      if (!dayData) {
        dayData = { date: dateStr, assignments: [], totalHoursAssigned: 0 };
      }

      const availableToday = Math.max(0, dayCapacity - dayData.totalHoursAssigned);
      const allocateNow = Math.min(remainingHours, availableToday);

      if (allocateNow > 0) {
        job.scheduledSegments.push({ date: dateStr, hours: allocateNow });
        
        const assignment: DailyAssignment = {
          date: dateStr,
          jobId: job.id,
          jobName: job.name,
          hoursAssigned: allocateNow,
          color: job.color,
          isUrgent: job.isUrgent,
          activityType: job.activityType,
          activityOther: job.activityOther,
          quoteNumber: job.quoteNumber,
        };
        dayData.assignments.push(assignment);
        dayData.totalHoursAssigned += allocateNow;
        remainingHours -= allocateNow;
        allocatedSchedule.set(dateStr, dayData);
      }
      
      if (remainingHours > 0) {
        currentDate = addDays(currentDate, 1); // Move to next calendar day; loop top will skip if it's a weekend
      } else {
        break; 
      }
      
      if (safetyCounter >= maxSchedulingDays && remainingHours > 0) {
        console.warn(`Job ${job.id} (${job.name}) could not be fully scheduled (${remainingHours}h remaining) within ${maxSchedulingDays} weekdays due to capacity limits or excessive duration.`);
        break;
      }
    }
  }
  return { allocatedSchedule, updatedJobs };
}

export function prepareDataForAI(jobs: Job[], settings: ScheduleSettings, currentDate: string): AIScheduleDataInput {
  const aiJobs: AIScheduleJobInput[] = jobs.map(job => ({
    id: job.id,
    name: job.name,
    requiredHours: job.requiredHours,
    isUrgent: job.isUrgent,
    activityType: job.activityType,
    activityOther: job.activityOther,
    quoteNumber: job.quoteNumber,
    currentAssignments: job.scheduledSegments,
    // Ensure preferredStartDate sent to AI is a weekday if set
    preferredStartDate: job.preferredStartDate ? 
      (isWeekend(parseISO(job.preferredStartDate)) ? format(nextMonday(parseISO(job.preferredStartDate)), DATE_FORMAT) : job.preferredStartDate)
      : undefined,
  }));

  const aiResources: AIResourceInfo = {
    dailyCapacityHours: settings.dailyCapacityHours,
    capacityOverrides: settings.capacityOverrides?.filter(override => !isWeekend(parseISO(override.date))), // Send only weekday overrides
  };

  return {
    jobs: aiJobs,
    resources: aiResources,
    currentDate: currentDate, // This should be a weekday from page.tsx
  };
}

export const JOB_COLORS = [
  'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-lime-500', 'bg-fuchsia-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
];

export function getNextJobColor(currentIndex: number): string {
  return JOB_COLORS[currentIndex % JOB_COLORS.length];
}
