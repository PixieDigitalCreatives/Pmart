const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');

async function start() {
  console.log('Starting MongoMemoryServer...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log('MongoMemoryServer started at', uri);
  
  process.env.MONGODB_URI = uri;
  
  console.log('Seeding demo products from JSON...');
  const seeder = spawn('npx', ['ts-node', 'src/scripts/seed-json.ts'], {
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: uri },
    shell: true
  });

  seeder.on('exit', (seedCode) => {
    if (seedCode !== 0) {
      console.error(`Seeding failed with code ${seedCode}`);
      return mongod.stop().then(() => process.exit(seedCode));
    }
    
    console.log('Starting backend server...');
    const backend = spawn('npx', ['nodemon', 'src/server.ts'], { 
      stdio: 'inherit', 
      env: { ...process.env, MONGODB_URI: uri },
      shell: true
    });
  
  backend.on('exit', async (code) => {
    console.log(`Backend exited with code ${code}`);
    await mongod.stop();
    process.exit(code);
  });
  });
}

start().catch(console.error);
