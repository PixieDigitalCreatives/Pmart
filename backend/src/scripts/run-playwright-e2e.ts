import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'child_process';
import path from 'path';

async function run() {
  console.log('Starting MongoDB Memory Server ReplSet...');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri = uri.replace(/\/\?/, '/pmart?');
  console.log(`MongoDB Memory Server started at: ${uri}`);

  const env = { ...process.env, MONGODB_URI: uri, NODE_ENV: 'test', PORT: '5000', FIREBASE_PRIVATE_KEY: 'mockkey', JWT_SECRET: 'test' };

  console.log('Running setup-e2e.ts...');
  const setup = spawn('npx', ['ts-node', 'src/scripts/setup-e2e.ts'], {
    cwd: path.resolve(__dirname, '../../'),
    env,
    stdio: 'inherit',
    shell: true
  });

  setup.on('close', code => {
    if (code !== 0) {
      console.error('setup-e2e.ts failed.');
      process.exit(1);
    }
    console.log('Starting backend server...');
    const backend = spawn('npx', ['ts-node', 'src/server.ts'], {
      cwd: path.resolve(__dirname, '../../'),
      env,
      stdio: 'pipe',
      shell: true
    });

  backend.stdout.on('data', data => {
    process.stdout.write(`[Backend] ${data}`);
    if (data.toString().includes('Server running')) {
      console.log('Backend server is ready.');
      runPlaywright(uri, backend, replSet);
    }
  });

  backend.stderr.on('data', data => {
    process.stderr.write(`[Backend Error] ${data}`);
  });

  backend.on('close', code => {
    console.log(`Backend server exited with code ${code}`);
  });
  });
}

function runPlaywright(uri: string, backend: any, replSet: any) {
  console.log('Starting Playwright tests...');
  const env = { ...process.env, MONGODB_URI: uri, VITE_API_URL: 'http://localhost:5000/api', JWT_SECRET: 'test' };
  
  // NOTE: Start frontend server as well if needed? Playwright might need it!
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.resolve(__dirname, '../../..'),
    env,
    stdio: 'pipe',
    shell: true
  });

  frontend.stdout.on('data', data => {
    process.stdout.write(`[Frontend] ${data}`);
  });
  frontend.stderr.on('data', data => {
    process.stderr.write(`[Frontend Error] ${data}`);
  });

  setTimeout(() => {
    console.log('Frontend server assumed ready, starting Playwright...');
    const pw = spawn('npx', ['playwright', 'test'], {
        cwd: path.resolve(__dirname, '../../../e2e'),
        env,
        stdio: 'inherit',
        shell: true
      });

      pw.on('close', async code => {
        console.log(`Playwright tests exited with code ${code}`);
        console.log('Shutting down frontend, backend and MongoDB...');
        frontend.kill();
        backend.kill();
        await replSet.stop();
        process.exit(code || 0);
      });
  }, 5000);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
