
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Job, ScheduleSettings, DayData } from '@/types/scheduler';
import Header from '@/components/layout/header';
import CalendarView from '@/components/scheduler/calendar-view';
import JobFormDialog from '@/components/scheduler/job-form-dialog';
import AIOptimizerDialog from '@/components/scheduler/ai-optimizer-dialog';
import SettingsPanel from '@/components/scheduler/settings-panel';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { allocateJobs, generateDateRange, DATE_FORMAT, getNextJobColor } from '@/lib/scheduler-utils';
import { useToast } from '@/hooks/use-toast';
import {
  format, addDays, parseISO, isValid,
  startOfMonth, endOfMonth, eachDayOfInterval as eachDayOfIntervalDateFns,
  addMonths, subMonths
} from 'date-fns';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const INITIAL_JOBS: Job[] = [
  { id: 'job-1', name: 'Order #001 - Alpha Parts', requiredHours: 16, isUrgent: false, color: 'bg-sky-500', preferredStartDate: format(new Date(), DATE_FORMAT), activityType: "Fab", quoteNumber: "Q-1001" },
  { id: 'job-2', name: 'Order #002 - Beta Assembly', requiredHours: 8, isUrgent: true, color: 'bg-rose-500', preferredStartDate: format(new Date(), DATE_FORMAT), activityType: "Screens", quoteNumber: "Q-1002" },
  { id: 'job-3', name: 'Order #003 - Gamma Components', requiredHours: 24, isUrgent: false, color: 'bg-emerald-500', preferredStartDate: format(addDays(new Date(),1), DATE_FORMAT), activityType: "Cut & Prep", quoteNumber: "Q-1003" },
];

const INITIAL_SETTINGS: ScheduleSettings = {
  dailyCapacityHours: 8,
  capacityOverrides: [],
};

type ViewMode = '2_WEEKS' | 'MONTH';

// Define type for JobFormData based on JobFormDialog's schema expectations
type JobFormData = Omit<Job, 'id' | 'scheduledSegments'>;


export default function SchedulerPage() {
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [settings, setSettings] = useState<ScheduleSettings>(INITIAL_SETTINGS);
  const [allocatedSchedule, setAllocatedSchedule] = useState<Map<string, DayData>>(new Map());
  const [currentPlanningDate, setCurrentPlanningDate] = useState<string>(format(new Date(), DATE_FORMAT));
  const [viewMode, setViewMode] = useState<ViewMode>('2_WEEKS');
  
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const { toast } = useToast();

  const calendarWidthClass = useMemo(() => {
    return viewMode === 'MONTH' ? 'w-40' : 'w-64'; // Adjusted to w-40 for month, w-64 for 2-weeks
  }, [viewMode]);

  const dateRangeToDisplay = useMemo(() => {
    const planningDateObj = parseISO(currentPlanningDate);
    if (!isValid(planningDateObj)) return generateDateRange(new Date(), 14); // Fallback

    if (viewMode === 'MONTH') {
      const monthStart = startOfMonth(planningDateObj);
      const monthEnd = endOfMonth(planningDateObj);
      return eachDayOfIntervalDateFns({ start: monthStart, end: monthEnd }).map(d => format(d, DATE_FORMAT));
    } else { // '2_WEEKS'
      return generateDateRange(planningDateObj, 14);
    }
  }, [currentPlanningDate, viewMode]);

  const reallocateSchedule = useCallback(() => {
    const { allocatedSchedule: newSchedule } = allocateJobs(jobs, settings, currentPlanningDate);
    setAllocatedSchedule(newSchedule);
  }, [jobs, settings, currentPlanningDate]);


  useEffect(() => {
    reallocateSchedule();
  }, [jobs, settings, currentPlanningDate, reallocateSchedule]);

  const handleSaveJob = (jobData: JobFormData, id?: string) => {
    if (id) { 
      setJobs(prevJobs => prevJobs.map(j => j.id === id ? { ...j, ...jobData, scheduledSegments: [] } : j));
      toast({ title: "Job Updated", description: `"${jobData.name}" has been updated.` });
    } else { 
      const newJobId = `job-${Date.now()}`;
      const newJob: Job = { ...jobData, id: newJobId, scheduledSegments: [] };
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

  const handleDropJob = (jobId: string, targetDate: string) => {
    setJobs(prevJobs =>
      prevJobs.map(j =>
        j.id === jobId ? { ...j, preferredStartDate: targetDate, scheduledSegments: [] } : j
      )
    );
    toast({ title: "Job Moved", description: `Job's preferred start date updated. Rescheduling...` });
  };

  const handleSettingsChange = (newSettings: ScheduleSettings) => {
    setSettings(newSettings);
    toast({ title: "Settings Updated", description: "Schedule settings have been applied." });
  };

  const handleScheduleOptimizedByAI = (optimizedJobsFromAI: Job[]) => {
    const newJobsState = jobs.map(currentJob => {
      const aiVersion = optimizedJobsFromAI.find(aj => aj.id === currentJob.id);
      if (aiVersion) {
        const newPreferredStartDate = aiVersion.scheduledSegments && aiVersion.scheduledSegments.length > 0 
          ? aiVersion.scheduledSegments[0].date 
          : currentJob.preferredStartDate;

        return {
          ...currentJob,
          scheduledSegments: aiVersion.scheduledSegments || [],
          preferredStartDate: newPreferredStartDate, 
        };
      }
      return currentJob;
    });
    setJobs(newJobsState);
    toast({ title: "AI Optimization Applied", description: "The schedule has been updated with AI suggestions." });
  };

  const handleNext = () => {
    const currentDateObj = parseISO(currentPlanningDate);
    if (viewMode === 'MONTH') {
      setCurrentPlanningDate(format(addMonths(currentDateObj, 1), DATE_FORMAT));
    } else {
      setCurrentPlanningDate(format(addDays(currentDateObj, 7), DATE_FORMAT));
    }
  };

  const handlePrev = () => {
    const currentDateObj = parseISO(currentPlanningDate);
    if (viewMode === 'MONTH') {
      setCurrentPlanningDate(format(subMonths(currentDateObj, 1), DATE_FORMAT));
    } else {
      setCurrentPlanningDate(format(addDays(currentDateObj, -7), DATE_FORMAT));
    }
  };
  
  const nextJobColor = useMemo(() => getNextJobColor(jobs.length), [jobs.length]);
  const navigationButtonText = viewMode === 'MONTH' ? 'Month' : 'Week';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-2 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-2 space-y-6"> {/* Left panel takes 2/12 (approx 16.7%) */}
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
            <AIOptimizerDialog
              currentJobs={jobs}
              currentSettings={settings}
              currentDate={currentPlanningDate}
              onScheduleOptimized={handleScheduleOptimizedByAI}
            />
          </div>

          <div className="lg:col-span-10"> {/* Calendar takes 10/12 (approx 83.3%) */}
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
              dateRange={dateRangeToDisplay}
              settings={settings}
              onDropJob={handleDropJob}
              onJobClick={handleEditJob}
              widthClass={calendarWidthClass}
            />
          </div>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t border-border">
        Leggwork &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

