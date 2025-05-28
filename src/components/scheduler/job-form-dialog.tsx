
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
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { CalendarIcon, Check } from 'lucide-react'; // Removed PlusCircle, Edit3 as they were unused here
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isWeekend, nextMonday, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { JOB_COLORS } from '@/lib/scheduler-utils';
import { useToast } from '@/hooks/use-toast';

export const ACTIVITY_TYPES = ["Cut & Prep", "Fab", "Screens", "Other"] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

const jobSchema = z.object({
  name: z.string().min(1, 'Job name is required'),
  requiredHours: z.coerce.number().min(0.1, 'Required hours must be positive'),
  isUrgent: z.boolean().default(false),
  preferredStartDate: z.string().optional().refine(dateStr => {
    if (!dateStr) return true; // Optional field
    const date = parseISO(dateStr);
    return isValid(date) && !isWeekend(date);
  }, {message: "Preferred start date must be a weekday."}),
  color: z.string(),
  activityType: z.string().min(1, "Activity type is required"),
  activityOther: z.string().optional(),
  quoteNumber: z.string().optional(),
}).refine(data => {
  if (data.activityType === 'Other') {
    return !!data.activityOther?.trim();
  }
  return true;
}, {
  message: "Please specify details for 'Other' activity type",
  path: ['activityOther'],
});

export type JobFormData = z.infer<typeof jobSchema>;

interface JobFormDialogProps {
  job?: Job | null;
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
  const { toast } = useToast();

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
      activityType: ACTIVITY_TYPES[0],
      activityOther: '',
      quoteNumber: '',
    },
  });
  
  const selectedColor = watch('color');
  const selectedActivityType = watch('activityType');

  useEffect(() => {
    if (open) { // Reset form only when dialog opens
      if (job) {
        let prefDate = job.preferredStartDate;
        if (prefDate && isWeekend(parseISO(prefDate))) {
            prefDate = format(nextMonday(parseISO(prefDate)), 'yyyy-MM-dd');
        }
        reset({
          name: job.name,
          requiredHours: job.requiredHours,
          isUrgent: job.isUrgent,
          preferredStartDate: prefDate,
          color: job.color || defaultColor,
          activityType: job.activityType,
          activityOther: job.activityOther || '',
          quoteNumber: job.quoteNumber || '',
        });
      } else {
        reset({
          name: '',
          requiredHours: 8,
          isUrgent: false,
          preferredStartDate: undefined, // Let user pick, will be validated
          color: defaultColor,
          activityType: ACTIVITY_TYPES[0],
          activityOther: '',
          quoteNumber: '',
        });
      }
    }
  }, [job, reset, defaultColor, open]);

  const onSubmit = (data: JobFormData) => {
    let finalData = { ...data };
    if (finalData.preferredStartDate) {
        const prefDateObj = parseISO(finalData.preferredStartDate);
        if (isWeekend(prefDateObj)) { // Should be caught by Zod, but as a fallback
            finalData.preferredStartDate = format(nextMonday(prefDateObj), 'yyyy-MM-dd');
        }
    }
    finalData = {
      ...finalData,
      activityOther: data.activityType === 'Other' ? data.activityOther : undefined,
    };
    onSave(finalData, job?.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-[480px] bg-card">
        <DialogHeader>
          <DialogTitle>{job ? 'Edit Job' : 'Add New Job'}</DialogTitle>
          <DialogDescription>
            {job ? 'Update the details of this job.' : 'Enter the details for the new job. Weekends are excluded.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Job Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g., Order #123 - Custom Widget" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quoteNumber">Quote Number</Label>
            <Input id="quoteNumber" {...register('quoteNumber')} placeholder="e.g., Q-2024-001" />
            {errors.quoteNumber && <p className="text-sm text-destructive">{errors.quoteNumber.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="requiredHours">Required Hours</Label>
            <Input id="requiredHours" type="number" step="0.1" {...register('requiredHours')} />
            {errors.requiredHours && <p className="text-sm text-destructive">{errors.requiredHours.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="activityType">Activity Type</Label>
            <Controller
              name="activityType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="activityType">
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.activityType && <p className="text-sm text-destructive">{errors.activityType.message}</p>}
          </div>

          {selectedActivityType === 'Other' && (
            <div className="grid gap-2">
              <Label htmlFor="activityOther">Specify Other Activity</Label>
              <Input id="activityOther" {...register('activityOther')} placeholder="Details for 'Other' activity" />
              {errors.activityOther && <p className="text-sm text-destructive">{errors.activityOther.message}</p>}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="preferredStartDate">Preferred Start Date (Optional - Weekdays Only)</Label>
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
                      {field.value && isValid(parseISO(field.value)) ? format(parseISO(field.value), "PPP (EEE)") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          if (isWeekend(date)) {
                             toast({
                                variant: "destructive",
                                title: "Invalid Date",
                                description: "Preferred start date must be a weekday. Please select another date.",
                              });
                            // Do not set the date if it's a weekend
                            // field.onChange(undefined); // Or keep previous valid date
                          } else {
                            field.onChange(format(date, 'yyyy-MM-dd'));
                          }
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                      disabled={isWeekend} // Disable weekends in the calendar picker
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
             {errors.preferredStartDate && <p className="text-sm text-destructive">{errors.preferredStartDate.message}</p>}
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
