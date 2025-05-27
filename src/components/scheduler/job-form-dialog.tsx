'use client';

import type { Job } from '@/types/scheduler';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { CalendarIcon, PlusCircle, Edit3 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { JOB_COLORS } from '@/lib/scheduler-utils';

const jobSchema = z.object({
  name: z.string().min(1, 'Job name is required'),
  requiredHours: z.coerce.number().min(0.1, 'Required hours must be positive'),
  isUrgent: z.boolean().default(false),
  preferredStartDate: z.string().optional(),
  color: z.string(),
});

type JobFormData = z.infer<typeof jobSchema>;

interface JobFormDialogProps {
  job?: Job | null; // Pass job for editing, null/undefined for new
  onSave: (jobData: JobFormData, id?: string) => void;
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultColor: string;
}

export default function JobFormDialog({
  job,
  onSave,
  triggerButton,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  defaultColor,
}: JobFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      name: '',
      requiredHours: 8,
      isUrgent: false,
      preferredStartDate: undefined,
      color: defaultColor,
    },
  });
  
  const selectedColor = watch('color');

  useEffect(() => {
    if (job) {
      reset({
        name: job.name,
        requiredHours: job.requiredHours,
        isUrgent: job.isUrgent,
        preferredStartDate: job.preferredStartDate,
        color: job.color || defaultColor,
      });
    } else {
      reset({
        name: '',
        requiredHours: 8,
        isUrgent: false,
        preferredStartDate: undefined,
        color: defaultColor,
      });
    }
  }, [job, reset, defaultColor, open]); // Reset form when dialog opens or job changes

  const onSubmit = (data: JobFormData) => {
    onSave(data, job?.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-[480px] bg-card">
        <DialogHeader>
          <DialogTitle>{job ? 'Edit Job' : 'Add New Job'}</DialogTitle>
          <DialogDescription>
            {job ? 'Update the details of this job.' : 'Enter the details for the new job.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Job Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g., Order #123 - Custom Widget" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="requiredHours">Required Hours</Label>
            <Input id="requiredHours" type="number" step="0.1" {...register('requiredHours')} />
            {errors.requiredHours && <p className="text-sm text-destructive">{errors.requiredHours.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="preferredStartDate">Preferred Start Date (Optional)</Label>
            <Controller
              name="preferredStartDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Controller
              name="isUrgent"
              control={control}
              render={({ field }) => (
                <Checkbox id="isUrgent" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="isUrgent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Mark as Urgent
            </Label>
          </div>
          <div className="grid gap-2">
            <Label>Job Color</Label>
            <div className="flex flex-wrap gap-2">
              {JOB_COLORS.map((colorClass) => (
                <Button
                  key={colorClass}
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-8 w-8 rounded-full',
                    colorClass,
                    selectedColor === colorClass && 'ring-2 ring-ring ring-offset-2'
                  )}
                  onClick={() => setValue('color', colorClass)}
                  aria-label={`Select color ${colorClass.split('-')[1]}-${colorClass.split('-')[2]}`}
                >
                  {selectedColor === colorClass && <Check className="h-4 w-4 text-primary-foreground" />}
                </Button>
              ))}
            </div>
             {errors.color && <p className="text-sm text-destructive">{errors.color.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">{job ? 'Save Changes' : 'Add Job'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
