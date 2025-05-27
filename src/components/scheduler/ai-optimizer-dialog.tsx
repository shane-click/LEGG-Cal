'use client';

import type { Job, ScheduleSettings, AIOptimizedScheduleOutput, AIScheduleDataInput } from '@/types/scheduler';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { optimizeSchedule as optimizeScheduleFlow } from '@/ai/flows/optimize-schedule'; // Assuming this is the correct path
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

const aiOptimizerSchema = z.object({
  constraints: z.string().min(10, 'Please provide some optimization constraints.'),
});

type AIOptimizerFormData = z.infer<typeof aiOptimizerSchema>;

interface AIOptimizerDialogProps {
  currentJobs: Job[];
  currentSettings: ScheduleSettings;
  currentDate: string; // YYYY-MM-DD planning start date
  onScheduleOptimized: (optimizedJobs: Job[]) => void;
}

export default function AIOptimizerDialog({
  currentJobs,
  currentSettings,
  currentDate,
  onScheduleOptimized,
}: AIOptimizerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AIOptimizerFormData>({
    resolver: zodResolver(aiOptimizerSchema),
  });

  const prepareAIScheduleData = (): AIScheduleDataInput => {
    return {
      jobs: currentJobs.map(j => ({
        id: j.id,
        name: j.name,
        requiredHours: j.requiredHours,
        isUrgent: j.isUrgent,
        currentAssignments: j.scheduledSegments,
        preferredStartDate: j.preferredStartDate,
      })),
      resources: {
        dailyCapacityHours: currentSettings.dailyCapacityHours,
        capacityOverrides: currentSettings.capacityOverrides,
      },
      currentDate: currentDate,
    };
  };

  const onSubmit = async (data: AIOptimizerFormData) => {
    setIsLoading(true);
    setAiExplanation(null);
    try {
      const scheduleDataForAI = prepareAIScheduleData();
      const aiInput = {
        scheduleData: JSON.stringify(scheduleDataForAI),
        constraints: data.constraints,
      };

      const result = await optimizeScheduleFlow(aiInput);
      
      setAiExplanation(result.explanation);

      // Assuming result.optimizedSchedule is a JSON string of AIOptimizedScheduleOutput
      const optimizedOutput: AIOptimizedScheduleOutput = JSON.parse(result.optimizedSchedule);
      
      // Map AI output back to our Job[] structure
      const optimizedJobs: Job[] = currentJobs.map(originalJob => {
        const aiJobData = optimizedOutput.jobs.find(j => j.id === originalJob.id);
        if (aiJobData) {
          return {
            ...originalJob,
            scheduledSegments: aiJobData.scheduledSegments,
            // AI might change preferredStartDate implicitly by its scheduling.
            // For now, we just update segments. A more complex merge might be needed.
            // preferredStartDate: aiJobData.scheduledSegments.length > 0 ? aiJobData.scheduledSegments[0].date : originalJob.preferredStartDate,
          };
        }
        return originalJob; // If AI didn't return this job, keep original (shouldn't happen if AI processes all)
      });
      
      onScheduleOptimized(optimizedJobs);
      toast({
        title: 'Schedule Optimized',
        description: 'The AI has provided an optimized schedule.',
      });
      // Optionally keep dialog open to show explanation, or close:
      // setIsOpen(false); 
      // reset();
    } catch (error) {
      console.error('AI Optimization Error:', error);
      toast({
        variant: 'destructive',
        title: 'Optimization Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred during AI optimization.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        reset();
        setAiExplanation(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Zap className="mr-2 h-4 w-4" /> Optimize with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle>AI Schedule Optimizer</DialogTitle>
          <DialogDescription>
            Describe your constraints and priorities for the AI to optimize the schedule.
            The current schedule will be provided to the AI.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="constraints">Optimization Constraints & Priorities</Label>
            <Textarea
              id="constraints"
              {...register('constraints')}
              placeholder="e.g., Prioritize jobs for 'Client X'. Machine M1 is down for maintenance on YYYY-MM-DD. Maximize throughput for the next 7 days."
              className="min-h-[100px]"
            />
            {errors.constraints && <p className="text-sm text-destructive">{errors.constraints.message}</p>}
          </div>
          
          {aiExplanation && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertTitle>AI Optimization Summary</AlertTitle>
              <AlertDescription>
                <ScrollArea className="h-[100px] w-full pr-4">
                 {aiExplanation}
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Optimizing...' : 'Run AI Optimizer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
