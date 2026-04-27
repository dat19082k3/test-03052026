import './config/env';
import app from './app';
import { logger } from './utils/logger';
import { config } from './config/env';

const port = config.port;

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
