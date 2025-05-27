'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Job, ScheduleSettings, DayData, AIOptimizedJobOutput } from '@/types/scheduler';
import Header from '@/components/layout/header';
import CalendarView from '@/components/scheduler/calendar-view';
import JobFormDialog from '@/components/scheduler/job-form-dialog';
import AIOptimizerDialog from '@/components/scheduler/ai-optimizer-dialog';
import SettingsPanel from '@/components/scheduler/settings-panel';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3 } from 'lucide-react';
import { allocateJobs, generateDateRange, DATE_FORMAT, getNextJobColor } from '@/lib/scheduler-utils';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO } from 'date-fns';

const INITIAL_JOBS: Job[] = [
  { id: 'job-1', name: 'Order #001 - Alpha Parts', requiredHours: 16, isUrgent: false, color: 'bg-sky-500', preferredStartDate: format(new Date(), DATE_FORMAT) },
  { id: 'job-2', name: 'Order #002 - Beta Assembly', requiredHours: 8, isUrgent: true, color: 'bg-rose-500', preferredStartDate: format(new Date(), DATE_FORMAT) },
  { id: 'job-3', name: 'Order #003 - Gamma Components', requiredHours: 24, isUrgent: false, color: 'bg-emerald-500', preferredStartDate: format(addDays(new Date(),1), DATE_FORMAT) },
];

const INITIAL_SETTINGS: ScheduleSettings = {
  dailyCapacityHours: 8,
  capacityOverrides: [],
};

const NUM_DAYS_TO_DISPLAY = 14; // Display 2 weeks

export default function SchedulerPage() {
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [settings, setSettings] = useState<ScheduleSettings>(INITIAL_SETTINGS);
  const [allocatedSchedule, setAllocatedSchedule] = useState<Map<string, DayData>>(new Map());
  const [currentPlanningDate, setCurrentPlanningDate] = useState<string>(format(new Date(), DATE_FORMAT));
  
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const { toast } = useToast();

  const dateRangeToDisplay = useMemo(() => {
    return generateDateRange(parseISO(currentPlanningDate), NUM_DAYS_TO_DISPLAY);
  }, [currentPlanningDate]);

  const reallocateSchedule = useCallback(() => {
    const { allocatedSchedule: newSchedule, updatedJobs: newJobs } = allocateJobs(jobs, settings, currentPlanningDate);
    setAllocatedSchedule(newSchedule);
    // setJobs(newJobs); // Important: update jobs with their new scheduledSegments
  }, [jobs, settings, currentPlanningDate]);

  useEffect(() => {
    reallocateSchedule();
  }, [jobs, settings, currentPlanningDate, reallocateSchedule]);

  const handleSaveJob = (jobData: Omit<Job, 'id' | 'scheduledSegments'> & {color: string}, id?: string) => {
    if (id) { // Editing existing job
      setJobs(prevJobs => prevJobs.map(j => j.id === id ? { ...j, ...jobData } : j));
      toast({ title: "Job Updated", description: `"${jobData.name}" has been updated.` });
    } else { // Adding new job
      const newJobId = `job-${Date.now()}`;
      const newJob: Job = { ...jobData, id: newJobId };
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
        j.id === jobId ? { ...j, preferredStartDate: targetDate } : j
      )
    );
    toast({ title: "Job Moved", description: `Job's preferred start date updated. Rescheduling...` });
  };

  const handleSettingsChange = (newSettings: ScheduleSettings) => {
    setSettings(newSettings);
    toast({ title: "Settings Updated", description: "Schedule settings have been applied." });
  };

  const handleScheduleOptimizedByAI = (optimizedJobsFromAI: Job[]) => {
     // The AI returns jobs with updated scheduledSegments. We need to merge this
    // with our existing jobs list, potentially creating new preferredStartDates.
    // For now, let's assume optimizedJobsFromAI is the new truth for segments.
    const newJobsState = jobs.map(currentJob => {
      const aiVersion = optimizedJobsFromAI.find(aj => aj.id === currentJob.id);
      if (aiVersion) {
        // If AI provides segments, use them. Update preferredStartDate to the first segment's date.
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
    // The useEffect for reallocation will pick this up.
  };

  const handleNextWeek = () => {
    setCurrentPlanningDate(format(addDays(parseISO(currentPlanningDate), 7), DATE_FORMAT));
  };

  const handlePrevWeek = () => {
    setCurrentPlanningDate(format(addDays(parseISO(currentPlanningDate), -7), DATE_FORMAT));
  };
  
  const nextJobColor = useMemo(() => getNextJobColor(jobs.length), [jobs.length]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
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

          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-foreground">Production Schedule</h2>
              <div className="space-x-2">
                <Button variant="outline" onClick={handlePrevWeek}>Previous {NUM_DAYS_TO_DISPLAY/2} Days</Button>
                <Button variant="outline" onClick={handleNextWeek}>Next {NUM_DAYS_TO_DISPLAY/2} Days</Button>
              </div>
            </div>
            <CalendarView
              schedule={allocatedSchedule}
              dateRange={dateRangeToDisplay}
              settings={settings}
              onDropJob={handleDropJob}
              onJobClick={handleEditJob}
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
