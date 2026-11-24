
import { Router } from "express";
import { startCall } from "../controllers/vapi.controller.ts";
import authMiddleware from "../middleware/auth.middleware.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: VAPI
 *     description: Outbound voice call APIs
 */

/**
 * @swagger
 * /api/vapi/call:
 *   post:
 *     summary: Initiate an outbound call
 *     tags: [VAPI]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               preferredCourse:
 *                 type: string
 *                 example: Computer Science
 *     responses:
 *       200:
 *         description: Call initiated successfully
 *       400:
 *         description: Valid phone number is required
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.post("/call", authMiddleware, startCall);

export default router;
