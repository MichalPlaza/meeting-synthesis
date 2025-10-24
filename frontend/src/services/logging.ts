
import log from 'loglevel';

const isDevelopment = process.env.NODE_ENV !== 'production';

log.setLevel(isDevelopment ? 'trace' : 'warn');

export default log;
