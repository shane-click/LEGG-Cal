'use client';

import type { ScheduleSettings } from '@/types/scheduler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings } from 'lucide-react';

const settingsSchema = z.object({
  dailyCapacityHours: z.coerce.number().min(1, 'Daily capacity must be at least 1 hour'),
  // TODO: Add capacityOverrides UI if needed
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
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      dailyCapacityHours: currentSettings.dailyCapacityHours,
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    onSettingsChange({
      ...currentSettings, // Preserve other settings like overrides
      dailyCapacityHours: data.dailyCapacityHours,
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Schedule Settings
        </CardTitle>
        <CardDescription>Adjust general scheduling parameters.</CardDescription>
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
          {/* Placeholder for capacity overrides editor */}
          {/* <div>
            <Label>Capacity Overrides (Advanced)</Label>
            <p className="text-sm text-muted-foreground">
              Specify different capacities for specific dates. (UI not yet implemented)
            </p>
          </div> */}
          <Button type="submit" className="w-full">Apply Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}
