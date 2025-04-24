# CCU Feeding Dashboard

A web application for Critical Care Unit (CCU) staff to monitor and prioritize patients who need dietitian referrals. The dashboard displays patient physiological measurements and uses machine learning recommendations to flag patients who should see a dietitian.

## Features

- Display all CCU patients with dietitian referral flags
- Filter and view patients who require dietitian referrals
- Upload patient data via CSV file
- Visualize individual patient measurements
- Generate reports with tables and graphs
- Cross-platform compatibility

## Technology Stack

- **Frontend**: React, React Bootstrap, Chart.js
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Data Processing**: CSV parsing for patient data

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local instance or MongoDB Atlas)
- npm or yarn

## Installation

1. Clone the repository
```
git clone <repository-url>
cd feeding-dashboard
```

2. Install backend dependencies
```
npm install
```

3. Install frontend dependencies
```
npm run install-client
```

4. Create a `.env` file in the root directory with the following variables:
```
MONGO_URI=mongodb://localhost/feeding-dashboard
PORT=5000
NODE_ENV=development
```

## Running the Application

1. Start the development server (both frontend and backend)
```
npm run dev
```

2. The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## CSV File Format

The application expects a CSV file with the following format:

- **Required fields**:
  - `patientId`: Unique identifier for each patient
  - `name`: Patient's name
  - `referral`: Whether a patient should be referred to a dietitian (true/false or 1/0)

- **Optional fields**:
  - `admissionDate`: Date when the patient was admitted
  - `notes`: Additional notes about the patient

- **Physiological measurements**:
  - Any additional columns will be treated as physiological measurements
  - These can be used by the application to display patient data and generate reports

## Application Structure

```
feeding-dashboard/
│
├── client/                   # React frontend
│   ├── public/               # Static files
│   └── src/                  # React components
│       ├── components/       # React components
│       │   ├── layout/       # Layout components
│       │   └── pages/        # Page components
│       └── App.js            # Main React component
│
├── models/                   # MongoDB models
│   └── Patient.js            # Patient model
│
├── routes/                   # API routes
│   └── patients.js           # Patient routes
│
├── uploads/                  # Temporary storage for CSV uploads
│
├── .env                      # Environment variables
├── package.json              # Project dependencies
├── server.js                 # Express server setup
└── README.md                 # Project documentation
```

## Deployment

The application is configured for easy deployment to Heroku or similar platforms:

```
# Heroku deployment
heroku create
git push heroku main
```

## License

MIT 