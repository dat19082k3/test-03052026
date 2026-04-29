/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: API endpoints for Inventory Voucher management (Import/Export)
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers:
 *   post:
 *     summary: Create an inventory voucher
 *     description: Create a new inventory voucher along with its details.
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - voucher_number
 *               - voucher_date
 *               - warehouse_id
 *               - total_amount_numeric
 *               - details
 *             properties:
 *               voucher_number:
 *                 type: string
 *               voucher_date:
 *                 type: string
 *                 format: date
 *               unit_name:
 *                 type: string
 *               department_name:
 *                 type: string
 *               debit_account:
 *                 type: string
 *               credit_account:
 *                 type: string
 *               deliverer_name:
 *                 type: string
 *               warehouse_id:
 *                 type: string
 *                 format: uuid
 *               location:
 *                 type: string
 *               reference_source:
 *                 type: string
 *               original_docs_count:
 *                 type: integer
 *               total_amount_numeric:
 *                 type: number
 *               total_amount_words:
 *                 type: string
 *               details:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_id
 *                     - quantity_by_doc
 *                     - quantity_actual
 *                     - unit_price
 *                   properties:
 *                     item_id:
 *                       type: string
 *                       format: uuid
 *                     item_code_snapshot:
 *                       type: string
 *                     item_name_snapshot:
 *                       type: string
 *                     unit_snapshot:
 *                       type: string
 *                     quantity_by_doc:
 *                       type: number
 *                     quantity_actual:
 *                       type: number
 *                     unit_price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Successfully created
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers:
 *   get:
 *     summary: Get all inventory vouchers
 *     description: Retrieve a paginated list of inventory vouchers.
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: A paginated array of vouchers
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers/{id}:
 *   get:
 *     summary: Get a voucher by ID
 *     description: Retrieve detailed information about a specific voucher.
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
 *         description: Specific voucher data
 *       404:
 *         description: Voucher not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers/{id}:
 *   put:
 *     summary: Update a voucher
 *     description: Modify details of an existing inventory voucher.
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/inventory/vouchers/{id}:
 *   delete:
 *     summary: Delete a voucher
 *     description: Soft-delete an inventory voucher.
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
 *         description: Successfully deleted
 *       500:
 *         description: Server error
 */
