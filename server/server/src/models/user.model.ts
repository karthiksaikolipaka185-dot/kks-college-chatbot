import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  googleId?: string;
  avatar?: string | null;
  authProvider?: "local" | "google";
  created_at: Date;
}

const UserSchema: Schema<IUser> = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [100, "Name cannot exceed 100 characters"],
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      "Please provide a valid email address",
    ],
  },

  password: {
    type: String,
    required: [
      function (this: IUser) {
        return this.authProvider !== "google";
      },
      "Password is required",
    ],
    minlength: [6, "Password must be at least 6 characters"],
  },

  phone: {
    type: String,
    trim: true,
    default: null,
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },

  avatar: {
    type: String,
    default: null,
  },

  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  created_at: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
