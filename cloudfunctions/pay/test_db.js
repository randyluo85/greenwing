const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-8gax523s60b70149' });
const db = cloud.database();
async function run() {
  const res = await db.collection('orders').orderBy('created_at', 'desc').limit(5).get();
  console.log(JSON.stringify(res.data, null, 2));
}
run();
