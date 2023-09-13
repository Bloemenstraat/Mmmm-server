import { Configuration, OpenAIApi } from "openai";
import { Router } from "express";
import dotenv from 'dotenv';
import auth from "../middlewares/auth.js";
import { chefBehaviour, generateDish, generateRecipe, searchRecipes } from "../prompts.js";
import Recipe from "../schemas/recipe.js";
import User from "../schemas/user.js";
import { writeFileSync } from "fs";
import fetch from "node-fetch";
import Dialogue from "../schemas/dialogue.js";
import { subscribed } from "../middlewares/subscription.js";
dotenv.config();
const chefRouter = Router();
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
// Parse the list of recipes
function parseRecipeList(content) {
    let recipes = [...content.matchAll(/[0-9]\.(.+)/g)];
    return [recipes[0][1], recipes[1][1], recipes[2][1], recipes[3][1], recipes[4][1], recipes[5][1], recipes[6][1]];
}
// Parse the recipes
function parseRecipe(content, name) {
    content = content.replace(/\n/g, '');
    //const regex = /difficulty:(.+)duration:(.+)calories:(.+)type:(.+)ingredients:(.+)instructions:(.+)/i;
    const regex = /;.+:(.+);.+:(.+);.+:(.+);.+:(.+);.+:(.+);.+:(.+)/i;
    const match = content.match(regex);
    if (match == null) {
        console.log('ERROR WHILE PARSING');
        console.log(content);
        return null;
    }
    // Split instructions to list
    let instructions = match[6].split(/[0-9]+\./);
    instructions.shift(); //First element is always empty
    // Create ingredient object
    // TODO : sometimes, there useless parentheses, parse them out
    let ingredients = match[5].split(/[0-9]+\./);
    ingredients.shift(); //First element is always empty
    let parsedIngredients = ingredients.map((e) => {
        let [name, quantity] = e.split('~');
        return { name: name, quantity: quantity };
    });
    console.log(ingredients);
    // Create JSON from the raw text
    const recipe = {
        name: name,
        picture: process.env.DEFAULT_RECIPE_PICTURE,
        difficulty: match[1],
        duration: parseInt(match[2].match(/ *([0-9]*)/)[1]),
        calories: parseInt(match[3].match(/ *([0-9]*)/)[1]),
        type: match[4],
        ingredients: parsedIngredients,
        instructions: instructions,
    };
    return recipe;
}
// Create meal plan
async function mealPlanning(user) {
    console.log('planning...');
    try {
        let recipeList = [];
        //let dishPicture: AxiosResponse<ImagesResponse, any>;
        let dishURL;
        // Get chat history of the user
        let dialogue = await Dialogue.findOne({ '_id': user.dialogueId });
        let chat = JSON.parse(JSON.stringify(dialogue.chat)); // TODO : really bad, find another way to make object compatible with OpenAI API
        let messages = [...chat, { role: "user", content: searchRecipes(user.language) }];
        // Get a list of recipes        
        let chat_completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
        });
        const recipes = parseRecipeList(chat_completion.data.choices[0].message.content);
        for (let i = 0; i < 7; i++) {
            chat_completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: generateRecipe(recipes[i], user.language) }],
            });
            const recipe = parseRecipe(chat_completion.data.choices[0].message.content, recipes[i]);
            if (recipe == null) {
                //i--;
                console.log('WTF');
                continue;
            }
            //return res.status().send("couldn't create recipe");
            // Check if recipe exists
            let oldRecipe = await Recipe.findOne({ 'name': recipe.name });
            if (oldRecipe != null) {
                recipeList.push(oldRecipe._id);
                continue;
            }
            // Create image for the dish
            let dishPicture = await openai.createImage({
                prompt: generateDish(recipes[i]),
                n: 1,
                size: '256x256'
            });
            dishURL = dishPicture.data.data[0].url;
            // Save image to disk
            const imgResult = await fetch(dishURL);
            const blob = await imgResult.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());
            const filename = `/dishes/recipe_${Date.now()}.png`;
            writeFileSync(`./public${filename}`, buffer);
            // Save the recipe to DB
            let newRecipe = new Recipe({ ...recipe, picture: filename });
            await newRecipe.save();
            // Add recipe to user meal plan
            recipeList.push(newRecipe._id);
            console.log(`recipe ${i} complete`);
        }
        await User.updateOne({ "_id": user._id }, { mealPlan: recipeList });
    }
    catch (e) {
        console.log('ERROOR');
        console.log(e.message);
        console.log(e.stack);
        await User.updateOne({ "_id": user._id }, { error: true });
    }
    finally {
        await User.updateOne({ "_id": user._id }, { pending: false });
        console.log('Planning over');
    }
}
// ---------- ROUTES ---------------
// Create the weekly meal plan
chefRouter.get('/chef', [auth, subscribed], async (req, res) => {
    const user = await User.findOne({ "_id": req.user._id }); //??
    if (user.pending)
        return res.status(409).send('recipe is generating');
    await User.updateOne({ "_id": req.user._id }, { pending: true, error: false, mealPlan: [] });
    res.status(200).send('Success');
    mealPlanning(user);
});
// Get the user's mealplan
chefRouter.get('/mealplan', auth, async (req, res) => {
    const user = await User.findOne({ "_id": req.user._id });
    const recipes = await Recipe.find({ '_id': { $in: user.mealPlan } });
    res.status(200).send(recipes);
});
// Get the system prompt for the chef bot 
// TODO : Remove, useless
chefRouter.get('/chat', [auth, subscribed], async (req, res) => {
    const user = await User.findOne({ "_id": req.user._id });
    res.status(200).json([
        { "role": "system", "content": chefBehaviour(user.language) },
        { "role": "assistant", "content": "Welcome to the zetsubou restaurant" },
    ]);
});
// Chatting with the chef bot
chefRouter.post('/chat', [auth, subscribed], async (req, res) => {
    let chat_completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: req.body,
    });
    res.status(200).send(chat_completion.data.choices[0].message.content);
});
export default chefRouter;
//# sourceMappingURL=chefbot.js.map