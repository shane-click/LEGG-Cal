
import type { Job, ScheduleSettings, DayData, DailyAssignment, AIScheduleJobInput, AIResourceInfo, AIScheduleDataInput } from '@/types/scheduler';
import { format, addDays, eachDayOfInterval, parseISO, isValid } from 'date-fns';

export const DATE_FORMAT = 'yyyy-MM-dd';

export function generateDateRange(startDate: Date, numDays: number): string[] {
  if (!isValid(startDate)) {
    console.error("Invalid start date for range generation:", startDate);
    const today = new Date();
    return eachDayOfInterval({
      start: today,
      end: addDays(today, numDays - 1),
    }).map(date => format(date, DATE_FORMAT));
  }
  const endDate = addDays(startDate, numDays - 1);
  return eachDayOfInterval({ start: startDate, end: endDate }).map(date => format(date, DATE_FORMAT));
}

export function allocateJobs(
  jobsToAllocate: Job[],
  settings: ScheduleSettings,
  planningStartDate: string
): { allocatedSchedule: Map<string, DayData>, updatedJobs: Job[] } {
  const allocatedSchedule = new Map<string, DayData>();
  const updatedJobs: Job[] = JSON.parse(JSON.stringify(jobsToAllocate)); // Deep copy

  updatedJobs.sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    const dateA = a.preferredStartDate ? parseISO(a.preferredStartDate) : null;
    const dateB = b.preferredStartDate ? parseISO(b.preferredStartDate) : null;
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
    let currentDate = parseISO(job.preferredStartDate || planningStartDate);
    if (!isValid(currentDate) || currentDate < parseISO(planningStartDate)) {
      currentDate = parseISO(planningStartDate);
    }

    while (remainingHours > 0) {
      const dateStr = format(currentDate, DATE_FORMAT);
      const dayCapacity = settings.capacityOverrides?.find(o => o.date === dateStr)?.hours || settings.dailyCapacityHours;
      
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
      
      if (remainingHours > 0 && availableToday === 0) {
        currentDate = addDays(currentDate, 1);
      } else if (remainingHours <=0) {
        break;
      } else {
        if (allocateNow < remainingHours && availableToday > 0) {
            currentDate = addDays(currentDate, 1);
        }
      }
      if (currentDate > addDays(parseISO(planningStartDate), 3650)) {
        console.warn(`Job ${job.id} could not be fully scheduled due to capacity limits or excessive duration.`);
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
    preferredStartDate: job.preferredStartDate,
  }));

  const aiResources: AIResourceInfo = {
    dailyCapacityHours: settings.dailyCapacityHours,
    capacityOverrides: settings.capacityOverrides,
  };

  return {
    jobs: aiJobs,
    resources: aiResources,
    currentDate: currentDate,
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
