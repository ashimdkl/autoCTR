import React from 'react';
import { Link } from 'react-router-dom';
import './Info.css';

function Info() {
  return (
    <div className="info-page">
      <h1>How to Use Our Site</h1>
      
      <section className="tutorial-section">
        <h2>General Order Analysis</h2>
        <ol>
          <li>
            <strong>Upload PDF Files:</strong>
            <p>Drag and drop your PDF files into the designated area or click to select files from your computer.</p>
          </li>
          <li>
            <strong>Enter Keywords:</strong>
            <p>Type in the keywords you want to search for in the uploaded PDFs, separated by commas.</p>
          </li>
          <li>
            <strong>Perform Analysis:</strong>
            <p>Click on the "General Order Analysis" button to start the analysis process. The system will extract sentences containing the keywords from the PDFs and cross-reference them with GO 95 and GO 128 rules.</p>
          </li>
          <li>
            <strong>Download Results:</strong>
            <p>Once the analysis is complete, an Excel file containing the results will be generated and you can download it.</p>
          </li>
        </ol>
      </section>
      
      <section className="tutorial-section">
        <h2>CTR Automation</h2>
        <ol>
          <li>
            <strong>Upload PDF Files:</strong>
            <p>Drag and drop your PDF files into the designated area or click to select files from your computer.</p>
          </li>
          <li>
            <strong>Provide Facility Data:</strong>
            <p>Enter the sequence numbers and facility IDs in the provided text area. Use the format: sequence number followed by a tab and then the facility ID.</p>
          </li>
          <li>
            <strong>Process Files:</strong>
            <p>Click the "Process Data" button to associate the sequence numbers with the corresponding PDF pages.</p>
          </li>
          <li>
            <strong>Download Renamed Files:</strong>
            <p>Once the processing is complete, click the "Download Renamed Files" button to download a zipped file containing the renamed PDFs.</p>
          </li>
        </ol>
      </section>
      
      <div className="navigation-links">
        <Link to="/">Home</Link> |{' '}
        <Link to="/mainPage">Main Page</Link> |{' '}
        <Link to="/generalOrder">General Order</Link>
      </div>
    </div>
  );
}

export default Info;
