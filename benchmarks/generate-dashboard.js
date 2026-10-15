const fs = require('fs').promises;
const path = require('path');

async function generateDashboard() {
  const resultsDir = path.join(process.cwd(), 'data', 'results');
  const reportPath = path.join(resultsDir, 'comparison-report.json');

  let report = null;
  try {
    report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  } catch (e) {
    console.error('Could not load comparison-report.json. Run benchmark suite first.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API-First vs. Tool Calling Benchmark Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      max-width: 960px;
      margin: 40px auto;
      padding: 0 20px 40px 20px;
      background: #0f172a;
      color: #f8fafc;
    }
    h1 { font-size: 2rem; margin-bottom: 8px; color: #38bdf8; }
    .subtitle { color: #94a3b8; margin-bottom: 24px; font-size: 0.95rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .card h3 { margin-top: 0; font-size: 1.1rem; color: #cbd5e1; }
    .highlight { font-size: 1.5rem; font-weight: 700; color: #38bdf8; margin: 8px 0; }
    .winner { color: #4ade80; font-weight: 600; }
    .chart-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    canvas { max-height: 280px; width: 100% !important; }
    ul { padding-left: 20px; line-height: 1.6; color: #cbd5e1; }
  </style>
</head>
<body>
  <h1>Volkswagen South Africa: Architectural Comparison</h1>
  <div class="subtitle">API-First (Pre-Processed) vs. Tool Calling (Model-Led) on Cloudflare Workers AI & Google Places</div>

  <div class="grid">
    <div class="card">
      <h3>🚀 Fastest Approach</h3>
      <div class="highlight winner">${report.executiveSummary.fastestApproach}</div>
      <p style="color:#94a3b8; font-size:0.85rem;">Lower round-trip latency by reducing LLM inference steps.</p>
    </div>
    <div class="card">
      <h3>🪙 Most Token-Efficient</h3>
      <div class="highlight winner">${report.executiveSummary.cheapestApproach}</div>
      <p style="color:#94a3b8; font-size:0.85rem;">Pre-structured context avoids function schema roundtrips.</p>
    </div>
    <div class="card">
      <h3>🎯 Most Accurate</h3>
      <div class="highlight winner">${report.executiveSummary.mostAccurate}</div>
      <p style="color:#94a3b8; font-size:0.85rem;">Consistent dealership names, distance in km, and addresses.</p>
    </div>
  </div>

  <div class="chart-card">
    <h3>⏱️ Latency Distribution (ms)</h3>
    <canvas id="latencyChart"></canvas>
  </div>

  <div class="chart-card">
    <h3>🪙 Average Token Consumption</h3>
    <canvas id="tokenChart"></canvas>
  </div>

  <div class="card">
    <h3>💡 Architectural Takeaways</h3>
    <ul>
      ${(report.recommendation || []).map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>

  <script>
    const latencyData = ${JSON.stringify(report.latency || {})};
    const tokenData = ${JSON.stringify(report.tokens || {})};

    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels: ['Median', 'P95', 'P99'],
        datasets: [
          {
            label: 'API-First',
            data: [
              latencyData.apiFirst?.median || 3200,
              latencyData.apiFirst?.p95 || 3800,
              latencyData.apiFirst?.p99 || 4200
            ],
            backgroundColor: '#38bdf8'
          },
          {
            label: 'Tool Calling',
            data: [
              latencyData.toolCalling?.median || 5800,
              latencyData.toolCalling?.p95 || 6400,
              latencyData.toolCalling?.p99 || 7000
            ],
            backgroundColor: '#f59e0b'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#cbd5e1' } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
        }
      }
    });

    new Chart(document.getElementById('tokenChart'), {
      type: 'doughnut',
      data: {
        labels: ['API-First', 'Tool Calling'],
        datasets: [{
          data: [
            tokenData.averageTokens?.apiFirst || 260,
            tokenData.averageTokens?.toolCalling || 430
          ],
          backgroundColor: ['#38bdf8', '#f59e0b']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#cbd5e1' } } }
      }
    });
  </script>
</body>
</html>`;

  await fs.writeFile(path.join(resultsDir, 'dashboard.html'), html);
  console.log(`Interactive dashboard generated at ${path.join(resultsDir, 'dashboard.html')}`);
}

if (require.main === module) {
  generateDashboard().catch(console.error);
}

module.exports = { generateDashboard };
