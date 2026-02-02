export default (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    "Permission",
    {
      key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      label: { type: DataTypes.STRING(160), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      group: { type: DataTypes.STRING(80), allowNull: true }, // ex: "Lançamentos", "Admin"
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "Permissions" }
  );

  Permission.associate = (models) => {
    Permission.hasMany(models.PermissionGrant, {
      foreignKey: "permissionKey",
      sourceKey: "key",
      as: "grants",
    });
  };

  return Permission;
};
