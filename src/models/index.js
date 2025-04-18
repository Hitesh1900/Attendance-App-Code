import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import UserModel from "./userModel.js";
import AttendanceModel from "./attendanceModel.js";

dotenv.config(); 


const sequelize = new Sequelize(process.env.DB_URL, { 
  dialect: "postgres", 
  logging: console.log 
});


const User = UserModel(sequelize);
const Attendance = AttendanceModel(sequelize);


User.hasMany(Attendance, { foreignKey: "userId" });
Attendance.belongsTo(User, { foreignKey: "userId" });


export { sequelize, User, Attendance };
export default { sequelize, User, Attendance };

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB Connected");

    
    await sequelize.sync({ alter: true }); 
    console.log("✅ Tables Synced");
  } catch (err) {
    console.error("❌ Error connecting to DB:", err);
  }
};
