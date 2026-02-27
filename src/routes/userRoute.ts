import { Router } from "express";
import { signup } from "../controllers/authController.js";
import validate from "../middleware/validate.js";
import { signupSchema } from "../schema/userSchema.js";

const router = Router();

router.post("/signup", validate(signupSchema), signup);


export default router