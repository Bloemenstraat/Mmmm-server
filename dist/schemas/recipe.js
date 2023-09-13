import mongoose from "mongoose";
const RecipeSchema = new mongoose.Schema({
    name: String,
    picture: String,
    difficulty: String,
    duration: String,
    calories: Number,
    type: String,
    rating: Number,
    instructions: [String],
    //ingredients: String,//[mongoose.Schema.Types.ObjectId],
    ingredients: [{ _id: false, name: String, quantity: String }]
});
const Recipe = mongoose.model('Recipe', RecipeSchema);
export default Recipe;
//# sourceMappingURL=recipe.js.map