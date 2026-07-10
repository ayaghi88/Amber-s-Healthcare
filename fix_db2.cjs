const fs = require('fs');
const backupFile = 'db_backup.json';
const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

// Filter out contact@ from candidates array
data.candidates = data.candidates.filter(c => c.user_id !== '0bbf795f-2698-4e02-a73c-964d0f3289f0');

fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
console.log("Removed from candidates");
