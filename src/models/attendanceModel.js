import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Attendance = sequelize.define("Attendance", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    latitude: { type: DataTypes.FLOAT, allowNull: false },
    longitude: { type: DataTypes.FLOAT, allowNull: false },
  }, {
    freezeTableName: true, // Prevent Sequelize from pluralizing the table name
    tableName: "attendances", // Explicitly set the table name
  });

  return Attendance;
};
