import mongoose from "mongoose";

type PreferencesType = {
    language: string;
    allergies: string;
    diet: string;
};

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    picture: String,
    password: String,
    googleID: String,
    status: String,
    mealPlan: [mongoose.Types.ObjectId],
    likes: [String],
    dislikes: [String],
    customerID: String,
    language: { type: String, default: 'English' },
    dialogueId: mongoose.Types.ObjectId,
    trialExpiration: Date,
    pending: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
},  { minimize: false });

const User = mongoose.model('User', userSchema);
export default User;