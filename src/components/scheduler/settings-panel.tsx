
'use client';

import type { ScheduleSettings } from '@/types/scheduler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, Trash2, PlusCircle, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid, isWeekend, nextMonday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const capacityOverrideSchema = z.object({
  id: z.string().optional(), 
  date: z.string()
    .min(1, 'Date is required.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
    .refine(dateStr => {
        const date = parseISO(dateStr);
        return isValid(date) && !isWeekend(date);
    }, {
      message: "Overrides must be for weekdays.",
    }),
  hours: z.coerce.number().min(0, 'Capacity must be non-negative'),
});

const settingsSchema = z.object({
  dailyCapacityByDay: z.object({
    monday: z.coerce.number().min(0, 'Capacity must be non-negative'),
    tuesday: z.coerce.number().min(0, 'Capacity must be non-negative'),
    wednesday: z.coerce.number().min(0, 'Capacity must be non-negative'),
    thursday: z.coerce.number().min(0, 'Capacity must be non-negative'),
    friday: z.coerce.number().min(0, 'Capacity must be non-negative'),
  }),
  capacityOverrides: z.array(capacityOverrideSchema).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsPanelProps {
  currentSettings: ScheduleSettings;
  onSettingsChange: (newSettings: ScheduleSettings) => void;
}

export default function SettingsPanel({ currentSettings, onSettingsChange }: SettingsPanelProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      dailyCapacityByDay: {
        monday: 8,
        tuesday: 8,
        wednesday: 8,
        thursday: 8,
        friday: 8,
        ...(currentSettings.dailyCapacityByDay || {}),
      },
      capacityOverrides: currentSettings.capacityOverrides?.filter(ov => ov.date && !isWeekend(parseISO(ov.date))) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "capacityOverrides",
  });

  useEffect(() => {
    reset({
      dailyCapacityByDay: {
        monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8,
        ...(currentSettings.dailyCapacityByDay || {}),
      },
      capacityOverrides: currentSettings.capacityOverrides?.filter(ov => ov.date && !isWeekend(parseISO(ov.date))) || [],
    });
  }, [currentSettings, reset]);

  const onSubmit = (data: SettingsFormData) => {
    const validOverrides = data.capacityOverrides?.filter(override => {
        if (!override.date || override.hours === undefined) return false;
        const dateObj = parseISO(override.date);
        return isValid(dateObj) && !isWeekend(dateObj);
    }).map(({id, ...rest}) => rest) || [];
    
    onSettingsChange({
      dailyCapacityByDay: data.dailyCapacityByDay,
      capacityOverrides: validOverrides,
    });
  };
  
  const isInsideSheet = true; 

  return (
    <Card className={cn(
        "h-full flex flex-col", 
        isInsideSheet ? "shadow-none border-none rounded-none bg-transparent" : "shadow-lg border bg-card"
    )}>
      {!isInsideSheet && ( // Conditionally render CardHeader if not inside a sheet
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Settings className="h-5 w-5" />
            Schedule Settings
          </CardTitle>
          <CardDescription>Adjust default weekday capacities and specific date overrides. Weekends are excluded.</CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn(
          "flex-grow overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent",
          isInsideSheet ? "p-4 md:p-6 pt-6" : "p-4 md:p-6" // Adjust padding if inside sheet
      )}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="space-y-4">
            <Label className="text-base font-medium">Default Weekday Capacity (Hours)</Label>
            {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map((day) => (
              <div key={day} className="space-y-1">
                <Label htmlFor={`dailyCapacityByDay.${day}`} className="capitalize">{day}</Label>
                <Input
                  id={`dailyCapacityByDay.${day}`}
                  type="number"
                  step="1"
                  {...register(`dailyCapacityByDay.${day}`)}
                />
                {errors.dailyCapacityByDay?.[day] && (
                  <p className="text-sm text-destructive">{errors.dailyCapacityByDay[day]?.message}</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Specific Date Capacity Overrides (Weekdays Only)</Label>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2 p-3 border rounded-lg bg-background/50">
                  <div className="flex-grow space-y-1">
                    <Controller
                      name={`capacityOverrides.${index}.date`}
                      control={control}
                      render={({ field: dateField }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal bg-background",
                                !dateField.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateField.value && isValid(parseISO(dateField.value)) ? format(parseISO(dateField.value), "MMM d, yyyy (EEE)") : <span>Pick date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateField.value && isValid(parseISO(dateField.value)) ? parseISO(dateField.value) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  if (isWeekend(date)) {
                                    toast({
                                      variant: "destructive",
                                      title: "Invalid Date",
                                      description: "Overrides must be weekdays.",
                                    });
                                  } else {
                                    dateField.onChange(format(date, 'yyyy-MM-dd'));
                                  }
                                } else {
                                  dateField.onChange('');
                                }
                              }}
                              disabled={isWeekend} 
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {errors.capacityOverrides?.[index]?.date && (
                         <p className="text-sm text-destructive">{errors.capacityOverrides[index]?.date?.message}</p>
                    )}
                     <Input
                        type="number"
                        placeholder="Hours"
                        step="0.5"
                        {...register(`capacityOverrides.${index}.hours`)}
                        className="w-full bg-background"
                      />
                    {errors.capacityOverrides?.[index]?.hours && (
                         <p className="text-sm text-destructive">{errors.capacityOverrides[index]?.hours?.message}</p>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove override" className="mt-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            {errors.capacityOverrides && typeof errors.capacityOverrides.message === 'string' && (
              <p className="text-sm text-destructive">{errors.capacityOverrides.message}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                let nextDay = new Date();
                if(isWeekend(nextDay)) nextDay = nextMonday(nextDay);
                const dayKey = format(nextDay, 'eeee').toLowerCase() as keyof SettingsFormData['dailyCapacityByDay'];
                const defaultHoursForDay = watch(`dailyCapacityByDay.${dayKey}`) || currentSettings.dailyCapacityByDay[dayKey] || 8;
                append({ date: format(nextDay, 'yyyy-MM-dd'), hours: defaultHoursForDay })
              }}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Capacity Override
            </Button>
          </div>
          <Button type="submit" className="w-full sticky bottom-0 bg-primary hover:bg-primary/90 py-3 mt-auto">
            Apply Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
