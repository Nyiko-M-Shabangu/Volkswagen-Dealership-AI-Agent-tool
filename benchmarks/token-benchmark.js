const { ApiFirstService } = require('../src/services/api-first-service');
const { ToolCallingService } = require('../src/services/tool-calling-service');
const config = require('../src/config/api-config');
const fs = require('fs').promises;
const path = require('path');

class TokenBenchmark {
  constructor() {
    this.apiFirst = new ApiFirstService();
    this.toolCalling = new ToolCallingService();
  }

  async run(iterations = 5) {
    console.log(`\nRunning Token Benchmark (${iterations} iterations)...`);
    const { lat, lng } = config.benchmark.location;
    const results = {
      apiFirst: [],
      toolCalling: []
    };

    for (let i = 0; i < iterations; i++) {
      process.stdout.write(`\rProgress: Iteration ${i + 1}/${iterations}`);

      const apiResult = await this.apiFirst.findClosestDealership(lat, lng);
      results.apiFirst.push(apiResult.metrics.tokenUsage || { total: apiResult.metrics.totalTokens });

      const toolResult = await this.toolCalling.findClosestDealership(lat, lng);
      results.toolCalling.push(toolResult.metrics.tokenUsage || { total: toolResult.metrics.totalTokens });

      await new Promise(r => setTimeout(r, 400));
    }

    const report = this.generateReport(results);
    await this.saveReport(report);
    return report;
  }

  generateReport(results) {
    const avg = list => Math.round(list.reduce((sum, v) => sum + (v.total || 0), 0) / list.length);

    const apiFirstAvg = avg(results.apiFirst);
    const toolCallingAvg = avg(results.toolCalling);

    return {
      timestamp: new Date().toISOString(),
      provider: config.activeLlm.provider,
      model: config.activeLlm.model,
      iterations: results.apiFirst.length,
      averageTokens: {
        apiFirst: apiFirstAvg,
        toolCalling: toolCallingAvg,
        difference: toolCallingAvg - apiFirstAvg,
        percentIncrease: Math.round(((toolCallingAvg - apiFirstAvg) / apiFirstAvg) * 100)
      },
      rawSamples: {
        apiFirst: results.apiFirst,
        toolCalling: results.toolCalling
      }
    };
  }

  async saveReport(report) {
    const dir = path.join(process.cwd(), 'data', 'results');
    const filePath = path.join(dir, 'token-report.json');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(report, null, 2));

    console.log(`\n\nToken report saved to ${filePath}`);
    console.log('Summary:');
    console.log(`   API-First average tokens:    ${report.averageTokens.apiFirst}`);
    console.log(`   Tool Calling average tokens: ${report.averageTokens.toolCalling}`);
    console.log(`   Tool Calling uses ${report.averageTokens.percentIncrease}% more tokens`);
  }
}

if (require.main === module) {
  const iterations = parseInt(process.argv[2], 10) || 5;
  new TokenBenchmark().run(iterations).catch(console.error);
}

module.exports = { TokenBenchmark };
