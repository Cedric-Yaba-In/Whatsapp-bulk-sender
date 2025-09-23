# WhatsApp Bulk Sender

Application web pour envoyer des messages WhatsApp en masse à partir de fichiers CSV, Excel ou JSON.

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Lancer l'application :
```bash
npm start
```

3. Ouvrir http://localhost:3000 dans votre navigateur

## Utilisation

1. **Connexion WhatsApp** : Scannez le QR code avec WhatsApp
2. **Import des contacts** : Uploadez un fichier CSV, Excel ou JSON
3. **Message** : Rédigez votre message (utilisez {{name}} pour personnaliser)
4. **Envoi** : Cliquez sur "Envoyer les messages"

## Format des fichiers

### CSV
```csv
name,phone
John Doe,+33123456789
Jane Smith,+33987654321
```

### JSON
```json
[
  {"name": "John Doe", "phone": "+33123456789"},
  {"name": "Jane Smith", "phone": "+33987654321"}
]
```

### Excel
Colonnes : `name` et `phone`

## Fonctionnalités

- ✅ Connexion WhatsApp via QR code
- ✅ Import CSV, Excel, JSON
- ✅ Messages personnalisés avec templates
- ✅ Envoi en masse avec délai
- ✅ Suivi des résultats d'envoi