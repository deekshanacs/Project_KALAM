import { Router } from 'express';
import { zodValidate } from '../middleware/validate';
import { UpdateStatusSchema, UpdateSupervisorSchema, IdParamSchema } from '../schemas/user.schemas';
import {
  listUsers, getUser, updateUserStatus, updateUserSupervisor,
  getUserTasksHandler, getUserWorkloadHandler,
} from '../controllers/user.controller';

const router = Router();

router.get('/', listUsers);
router.get('/:id', zodValidate(IdParamSchema, 'params'), getUser);
router.patch('/:id/status', zodValidate(IdParamSchema, 'params'), zodValidate(UpdateStatusSchema), updateUserStatus);
router.patch('/:id/supervisor', zodValidate(IdParamSchema, 'params'), zodValidate(UpdateSupervisorSchema), updateUserSupervisor);
router.get('/:id/tasks', zodValidate(IdParamSchema, 'params'), getUserTasksHandler);
router.get('/:id/workload', zodValidate(IdParamSchema, 'params'), getUserWorkloadHandler);

export { router as userRouter };
