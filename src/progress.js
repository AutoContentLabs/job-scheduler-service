// progress.js

/**
 * Formats a time in seconds into days, hours, minutes, and seconds.
 * @param {number} seconds - The number of seconds to format.
 * @returns {string} - The formatted time as a string in the format 'Xd Xh Xm Xs'.
 */
function formatTime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
  
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
  
  /**
   * Calculate progress percentage and estimate remaining time.
   * @param {number} tasksProcessed - The number of tasks processed so far.
   * @param {number} totalTasks - The total number of tasks.
   * @param {number} startTime - The start time of the operation (timestamp).
   * @returns {Object} - Contains formatted progress information: percentage, elapsed time, and remaining time.
   */
  function calculateProgress(tasksProcessed, totalTasks, startTime) {
    // Ensure we don't divide by zero
    if (totalTasks === 0) {
      totalTasks = 1;
    }
  
    const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
    const progressPercentage = Math.round((tasksProcessed / totalTasks) * 100);
  
    // Estimate remaining time
    const estimatedTimeRemaining = (elapsedTime / tasksProcessed) * (totalTasks - tasksProcessed);
  
    const formattedElapsedTime = formatTime(elapsedTime); // Format elapsed time
    const formattedEstimatedTimeRemaining = formatTime(estimatedTimeRemaining); // Format remaining time
  
    return {
      progressPercentage,
      formattedElapsedTime,
      formattedEstimatedTimeRemaining,
    };
  }
  
  module.exports = { formatTime, calculateProgress };
  