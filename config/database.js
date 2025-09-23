const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://cednguendap_db_user:vOyCTLwGVnjzzahO@films-serie-show.dg8x7yk.mongodb.net/w-message');
    console.log('MongoDB connecté avec succès');
  } catch (error) {
    console.error('Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;