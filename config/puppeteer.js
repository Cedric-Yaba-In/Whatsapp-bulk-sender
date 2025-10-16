const chromium = require('@sparticuz/chromium');

const getPuppeteerConfig = () => {
  if (process.env.VERCEL) {
    return {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: chromium.executablePath,
      headless: chromium.headless,
    };
  }
  
  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
};

module.exports = { getPuppeteerConfig };