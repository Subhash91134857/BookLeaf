const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const logger = require('../utils/logger');

const migrate = async () => {
    await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    logger.info('✅ Database schema is up to date');
};
module.exports = { migrate };

if (require.main === module) migrate().then(() => pool.end()).catch((e) => { logger.error(e); process.exit(1); });
