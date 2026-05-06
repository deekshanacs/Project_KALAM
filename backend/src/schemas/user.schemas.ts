import { z } from 'zod';
import { AvailabilityStatus } from '../_shared';

export const UpdateStatusSchema = z.object({
  availabilityStatus: z.nativeEnum(AvailabilityStatus),
});

export const UpdateSupervisorSchema = z.object({
  supervisorId: z.string().nullable(),
});

export const IdParamSchema = z.object({
  id: z.string().min(1),
});
