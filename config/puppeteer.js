const getPuppeteerConfig = async () => {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      const chromium = require('@sparticuz/chromium');
      
      const executablePath = await chromium.executablePath();
      console.log('🔧 Configuration Puppeteer pour Vercel:', { executablePath });
      
      return {
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
      };
    } catch (error) {
      console.error('❌ Erreur configuration Chromium:', error);
      throw new Error('Chromium non disponible sur cette plateforme');
    }
  }
  
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  };
};

module.exports = { getPuppeteerConfig };