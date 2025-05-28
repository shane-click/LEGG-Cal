
import type { Job, ScheduleSettings, DayData, DailyAssignment, AIScheduleJobInput, AIResourceInfo, AIScheduleDataInput } from '@/types/scheduler';
import { format, addDays, eachDayOfInterval, parseISO, isValid, isWeekend, nextMonday, getDay, subDays, addYears, startOfMonth } from 'date-fns';

export const DATE_FORMAT = 'yyyy-MM-dd';

// Helper to get the capacity for a given date string, considering overrides and weekday defaults
function getCapacityForDate(dateStr: string, settings: ScheduleSettings): number {
  const override = settings.capacityOverrides?.find(o => o.date === dateStr);
  if (override) {
    return override.hours;
  }
  const dateObj = parseISO(dateStr);
  if (!isValid(dateObj) || isWeekend(dateObj)) {
    return 0; // No capacity for invalid dates or weekends
  }
  const dayIndex = getDay(dateObj); // Sunday = 0, Monday = 1, ..., Friday = 5, Saturday = 6
  switch (dayIndex) {
    case 1: return settings.dailyCapacityByDay.monday;
    case 2: return settings.dailyCapacityByDay.tuesday;
    case 3: return settings.dailyCapacityByDay.wednesday;
    case 4: return settings.dailyCapacityByDay.thursday;
    case 5: return settings.dailyCapacityByDay.friday;
    default: return 0; // Should not happen for weekdays
  }
}


export function generateDateRange(startDate: Date, numDaysInPeriod: number): string[] {
  if (!isValid(startDate)) {
    console.error("Invalid start date for range generation:", startDate);
    const today = new Date();
    const effectiveStartDate = isWeekend(today) ? nextMonday(today) : today;
    const endDate = addDays(effectiveStartDate, numDaysInPeriod - 1);
    return eachDayOfInterval({ start: effectiveStartDate, end: endDate })
      .filter(date => !isWeekend(date))
      .map(date => format(date, DATE_FORMAT));
  }

  let effectiveStartDate = startDate;
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
  planningStartDateString: string
): { allocatedSchedule: Map<string, DayData>, updatedJobs: Job[] } {
  const allocatedSchedule = new Map<string, DayData>();
  const updatedJobs: Job[] = JSON.parse(JSON.stringify(jobsToAllocate));

  let planningStartDate = parseISO(planningStartDateString);
  if (!isValid(planningStartDate) || isWeekend(planningStartDate)) {
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
      return -1;
    } else if (dateB) {
      return 1;
    }
    return a.id.localeCompare(b.id);
  });

  for (const job of updatedJobs) {
    job.scheduledSegments = [];
    let remainingHours = job.requiredHours;

    let jobStartDate = planningStartDate;
    if (job.preferredStartDate) {
        let preferred = parseISO(job.preferredStartDate);
        if (isValid(preferred)) {
            jobStartDate = preferred > planningStartDate ? preferred : planningStartDate;
        }
    }

    let currentDate = isWeekend(jobStartDate) ? nextMonday(jobStartDate) : jobStartDate;

    let safetyCounter = 0;
    const maxSchedulingDays = 365 * 2;

    while (remainingHours > 0 && safetyCounter < maxSchedulingDays) {
      safetyCounter++;

      while (isWeekend(currentDate)) {
        currentDate = addDays(currentDate, 1);
      }

      const dateStr = format(currentDate, DATE_FORMAT);
      const dayCapacity = getCapacityForDate(dateStr, settings);

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
        currentDate = addDays(currentDate, 1);
      } else {
        break;
      }

      if (safetyCounter >= maxSchedulingDays && remainingHours > 0) {
        console.warn(`Job ${job.id} (${job.name}) could not be fully scheduled (${remainingHours}h remaining) within ${maxSchedulingDays} weekdays.`);
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
    preferredStartDate: job.preferredStartDate ?
      (isWeekend(parseISO(job.preferredStartDate)) ? format(nextMonday(parseISO(job.preferredStartDate)), DATE_FORMAT) : job.preferredStartDate)
      : undefined,
  }));

  const aiResources: AIResourceInfo = {
    dailyCapacityByDay: settings.dailyCapacityByDay,
    capacityOverrides: settings.capacityOverrides?.filter(override => !isWeekend(parseISO(override.date))),
  };

  return {
    jobs: aiJobs,
    resources: aiResources,
    currentDate: currentDate,
  };
}

export const JOB_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-400', // Lighter yellow/amber for better contrast if text becomes dark
  'bg-lime-400',   // Lighter lime for better contrast
  'bg-green-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
];

export function getNextJobColor(currentIndex: number): string {
  return JOB_COLORS[currentIndex % JOB_COLORS.length];
}
