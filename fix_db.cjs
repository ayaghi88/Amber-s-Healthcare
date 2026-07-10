const fs = require('fs');
const bcrypt = require('bcryptjs');

const backupFile = 'db_backup.json';
if (fs.existsSync(backupFile)) {
  const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  
  // Set all user passwords to 'password123'
  const hash = bcrypt.hashSync('password123', 10);
  data.users.forEach(u => {
    u.password = hash;
  });
  
  // Ensure contact@ambershealthcare.com is an employer
  let contact = data.users.find(u => u.email === 'contact@ambershealthcare.com');
  if (contact) {
    contact.role = 'employer';
  } else {
    // Add it
    contact = {
      id: "0bbf795f-2698-4e02-a73c-964d0f3289f0",
      email: "contact@ambershealthcare.com",
      password: hash,
      role: "employer",
      created_at: new Date().toISOString()
    };
    data.users.push(contact);
  }
  
  // Make sure it's in the employers array
  let emp = data.employers.find(e => e.user_id === contact.id);
  if (!emp) {
    data.employers.push({
      id: "new-emp-id-1234",
      user_id: contact.id,
      company_name: "Ambers Healthcare",
      contact_name: "Contact Team",
      phone: "555-0000",
      parish: "East Baton Rouge",
      website: "https://ambershealthcare.com",
      stripe_customer_id: null,
      accepted_agreement_at: new Date().toISOString()
    });
  }

  // Set ambersamanthayaghi@gmail.com password hash to known
  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
  console.log("Fixed db_backup.json");
} else {
  console.log("No db_backup.json found");
}
