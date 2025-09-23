const mongoose = require('mongoose');

// Pack Schema
const packSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  dailyLimit: { type: Number, required: true },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFree: { type: Boolean, default: false },
  contactInfo: String
});

const Pack = mongoose.model('Pack', packSchema);

// User Schema
const userSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: String,
  email: String,
  packId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pack' },
  messagesUsedToday: { type: Number, default: 0 },
  lastResetDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const initializePacks = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/whatsapp-bulk');
    
    // Supprimer les packs existants
    await Pack.deleteMany({});
    
    // Créer les nouveaux packs
    const packs = [
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
    
    const createdPacks = await Pack.insertMany(packs);
    console.log('Packs créés:', createdPacks.length);
    
    // Créer le compte de test par défaut
    const testPack = createdPacks.find(p => p.name === 'Test');
    
    // Supprimer l'utilisateur test existant s'il existe
    await User.deleteOne({ code: 'TEST2024' });
    
    const testUser = new User({
      code: 'TEST2024',
      name: 'Compte Test',
      email: 'test@example.com',
      packId: testPack._id,
      isActive: true
    });
    
    await testUser.save();
    console.log('Compte test créé avec le code:', testUser.code);
    
    console.log('Initialisation terminée avec succès!');
    process.exit(0);
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
};

initializePacks();