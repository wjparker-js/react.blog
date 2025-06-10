const axios = require('axios');

async function testServers() {
  console.log('🧪 Testing Server Status...\n');

  const tests = [
    { name: 'Backend API Health', url: 'http://localhost:3001/api/health' },
    { name: 'Backend API Docs', url: 'http://localhost:3001/api/docs' },
    { name: 'Frontend/Gatsby', url: 'http://localhost:8000' },
    { name: 'Admin Dashboard', url: 'http://localhost:8000/admin' }
  ];

  for (const test of tests) {
    try {
      const response = await axios.get(test.url, { timeout: 5000 });
      console.log(`✅ ${test.name}: Running (${response.status})`);
    } catch (error) {
      console.log(`❌ ${test.name}: Not accessible`);
      console.log(`   URL: ${test.url}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   Error: Server not running`);
      }
    }
  }

  // Test Redis
  console.log('\n🔍 Testing Redis...');
  try {
    const redis = require('redis');
    const client = redis.createClient({ host: 'localhost', port: 6379 });
    await client.connect();
    await client.ping();
    console.log('✅ Redis: Connected');
    await client.quit();
  } catch (error) {
    console.log('❌ Redis: Not accessible');
  }

  // Test MySQL
  console.log('\n🔍 Testing MySQL...');
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'SealTeam6',
      database: 'gatsby_blog_cms'
    });
    await connection.execute('SELECT 1');
    console.log('✅ MySQL: Connected');
    await connection.end();
  } catch (error) {
    console.log('❌ MySQL: Not accessible');
  }

  console.log('\n🎯 Test complete!');
}

testServers().catch(console.error); 