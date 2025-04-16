import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import UserModel from "./userModel.js";
import AttendanceModel from "./attendanceModel.js";

dotenv.config(); // Load environment variables

// Initialize Sequelize instance
const sequelize = new Sequelize(process.env.DB_URL, { 
  dialect: "postgres", 
  logging: console.log // Enable logging for debugging
});

// Initialize models
const User = UserModel(sequelize);
const Attendance = AttendanceModel(sequelize);

// Define relationships
User.hasMany(Attendance, { foreignKey: "userId" });
Attendance.belongsTo(User, { foreignKey: "userId" });

// Export models and Sequelize instance
export { sequelize, User, Attendance };
export default { sequelize, User, Attendance };

// Connect & Sync
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB Connected");

    // Sync all models
    await sequelize.sync({ alter: true }); // Creates or updates tables
    console.log("✅ Tables Synced");
  } catch (err) {
    console.error("❌ Error connecting to DB:", err);
  }
};
