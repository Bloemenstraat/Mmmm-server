import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../schemas/user.js';
import auth from '../middlewares/auth.js';
import dotenv from 'dotenv';
dotenv.config();
const authRouter = express.Router();
//Google registration
authRouter.post('/google/register', async (req, res) => {
    let user = await User.findOne({ 'email': req.body.email });
    if (user != null) {
        if (user.email != req.body.email || user.googleID != req.body.id)
            return res.status(409).send('Error while logging in.');
    }
    else {
        user = new User({
            name: req.body.name,
            googleID: req.body.id,
            email: req.body.email,
            status: 'trial',
            picture: req.body.picture,
            preferences: '',
        });
        console.log(user);
        await user.save();
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    return res.status(200).header('auth-token', token).send(user);
});
//Simple registration
authRouter.post('/register', async (req, res) => {
    const user = await User.findOne({ 'email': req.body.email });
    if (user != null)
        return res.status(409).send('User already exists.');
    const newUser = new User({
        name: 'Stranger',
        password: req.body.password,
        email: req.body.email,
        status: 'trial',
        picture: process.env.DEFAULT_PROFILE_PICTURE,
        preferences: '',
    });
    await newUser.save();
    res.sendStatus(200);
});
//Simple Login
authRouter.post('/login', async (req, res) => {
    const user = await User.findOne({ 'email': req.body.email });
    if (user == null)
        return res.status(401).send('Wrong email');
    //comparer mot de passe
    if (user.password != req.body.password)
        return res.status(401).send('Wrong password');
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.status(200).header('auth-token', token).send(user);
});
//Get profile info
authRouter.get('/info', auth, async (req, res) => {
    const user = await User.findOne({ "_id": req.user._id });
    return res.status(200).send(user);
});
//TODO:
//- Improve validation using Joi
//- Check if a user already exists
export default authRouter;
//# sourceMappingURL=auth.js.map