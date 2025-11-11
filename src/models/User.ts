import mongoose, { Schema, Document } from "mongoose";

export interface UserDocument extends Document {
    email: string;
    name: string;
    passwordHash: string;
    publicKey?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
    {
        email: {type: String, required: true, unique: true, index: true},
        name: {type: String, required: true},
        passwordHash: {type: String, required: true },
        publicKey: {type: String }
    },
    { timestamps: true }
);

export const User = mongoose.model<UserDocument>("User", UserSchema);