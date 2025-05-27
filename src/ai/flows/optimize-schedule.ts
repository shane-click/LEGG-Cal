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
      'A JSON string representing the current production schedule. Include details about jobs, machines, staff, capacity, and priorities.'
    ),
  constraints: z
    .string()
    .describe(
      'A natural language description of the constraints and objectives for optimizing the schedule, including machine capacity, staff availability, job priorities, and any other relevant factors.'
    ),
});
export type OptimizeScheduleInput = z.infer<typeof OptimizeScheduleInputSchema>;

const OptimizeScheduleOutputSchema = z.object({
  optimizedSchedule: z
    .string()
    .describe(
      'A JSON string representing the optimized production schedule, taking into account the provided constraints and priorities.'
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
  prompt: `You are an AI production scheduling assistant. Your task is to optimize a production schedule based on given constraints and priorities.

  Here is the current production schedule in JSON format: {{{scheduleData}}}

  Here are the constraints and objectives for optimization: {{{constraints}}}

  Based on the current schedule and the specified constraints, generate an optimized production schedule in JSON format. Also, provide a clear and concise explanation of the changes made and the reasoning behind them.

  Ensure that the optimized schedule adheres to all constraints, including machine capacity, staff availability, and job priorities. Prioritize urgent orders as specified in the constraints.

  Return the optimized schedule as a JSON string and the explanation as a natural language text.
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
