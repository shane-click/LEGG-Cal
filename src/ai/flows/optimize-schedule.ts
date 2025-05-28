
// Optimize the production schedule using AI, considering capacity and job priorities.
'use server';
/**
 * @fileOverview An AI agent that optimizes the production schedule.
 *
 * - optimizeSchedule - A function that handles the schedule optimization process.
 * - OptimizeScheduleInput - The input type for the optimizeSchedule function.
 * - OptimizeScheduleOutput - The return type for the optimizeSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeScheduleInputSchema = z.object({
  scheduleData: z
    .string()
    .describe(
      'A JSON string representing the current production schedule. This JSON includes a "jobs" array and a "resources" object. The "resources" object contains "dailyCapacityByDay" (with keys "monday", "tuesday", "wednesday", "thursday", "friday" and their respective hour capacities) and an optional "capacityOverrides" array (each item having "date" and "hours"). It also includes a "currentDate" for planning reference.'
    ),
  constraints: z
    .string()
    .describe(
      'A natural language description of the constraints and objectives for optimizing the schedule. For example, "Prioritize urgent jobs. Maximize throughput for the next two weeks. Account for machine M1 being down on YYYY-MM-DD."'
    ),
});
export type OptimizeScheduleInput = z.infer<typeof OptimizeScheduleInputSchema>;

const OptimizeScheduleOutputSchema = z.object({
  optimizedSchedule: z
    .string()
    .describe(
      'A JSON string representing the optimized production schedule, taking into account the provided constraints and priorities. The output should be a JSON object containing a "jobs" array, where each job has an "id" and "scheduledSegments" (array of {date: "YYYY-MM-DD", hours: number}).'
    ),
  explanation: z
    .string()
    .describe(
      'A natural language explanation of the changes made to the schedule and the reasoning behind them.'
    ),
});
export type OptimizeScheduleOutput = z.infer<typeof OptimizeScheduleOutputSchema>;

export async function optimizeSchedule(input: OptimizeScheduleInput): Promise<OptimizeScheduleOutput> {
  return optimizeScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeSchedulePrompt',
  input: {schema: OptimizeScheduleInputSchema},
  output: {schema: OptimizeScheduleOutputSchema},
  prompt: `You are an AI production scheduling assistant. Your task is to optimize a production schedule based on given job data, resource capacities, and user-defined constraints.

  Here is the current production schedule data in JSON format:
  {{{scheduleData}}}

  The 'scheduleData' contains:
  - 'jobs': An array of jobs to be scheduled, including their ID, required hours, urgency, preferred start date, and current assignments (if any).
  - 'resources':
    - 'dailyCapacityByDay': An object specifying default work hours for each weekday (e.g., "monday": 8, "tuesday": 8, ...).
    - 'capacityOverrides': An array of objects ({date: "YYYY-MM-DD", hours: number}) that specify capacity for specific dates, taking precedence over 'dailyCapacityByDay'.
    - No work should be scheduled on Saturdays or Sundays unless explicitly stated in an override (though typically overrides are for weekdays).
  - 'currentDate': The starting date for planning.

  Here are the user-defined constraints and objectives for optimization:
  {{{constraints}}}

  Based on the 'scheduleData' and the specified 'constraints', generate an optimized production schedule.
  The output 'optimizedSchedule' must be a JSON string containing an object with a "jobs" key. This "jobs" key should hold an array where each element represents a job and includes:
  - "id": The job's original ID.
  - "name": The job's name (for easier identification, can be copied from input if available).
  - "scheduledSegments": An array of objects, where each object is { "date": "YYYY-MM-DD", "hours": number_of_hours_assigned_on_that_date }. Ensure all dates are weekdays.

  Also, provide a clear and concise 'explanation' (natural language text) of the changes made and the reasoning behind them.

  Ensure that the optimized schedule adheres to all capacity constraints (both weekday defaults and specific date overrides) and user-defined priorities (e.g., urgent jobs, client requests).
  Distribute job hours across consecutive weekdays, respecting daily capacities.
  Prioritize urgent orders as specified.
  Return the optimized schedule as a JSON string and the explanation as text.
  `,
});

const optimizeScheduleFlow = ai.defineFlow(
  {
    name: 'optimizeScheduleFlow',
    inputSchema: OptimizeScheduleInputSchema,
    outputSchema: OptimizeScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
