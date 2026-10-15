const { ApiFirstService } = require('../src/services/api-first-service');
const { ToolCallingService } = require('../src/services/tool-calling-service');
const config = require('../src/config/api-config');
const fs = require('fs').promises;
const path = require('path');

class AccuracyEvaluator {
  constructor() {
    this.apiFirst = new ApiFirstService();
    this.toolCalling = new ToolCallingService();
  }

  async run(iterations = 5) {
    console.log(`\nRunning Accuracy Evaluation (${iterations} iterations)...`);
    const { lat, lng } = config.benchmark.location;
    const { HybridService } = require('../src/services/hybrid-service');
    const sampleQueries = require('../tests/fixtures/sample-queries.json');
    const hybrid = new HybridService();

    // 1. Evaluate Router Classification across labeled 50-query fixture set
    const routerResults = {
      total: sampleQueries.length,
      correct: 0,
      byCategory: {}
    };

    for (const q of sampleQueries) {
      const actual = hybrid.classifyQuery(q.query);
      const isCorrect = actual === q.expectedRoute;
      if (isCorrect) routerResults.correct++;

      if (!routerResults.byCategory[q.type]) {
        routerResults.byCategory[q.type] = { total: 0, correct: 0 };
      }
      routerResults.byCategory[q.type].total++;
      if (isCorrect) routerResults.byCategory[q.type].correct++;
    }
    routerResults.accuracyPercent = Math.round((routerResults.correct / routerResults.total) * 100);

    // 2. Evaluate Pipeline Output Quality across iterations
    for (let i = 0; i < iterations; i++) {
      process.stdout.write(`\rProgress: Iteration ${i + 1}/${iterations}`);

      const apiResult = await this.apiFirst.findClosestDealership(lat, lng);
      results.apiFirst.push(this._evaluate(apiResult));
      await this.delay(500);

      const toolResult = await this.toolCalling.findClosestDealership(lat, lng);
      results.toolCalling.push(this._evaluate(toolResult));
      await this.delay(500);
    }

    const report = this.aggregate(results, routerResults);
    await this.saveReport(report);
    return report;
  }

  _evaluate(result) {
    const rawData = result.rawData || [];
    const answer = result.answer || '';
    const firstDealership = rawData[0];

    return {
      nameCorrect: firstDealership 
        ? /volkswagen|vw/i.test(firstDealership.name || '') 
        : /volkswagen|vw/i.test(answer),

      hasAddress: firstDealership 
        ? (firstDealership.address && firstDealership.address.length > 5)
        : /street|road|st|rd|ave|avenue|cres|crescent|sandton|pretoria|johannesburg/i.test(answer),

      distanceReasonable: firstDealership 
        ? (firstDealership.distanceKm >= 0 && firstDealership.distanceKm <= 100)
        : true,

      answerMentionsName: firstDealership 
        ? answer.toLowerCase().includes((firstDealership.name || '').toLowerCase().substring(0, 10))
        : /volkswagen|vw/i.test(answer),

      answerIncludesDistance: /\d+(\.\d+)?\s*(km|kilometers|miles)/i.test(answer),
      answerIncludesLocation: /address|located at|at \d+|st|rd|ave/i.test(answer),
      hasHoursInfo: /open|hours|closed|trading/i.test(answer),
      rawDataCount: rawData.length
    };
  }

  aggregate(results, routerResults = null) {
    const score = (evals, keys) => {
      const scores = evals.map(e => {
        const passed = keys.filter(k => e[k]).length;
        return passed / keys.length;
      });
      return {
        mean: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100),
        breakdown: keys.reduce((acc, key) => {
          acc[key] = Math.round((evals.filter(e => e[key]).length / evals.length) * 100);
          return acc;
        }, {})
      };
    };

    const criticalKeys = ['nameCorrect', 'hasAddress', 'distanceReasonable'];
    const qualityKeys = ['answerMentionsName', 'answerIncludesDistance', 'answerIncludesLocation', 'hasHoursInfo'];

    return {
      timestamp: new Date().toISOString(),
      provider: config.activeLlm.provider,
      model: config.activeLlm.model,
      iterations: results.apiFirst.length,
      routerAccuracy: routerResults,
      apiFirst: {
        criticalScore: score(results.apiFirst, criticalKeys),
        qualityScore: score(results.apiFirst, qualityKeys)
      },
      toolCalling: {
        criticalScore: score(results.toolCalling, criticalKeys),
        qualityScore: score(results.toolCalling, qualityKeys)
      }
    };
  }

  async saveReport(report) {
    const dir = path.join(process.cwd(), 'data', 'results');
    const filePath = path.join(dir, 'accuracy-report.json');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(report, null, 2));

    console.log(`\n\nAccuracy report saved to ${filePath}`);
    console.log('Summary:');
    if (report.routerAccuracy) {
      console.log(`   Router Classification Accuracy: ${report.routerAccuracy.accuracyPercent}% (${report.routerAccuracy.correct}/${report.routerAccuracy.total} labeled queries)`);
    }
    console.log(`   API-First Critical:   ${report.apiFirst.criticalScore.mean}%`);
    console.log(`   Tool Calling Critical: ${report.toolCalling.criticalScore.mean}%`);
    console.log(`   API-First Quality:    ${report.apiFirst.qualityScore.mean}%`);
    console.log(`   Tool Calling Quality: ${report.toolCalling.qualityScore.mean}%`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (require.main === module) {
  const iterations = parseInt(process.argv[2], 10) || 3;
  new AccuracyEvaluator().run(iterations).catch(console.error);
}

module.exports = { AccuracyEvaluator };
