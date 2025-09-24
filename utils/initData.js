const Pack = require('../models/Pack');
const User = require('../models/User');

const initDefaultPacks = async () => {
  try {
    console.log('Vérification des packs par défaut...');
    
    // Vérifier si les packs existent déjà
    const existingPacks = await Pack.countDocuments();
    
    if (existingPacks === 0) {
      const defaultPacks = [
        {
          name: 'Test',
          description: 'Compte de test par défaut',
          dailyLimit: 5,
          price: 0,
          isFree: true,
          isActive: true
        },
        {
          name: 'Gratuit',
          description: 'Pack gratuit pour découvrir le service',
          dailyLimit: 10,
          price: 0,
          isFree: true,
          isActive: true
        },
        {
          name: 'Starter',
          description: 'Pack idéal pour débuter',
          dailyLimit: 50,
          price: 19.99,
          isFree: false,
          isActive: true,
          contactInfo: 'Pour souscrire au pack Starter, contactez-nous à contact@whatsapp-bulk.com ou au +33 1 23 45 67 89'
        },
        {
          name: 'Entreprise',
          description: 'Pack professionnel pour les entreprises',
          dailyLimit: 100,
          price: 49.99,
          isFree: false,
          isActive: true,
          contactInfo: 'Pour souscrire au pack Entreprise, contactez-nous à contact@whatsapp-bulk.com ou au +33 1 23 45 67 89'
        }
      ];
      
      const createdPacks = await Pack.insertMany(defaultPacks);
      console.log('Packs par défaut créés');
      
      // Créer le compte de test par défaut s'il n'existe pas
      const existingTestUser = await User.findOne({ code: 'TEST2024' });
      if (!existingTestUser) {
        const testPack = createdPacks.find(p => p.name === 'Test');
        if (testPack) {
          const testUser = new User({
            name: 'Compte Test',
            email: 'test@example.com',
            code: 'TEST2024',
            packId: testPack._id,
            isTestAccount: true
          });
          await testUser.save();
          console.log('Compte de test créé avec le code: TEST2024');
        }
      } else {
        console.log('Compte de test existe déjà');
      }
    } else {
      console.log('Packs par défaut déjà existants');
      
      // Vérifier si le compte de test existe
      const existingTestUser = await User.findOne({ code: 'TEST2024' });
      if (!existingTestUser) {
        const testPack = await Pack.findOne({ name: 'Test' });
        if (testPack) {
          const testUser = new User({
            name: 'Compte Test',
            email: 'test@example.com',
            code: 'TEST2024',
            packId: testPack._id,
            isTestAccount: true
          });
          await testUser.save();
          console.log('Compte de test créé avec le code: TEST2024');
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
};

module.exports = { initDefaultPacks };