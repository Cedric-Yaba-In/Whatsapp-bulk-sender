const TestAccount = require('../models/TestAccount');

class TestAccountService {
  static async getOrCreateTestAccount(ipAddress) {
    let testAccount = await TestAccount.findOne({ ipAddress });
    
    if (!testAccount) {
      testAccount = new TestAccount({ ipAddress });
      await testAccount.save();
      console.log(`🆕 Nouveau compte test créé pour IP: ${ipAddress}`);
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
      name: 'Compte Test',
      pack: 'Test (IP)',
      dailyLimit: 5,
      messagesUsedToday: testAccount.messagesUsedToday,
      remainingMessages: remainingMessages,
      resetDate: testAccount.lastResetDate,
      code: 'TEST2024'
    };
  }
}

module.exports = TestAccountService;