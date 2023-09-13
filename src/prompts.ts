export const generateRecipe = (recipe, language) => `You are a chef. 
I would need you to generate the instructions in ${language} for the following recipe: ${recipe}. 
Give the recipe and say nothing else.
The recipe should follow this format (don't forget the semicolons) :
;difficulty: [recipe's difficulty]
;duration: [how long to prepare the recipe in minutes]
;calories: [calories in the dish in kcal]
;type: [vegetarian or not]
;ingredients: [numbered list of ingredients in the following format : [ingredient name ~ quantity]]
;instructions: [numbered list of instructions in ${language}]`;

/*export const searchRecipes = (ingredients, preferences) => `You are a chef. 
I would need you to generate 7 different recipes with the following ingredients: ${ingredients}. 
You are allowed to use other ingredients. 
The recipes must be ${preferences.diet} and cater to the following allergies: ${preferences.allergies}. 
Give the name of the recipes in ${preferences.language} only and say nothing else before or after.`;*/

export const searchRecipes = (language) => `You are a chef. 
I would need you to generate 7 different recipes corresponding to my preferences.
If I have no mentioned ingredients before, use whatever ingredients you like.  
In your next message, give me the recipes and don't ask me any question.
Give the name of the recipes in ${language} only and say nothing else before or after.`;

export const generateDish = (recipe) => `${recipe}, photo realistic style, realistic, delicious, food`;

export const chefBehaviour = (language) => `You are a chef specialized in selecting recipes. 
You speak ${language}.
Your only objective is to ask questions regarding a person's diatery preferences, such as allergies.
You also need to ask the person what ingredients she wants in her recipes.
Don't stray in meaningless discussions.
`;

export const summarizePrompt = (dialogue) => `Here is dialogue between a chef and Joe. 
I need you to extract Joe's diatary preferences from this dialogue:
${dialogue}
`