// 只在数据卷首次初始化时运行：建立本项目的最小权限账号。
db.getSiblingDB('zhiborl').createUser({
  user: 'zhiborl',
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: 'zhiborl' }],
});
