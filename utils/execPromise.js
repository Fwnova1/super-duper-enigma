/**
 * Utility for executing shell commands as promises
 */
const { exec } = require('child_process');

/**
 * Promisified version of exec
 * @param {string} command - Command to execute
 * @returns {Promise<{stdout: string, stderr: string}>} - Promise with stdout and stderr
 */
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
};

module.exports = { execPromise }; 