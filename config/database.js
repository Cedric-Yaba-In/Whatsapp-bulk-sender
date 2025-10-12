const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Tentative de connexion à MongoDB...');
    
    await mongoose.connect('mongodb+srv://cednguendap_db_user:vOyCTLwGVnjzzahO@films-serie-show.dg8x7yk.mongodb.net/w-message', {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      retryWrites: true
    });
    
    console.log('✅ MongoDB connecté avec succès');
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    
    // Essayer de se reconnecter après 5 secondes
    console.log('🔄 Nouvelle tentative dans 5 secondes...');
    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};

module.exports = connectDB;