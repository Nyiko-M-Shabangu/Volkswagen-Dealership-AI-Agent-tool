const config = require('./src/config/api-config');
const { ApiFirstService } = require('./src/services/api-first-service');
const { ToolCallingService } = require('./src/services/tool-calling-service');
const { HybridService } = require('./src/services/hybrid-service');
const logger = require('./src/utils/logger');

async function runDemo() {
  // Always validate keys and configuration before proceeding (Best Practice)
  config.printValidationBanner();

  if (!config.validation.isValid) {
    logger.error('Aborting execution: Missing or invalid required LLM credentials in .env');
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('VW South Africa Dealership Finder: API-First vs. Tool Calling Demo');
  console.log(`Active Provider: ${config.activeLlm.provider.toUpperCase()} (${config.activeLlm.model})`);
  console.log(`Places Source:   LIVE Google Places API (New)`);
  console.log(`Coordinates:     (${config.benchmark.location.lat}, ${config.benchmark.location.lng})`);
  console.log('='.repeat(70));

  const lat = config.benchmark.location.lat;
  const lng = config.benchmark.location.lng;

  // 1. Test API-First
  console.log('\n--- [1] Testing API-First Service ---');
  try {
    const apiFirstService = new ApiFirstService();
    const apiFirstResult = await apiFirstService.findClosestDealership(lat, lng);
    console.log('Response:\n', apiFirstResult.answer);
    console.log('\nMetrics:', JSON.stringify(apiFirstResult.metrics, null, 2));
  } catch (err) {
    logger.error('API-First run failed:', err.message);
  }

  // 2. Test Tool-Calling
  console.log('\n--- [2] Testing Tool-Calling Service ---');
  try {
    const toolCallingService = new ToolCallingService();
    const toolResult = await toolCallingService.findClosestDealership(lat, lng);
    console.log('Response:\n', toolResult.answer);
    console.log('\nMetrics:', JSON.stringify(toolResult.metrics, null, 2));
  } catch (err) {
    logger.error('Tool-Calling run failed:', err.message);
  }

  // 3. Test Hybrid Router
  console.log('\n--- [3] Testing Hybrid Router ---');
  try {
    const hybridService = new HybridService();
    const hybridResult = await hybridService.handleQuery('Where is the closest VW dealership?', lat, lng);
    console.log(`Routed via: ${hybridResult.routeUsed} (${hybridResult.routeReason})`);
  } catch (err) {
    logger.error('Hybrid run failed:', err.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('Demo finished successfully.');
  console.log('='.repeat(70));
}

runDemo().catch(console.error);
