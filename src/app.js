const clusterManager = require('./cluster/clusterManager');

// 
const withCluster = process.env.NODE_ENV === "production" ? false : true
clusterManager.start(withCluster);
