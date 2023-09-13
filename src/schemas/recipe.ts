import mongoose from "mongoose"

const RecipeSchema = new mongoose.Schema({
    name: String,
    picture: String,
    difficulty: String, 
    duration: String, //in minutes
    calories: Number, //in kcal
    type: String,
    rating: Number,
    instructions: [String],
    //ingredients: String,//[mongoose.Schema.Types.ObjectId],
    ingredients: [{ _id: false, name: String, quantity: String }]
});

const Recipe = mongoose.model('Recipe', RecipeSchema);
export default Recipe;