const { ApiFirstService } = require('../src/services/api-first-service');
const { ToolCallingService } = require('../src/services/tool-calling-service');
const config = require('../src/config/api-config');
const fs = require('fs').promises;
const path = require('path');

class LatencyBenchmark {
  constructor() {
    this.apiFirst = new ApiFirstService();
    this.toolCalling = new ToolCallingService();
    this.results = {
      apiFirst: [],
      toolCalling: []
    };
  }

  async run(iterations = 10, warmupRuns = 2) {
    console.log(`\nRunning Latency Benchmark (${iterations} iterations with ${warmupRuns} warm-up runs)...`);
    const { lat, lng } = config.benchmark.location;

    // Discard warm-up runs to eliminate TCP/TLS handshake latency and cold starts
    for (let w = 0; w < warmupRuns; w++) {
      process.stdout.write(`\rWarm-up: Run ${w + 1}/${warmupRuns}`);
      await this.apiFirst.findClosestDealership(lat, lng);
      await this.toolCalling.findClosestDealership(lat, lng);
      await this.delay(300);
    }
    console.log('\nWarm-up complete. Collecting benchmark samples...');

    for (let i = 0; i < iterations; i++) {
      process.stdout.write(`\rProgress: Iteration ${i + 1}/${iterations}`);

      const apiFirstResult = await this.apiFirst.findClosestDealership(lat, lng);
      this.results.apiFirst.push({
        total: apiFirstResult.metrics.latencyMs,
        places: apiFirstResult.metrics.breakdown?.placesLatencyMs || 0,
        llm: apiFirstResult.metrics.breakdown?.llmLatencyMs || 0
      });

      const toolResult = await this.toolCalling.findClosestDealership(lat, lng);
      this.results.toolCalling.push({
        total: toolResult.metrics.latencyMs,
        places: toolResult.metrics.breakdown?.placesLatencyMs || 0,
        llmTurn1: toolResult.metrics.breakdown?.llmTurn1Ms || 0,
        llmTurn2: toolResult.metrics.breakdown?.llmTurn2Ms || 0,
        totalLlm: toolResult.metrics.breakdown?.totalLlmMs || 0
      });

      // Throttle between iterations to prevent provider rate limits
      await this.delay(500);
    }

    const report = this.generateReport();
    await this.saveReport(report);
    return report;
  }

  generateReport() {
    const apiFirstTotals = this.results.apiFirst.map(r => r.total);
    const toolCallingTotals = this.results.toolCalling.map(r => r.total);

    const apiFirst = this._calculateStats(apiFirstTotals);
    const toolCalling = this._calculateStats(toolCallingTotals);

    apiFirst.breakdown = {
      meanPlacesMs: Math.round(this.results.apiFirst.reduce((a, b) => a + b.places, 0) / this.results.apiFirst.length),
      meanLlmMs: Math.round(this.results.apiFirst.reduce((a, b) => a + b.llm, 0) / this.results.apiFirst.length)
    };

    toolCalling.breakdown = {
      meanPlacesMs: Math.round(this.results.toolCalling.reduce((a, b) => a + b.places, 0) / this.results.toolCalling.length),
      meanLlmTurn1Ms: Math.round(this.results.toolCalling.reduce((a, b) => a + b.llmTurn1, 0) / this.results.toolCalling.length),
      meanLlmTurn2Ms: Math.round(this.results.toolCalling.reduce((a, b) => a + b.llmTurn2, 0) / this.results.toolCalling.length),
      meanTotalLlmMs: Math.round(this.results.toolCalling.reduce((a, b) => a + b.totalLlm, 0) / this.results.toolCalling.length)
    };

    return {
      timestamp: new Date().toISOString(),
      provider: config.activeLlm.provider,
      model: config.activeLlm.model,
      iterations: this.results.apiFirst.length,
      apiFirst,
      toolCalling,
      difference: {
        medianDeltaMs: toolCalling.median - apiFirst.median,
        p95DeltaMs: toolCalling.p95 - apiFirst.p95,
        slowerByPercent: Math.round(((toolCalling.median - apiFirst.median) / apiFirst.median) * 100)
      }
    };
  }

  _calculateStats(values) {
    if (!values || values.length === 0) return {};
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = Math.round(sum / n);

    const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
    const stdDev = Math.round(Math.sqrt(variance));
    const stdError = Math.round(stdDev / Math.sqrt(n));
    const ci95 = [Math.max(0, mean - Math.round(1.96 * stdError)), mean + Math.round(1.96 * stdError)];

    return {
      min: sorted[0],
      max: sorted[n - 1],
      mean,
      stdDev,
      ci95,
      median: sorted[Math.floor(n / 2)],
      p50: sorted[Math.floor(n * 0.5)],
      p95: sorted[Math.floor(n * 0.95)] || sorted[n - 1],
      p99: sorted[Math.floor(n * 0.99)] || sorted[n - 1]
    };
  }

  async saveReport(report) {
    const dir = path.join(process.cwd(), 'data', 'results');
    const filePath = path.join(dir, 'latency-report.json');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(report, null, 2));

    console.log(`\n\nLatency report saved to ${filePath}`);
    console.log('Summary:');
    console.log(`   API-First median:    ${report.apiFirst.median} ms (Mean: ${report.apiFirst.mean} ± ${report.apiFirst.stdDev} ms, 95% CI: [${report.apiFirst.ci95.join(', ')}])`);
    console.log(`   Tool Calling median: ${report.toolCalling.median} ms (Mean: ${report.toolCalling.mean} ± ${report.toolCalling.stdDev} ms, 95% CI: [${report.toolCalling.ci95.join(', ')}])`);
    console.log(`   Latency breakdown (API-First):   Places ${report.apiFirst.breakdown.meanPlacesMs} ms | LLM ${report.apiFirst.breakdown.meanLlmMs} ms`);
    console.log(`   Latency breakdown (Tool-Calling): Turn 1 LLM ${report.toolCalling.breakdown.meanLlmTurn1Ms} ms | Places ${report.toolCalling.breakdown.meanPlacesMs} ms | Turn 2 LLM ${report.toolCalling.breakdown.meanLlmTurn2Ms} ms`);
    console.log(`   Tool Calling is ${report.difference.slowerByPercent}% slower`);

    console.log(`   Tool Calling median: ${report.toolCalling.median} ms`);
    console.log(`   Tool Calling is ${report.difference.slowerByPercent}% slower`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (require.main === module) {
  const iterations = parseInt(process.argv[2], 10) || 5;
  new LatencyBenchmark().run(iterations).catch(console.error);
}

module.exports = { LatencyBenchmark };
