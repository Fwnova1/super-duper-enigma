const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Function to generate a random date within a range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Function to generate a random patient
function generatePatient() {
  const admissionDate = randomDate(new Date(2023, 0, 1), new Date());
  const dateOfBirth = randomDate(new Date(1940, 0, 1), new Date(2000, 0, 1));
  const age = Math.floor((new Date() - dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
  
  return {
    encounterId: faker.string.uuid(),
    name: faker.person.fullName(),
    dateOfBirth: dateOfBirth.toISOString().split('T')[0],
    admissionDate: admissionDate.toISOString().split('T')[0],
    gender: faker.helpers.arrayElement(['male', 'female', 'other']),
    age: age,
    referral: faker.datatype.boolean(),
    referralStatus: faker.helpers.arrayElement(['pending', 'in_progress', 'completed']),
    bmi: faker.number.float({ min: 15, max: 40, precision: 0.1 }),
    feed_vol: faker.number.int({ min: 0, max: 2000 }),
    fio2: faker.number.int({ min: 21, max: 100 }),
    spo2: faker.number.int({ min: 80, max: 100 }),
    heart_rate: faker.number.int({ min: 50, max: 120 }),
    respiratory_rate: faker.number.int({ min: 12, max: 30 }),
    systolic_bp: faker.number.int({ min: 90, max: 180 }),
    diastolic_bp: faker.number.int({ min: 60, max: 110 }),
    temperature: faker.number.float({ min: 36, max: 39, precision: 0.1 }),
    weight: faker.number.float({ min: 40, max: 120, precision: 0.1 }),
    height: faker.number.float({ min: 140, max: 200, precision: 0.1 }),
    created: new Date().toISOString()
  };
}

// Generate 100 sample patients
const patients = Array.from({ length: 100 }, generatePatient);

// Convert to CSV
const csvHeader = Object.keys(patients[0]).join(',');
const csvRows = patients.map(patient => 
  Object.values(patient).map(value => 
    typeof value === 'string' ? `"${value}"` : value
  ).join(',')
);

const csvContent = [csvHeader, ...csvRows].join('\n');

// Write to file
const outputPath = path.join(__dirname, 'sample-patients.csv');
fs.writeFileSync(outputPath, csvContent);

console.log(`Generated ${patients.length} sample patients in ${outputPath}`); 
const path = require('path');
const { faker } = require('@faker-js/faker');

// Function to generate a random date within a range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Function to generate a random patient
function generatePatient() {
  const admissionDate = randomDate(new Date(2023, 0, 1), new Date());
  const dateOfBirth = randomDate(new Date(1940, 0, 1), new Date(2000, 0, 1));
  const age = Math.floor((new Date() - dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
  
  return {
    encounterId: faker.string.uuid(),
    name: faker.person.fullName(),
    dateOfBirth: dateOfBirth.toISOString().split('T')[0],
    admissionDate: admissionDate.toISOString().split('T')[0],
    gender: faker.helpers.arrayElement(['male', 'female', 'other']),
    age: age,
    referral: faker.datatype.boolean(),
    referralStatus: faker.helpers.arrayElement(['pending', 'in_progress', 'completed']),
    bmi: faker.number.float({ min: 15, max: 40, precision: 0.1 }),
    feed_vol: faker.number.int({ min: 0, max: 2000 }),
    fio2: faker.number.int({ min: 21, max: 100 }),
    spo2: faker.number.int({ min: 80, max: 100 }),
    heart_rate: faker.number.int({ min: 50, max: 120 }),
    respiratory_rate: faker.number.int({ min: 12, max: 30 }),
    systolic_bp: faker.number.int({ min: 90, max: 180 }),
    diastolic_bp: faker.number.int({ min: 60, max: 110 }),
    temperature: faker.number.float({ min: 36, max: 39, precision: 0.1 }),
    weight: faker.number.float({ min: 40, max: 120, precision: 0.1 }),
    height: faker.number.float({ min: 140, max: 200, precision: 0.1 }),
    created: new Date().toISOString()
  };
}

// Generate 100 sample patients
const patients = Array.from({ length: 100 }, generatePatient);

// Convert to CSV
const csvHeader = Object.keys(patients[0]).join(',');
const csvRows = patients.map(patient => 
  Object.values(patient).map(value => 
    typeof value === 'string' ? `"${value}"` : value
  ).join(',')
);

const csvContent = [csvHeader, ...csvRows].join('\n');

// Write to file
const outputPath = path.join(__dirname, 'sample-patients.csv');
fs.writeFileSync(outputPath, csvContent);

console.log(`Generated ${patients.length} sample patients in ${outputPath}`); 