import User from "../schemas/user.js";

async function subscribed (req, res, next) {
    const user = await User.findOne({"_id": req.user._id});

    console.log(user.status)

    if (user.status == 'subscribed' || user.status == 'trial')
        return next(); 

    res.sendStatus(401);
}

async function unsubscribed (req, res, next) { 
    const user = await User.findOne({"_id": req.user._id});

    if (user.status == 'subscribed')
        return res.sendStatus(401);

    next();
}

export { subscribed, unsubscribed };