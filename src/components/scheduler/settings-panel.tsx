
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
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const capacityOverrideSchema = z.object({
  id: z.string().optional(), // For useFieldArray key
  date: z.string().min(1, 'Date is required.').regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  hours: z.coerce.number().min(0, 'Capacity must be non-negative'),
});

const settingsSchema = z.object({
  dailyCapacityHours: z.coerce.number().min(1, 'Daily capacity must be at least 1 hour'),
  capacityOverrides: z.array(capacityOverrideSchema).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsPanelProps {
  currentSettings: ScheduleSettings;
  onSettingsChange: (newSettings: ScheduleSettings) => void;
}

export default function SettingsPanel({ currentSettings, onSettingsChange }: SettingsPanelProps) {
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
      dailyCapacityHours: currentSettings.dailyCapacityHours,
      capacityOverrides: currentSettings.capacityOverrides || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "capacityOverrides",
  });

  useEffect(() => {
    reset({
      dailyCapacityHours: currentSettings.dailyCapacityHours,
      capacityOverrides: currentSettings.capacityOverrides || [],
    });
  }, [currentSettings, reset]);

  const onSubmit = (data: SettingsFormData) => {
    onSettingsChange({
      dailyCapacityHours: data.dailyCapacityHours,
      capacityOverrides: data.capacityOverrides?.filter(override => override.date && override.hours !== undefined).map(({id, ...rest}) => rest) || [], // remove 'id' before saving
    });
  };

  // const watchedOverrides = watch("capacityOverrides"); // For debugging if needed

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Schedule Settings
        </CardTitle>
        <CardDescription>Adjust general scheduling parameters and daily capacities.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dailyCapacityHours">Default Daily Capacity (Hours)</Label>
            <Input
              id="dailyCapacityHours"
              type="number"
              step="1"
              {...register('dailyCapacityHours')}
            />
            {errors.dailyCapacityHours && (
              <p className="text-sm text-destructive">{errors.dailyCapacityHours.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Capacity Overrides</Label>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
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
                              {dateField.value && isValid(parseISO(dateField.value)) ? format(parseISO(dateField.value), "MMM d, yyyy") : <span>Pick date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateField.value && isValid(parseISO(dateField.value)) ? parseISO(dateField.value) : undefined}
                              onSelect={(date) => dateField.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
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
              onClick={() => append({ date: '', hours: currentSettings.dailyCapacityHours || 0 })}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Capacity Override
            </Button>
          </div>
          <Button type="submit" className="w-full">Apply Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}
