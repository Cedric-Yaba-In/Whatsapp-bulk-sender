const getPuppeteerConfig = async () => {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = require('@sparticuz/chromium');
    
    return {
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    };
  }
  
  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
};

module.exports = { getPuppeteerConfig };