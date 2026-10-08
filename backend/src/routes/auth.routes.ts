import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  rateLimiter(10, 60000),
  validate(registerSchema, 'body'),
  authController.register.bind(authController)
);

router.post(
  '/login',
  rateLimiter(20, 60000),
  validate(loginSchema, 'body'),
  authController.login.bind(authController)
);

router.get('/me', authenticate, authController.getMe.bind(authController));

export default router;
