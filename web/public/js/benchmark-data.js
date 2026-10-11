/**
 * benchmark-data.js — Embedded benchmark data from AES project results
 *
 * Data sourced from:
 *   /Users/adhamhaithameid/Desktop/code/AES/results/benchmark_aggregate.csv
 *   /Users/adhamhaithameid/Desktop/code/AES/results/memory_results.csv
 *
 * ⚠️ This is real measured data from the AES implementation project.
 */

(function (global) {
  'use strict';

  // Aggregate benchmark data (mean, median, stdev across repetitions)
  const aggregateData = [
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 16, count: 10, mean_time_ns: 792, median_time_ns: 417, stdev_time_ns: 680, min_time_ns: 333, max_time_ns: 2000, mean_throughput_mib_s: 30.9528, median_throughput_mib_s: 36.5918, stdev_throughput_mib_s: 15.5703 },
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 1024, count: 10, mean_time_ns: 2167, median_time_ns: 1813, stdev_time_ns: 538, min_time_ns: 1708, max_time_ns: 3000, mean_throughput_mib_s: 474.4749, median_throughput_mib_s: 538.7168, stdev_throughput_mib_s: 106.6279 },
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 102400, count: 10, mean_time_ns: 137042, median_time_ns: 136896, stdev_time_ns: 1105, min_time_ns: 136083, max_time_ns: 139750, mean_throughput_mib_s: 712.6437, median_throughput_mib_s: 713.3609, stdev_throughput_mib_s: 5.6828 },
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 1048576, count: 10, mean_time_ns: 1394229, median_time_ns: 1390896, stdev_time_ns: 8040, min_time_ns: 1385917, max_time_ns: 1413959, mean_throughput_mib_s: 717.2635, median_throughput_mib_s: 718.9612, stdev_throughput_mib_s: 4.1010 },
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 10485760, count: 10, mean_time_ns: 13953258, median_time_ns: 13970063, stdev_time_ns: 38547, min_time_ns: 13888791, max_time_ns: 14002333, mean_throughput_mib_s: 716.6834, median_throughput_mib_s: 715.8165, stdev_throughput_mib_s: 1.9821 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 16, count: 10, mean_time_ns: 746, median_time_ns: 438, stdev_time_ns: 539, min_time_ns: 375, max_time_ns: 1709, mean_throughput_mib_s: 28.9715, median_throughput_mib_s: 34.9539, stdev_throughput_mib_s: 13.3885 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 1024, count: 10, mean_time_ns: 2196, median_time_ns: 1876, stdev_time_ns: 529, min_time_ns: 1708, max_time_ns: 2917, mean_throughput_mib_s: 467.1798, median_throughput_mib_s: 521.7287, stdev_throughput_mib_s: 103.8229 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 102400, count: 10, mean_time_ns: 137412, median_time_ns: 136917, stdev_time_ns: 1461, min_time_ns: 136083, max_time_ns: 140958, mean_throughput_mib_s: 710.7513, median_throughput_mib_s: 713.2515, stdev_throughput_mib_s: 7.4451 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 1048576, count: 10, mean_time_ns: 1395475, median_time_ns: 1393063, stdev_time_ns: 6502, min_time_ns: 1389959, max_time_ns: 1408042, mean_throughput_mib_s: 716.6158, median_throughput_mib_s: 717.8426, stdev_throughput_mib_s: 3.3260 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 10485760, count: 10, mean_time_ns: 13982721, median_time_ns: 13960688, stdev_time_ns: 79769, min_time_ns: 13903292, max_time_ns: 14150416, mean_throughput_mib_s: 715.1892, median_throughput_mib_s: 716.2976, stdev_throughput_mib_s: 4.0591 },
    { implementation: 'openssl-ecb', operation: 'keysetup', input_size_bytes: 16, count: 10, mean_time_ns: 646, median_time_ns: 312, stdev_time_ns: 566, min_time_ns: 250, max_time_ns: 1625, mean_throughput_mib_s: 39.9345, median_throughput_mib_s: 49.0603, stdev_throughput_mib_s: 21.8110 },
    { implementation: 'openssl-ecb', operation: 'keysetup', input_size_bytes: 1024, count: 10, mean_time_ns: 662, median_time_ns: 292, stdev_time_ns: 643, min_time_ns: 250, max_time_ns: 1917, mean_throughput_mib_s: 2617.9369, median_throughput_mib_s: 3344.3921, stdev_throughput_mib_s: 1372.7057 },
    { implementation: 'openssl-ecb', operation: 'keysetup', input_size_bytes: 102400, count: 10, mean_time_ns: 596, median_time_ns: 333, stdev_time_ns: 493, min_time_ns: 250, max_time_ns: 1459, mean_throughput_mib_s: 256388.9436, median_throughput_mib_s: 293262.0120, stdev_throughput_mib_s: 128831.3942 },
    { implementation: 'openssl-ecb', operation: 'keysetup', input_size_bytes: 1048576, count: 10, mean_time_ns: 596, median_time_ns: 312, stdev_time_ns: 481, min_time_ns: 291, max_time_ns: 1417, mean_throughput_mib_s: 2553374.4187, median_throughput_mib_s: 3213830.2686, stdev_throughput_mib_s: 1225151.1376 },
    { implementation: 'openssl-ecb', operation: 'keysetup', input_size_bytes: 10485760, count: 10, mean_time_ns: 642, median_time_ns: 312, stdev_time_ns: 545, min_time_ns: 291, max_time_ns: 1667, mean_throughput_mib_s: 24744782.8093, median_throughput_mib_s: 32138302.6863, stdev_throughput_mib_s: 12446669.3168 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 16, count: 10, mean_time_ns: 1604, median_time_ns: 1250, stdev_time_ns: 968, min_time_ns: 1208, max_time_ns: 4333, mean_throughput_mib_s: 11.0022, median_throughput_mib_s: 12.2070, stdev_throughput_mib_s: 2.8151 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 1024, count: 10, mean_time_ns: 3158, median_time_ns: 2833, stdev_time_ns: 738, min_time_ns: 2709, max_time_ns: 4917, mean_throughput_mib_s: 320.7488, median_throughput_mib_s: 344.7097, stdev_throughput_mib_s: 55.3328 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 102400, count: 10, mean_time_ns: 154721, median_time_ns: 154375, stdev_time_ns: 1085, min_time_ns: 154250, max_time_ns: 157791, mean_throughput_mib_s: 631.2052, median_throughput_mib_s: 632.5911, stdev_throughput_mib_s: 4.3527 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 1048576, count: 10, mean_time_ns: 1568304, median_time_ns: 1566229, stdev_time_ns: 6830, min_time_ns: 1562458, max_time_ns: 1581708, mean_throughput_mib_s: 637.6423, median_throughput_mib_s: 638.4795, stdev_throughput_mib_s: 2.7691 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 10485760, count: 10, mean_time_ns: 15904996, median_time_ns: 15874896, stdev_time_ns: 167464, min_time_ns: 15686666, max_time_ns: 16253459, mean_throughput_mib_s: 628.7955, median_throughput_mib_s: 629.9255, stdev_throughput_mib_s: 6.5700 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 16, count: 10, mean_time_ns: 1221, median_time_ns: 896, stdev_time_ns: 682, min_time_ns: 791, max_time_ns: 2750, mean_throughput_mib_s: 14.8650, median_throughput_mib_s: 17.0393, stdev_throughput_mib_s: 4.8366 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 1024, count: 10, mean_time_ns: 2696, median_time_ns: 2354, stdev_time_ns: 725, min_time_ns: 2166, max_time_ns: 4083, mean_throughput_mib_s: 382.3775, median_throughput_mib_s: 415.1404, stdev_throughput_mib_s: 83.7292 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 102400, count: 10, mean_time_ns: 144950, median_time_ns: 144646, stdev_time_ns: 647, min_time_ns: 144542, max_time_ns: 146166, mean_throughput_mib_s: 673.7366, median_throughput_mib_s: 675.1420, stdev_throughput_mib_s: 2.9890 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 1048576, count: 10, mean_time_ns: 1454308, median_time_ns: 1448772, stdev_time_ns: 21989, min_time_ns: 1437791, max_time_ns: 1512583, mean_throughput_mib_s: 687.7496, median_throughput_mib_s: 690.2409, stdev_throughput_mib_s: 10.1062 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 10485760, count: 10, mean_time_ns: 14429804, median_time_ns: 14414770, stdev_time_ns: 54215, min_time_ns: 14388000, max_time_ns: 14575750, mean_throughput_mib_s: 693.0188, median_throughput_mib_s: 693.7328, stdev_throughput_mib_s: 2.5837 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 16, count: 10, mean_time_ns: 56179, median_time_ns: 55791, stdev_time_ns: 877, min_time_ns: 55667, max_time_ns: 58000, mean_throughput_mib_s: 0.2717, median_throughput_mib_s: 0.2735, stdev_throughput_mib_s: 0.0041 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 1024, count: 10, mean_time_ns: 2775900, median_time_ns: 2775812, stdev_time_ns: 1465, min_time_ns: 2774125, max_time_ns: 2778458, mean_throughput_mib_s: 0.3518, median_throughput_mib_s: 0.3518, stdev_throughput_mib_s: 0.0002 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 102400, count: 10, mean_time_ns: 281930408, median_time_ns: 279141375, stdev_time_ns: 7203937, min_time_ns: 277099834, max_time_ns: 300774209, mean_throughput_mib_s: 0.3466, median_throughput_mib_s: 0.3498, stdev_throughput_mib_s: 0.0084 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 1048576, count: 3, mean_time_ns: 2864519028, median_time_ns: 2862546875, stdev_time_ns: 16398000, min_time_ns: 2849196292, max_time_ns: 2881813916, mean_throughput_mib_s: 0.3491, median_throughput_mib_s: 0.3493, stdev_throughput_mib_s: 0.0020 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 10485760, count: 2, mean_time_ns: 28934930229, median_time_ns: 28934930229, stdev_time_ns: 218483651, min_time_ns: 28780438958, max_time_ns: 29089421500, mean_throughput_mib_s: 0.3457, median_throughput_mib_s: 0.3457, stdev_throughput_mib_s: 0.0026 },
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 16, count: 10, mean_time_ns: 214129, median_time_ns: 185375, stdev_time_ns: 72420, min_time_ns: 184625, max_time_ns: 417583, mean_throughput_mib_s: 0.0756, median_throughput_mib_s: 0.0823, stdev_throughput_mib_s: 0.0144 },
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 1024, count: 10, mean_time_ns: 4595929, median_time_ns: 4235396, stdev_time_ns: 1043910, min_time_ns: 3454667, max_time_ns: 6524792, mean_throughput_mib_s: 0.2216, median_throughput_mib_s: 0.2308, stdev_throughput_mib_s: 0.0454 },
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 102400, count: 10, mean_time_ns: 285911992, median_time_ns: 279705500, stdev_time_ns: 18591056, min_time_ns: 278458542, max_time_ns: 338640208, mean_throughput_mib_s: 0.3427, median_throughput_mib_s: 0.3491, stdev_throughput_mib_s: 0.0192 },
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 1048576, count: 3, mean_time_ns: 3167930833, median_time_ns: 3191166208, stdev_time_ns: 252794250, min_time_ns: 2904321041, max_time_ns: 3408305250, mean_throughput_mib_s: 0.3170, median_throughput_mib_s: 0.3134, stdev_throughput_mib_s: 0.0256 },
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 10485760, count: 2, mean_time_ns: 29050381458, median_time_ns: 29050381458, stdev_time_ns: 21951541, min_time_ns: 29034859375, max_time_ns: 29065903542, mean_throughput_mib_s: 0.3442, median_throughput_mib_s: 0.3442, stdev_throughput_mib_s: 0.0003 },
    { implementation: 'scratch', operation: 'keysetup', input_size_bytes: 16, count: 10, mean_time_ns: 12404, median_time_ns: 12416, stdev_time_ns: 40, min_time_ns: 12333, max_time_ns: 12459, mean_throughput_mib_s: 1.2301, median_throughput_mib_s: 1.2290, stdev_throughput_mib_s: 0.0039 },
    { implementation: 'scratch', operation: 'keysetup', input_size_bytes: 1024, count: 10, mean_time_ns: 14308, median_time_ns: 14292, stdev_time_ns: 45, min_time_ns: 14250, max_time_ns: 14375, mean_throughput_mib_s: 68.2521, median_throughput_mib_s: 68.3293, stdev_throughput_mib_s: 0.2137 },
    { implementation: 'scratch', operation: 'keysetup', input_size_bytes: 102400, count: 10, mean_time_ns: 10450, median_time_ns: 10458, stdev_time_ns: 33, min_time_ns: 10416, max_time_ns: 10500, mean_throughput_mib_s: 9345.0893, median_throughput_mib_s: 9337.9470, stdev_throughput_mib_s: 29.3483 },
    { implementation: 'scratch', operation: 'keysetup', input_size_bytes: 1048576, count: 3, mean_time_ns: 13903, median_time_ns: 13916, stdev_time_ns: 24, min_time_ns: 13875, max_time_ns: 13917, mean_throughput_mib_s: 71928.7894, median_throughput_mib_s: 71859.7298, stdev_throughput_mib_s: 124.1133 },
    { implementation: 'scratch', operation: 'keysetup', input_size_bytes: 10485760, count: 2, mean_time_ns: 14396, median_time_ns: 14396, stdev_time_ns: 30, min_time_ns: 14375, max_time_ns: 14417, mean_throughput_mib_s: 694638.8774, median_throughput_mib_s: 694638.8774, stdev_throughput_mib_s: 1433.0177 }
  ];

  // Memory benchmark data (peak RSS)
  const memoryData = [
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 1024, peak_rss_bytes: 1933312, baseline_rss_bytes: 1933312 },
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 102400, peak_rss_bytes: 2179072, baseline_rss_bytes: 1933312 },
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 1048576, peak_rss_bytes: 3997696, baseline_rss_bytes: 1933312 },
    { implementation: 'scratch', operation: 'encrypt', input_size_bytes: 10485760, peak_rss_bytes: 22904832, baseline_rss_bytes: 1933312 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 1024, peak_rss_bytes: 1933312, baseline_rss_bytes: 1933312 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 102400, peak_rss_bytes: 2179072, baseline_rss_bytes: 1933312 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 1048576, peak_rss_bytes: 4046848, baseline_rss_bytes: 1933312 },
    { implementation: 'scratch', operation: 'decrypt', input_size_bytes: 10485760, peak_rss_bytes: 22888448, baseline_rss_bytes: 1933312 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 1024, peak_rss_bytes: 3932160, baseline_rss_bytes: 3915776 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 102400, peak_rss_bytes: 4194304, baseline_rss_bytes: 3948544 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 1048576, peak_rss_bytes: 6062080, baseline_rss_bytes: 3948544 },
    { implementation: 'openssl-ecb', operation: 'encrypt', input_size_bytes: 10485760, peak_rss_bytes: 24920064, baseline_rss_bytes: 3915776 },
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 1024, peak_rss_bytes: 3932160, baseline_rss_bytes: 3932160 },
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 102400, peak_rss_bytes: 4194304, baseline_rss_bytes: 3932160 },
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 1048576, peak_rss_bytes: 6062080, baseline_rss_bytes: 3932160 },
    { implementation: 'openssl-ecb', operation: 'decrypt', input_size_bytes: 10485760, peak_rss_bytes: 24952832, baseline_rss_bytes: 3948544 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 1024, peak_rss_bytes: 4030464, baseline_rss_bytes: 4030464 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 102400, peak_rss_bytes: 4308992, baseline_rss_bytes: 4014080 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 1048576, peak_rss_bytes: 6144000, baseline_rss_bytes: 4030464 },
    { implementation: 'openssl-gcm', operation: 'encrypt', input_size_bytes: 10485760, peak_rss_bytes: 25051136, baseline_rss_bytes: 4014080 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 1024, peak_rss_bytes: 4079616, baseline_rss_bytes: 4046848 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 102400, peak_rss_bytes: 4423680, baseline_rss_bytes: 4030464 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 1048576, peak_rss_bytes: 7241728, baseline_rss_bytes: 4046848 },
    { implementation: 'openssl-gcm', operation: 'decrypt', input_size_bytes: 10485760, peak_rss_bytes: 35586048, baseline_rss_bytes: 4014080 }
  ];

  const BenchmarkData = {
    aggregate: aggregateData,
    memory: memoryData,

    getImplementations() {
      return [...new Set(aggregateData.map(d => d.implementation))];
    },

    getOperations() {
      return [...new Set(aggregateData.map(d => d.operation))];
    },

    getSizes() {
      return [...new Set(aggregateData.map(d => d.input_size_bytes))].sort((a, b) => a - b);
    },

    filter(filters) {
      return aggregateData.filter(d => {
        if (filters.implementation && filters.implementation !== 'all' && d.implementation !== filters.implementation) return false;
        if (filters.operation && filters.operation !== 'all' && d.operation !== filters.operation) return false;
        if (filters.size && filters.size !== 'all' && d.input_size_bytes !== parseInt(filters.size)) return false;
        return true;
      });
    },

    filterMemory(filters) {
      return memoryData.filter(d => {
        if (filters.implementation && filters.implementation !== 'all' && d.implementation !== filters.implementation) return false;
        if (filters.operation && filters.operation !== 'all' && d.operation !== filters.operation) return false;
        if (filters.size && filters.size !== 'all' && d.input_size_bytes !== parseInt(filters.size)) return false;
        return true;
      });
    },

    formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
      return (bytes / 1073741824).toFixed(2) + ' GB';
    },

    formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
      if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + ' MB';
      return (bytes / 1073741824).toFixed(1) + ' GB';
    },

    formatTime(ns) {
      if (ns < 1000) return ns + ' ns';
      if (ns < 1000000) return (ns / 1000).toFixed(1) + ' µs';
      if (ns < 1000000000) return (ns / 1000000).toFixed(2) + ' ms';
      return (ns / 1000000000).toFixed(2) + ' s';
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BenchmarkData;
  }
  global.BenchmarkData = BenchmarkData;

})(typeof window !== 'undefined' ? window : globalThis);
