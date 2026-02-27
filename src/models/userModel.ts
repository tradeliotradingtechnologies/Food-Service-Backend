import { Schema, model } from "mongoose";
import type { IUser } from "../types/model.types.js";

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordConfirm: {
    type: String,
    validate: [
      function (this: IUser, val: string) {
        return this.password === val;
      },
      "Passwords do not match",
    ],
  },
  role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
});

const User = model("User", userSchema);

export default User;
