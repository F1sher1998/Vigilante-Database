import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function requireAuth(req, res, next) {
  try{
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      const err = new Error("Unauthorized")
      err.status = 401;
      throw err;
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id username");
    if(!user) {
      const err = new Error("Unauthorized")
      err.status = 401;
      throw err;
    }

    req.user = user;
    next();
  }  catch(err){
    if(err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      err.status = 401;
    }
    next(err);
  }
}