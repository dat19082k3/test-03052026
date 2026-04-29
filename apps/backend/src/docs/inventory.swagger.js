/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryVoucherDetail:
 *       type: object
 *       required:
 *         - item_id
 *         - quantity_by_doc
 *         - quantity_actual
 *         - unit_price
 *       properties:
 *         item_id:
 *           type: string
 *           format: uuid
 *         item_code_snapshot:
 *           type: string
 *         item_name_snapshot:
 *           type: string
 *         unit_snapshot:
 *           type: string
 *         quantity_by_doc:
 *           type: number
 *         quantity_actual:
 *           type: number
 *         unit_price:
 *           type: number
 *         sort_order:
 *           type: integer
 *     
 *     InventoryVoucher:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         voucher_number:
 *           type: string
 *           example: "NK000001"
 *         voucher_date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [draft, posted, cancelled]
 *         warehouse_id:
 *           type: string
 *           format: uuid
 *         deliverer_name:
 *           type: string
 *         total_amount_numeric:
 *           type: number
 *         replaced_from_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         cancelled_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancel_reason:
 *           type: string
 *           nullable: true
 *         details:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryVoucherDetail'
 */

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: API logic for Inventory Voucher State Machine (Draft -> Posted -> Cancelled)
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers/template:
 *   get:
 *     summary: Get a voucher template
 *     description: Returns a default draft template with an auto-generated unique voucher number (e.g. NK000001).
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Initial voucher state for UI forms
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryVoucher'
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers:
 *   get:
 *     summary: List vouchers
 *     description: Retrieve a paginated list of vouchers.
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list
 *   post:
 *     summary: Create a draft voucher
 *     description: Initiates a new voucher in 'draft' status.
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryVoucher'
 *     responses:
 *       201:
 *         description: Draft created
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers/{id}:
 *   get:
 *     summary: Get voucher details
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Voucher with details
 *   put:
 *     summary: Update a draft voucher
 *     description: Modifies a voucher. ONLY allowed if status is 'draft'.
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryVoucher'
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid state (not draft)
 *   delete:
 *     summary: Hard delete a draft
 *     description: Permanently removes a voucher. ONLY allowed if status is 'draft'.
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Deleted
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers/{id}/post:
 *   post:
 *     summary: Post a voucher
 *     description: Transitions status from 'draft' to 'posted'. Once posted, the voucher becomes immutable.
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Successfully posted
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers/{id}/cancel:
 *   post:
 *     summary: Cancel a voucher
 *     description: Marks a voucher as 'cancelled'. Requires a reason. Data is preserved for audit.
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cancelled
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers/{id}/replace:
 *   post:
 *     summary: Replace a cancelled voucher
 *     description: Creates a new 'draft' voucher linked to the cancelled one via 'replaced_from_id'.
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryVoucher'
 *     responses:
 *       201:
 *         description: New draft created as replacement
 */
