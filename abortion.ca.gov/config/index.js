const main = require('./config.json'); // Default settings.

/**
 * Handler for site configurations and global content settings.
 * Use this to extend global site setting for various rendering environments.
 * 
 * @returns object - Default data for site configurations
 */
const getConfig = () => {
    return main;
};

module.exports = getConfig();