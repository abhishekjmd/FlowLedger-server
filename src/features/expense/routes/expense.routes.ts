import { Router } from "express";
import { expenseController } from "../controllers/expense.controller";
import { groupController } from "../controllers/group.controller";
import { recurringExpenseController } from "../controllers/recurring-expense.controller";
import { requireAuth } from "@/middleware/clerk.middleware";

const router = Router();

router.use(requireAuth);

// Expense routes
router.post("/", expenseController.create);
router.get("/", expenseController.list);
router.patch("/:id", expenseController.update);
router.delete("/:id", expenseController.delete);

// Metadata routes
router.get("/categories", expenseController.listCategories);

// Recurring Expense routes
router.post("/recurring", recurringExpenseController.create);
router.get("/recurring", recurringExpenseController.list);
router.patch("/recurring/:id", recurringExpenseController.update);
router.delete("/recurring/:id", recurringExpenseController.delete);

// Group routes
router.post("/groups", groupController.create);
router.get("/groups", groupController.list);
router.get("/groups/:id", groupController.getDetails);
router.post("/groups/:id/invite", groupController.invite);
router.get("/groups/invites/:token", groupController.getInviteInfo);
router.post("/groups/invites/accept", groupController.acceptInvite);
router.post("/groups/:id/settle", groupController.settle);

export default router;
