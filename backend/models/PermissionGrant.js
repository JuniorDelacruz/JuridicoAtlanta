export default (sequelize, DataTypes) => {
  const PermissionGrant = sequelize.define(
    "PermissionGrant",
    {
      subjectType: { type: DataTypes.ENUM("role", "subRole"), allowNull: false },
      subjectValue: { type: DataTypes.STRING(80), allowNull: false }, // ex "juiz", "equipejuridico"
      permissionKey: { type: DataTypes.STRING(120), allowNull: false },
      effect: { type: DataTypes.ENUM("allow", "deny"), allowNull: false, defaultValue: "allow" },
    },
    {
      tableName: "PermissionGrants",
      indexes: [
        {
          unique: true,
          fields: ["subjectType", "subjectValue", "permissionKey"],
          name: "PermissionGrants_unique_subject_perm",
        },
      ],
    }
  );

  PermissionGrant.associate = (models) => {
    PermissionGrant.belongsTo(models.Permission, {
      foreignKey: "permissionKey",
      targetKey: "key",
      as: "permission",
    });
  };

  return PermissionGrant;
};
