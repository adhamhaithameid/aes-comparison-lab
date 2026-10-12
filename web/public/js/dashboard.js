/**
 * dashboard.js — Implementation Comparison Dashboard Logic
 */

(function () {
  'use strict';

  let timeChart = null;
  let throughputChart = null;
  let memoryChart = null;
  let currentFilters = {
    implementation: 'all',
    operation: 'all',
    size: 'all'
  };

  function $(id) {
    return document.getElementById(id);
  }

  // ==========================================================================
  // Filter Handling
  // ==========================================================================

  function updateFilters() {
    currentFilters.implementation = $('implFilter') ? $('implFilter').value : 'all';
    currentFilters.operation = $('opFilter') ? $('opFilter').value : 'all';
    currentFilters.size = $('sizeFilter') ? $('sizeFilter').value : 'all';
    renderDashboard();
  }

  // ==========================================================================
  // Summary Cards
  // ==========================================================================

  function renderSummaryCards() {
    const container = $('summaryCards');
    if (!container) return;

    const data = BenchmarkData.filter(currentFilters);

    // Calculate stats
    const implementations = BenchmarkData.getImplementations();
    const ops = BenchmarkData.getOperations();

    // Fastest implementation for 1MB encrypt
    const largeEnc = data.filter(function (d) {
      return d.operation === 'encrypt' && d.input_size_bytes === 1048576;
    });
    let fastest = null;
    if (largeEnc.length) {
      fastest = largeEnc.reduce(function (min, d) {
        return d.mean_time_ns < min.mean_time_ns ? d : min;
      }, largeEnc[0]);
    }

    // Highest throughput
    let highestTp = null;
    if (data.length) {
      highestTp = data.reduce(function (max, d) {
        return d.mean_throughput_mib_s > max.mean_throughput_mib_s ? d : max;
      }, data[0]);
    }

    // Total measurements
    const totalMeasurements = data.reduce(function (sum, d) {
      return sum + d.count;
    }, 0);

    let html = '';

    if (fastest) {
      html += '<div class="card text-center">';
      html += '<span aria-hidden="true" class="icon" data-icon="bolt" style="font-size: 2rem;"></span>';
      html += '<h4>Fastest (1MB Encrypt)</h4>';
      html += '<p><strong>' + fastest.implementation + '</strong></p>';
      html += '<p class="text-muted">' + BenchmarkData.formatTime(fastest.mean_time_ns) + '</p>';
      html += '</div>';
    }

    if (highestTp) {
      html += '<div class="card text-center">';
      html += '<span aria-hidden="true" class="icon" data-icon="rocket" style="font-size: 2rem;"></span>';
      html += '<h4>Highest Throughput</h4>';
      html += '<p><strong>' + highestTp.implementation + '</strong></p>';
      html += '<p class="text-muted">' + highestTp.mean_throughput_mib_s.toFixed(1) + ' MiB/s</p>';
      html += '</div>';
    }

    html += '<div class="card text-center">';
    html += '<span aria-hidden="true" class="icon" data-icon="chart" style="font-size: 2rem;"></span>';
    html += '<h4>Measurements</h4>';
    html += '<p><strong>' + totalMeasurements + '</strong></p>';
    html += '<p class="text-muted">Total benchmark runs</p>';
    html += '</div>';

    container.innerHTML = html;
    if (window.Icon) Icon.mountIn(container);
  }

  // ==========================================================================
  // Chart Rendering
  // ==========================================================================

  function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: isDark ? '#f1f5f9' : '#0f172a',
      grid: isDark ? '#334155' : '#e2e8f0',
      bg: isDark ? '#1e293b' : '#ffffff'
    };
  }

  function renderTimeChart() {
    const canvas = $('timeChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const data = BenchmarkData.filter(currentFilters).filter(function (d) {
      return d.input_size_bytes >= 1024;
    });

    const labels = data.map(function (d) {
      return d.implementation + ' ' + d.operation + '\n' + BenchmarkData.formatSize(d.input_size_bytes);
    });

    const values = data.map(function (d) {
      return d.mean_time_ns;
    });

    const colors = data.map(function (d) {
      if (d.implementation === 'openssl-ecb') return 'rgba(59, 130, 246, 0.7)';
      if (d.implementation === 'openssl-gcm') return 'rgba(16, 185, 129, 0.7)';
      return 'rgba(245, 158, 11, 0.7)';
    });

    const chartColors = getChartColors();

    if (timeChart) timeChart.destroy();

    timeChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Mean Time (ns)',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(function (c) { return c.replace('0.7', '1'); }),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return BenchmarkData.formatTime(ctx.raw);
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: chartColors.text, font: { size: 10 } },
            grid: { color: chartColors.grid }
          },
          y: {
            type: 'logarithmic',
            ticks: {
              color: chartColors.text,
              callback: function (value) {
                return BenchmarkData.formatTime(value);
              }
            },
            grid: { color: chartColors.grid },
            title: { display: true, text: 'Time (ns, log scale)', color: chartColors.text }
          }
        }
      }
    });
  }

  function renderThroughputChart() {
    const canvas = $('throughputChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const data = BenchmarkData.filter(currentFilters).filter(function (d) {
      return d.input_size_bytes >= 1024;
    });

    const labels = data.map(function (d) {
      return d.implementation + ' ' + d.operation + '\n' + BenchmarkData.formatSize(d.input_size_bytes);
    });

    const values = data.map(function (d) {
      return d.mean_throughput_mib_s;
    });

    const colors = data.map(function (d) {
      if (d.implementation === 'openssl-ecb') return 'rgba(59, 130, 246, 0.7)';
      if (d.implementation === 'openssl-gcm') return 'rgba(16, 185, 129, 0.7)';
      return 'rgba(245, 158, 11, 0.7)';
    });

    const chartColors = getChartColors();

    if (throughputChart) throughputChart.destroy();

    throughputChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Throughput (MiB/s)',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(function (c) { return c.replace('0.7', '1'); }),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.raw.toFixed(2) + ' MiB/s';
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: chartColors.text, font: { size: 10 } },
            grid: { color: chartColors.grid }
          },
          y: {
            type: 'logarithmic',
            ticks: { color: chartColors.text },
            grid: { color: chartColors.grid },
            title: { display: true, text: 'MiB/s (log scale)', color: chartColors.text }
          }
        }
      }
    });
  }

  function renderMemoryChart() {
    const canvas = $('memoryChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const data = BenchmarkData.filterMemory(currentFilters);

    const labels = data.map(function (d) {
      return d.implementation + ' ' + d.operation + '\n' + BenchmarkData.formatSize(d.input_size_bytes);
    });

    const values = data.map(function (d) {
      return d.peak_rss_bytes;
    });

    const chartColors = getChartColors();

    if (memoryChart) memoryChart.destroy();

    memoryChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Peak RSS (bytes)',
          data: values,
          backgroundColor: data.map(function (d) {
            if (d.implementation === 'openssl-ecb') return 'rgba(59, 130, 246, 0.7)';
            if (d.implementation === 'openssl-gcm') return 'rgba(16, 185, 129, 0.7)';
            return 'rgba(245, 158, 11, 0.7)';
          }),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return BenchmarkData.formatBytes(ctx.raw);
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: chartColors.text, font: { size: 10 } },
            grid: { color: chartColors.grid }
          },
          y: {
            ticks: {
              color: chartColors.text,
              callback: function (value) {
                return BenchmarkData.formatBytes(value);
              }
            },
            grid: { color: chartColors.grid },
            title: { display: true, text: 'Peak RSS', color: chartColors.text }
          }
        }
      }
    });
  }

  // ==========================================================================
  // Comparison Table
  // ==========================================================================

  function renderTable() {
    const tbody = $('benchmarkTable') ? $('benchmarkTable').querySelector('tbody') : null;
    if (!tbody) return;

    const data = BenchmarkData.filter(currentFilters);

    let html = '';
    data.forEach(function (d) {
      html += '<tr>';
      html += '<td><span class="badge ' + (d.implementation === 'openssl-ecb' ? 'badge-blue' : d.implementation === 'openssl-gcm' ? 'badge-green' : 'badge-yellow') + '">' + d.implementation + '</span></td>';
      html += '<td>' + d.operation + '</td>';
      html += '<td>' + BenchmarkData.formatSize(d.input_size_bytes) + '</td>';
      html += '<td>' + BenchmarkData.formatTime(d.mean_time_ns) + '</td>';
      html += '<td>' + BenchmarkData.formatTime(d.median_time_ns) + '</td>';
      html += '<td>' + BenchmarkData.formatTime(d.stdev_time_ns) + '</td>';
      html += '<td>' + d.mean_throughput_mib_s.toFixed(2) + '</td>';
      html += '</tr>';
    });

    if (!data.length) {
      html = '<tr><td colspan="7" class="text-center">No data matching filters</td></tr>';
    }

    tbody.innerHTML = html;
  }

  // ==========================================================================
  // Render Dashboard
  // ==========================================================================

  function renderDashboard() {
    renderSummaryCards();
    renderTimeChart();
    renderThroughputChart();
    renderMemoryChart();
    renderTable();
  }

  // ==========================================================================
  // Initialize
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', function () {
    // Filter listeners
    const implFilter = $('implFilter');
    const opFilter = $('opFilter');
    const sizeFilter = $('sizeFilter');

    if (implFilter) implFilter.addEventListener('change', updateFilters);
    if (opFilter) opFilter.addEventListener('change', updateFilters);
    if (sizeFilter) sizeFilter.addEventListener('change', updateFilters);

    // Initial render
    renderDashboard();

    // Re-render charts on theme change
    const observer = new MutationObserver(function () {
      renderTimeChart();
      renderThroughputChart();
      renderMemoryChart();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });

})();
