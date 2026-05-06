import { RequestHandler } from 'express';
import * as taskService from '../services/task.service';
import type { CreateTaskDto } from '../schemas/task.schemas';
import { TaskStatus } from '@tms/shared';

export const listTasks: RequestHandler = async (req, res, next) => {
  try {
    const result = await taskService.getTasks(req.user!.id, req.query as never);
    res.json({ data: result });
  } catch (err) { next(err); }
};

export const createTaskHandler: RequestHandler = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body as CreateTaskDto, req.user!.id);
    res.status(201).json({ data: { task } });
  } catch (err) { next(err); }
};

export const updateTaskHandler: RequestHandler = async (req, res, next) => {
  try {
    const task = await taskService.updateTaskStatus(
      req.params['id']!,
      (req.body as { status: TaskStatus }).status,
      req.user!.id
    );
    res.json({ data: { task } });
  } catch (err) { next(err); }
};

export const deleteTaskHandler: RequestHandler = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params['id']!, req.user!.id);
    res.json({ data: { message: 'Task deleted' } });
  } catch (err) { next(err); }
};

export const addCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    const comment = await taskService.addComment(
      req.params['id']!,
      (req.body as { content: string }).content,
      req.user!.id
    );
    res.status(201).json({ data: { comment } });
  } catch (err) { next(err); }
};

export const getCommentsHandler: RequestHandler = async (req, res, next) => {
  try {
    const comments = await taskService.getComments(req.params['id']!);
    res.json({ data: { comments } });
  } catch (err) { next(err); }
};

export const logTimeHandler: RequestHandler = async (req, res, next) => {
  try {
    const { hours, note } = req.body as { hours: number; note?: string };
    const timeLog = await taskService.logTime(req.params['id']!, hours, note, req.user!.id);
    res.status(201).json({ data: { timeLog } });
  } catch (err) { next(err); }
};

export const getTimeLogsHandler: RequestHandler = async (req, res, next) => {
  try {
    const result = await taskService.getTimeLogs(req.params['id']!);
    res.json({ data: result });
  } catch (err) { next(err); }
};
