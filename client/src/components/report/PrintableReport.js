import React from 'react';
import './PrintableReport.css';

const PrintableReport = ({ patients, stats }) => {
  if (!patients || patients.length === 0) return null;
  
  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDecimal = (value) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return value.toFixed(2);
  };

  // Get BMI status text and color
  const getBmiStatusInfo = (bmi) => {
    if (!bmi) return { text: 'N/A', color: '#6c757d' };
    
    if (bmi > 30) return { text: 'Obese', color: '#dc3545' };
    if (bmi > 25) return { text: 'Overweight', color: '#ffc107' };
    if (bmi < 18.5) return { text: 'Underweight', color: '#17a2b8' };
    return { text: 'Normal', color: '#28a745' };
  };

  // Calculate percent of average
  const getPercentOfAverage = (value, field) => {
    if (!value || !stats?.measurementStats?.[field]?.average) return 'N/A';
    const avg = stats.measurementStats[field].average;
    return `${Math.round((value / avg) * 100)}%`;
  };

  return (
    <div className="printable-report">
      <div className="report-header">
        <h1>CCU Patient Medical Report</h1>
        <div className="report-meta">
          <p>Generated: {formatDate()}</p>
          <p>Total Patients: {patients.length}</p>
        </div>
      </div>

      {patients.map((patient, index) => (
        <div key={patient._id} className="patient-section">
          <div className="patient-header">
            <h2>
              Patient ID: {patient.encounterId}
              <span className={`status-badge ${patient.referral ? 'referral' : 'regular'}`}>
                {patient.referral ? 'Dietitian Referral' : 'Regular Care'}
              </span>
            </h2>
            <div className="patient-demographics">
              <p><strong>Name:</strong> {patient.name || 'Not specified'}</p>
              <p><strong>Date of Birth:</strong> {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not specified'}</p>
              <p><strong>Admission Date:</strong> {patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString() : 'Not specified'}</p>
              <p><strong>Age:</strong> {patient.age || 'Not specified'}</p>
              <p><strong>Gender:</strong> {patient.gender ? (patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)) : 'Not specified'}</p>
            </div>
          </div>

          <div className="report-grid">
            <div className="medical-info">
              <h3>Medical Information</h3>
              <table className="info-table">
                <tbody>
                  <tr>
                    <th>Body Mass Index (BMI)</th>
                    <td>
                      {patient.bmi ? (
                        <span>
                          {patient.bmi.toFixed(2)}
                          <span className="status-dot" style={{ backgroundColor: getBmiStatusInfo(patient.bmi).color }}></span>
                          <span className="status-text">{getBmiStatusInfo(patient.bmi).text}</span>
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.bmi, 'bmi')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>Feeding Volume</th>
                    <td>{patient.feed_vol ? `${patient.feed_vol.toFixed(2)} ml` : 'N/A'}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.feed_vol, 'feed_vol')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>Administered Volume</th>
                    <td>{patient.feed_vol_adm ? `${patient.feed_vol_adm.toFixed(2)} ml` : 'N/A'}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.feed_vol_adm, 'feed_vol_adm')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>End Tidal CO2</th>
                    <td>{formatDecimal(patient.end_tidal_co2)}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.end_tidal_co2, 'end_tidal_co2')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>FiO2</th>
                    <td>{patient.fio2 ? `${patient.fio2.toFixed(2)}%` : 'N/A'}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.fio2, 'fio2')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>FiO2 Ratio</th>
                    <td>{formatDecimal(patient.fio2_ratio)}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.fio2_ratio, 'fio2_ratio')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>Respiratory Rate</th>
                    <td>{patient.resp_rate ? `${patient.resp_rate.toFixed(2)} breaths/min` : 'N/A'}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.resp_rate, 'resp_rate')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>Oxygen Flow Rate</th>
                    <td>{formatDecimal(patient.oxygen_flow_rate)}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.oxygen_flow_rate, 'oxygen_flow_rate')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>PEEP</th>
                    <td>{formatDecimal(patient.peep)}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.peep, 'peep')} of avg
                    </td>
                  </tr>
                  <tr>
                    <th>PIP</th>
                    <td>{formatDecimal(patient.pip)}</td>
                    <td className="compare-cell">
                      {getPercentOfAverage(patient.pip, 'pip')} of avg
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="summary-section">
              <h3>Patient Summary</h3>
              <div className="key-metrics">
                <div className="metric-item">
                  <span className="metric-label">BMI</span>
                  <span className="metric-value">{patient.bmi ? patient.bmi.toFixed(1) : 'N/A'}</span>
                  <span className="metric-status">{getBmiStatusInfo(patient.bmi).text}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Feed Vol</span>
                  <span className="metric-value">{patient.feed_vol ? patient.feed_vol.toFixed(0) : 'N/A'}</span>
                  <span className="metric-unit">ml</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Resp Rate</span>
                  <span className="metric-value">{patient.resp_rate ? patient.resp_rate.toFixed(1) : 'N/A'}</span>
                  <span className="metric-unit">bpm</span>
                </div>
              </div>
              
              <div className="assessment-section">
                <h4>Assessment</h4>
                <p>
                  {patient.bmi > 30 ? 'Patient is obese and may require nutritional counseling.' : 
                   patient.bmi > 25 ? 'Patient is overweight. Monitor nutritional intake.' : 
                   patient.bmi < 18.5 ? 'Patient is underweight. Consider nutritional supplementation.' : 
                   'Patient has normal BMI.'}
                </p>
                <p>
                  {patient.feed_vol ? 
                    (patient.feed_vol_adm && patient.feed_vol > patient.feed_vol_adm * 1.2) ? 
                      'Significant gap between prescribed feeding volume and administered volume. Review feeding protocol.' : 
                      'Feeding volume is being administered as prescribed.' 
                    : 'Feeding volume data not available.'}
                </p>
              </div>
            </div>
          </div>
          
          {index < patients.length - 1 && <div className="page-break"></div>}
        </div>
      ))}
      
      <div className="report-footer">
        <p>CCU Feeding Dashboard | End of Report</p>
      </div>
    </div>
  );
};

export default PrintableReport; 