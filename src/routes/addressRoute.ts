import { Router } from "express";
import * as ctrl from "../controllers/addressController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../schema/addressSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// All address routes require authentication
router.use(authenticate);

router.post("/", validate(createAddressSchema), ctrl.createAddress);
router.get("/", ctrl.getUserAddresses);
router.get("/:id", validate(paramIdSchema), ctrl.getAddressById);
router.patch("/:id", validate(updateAddressSchema), ctrl.updateAddress);
router.delete("/:id", validate(paramIdSchema), ctrl.deleteAddress);

export default router;
