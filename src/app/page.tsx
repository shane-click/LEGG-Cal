
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Job, ScheduleSettings, DayData } from '@/types/scheduler';
import Header from '@/components/layout/header';
import CalendarView from '@/components/scheduler/calendar-view';
import JobFormDialog from '@/components/scheduler/job-form-dialog';
import AIOptimizerDialog from '@/components/scheduler/ai-optimizer-dialog';
import SettingsPanel from '@/components/scheduler/settings-panel';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { allocateJobs, generateDateRange, DATE_FORMAT, getNextJobColor } from '@/lib/scheduler-utils';
import { useToast } from '@/hooks/use-toast';
import {
  format, addDays, parseISO, isValid,
  startOfMonth, endOfMonth, eachDayOfInterval as eachDayOfIntervalDateFns,
  addMonths, subMonths, isWeekend, nextMonday, getDay, previousMonday
} from 'date-fns';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const INITIAL_SETTINGS: ScheduleSettings = {
  dailyCapacityHours: 8,
  capacityOverrides: [],
};

type ViewMode = '2_WEEKS' | 'MONTH';
type JobFormData = Omit<Job, 'id' | 'scheduledSegments'>;

export default function SchedulerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<ScheduleSettings>(INITIAL_SETTINGS);
  const [allocatedSchedule, setAllocatedSchedule] = useState<Map<string, DayData>>(new Map());
  const [currentPlanningDate, setCurrentPlanningDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('2_WEEKS');
  
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    let today = new Date();
    // Ensure initial planning date is a weekday
    if (isWeekend(today)) {
      today = nextMonday(today);
    }
    const todayStr = format(today, DATE_FORMAT);
    setCurrentPlanningDate(todayStr);

    const dynamicInitialJobs: Job[] = [
      { id: 'job-1', name: 'Order #001 - Alpha Parts', requiredHours: 16, isUrgent: false, color: 'bg-sky-500', preferredStartDate: todayStr, activityType: "Fab", quoteNumber: "Q-1001", scheduledSegments: [] },
      { id: 'job-2', name: 'Order #002 - Beta Assembly', requiredHours: 8, isUrgent: true, color: 'bg-rose-500', preferredStartDate: todayStr, activityType: "Screens", quoteNumber: "Q-1002", scheduledSegments: [] },
      { id: 'job-3', name: 'Order #003 - Gamma Components', requiredHours: 24, isUrgent: false, color: 'bg-emerald-500', preferredStartDate: format(isWeekend(addDays(today,1)) ? nextMonday(addDays(today,1)) : addDays(today,1), DATE_FORMAT), activityType: "Cut & Prep", quoteNumber: "Q-1003", scheduledSegments: [] },
    ];
    setJobs(dynamicInitialJobs);
    setIsLoading(false);
  }, []);

  const calendarWidthClass = useMemo(() => {
    return viewMode === 'MONTH' ? 'w-40' : 'w-64';
  }, [viewMode]);

  const dateRangeToDisplay = useMemo(() => {
    if (!currentPlanningDate) return [];
    const planningDateObj = parseISO(currentPlanningDate);
    if (!isValid(planningDateObj)) return generateDateRange(new Date(), 14);

    if (viewMode === 'MONTH') {
      const monthStart = startOfMonth(planningDateObj);
      const monthEnd = endOfMonth(planningDateObj);
      return eachDayOfIntervalDateFns({ start: monthStart, end: monthEnd })
        .filter(d => !isWeekend(d)) // Filter out weekends for month view
        .map(d => format(d, DATE_FORMAT));
    } else { // '2_WEEKS'
      // generateDateRange now filters weekends internally based on a 14-day period
      return generateDateRange(planningDateObj, 14); 
    }
  }, [currentPlanningDate, viewMode]);

  const reallocateSchedule = useCallback(() => {
    if (!currentPlanningDate || jobs.length === 0 || isLoading) return;
    const planningDateObj = parseISO(currentPlanningDate);
     if (!isValid(planningDateObj) || isWeekend(planningDateObj)) {
        // This should ideally not happen if currentPlanningDate is always set to a weekday
        console.warn("Reallocate called with invalid or weekend planning date:", currentPlanningDate);
        return;
    }
    const { allocatedSchedule: newSchedule } = allocateJobs(jobs, settings, currentPlanningDate);
    setAllocatedSchedule(newSchedule);
  }, [jobs, settings, currentPlanningDate, isLoading]);

  useEffect(() => {
    if (!isLoading && currentPlanningDate) {
      reallocateSchedule();
    }
  }, [jobs, settings, currentPlanningDate, reallocateSchedule, isLoading]);

  const handleSaveJob = (jobData: JobFormData, id?: string) => {
    let preferredStartDate = jobData.preferredStartDate;
    if (preferredStartDate) {
        const prefDateObj = parseISO(preferredStartDate);
        if (isWeekend(prefDateObj)) {
            preferredStartDate = format(nextMonday(prefDateObj), DATE_FORMAT);
        }
    }

    if (id) { 
      setJobs(prevJobs => prevJobs.map(j => j.id === id ? { ...j, ...jobData, preferredStartDate, scheduledSegments: [] } : j));
      toast({ title: "Job Updated", description: `"${jobData.name}" has been updated.` });
    } else { 
      const newJobId = `job-${Date.now()}`;
      const newJob: Job = { ...jobData, preferredStartDate, id: newJobId, scheduledSegments: [] };
      setJobs(prevJobs => [...prevJobs, newJob]);
      toast({ title: "Job Added", description: `"${jobData.name}" has been added.` });
    }
    setIsJobFormOpen(false);
    setEditingJob(null);
  };
  
  const handleEditJob = (jobId: string) => {
    const jobToEdit = jobs.find(j => j.id === jobId);
    if (jobToEdit) {
      setEditingJob(jobToEdit);
      setIsJobFormOpen(true);
    }
  };

  const handleDropJob = (jobId: string, targetDateStr: string) => {
    let targetDate = parseISO(targetDateStr);
    if (isWeekend(targetDate)) {
      targetDate = nextMonday(targetDate); // Snap to next Monday if dropped on weekend
    }
    const finalTargetDateStr = format(targetDate, DATE_FORMAT);

    setJobs(prevJobs =>
      prevJobs.map(j =>
        j.id === jobId ? { ...j, preferredStartDate: finalTargetDateStr, scheduledSegments: [] } : j
      )
    );
    toast({ title: "Job Moved", description: `Job's preferred start date updated. Rescheduling...` });
  };

  const handleSettingsChange = (newSettings: ScheduleSettings) => {
    // Filter out any capacity overrides that might be for weekends
    const filteredOverrides = newSettings.capacityOverrides?.filter(
        override => !isWeekend(parseISO(override.date))
    );
    setSettings({...newSettings, capacityOverrides: filteredOverrides });
    toast({ title: "Settings Updated", description: "Schedule settings have been applied." });
  };

  const handleScheduleOptimizedByAI = (optimizedJobsFromAI: Job[]) => {
    const newJobsState = jobs.map(currentJob => {
      const aiVersion = optimizedJobsFromAI.find(aj => aj.id === currentJob.id);
      if (aiVersion) {
        // Ensure AI segments are not on weekends and preferredStartDate is a weekday
        const validSegments = aiVersion.scheduledSegments?.filter(seg => !isWeekend(parseISO(seg.date))) || [];
        let newPreferredStartDate = currentJob.preferredStartDate;
        if (validSegments.length > 0) {
            const firstSegDate = parseISO(validSegments[0].date);
            newPreferredStartDate = format(isWeekend(firstSegDate) ? nextMonday(firstSegDate) : firstSegDate, DATE_FORMAT);
        } else if (aiVersion.preferredStartDate) {
            const aiPrefDate = parseISO(aiVersion.preferredStartDate);
            newPreferredStartDate = format(isWeekend(aiPrefDate) ? nextMonday(aiPrefDate) : aiPrefDate, DATE_FORMAT);
        }
        
        return {
          ...currentJob,
          scheduledSegments: validSegments,
          preferredStartDate: newPreferredStartDate, 
        };
      }
      return currentJob;
    });
    setJobs(newJobsState);
    toast({ title: "AI Optimization Applied", description: "The schedule has been updated with AI suggestions." });
  };

 const handleNext = () => {
    if (!currentPlanningDate) return;
    let currentDateObj = parseISO(currentPlanningDate);
    let newDate;
    if (viewMode === 'MONTH') {
      newDate = startOfMonth(addMonths(currentDateObj, 1));
    } else { // 2_WEEKS
      newDate = addDays(currentDateObj, 7); // Move by one week
    }
    // Ensure the new planning date is a weekday
    if (isWeekend(newDate)) {
      newDate = nextMonday(newDate);
    }
    setCurrentPlanningDate(format(newDate, DATE_FORMAT));
  };

  const handlePrev = () => {
    if (!currentPlanningDate) return;
    let currentDateObj = parseISO(currentPlanningDate);
    let newDate;

    if (viewMode === 'MONTH') {
      newDate = startOfMonth(subMonths(currentDateObj, 1));
    } else { // 2_WEEKS
      newDate = addDays(currentDateObj, -7); // Move back by one week
    }
    
    // Ensure the new planning date is a weekday, adjusting backwards if necessary
    if (isWeekend(newDate)) {
      if (getDay(newDate) === 0) { // Sunday, go to previous Friday
        newDate = subDays(newDate, 2);
      } else { // Saturday, go to previous Friday
        newDate = subDays(newDate, 1);
      }
    }
    // If month view, after adjusting for weekend, ensure it's still start of that month, or next valid weekday.
    // This handles case where prev month's start was a weekend, adjusted to Fri, then we want start of that month again.
     if (viewMode === 'MONTH') {
        newDate = startOfMonth(newDate); // Re-align to start of the (potentially new) month
        if (isWeekend(newDate)) {
            newDate = nextMonday(newDate); // If that start is a weekend, go to its Monday
        }
    }
    setCurrentPlanningDate(format(newDate, DATE_FORMAT));
  };
  
  const nextJobColor = useMemo(() => getNextJobColor(jobs.length), [jobs.length]);
  const navigationButtonText = useMemo(() => {
    if (viewMode === 'MONTH') return 'Month';
    // For 2_WEEKS view, 'Week' makes more sense as navigation is weekly
    const twoWeeksRange = dateRangeToDisplay;
    if (twoWeeksRange.length >= 5) return 'Week'; // Default to week if we have enough days
    return 'Period';
  }, [viewMode, dateRangeToDisplay]);


  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-foreground mt-4">Loading scheduler...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-2 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Button onClick={() => { setEditingJob(null); setIsJobFormOpen(true); }} className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Job
            </Button>
            <JobFormDialog
              job={editingJob}
              onSave={handleSaveJob}
              open={isJobFormOpen}
              onOpenChange={setIsJobFormOpen}
              defaultColor={nextJobColor}
            />
            <SettingsPanel currentSettings={settings} onSettingsChange={handleSettingsChange} />
            {currentPlanningDate && <AIOptimizerDialog
              currentJobs={jobs}
              currentSettings={settings}
              currentDate={currentPlanningDate} // This should be a weekday
              onScheduleOptimized={handleScheduleOptimizedByAI}
            />}
          </div>

          <div className="lg:col-span-10">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <h2 className="text-2xl font-semibold text-foreground">Production Schedule</h2>
              <div className="flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value: ViewMode) => {
                    if (value) setViewMode(value);
                  }}
                  aria-label="View mode"
                  size="sm"
                >
                  <ToggleGroupItem value="2_WEEKS" aria-label="2 Weeks View">
                    2 Weeks
                  </ToggleGroupItem>
                  <ToggleGroupItem value="MONTH" aria-label="Month View">
                    Month
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button variant="outline" size="sm" onClick={handlePrev}><ChevronLeft className="mr-1 h-4 w-4"/> Prev {navigationButtonText}</Button>
                <Button variant="outline" size="sm" onClick={handleNext}>Next {navigationButtonText} <ChevronRight className="ml-1 h-4 w-4"/></Button>
              </div>
            </div>
            <CalendarView
              schedule={allocatedSchedule}
              dateRange={dateRangeToDisplay} // This range will now only contain weekdays
              settings={settings}
              onDropJob={handleDropJob}
              onJobClick={handleEditJob}
              widthClass={calendarWidthClass}
            />
          </div>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t border-border">
        LEGG &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
