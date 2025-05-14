/**
 * @swagger
 * components:
 *   schemas:
 *     Ride:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID univoco del viaggio
 *         driver:
 *           $ref: '#/components/schemas/User'
 *         startPoint:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *         endPoint:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *         departureTime:
 *           type: string
 *           format: date-time
 *         availableSeats:
 *           type: integer
 *         price:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         rating:
 *           type: number
 *         avatar:
 *           type: string
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */