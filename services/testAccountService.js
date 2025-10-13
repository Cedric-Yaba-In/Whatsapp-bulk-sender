const TestAccount = require('../models/TestAccount');

class TestAccountService {
  // Générer un code de test unique basé sur l'IP
  static generateTestCode(ipAddress) {
    const cleanIp = ipAddress.replace(/[^0-9]/g, '');
    const hash = cleanIp.slice(-6).padStart(6, '0');
    return `TEST${hash}`;
  }
  
  static async getOrCreateTestAccount(ipAddress) {
    let testAccount = await TestAccount.findOne({ ipAddress });
    
    if (!testAccount) {
      const testCode = this.generateTestCode(ipAddress);
      testAccount = new TestAccount({ 
        ipAddress,
        testCode 
      });
      await testAccount.save();
      console.log(`🆕 Nouveau compte test créé pour IP: ${ipAddress} - Code: ${testCode}`);
    }
    
    return await this.checkAndResetDailyMessages(testAccount);
  }
  
  static async checkAndResetDailyMessages(testAccount) {
    const today = new Date();
    const lastReset = new Date(testAccount.lastResetDate);
    
    if (today.toDateString() !== lastReset.toDateString()) {
      testAccount.messagesUsedToday = 0;
      testAccount.lastResetDate = today;
      await testAccount.save();
      console.log(`🔄 Messages quotidiens réinitialisés pour IP: ${testAccount.ipAddress}`);
    }
    
    return testAccount;
  }
  
  static canSendMessages(testAccount, messageCount) {
    const remainingMessages = 5 - testAccount.messagesUsedToday;
    return messageCount <= remainingMessages;
  }
  
  static async decrementMessages(testAccount, messageCount) {
    const previousUsed = testAccount.messagesUsedToday;
    testAccount.messagesUsedToday += messageCount;
    await testAccount.save();
    
    const remainingMessages = Math.max(0, 5 - testAccount.messagesUsedToday);
    console.log(`📊 Test IP ${testAccount.ipAddress}: ${previousUsed} -> ${testAccount.messagesUsedToday} (+${messageCount}), ${remainingMessages}/5 restants`);
    
    return {
      messagesUsed: testAccount.messagesUsedToday,
      remainingMessages: remainingMessages,
      dailyLimit: 5
    };
  }
  
  static getTestAccountStats(testAccount) {
    const remainingMessages = Math.max(0, 5 - testAccount.messagesUsedToday);
    
    console.log(`📊 Test account IP ${testAccount.ipAddress}: utilisés=${testAccount.messagesUsedToday}, restants=${remainingMessages}/5`);
    
    return {
      name: `Compte Test (${testAccount.testCode || 'TEST2024'})`,
      pack: 'Test (IP)',
      dailyLimit: 5,
      messagesUsedToday: testAccount.messagesUsedToday,
      remainingMessages: remainingMessages,
      resetDate: testAccount.lastResetDate,
      code: testAccount.testCode || 'TEST2024',
      ipAddress: testAccount.ipAddress
    };
  }
  
  // Vérifier si un code est un code de test
  static isTestCode(userCode) {
    return userCode === 'TEST2024' || userCode.startsWith('TEST');
  }
  
  // Obtenir le compte de test par code
  static async getTestAccountByCode(userCode, ipAddress) {
    if (userCode === 'TEST2024') {
      return await this.getOrCreateTestAccount(ipAddress);
    } else if (userCode.startsWith('TEST')) {
      const testAccount = await TestAccount.findOne({ testCode: userCode });
      if (testAccount && testAccount.ipAddress === ipAddress) {
        return await this.checkAndResetDailyMessages(testAccount);
      }
    }
    return null;
  }
}

module.exports = TestAccountService;