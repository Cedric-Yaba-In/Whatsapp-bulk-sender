const cron = require('node-cron');
const User = require('../models/User');

class CronService {
  static init() {
    // Tâche cron qui s'exécute chaque jour à 01h00
    cron.schedule('0 1 * * *', async () => {
      console.log('🕐 Exécution de la tâche cron de réinitialisation quotidienne...');
      
      try {
        const result = await User.updateMany(
          {}, // Tous les utilisateurs
          {
            $set: {
              messagesUsedToday: 0,
              lastResetDate: new Date()
            }
          }
        );
        
        console.log(`✅ Réinitialisation quotidienne terminée: ${result.modifiedCount} utilisateurs mis à jour`);
      } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation quotidienne:', error);
      }
    }, {
      timezone: "Europe/Paris"
    });
    
    console.log('📅 Tâche cron de réinitialisation quotidienne programmée (01h00 chaque jour)');
  }
  
  // Fonction pour réinitialiser manuellement (utile pour les tests)
  static async resetAllUsers() {
    try {
      const result = await User.updateMany(
        {},
        {
          $set: {
            messagesUsedToday: 0,
            lastResetDate: new Date()
          }
        }
      );
      
      console.log(`✅ Réinitialisation manuelle: ${result.modifiedCount} utilisateurs mis à jour`);
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation manuelle:', error);
      throw error;
    }
  }
}

module.exports = CronService;