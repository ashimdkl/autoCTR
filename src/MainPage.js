// before we begin, import the necessary modules
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import './App.css';
import JSZip from 'jszip';
import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';

// setting the worker source for pdf.js
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

function MainPage() {
  // state variables to store files and data
  const [splitFiles, setSplitFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [facilityData, setFacilityData] = useState("");
  const [renameFiles, setRenameFiles] = useState([]);
  const [facilityDialogVisible, setFacilityDialogVisible] = useState(false);
  const [workOrderDialogVisible, setWorkOrderDialogVisible] = useState(false);
  const [workOrder, setWorkOrder] = useState("");
  const [popupVisible, setPopupVisible] = useState(false); // New state for popup visibility

  // function to handle changes in the facility data input
  const handleFacilityDataChange = (event) => {
    setFacilityData(event.target.value);
  };

  // function to handle changes in the work order input
  const handleWorkOrderChange = (event) => {
    setWorkOrder(event.target.value);
  };

  // function to parse facility data
  /*
  params: data (string)
  output: array of objects containing sequence and facilityId
  this function takes the facility data as a string, splits it by lines, and returns an array of objects containing sequence and facilityId
  */
  const parseFacilityData = (data) => {
    return data.split('\n').map(line => {
      const [sequence, facilityId] = line.split('\t');
      return { sequence, facilityId };
    });
  };

  // function to handle dropping PDF files for splitting
  /*
  params: acceptedFiles (array of files)
  output: none
  this function handles the dropping of PDF files, reads the files, splits them into individual pages, and saves them as a zipped file
  */
  const handleSplitDrop = (acceptedFiles) => {
    setSplitFiles(acceptedFiles);
    setLoading(true);
    
    // split the PDF files
    const splitPromises = acceptedFiles.map((file) => {
      // return a promise for each file
      return new Promise((resolve) => {
        // create a new file reader
        const reader = new FileReader();
        reader.onload = async () => {

          // here, we are reading the file as an array buffer and then converting it to a Uint8Array and then passing it to the getDocument function.
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = getDocument(typedArray);
          const pdf = await loadingTask.promise;

          // create a new JSZip instance
          const zip = new JSZip();
          const pagePromises = [];

          // loop through each page of the PDF
          for (let i = 1; i <= pdf.numPages; i++) {
            // for each page, create a new canvas element and draw the page on it
            pagePromises.push(pdf.getPage(i).then(async (page) => {
              // this is extracting the viewport of the page and then rendering it on a canvas element
              const scale = 2;
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              const renderContext = {
                canvasContext: context,
                viewport: viewport
              };

              await page.render(renderContext).promise;
              const imgData = canvas.toDataURL('image/png');
              
              // p much the same as before, but now we are creating a new PDF document and adding the image to it
              const newPdfDoc = await PDFDocument.create();
              const page1 = newPdfDoc.addPage([viewport.width, viewport.height]);
              const img = await newPdfDoc.embedPng(imgData);
              page1.drawImage(img, {
                x: 0,
                y: 0,
                width: viewport.width,
                height: viewport.height,
              });

              // saving the new PDF document as a blob and adding it to the zip file
              const pdfBytes = await newPdfDoc.save();
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              zip.file(`page${i}.pdf`, blob);
            }));
          }

          // after all pages have been processed, generate the zip file and save it
          Promise.all(pagePromises).then(() => {
            zip.generateAsync({ type: 'blob' }).then((content) => {
              saveAs(content, `${file.name.split('.pdf')[0]}_pages.zip`);
              resolve();
            });
          });
        };

        // read the file as an array buffer
        reader.readAsArrayBuffer(file);
      });
    });

    // wait for all promises to resolve before setting loading to false
    Promise.all(splitPromises).then(() => setLoading(false));
  };

  // function to handle dropping PDF files for renaming
  /*
  params: acceptedFiles (array of files)
  output: none
  this function handles the dropping of PDF files, stores the files in state, and shows the facility dialog for input
  */
  const handleRenameDrop = (acceptedFiles) => {
    setRenameFiles(acceptedFiles);
    setLoading(true);
    setFacilityDialogVisible(true);
  };

  // function to process facility data
  /*
  params: none
  output: none
  this function processes the facility data, matches it with the dropped PDF files, and sets the results in state
  */
  const processFacilityData = () => {
    const facilityDataArray = parseFacilityData(facilityData);
    const facilityIds = facilityDataArray.map(item => item.facilityId);

    // process the facility data
    const renamePromises = renameFiles.map((file) => {
      // return a promise for each file
      return new Promise((resolve) => {
        // create a new file reader
        const reader = new FileReader();
        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = getDocument(typedArray);
          const pdf = await loadingTask.promise;

          // create a new JSZip instance
          const pagePromises = [];
          
          // in this, we are looping through each page of the PDF and extracting the text content
          for (let i = 1; i <= pdf.numPages; i++) {
            pagePromises.push(pdf.getPage(i).then(async (page) => {
              const textContent = await page.getTextContent();
              const lines = textContent.items.map(item => item.str.replace(/\s+/g, ''));
              const text = lines.join(' ');

              // here, we are using a regex to match the facility id and then finding the corresponding sequence number from the facility data array
              const regex = /(\d{8}\.\d+)\s+(\d+)/;
              // const regex = /(\d{8}\.\d{7})\s+(\d+)/; this is the bread and butter, and it will match the facility id and the sequence number
              const matches = text.match(regex);
              let facilityId = null;
              if (matches) {
                facilityId = matches[1] + matches[2];
              }

              // here, we are finding the corresponding sequence number from the facility data array
              const facilityMatch = facilityDataArray.find(item => item.facilityId === facilityId);

              const result = {
                fileName: file.name,
                page: `page ${i}`,
                sequence: facilityMatch ? facilityMatch.sequence : 'not found',
                facilityId: facilityId || 'not found'
              };

              return result;
            }));
          }

          Promise.all(pagePromises).then((pageResults) => {
            resolve(pageResults);
          });
        };

        reader.readAsArrayBuffer(file);
      });
    });

    // wait for all promises to resolve before setting loading to false
    Promise.all(renamePromises).then((allResults) => {
      const flattenedResults = allResults.flat();
      setResults(flattenedResults);
      setLoading(false);
      setFacilityDialogVisible(false);
    });
  };

  // function to rename and zip files
  /*
  params: none
  output: none
  this function renames the PDF files based on the sequence number and zips them for download
  */
  const renameAndZipFiles = () => {
    setLoading(true);
    const zip = new JSZip();

    // group the results by sequence number
    const sequenceGroups = results.reduce((groups, result) => {
      if (result.sequence !== 'not found') {
        if (!groups[result.sequence]) {
          groups[result.sequence] = [];
        }
        groups[result.sequence].push(result);
      }
      return groups;
    }, {});

    // create a new PDF document for each sequence group
    const renamePromises = Object.keys(sequenceGroups).map(async (sequence) => {
      const pdfDoc = await PDFDocument.create();
      const sequenceResults = sequenceGroups[sequence];
      // for each result in the sequence group, add the corresponding page to the new PDF document
      for (const result of sequenceResults) {
        const file = renameFiles.find(f => f.name === result.fileName);
        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          const originalPdf = await PDFDocument.load(arrayBuffer);

          const pageIndex = parseInt(result.page.split(' ')[1], 10) - 1;
          const [page] = await pdfDoc.copyPages(originalPdf, [pageIndex]);
          pdfDoc.addPage(page);
        }
      }
      // save the new PDF document as a blob and add it to the zip file
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      zip.file(`SEQ${sequence}.pdf`, blob);
    });
    // generate the zip file and save it
    Promise.all(renamePromises).then(() => {
      zip.generateAsync({ type: 'blob' }).then((content) => {
        saveAs(content, 'output.zip');
        setLoading(false);
      });
    }).catch(error => {
      console.error('Error generating zip file:', error);
      setLoading(false);
    });
  };

  // function to add box with work order and sequence number to each page
  /*
  params: none
  output: none
  this function adds a box with the work order and sequence number to each page of the PDF and zips the edited files for download
  */
  const addBoxToPages = async () => {
    setLoading(true);

    // group the results by sequence number
    const sequenceGroups = results.reduce((groups, result) => {
      if (result.sequence !== 'not found') {
        if (!groups[result.sequence]) {
          groups[result.sequence] = [];
        }
        groups[result.sequence].push(result);
      }
      return groups;
    }, {});

    // create a new PDF document for each sequence group
    const editPromises = Object.keys(sequenceGroups).map(async (sequence) => {
      const pdfDoc = await PDFDocument.create();
      const sequenceResults = sequenceGroups[sequence];
      
      // for each result in the sequence group, add the corresponding page to the new PDF document
      for (const result of sequenceResults) {
        const file = renameFiles.find(f => f.name === result.fileName);
        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          const originalPdf = await PDFDocument.load(arrayBuffer);

          const pageIndex = parseInt(result.page.split(' ')[1], 10) - 1;
          const [page] = await pdfDoc.copyPages(originalPdf, [pageIndex]);
          const newPage = pdfDoc.addPage(page);

          // we are adding a red rectangle with the work order and sequence number to the bottom right corner of the page using the drawRectangle and drawText functions
          const rectWidth = 120;
          const rectHeight = 40;
          const rectX = newPage.getWidth() - rectWidth - 10;
          const rectY = newPage.getHeight() - rectHeight - 10;

          newPage.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            borderColor: rgb(1, 0, 0),
            borderWidth: 1,
          });

          newPage.drawText(`WO: ${workOrder}`, {
            x: rectX + 5,
            y: rectY + 20,
            size: 10,
            color: rgb(1, 0, 0),
          });

          newPage.drawText(`Sequence #: ${result.sequence}`, {
            x: rectX + 5,
            y: rectY + 5,
            size: 10,
            color: rgb(1, 0, 0),
          });
        }
      }

      // save the new PDF document as a blob
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      return { blob, fileName: `SEQ${sequence}.pdf` };
    });

    // generate the zip file and save it
    const editedFiles = await Promise.all(editPromises);
    const zip = new JSZip();

    // add the edited files to the zip file
    editedFiles.forEach((file) => {
      zip.file(file.fileName, file.blob);
    });

    // generate the zip file and save it
    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'edited_files.zip');
      setLoading(false);
    }).catch(error => {
      console.error('Error generating zip file:', error);
      setLoading(false);
    });
  };

  // dropzone configuration
  const { getRootProps: getSplitRootProps, getInputProps: getSplitInputProps } = useDropzone({ onDrop: handleSplitDrop });
  const { getRootProps: getRenameRootProps, getInputProps: getRenameInputProps } = useDropzone({ onDrop: handleRenameDrop });

  return (
    <div className="data-page">
      <h1>splitter</h1>
      <div {...getSplitRootProps({ className: 'dropzone' })}>
        <input {...getSplitInputProps()} />
        <p>drag and drop pdf files here, or click to select</p>
      </div>
      {loading && splitFiles.length > 0 ? (
        <div>loading and splitting files...</div>
      ) : (
        splitFiles.length > 0 && (
          <div>
            <h2>files processed! download your zipped files.</h2>
          </div>
        )
      )}

      <h1>results</h1>
      <div {...getRenameRootProps({ className: 'dropzone' })}>
        <input {...getRenameInputProps()} />
        <p>drag and drop pdf files here, or click to select</p>
      </div>
      {loading && renameFiles.length > 0 ? (
        <div>loading and processing files...</div>
      ) : (
        renameFiles.length > 0 && (
          <div>
            <h2>files processed! check the results below.</h2>
          </div>
        )
      )}

      {facilityDialogVisible && (
        <div className="facility-dialog">
          <h2>enter sequence # and facility id pairs</h2>
          <textarea
            rows="10"
            cols="50"
            value={facilityData}
            onChange={handleFacilityDataChange}
            placeholder={`enter sequence #'s and facility ids, e.g.\n1010\t01339008.0221700\n1020\t01339008.0221761\n1030\t01339008.0221703\n1040\t01339008.0221702`}
          />
          <button onClick={processFacilityData}>process data</button>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2>results</h2>
          

          <div className="navigation-links">
            <Link to="/">Home</Link> |{' '}
            <Link to="/mainPage">Main Page</Link> |{' '}
            <Link to="/generalOrder">General Order</Link>
          </div>

          <table>
            <thead>
              <tr>
                <th>file name</th>
                <th>page</th>
                <th>sequence #</th>
                <th>facility id</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td>{result.fileName}</td>
                  <td>{result.page}</td>
                  <td>{result.sequence}</td>
                  <td>{result.facilityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="download-button" onClick={renameAndZipFiles}>Download Renamed Files</button>
          <button className="download-button-edited" onClick={() => setWorkOrderDialogVisible(true)}>Download Edited PDFs</button>
          {workOrderDialogVisible && (
            <div className="work-order-dialog">
              <h2>enter work order #</h2>
              <input
                className="work-order-input"
                type="text"
                value={workOrder}
                onChange={handleWorkOrderChange}
                placeholder="enter work order #"
              />
              <button className="edited-button" onClick={addBoxToPages}>add box and download edited pdfs</button>
            </div>
          )}
        </div>
      )}

      {/* Icon and Popup */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          cursor: 'pointer',
          zIndex: 1000,
        }}
        onClick={() => setPopupVisible(true)}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/8/84/Question_Mark_Icon.png"
          alt="Help"
          style={{ width: '60px', height: '60px', opacity: 0.5 }}
        />
      </div>

      {popupVisible && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            zIndex: 1001,
          }}
        >
          <video width="320" height="240" controls>
            <source src="/ctrAuto.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <button
            onClick={() => setPopupVisible(false)}
            style={{
              display: 'block',
              margin: '10px auto',
              padding: '5px 10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default MainPage;
