
import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller.ts";
import authMiddleware from "../middleware/auth.middleware.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and profile APIs
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Avinash
 *               email:
 *                 type: string
 *                 example: avinash@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Required fields missing or password too short
 *       409:
 *         description: Email already registered
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: avinash@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful. Returns JWT token and user details.
 *       400:
 *         description: Email or password missing
 *       401:
 *         description: Invalid email or password
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.get("/me", authMiddleware, getMe);

export default router;
