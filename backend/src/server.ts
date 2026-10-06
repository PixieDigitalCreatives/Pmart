import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './utils/logger';

import { createServer } from 'http';
import { initSocket } from './config/socket';

const startServer = async () => {
  await connectDB();

  const server = createServer(app);
  initSocket(server);

  const { OrderAutomation } = require('./modules/order/order.automation');
  OrderAutomation.startRecoverySweeper();

  server.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

startServer();
// trigger restart
