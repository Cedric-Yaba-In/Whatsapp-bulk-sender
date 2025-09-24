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
    testAccount.messagesUsedToday += messageCount;
    await testAccount.save();
    
    const remainingMessages = 5 - testAccount.messagesUsedToday;
    console.log(`📊 IP ${testAccount.ipAddress}: ${messageCount} messages envoyés, ${remainingMessages} restants`);
    
    return {
      messagesUsed: testAccount.messagesUsedToday,
      remainingMessages: remainingMessages,
      dailyLimit: 5
    };
  }
  
  static getTestAccountStats(testAccount) {
    const remainingMessages = 5 - testAccount.messagesUsedToday;
    
    return {
      name: 'Compte Test',
      pack: 'Test (IP)',
      dailyLimit: 5,
      messagesUsedToday: testAccount.messagesUsedToday,
      remainingMessages: remainingMessages,
      resetDate: testAccount.lastResetDate
    };
  }
}

module.exports = TestAccountService;