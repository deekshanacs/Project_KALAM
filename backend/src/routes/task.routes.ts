import { Router } from 'express';
import { zodValidate } from '../middleware/validate';
import {
  CreateTaskSchema, UpdateStatusSchema, TaskListQuerySchema,
  CreateCommentSchema, CreateTimeLogSchema,
} from '../schemas/task.schemas';
import { IdParamSchema } from '../schemas/user.schemas';
import {
  listTasks, createTaskHandler, updateTaskHandler, deleteTaskHandler,
  addCommentHandler, getCommentsHandler, logTimeHandler, getTimeLogsHandler,
} from '../controllers/task.controller';

const router = Router();

router.get('/', zodValidate(TaskListQuerySchema, 'query'), listTasks);
router.post('/', zodValidate(CreateTaskSchema), createTaskHandler);
router.patch('/:id/status', zodValidate(IdParamSchema, 'params'), zodValidate(UpdateStatusSchema), updateTaskHandler);
router.delete('/:id', zodValidate(IdParamSchema, 'params'), deleteTaskHandler);
router.post('/:id/comments', zodValidate(IdParamSchema, 'params'), zodValidate(CreateCommentSchema), addCommentHandler);
router.get('/:id/comments', zodValidate(IdParamSchema, 'params'), getCommentsHandler);
router.post('/:id/time-logs', zodValidate(IdParamSchema, 'params'), zodValidate(CreateTimeLogSchema), logTimeHandler);
router.get('/:id/time-logs', zodValidate(IdParamSchema, 'params'), getTimeLogsHandler);

export { router as taskRouter };
