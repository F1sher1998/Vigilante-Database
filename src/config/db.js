import mongoose from 'mongoose';

export default async function connectDB(){
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB is missing URI");
  try{
    await mongoose.connect(uri,  {dbName: "VigilanteDB"});
  } catch (error){
    console.error(`An error has occurred while connecting to database: ${error.message}`)
    process.exit(1)
  }
}

