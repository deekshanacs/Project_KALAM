import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { zodValidate } from '../middleware/validate';
import { RegisterSchema, LoginSchema, RefreshTokenSchema, LogoutSchema } from '../schemas/auth.schemas';
import { register, login, refresh, logout, getMe } from '../controllers/auth.controller';

const router = Router();

router.post('/register', zodValidate(RegisterSchema), register);
router.post('/login', zodValidate(LoginSchema), login);
router.post('/refresh', zodValidate(RefreshTokenSchema), refresh);
router.post('/logout', authMiddleware, zodValidate(LogoutSchema), logout);
router.get('/me', authMiddleware, getMe);

export { router as authRouter };
