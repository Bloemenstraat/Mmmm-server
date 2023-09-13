import express from 'express';
import User from '../schemas/user.js';
import auth from '../middlewares/auth.js';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { subscribed, unsubscribed } from '../middlewares/subscription.js';
import Dialogue from '../schemas/dialogue.js';
import { chefBehaviour } from '../prompts.js';
dotenv.config();
const accountRouter = express.Router();
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY, {
    apiVersion: '2022-11-15', // TODO : check later 
});
// Pay for subscription
// TODO : try ... catch
// TODO : check if already subscribed
accountRouter.post('/subscribe', [auth, unsubscribed], async (req, res) => {
    const priceId = 'price_1NTguQKLNDSdLxzChNpKE8oy'; // Change to accept client stuff
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
            {
                price: priceId,
                // For metered billing, do not pass quantity
                quantity: 1,
            },
        ],
        success_url: `${process.env.STRIPE_REDIRECTION}/`,
        client_reference_id: req.user._id,
    });
    res.status(200).send(session.url);
});
// Portal for managing subscriptions
// TODO
accountRouter.get('/manage-subscription', [auth, subscribed], async (req, res) => {
    const user = await User.findOne({ '_id': req.user._id });
    let returnUrl = `${process.env.STRIPE_REDIRECTION}/dashboard`; //'http://localhost:3000/dashboard';
    let customerId = user.customerID;
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
    res.status(200).send(portalSession.url);
});
// Listen for payment events
// TODO: Webhook signing is recommended, but if the secret is not configured in `config.js`,
// retrieve the event data directly from the request body.
accountRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (e) {
        console.log('Webhook signature verification failed!');
        console.log(e.message);
        return res.status(400).send(e.message);
    }
    const data = event.data;
    const eventType = event.type;
    // Check for event type
    // TODO : Events don't trigger in a definite order. Need to deal with that
    // TODO : save receipts on a DB collection
    // TODO : Check if database updated correctly
    // TODO : handle payment failure and subscription renewal
    // TODO : cancel plan
    switch (eventType) {
        case 'checkout.session.completed':
            await User.findOneAndUpdate({ '_id': data.object.client_reference_id }, { 'status': 'subscribed', 'customerID': data.object.customer });
            console.log('purchase completed');
            break;
        case 'invoice.paid':
            console.log('invoice paid');
            break;
        case 'invoice.payment_succeeded':
            break;
        case 'invoice.payment_failed':
            console.log('payment failed');
            break;
        case 'customer.subscription.updated':
            if (data.object.cancel_at_period_end)
                await User.findOneAndUpdate({ '_id': data.object.client_reference_id }, { 'status': 'limited' });
            else if (!data.object.cancel_at_period_end)
                await User.findOneAndUpdate({ '_id': data.object.client_reference_id }, { 'status': 'subscribed' });
            break;
        default:
            console.log(`Unknown stripe event triggered : ${eventType}`);
    }
    res.sendStatus(200);
});
accountRouter.patch('/onboarding', auth, async (req, res) => {
    const response = await User.findOneAndUpdate({ "_id": req.user._id }, { 'language': req.body.language, 'name': req.body.name });
    if (!response)
        return res.status(504).send('Cannot set name and language');
    return res.status(200).send('Onboarding succesful');
});
// Save the chat data in the DB
accountRouter.post('/save-chat', [auth, subscribed], async (req, res) => {
    const user = await User.findOne({ '_id': req.user._id });
    // TODO : check if the "in" statement is no buggy
    if (user.dialogueId) {
        await Dialogue.findOneAndUpdate({ '_id': user.dialogueId }, { chat: req.body });
        return res.sendStatus(200);
    }
    // req.body.shift(); // Delete the system prompt
    const newDiag = new Dialogue({ 'chat': req.body });
    const result = await newDiag.save();
    await User.findOneAndUpdate({ '_id': req.user._id }, { 'dialogueId': result._id });
    res.sendStatus(200);
});
// Get the chat for a specific user
accountRouter.get('/chat', auth, async (req, res) => {
    const user = await User.findOne({ '_id': req.user._id });
    // TODO : what happened with this line ? 
    // if ('dialogueId' in user)
    if (!user.dialogueId)
        return res.status(200).json([
            { "role": "system", "content": chefBehaviour(user.language) },
            { "role": "assistant", "content": "Welcome to the zetsubou restaurant" },
        ]);
    const dialogue = await Dialogue.findOne({ '_id': user.dialogueId });
    return res.status(200).send(dialogue.chat);
});
// Like a recipe
// TODO : make sure the two requests are made at the same time is this route to avoid too much DB calls
accountRouter.patch('/like', auth, async (req, res) => {
    const user = await User.findOne({ '_id': req.user._id });
    // Check if already liked
    if (user.likes.includes(req.body.recipe_id))
        return res.sendStatus(200);
    if (user.dislikes.includes(req.body.recipe_id)) {
        const i = user.dislikes.indexOf(req.body.recipe_id);
        user.dislikes.splice(i, 1);
        await User.findOneAndUpdate({ '_id': req.user._id }, { 'dislikes': user.dislikes });
    }
    await User.findOneAndUpdate({ '_id': req.user._id }, { 'likes': [...user.likes, req.body.recipe_id] });
    return res.sendStatus(200);
});
// Dislike a recipe
// TODO : same as above
accountRouter.patch('/dislike', auth, async (req, res) => {
    const user = await User.findOne({ '_id': req.user._id });
    // Check if already disliked
    if (user.dislikes.includes(req.body.recipe_id))
        return res.sendStatus(200);
    if (user.likes.includes(req.body.recipe_id)) {
        const i = user.likes.indexOf(req.body.recipe_id);
        user.likes.splice(i, 1);
        await User.findOneAndUpdate({ '_id': req.user._id }, { 'likes': user.likes });
    }
    await User.findOneAndUpdate({ '_id': req.user._id }, { 'dislikes': [...user.dislikes, req.body.recipe_id] });
    return res.sendStatus(200);
});
// Set the user's preferences by deducing them from the chat
// TODO : just a draft for the moment
accountRouter.patch('/preferences', auth, async (req, res) => {
    let dialogue = '';
    for (let i = 1; i < req.body.length; i++) {
        if (req.body[i].role == "user")
            dialogue += `Joe : ${req.body[i].content}`;
        else if (req.body[i].role == "assistant")
            dialogue += `Chef : ${req.body[i].content}`;
    }
    console.log(dialogue);
    return res.sendStatus(200);
});
// TODO : Get profile info: FROM AUTH
export default accountRouter;
//# sourceMappingURL=account.js.map