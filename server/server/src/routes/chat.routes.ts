
import { Router } from "express";
import { sendMessage } from "../controllers/chat.controller.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: College chatbot APIs
 */

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send a message to the college chatbot
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: What courses are offered by the college?
 *     responses:
 *       200:
 *         description: Chatbot response generated successfully
 *       400:
 *         description: Message is required
 */
router.post("/message", sendMessage);

export default router;
