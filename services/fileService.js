const csv = require('csv-parser');
const XLSX = require('xlsx');
const { parse } = require('json2csv');
const fs = require('fs');

class FileService {
  parseContacts(file) {
    return new Promise((resolve, reject) => {
      const contacts = [];

      if (file.mimetype === 'text/csv') {
        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (row) => {
            contacts.push({
              name: row.name || row.nom,
              phone: row.phone || row.telephone
            });
          })
          .on('end', () => {
            fs.unlinkSync(file.path);
            resolve(contacts);
          })
          .on('error', reject);
      } else if (file.mimetype === 'application/json') {
        try {
          const data = JSON.parse(fs.readFileSync(file.path, 'utf8'));
          fs.unlinkSync(file.path);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      } else if (file.mimetype.includes('sheet')) {
        try {
          const workbook = XLSX.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          
          data.forEach(row => {
            contacts.push({
              name: row.name || row.nom,
              phone: row.phone || row.telephone
            });
          });
          
          fs.unlinkSync(file.path);
          resolve(contacts);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Format de fichier non supporté'));
      }
    });
  }

  generateTemplate(format) {
    const sampleData = [
      { name: 'John Doe', phone: '+33123456789' },
      { name: 'Jane Smith', phone: '+33987654321' }
    ];

    switch (format) {
      case 'csv':
        return {
          data: parse(sampleData, { fields: ['name', 'phone'] }),
          contentType: 'text/csv',
          filename: 'template.csv'
        };
      case 'json':
        return {
          data: JSON.stringify(sampleData, null, 2),
          contentType: 'application/json',
          filename: 'template.json'
        };
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
        return {
          data: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: 'template.xlsx'
        };
      default:
        throw new Error('Format non supporté');
    }
  }
}

module.exports = new FileService();