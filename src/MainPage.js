import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import './App.css';
import JSZip from 'jszip';
import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';

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

  // function to handle changes in the facility data input
  // inputs: event (change event)
  // outputs: updates facilityData state
  const handleFacilityDataChange = (event) => {
    setFacilityData(event.target.value);
  };

  // function to handle changes in the work order input
  // inputs: event (change event)
  // outputs: updates workOrder state
  const handleWorkOrderChange = (event) => {
    setWorkOrder(event.target.value);
  };

  // function to parse facility data
  // inputs: data (string of facility data)
  // outputs: array of objects with sequence and facilityId
  const parseFacilityData = (data) => {
    return data.split('\n').map(line => {
      const [sequence, facilityId] = line.split('\t');
      return { sequence, facilityId };
    });
  };

  // function to handle dropping PDF files for splitting
  // inputs: acceptedFiles (array of PDF files)
  // outputs: sets loading state, processes each PDF file, creates a zip of split pages
  const handleSplitDrop = (acceptedFiles) => {
    setSplitFiles(acceptedFiles);
    setLoading(true);

    // process each PDF file
    const splitPromises = acceptedFiles.map((file) => {
      // return a promise for each file
      return new Promise((resolve) => {
        const reader = new FileReader();
        // read the file as an array buffer
        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = getDocument(typedArray);
          const pdf = await loadingTask.promise;

          const zip = new JSZip();
          const pagePromises = [];

          // process each page of the PDF file
          for (let i = 1; i <= pdf.numPages; i++) {
            pagePromises.push(pdf.getPage(i).then(async (page) => {
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

              const newPdfDoc = await PDFDocument.create();
              const page1 = newPdfDoc.addPage([viewport.width, viewport.height]);
              const img = await newPdfDoc.embedPng(imgData);
              page1.drawImage(img, {
                x: 0,
                y: 0,
                width: viewport.width,
                height: viewport.height,
              });

              const pdfBytes = await newPdfDoc.save();
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              zip.file(`page${i}.pdf`, blob);
            }));
          }

          // generate the zip file with all pages
          Promise.all(pagePromises).then(() => {
            zip.generateAsync({ type: 'blob' }).then((content) => {
              saveAs(content, `${file.name.split('.pdf')[0]}_pages.zip`);
              resolve();
            });
          });
        };

        reader.readAsArrayBuffer(file);
      });
    });

    Promise.all(splitPromises).then(() => setLoading(false));
  };

  // function to handle dropping PDF files for renaming
  // inputs: acceptedFiles (array of PDF files)
  // outputs: sets loading state, shows facility dialog
  const handleRenameDrop = (acceptedFiles) => {
    setRenameFiles(acceptedFiles);
    setLoading(true);
    setFacilityDialogVisible(true);
  };

  // function to process facility data
  // inputs: none
  // outputs: processes facility data, sets results state
  const processFacilityData = () => {
    const facilityDataArray = parseFacilityData(facilityData);
    const facilityIds = facilityDataArray.map(item => item.facilityId);

    const renamePromises = renameFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = getDocument(typedArray);
          const pdf = await loadingTask.promise;

          const pagePromises = [];

          // process each page of the PDF file
          for (let i = 1; i <= pdf.numPages; i++) {
            pagePromises.push(pdf.getPage(i).then(async (page) => {
              const textContent = await page.getTextContent();
              const lines = textContent.items.map(item => item.str.replace(/\s+/g, ''));
              const text = lines.join(' ');

              // match the facility id using regex
              const regex = /(\d{8}\.\d+)\s+(\d+)/;
              const matches = text.match(regex);
              let facilityId = null;
              if (matches) {
                facilityId = matches[1] + matches[2];
              }

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

    Promise.all(renamePromises).then((allResults) => {
      const flattenedResults = allResults.flat();
      setResults(flattenedResults);
      setLoading(false);
      setFacilityDialogVisible(false);
    });
  };

  // function to rename and zip files
  // inputs: none
  // outputs: renames PDF files and creates a zip file
  const renameAndZipFiles = () => {
    setLoading(true);
    const zip = new JSZip();

    // group results by sequence number
    const sequenceGroups = results.reduce((groups, result) => {
      if (result.sequence !== 'not found') {
        if (!groups[result.sequence]) {
          groups[result.sequence] = [];
        }
        groups[result.sequence].push(result);
      }
      return groups;
    }, {});

    // create a promise for each sequence group
    const renamePromises = Object.keys(sequenceGroups).map(async (sequence) => {
      const pdfDoc = await PDFDocument.create();
      const sequenceResults = sequenceGroups[sequence];

      // add pages to the new PDF document
      for (const result of sequenceResults) {
        const response = await fetch(result.fileName);
        const arrayBuffer = await response.arrayBuffer();
        const originalPdf = await PDFDocument.load(arrayBuffer);

        // get the page index from the result
        const pageIndex = parseInt(result.page.split(' ')[1], 10) - 1;
        const [page] = await pdfDoc.copyPages(originalPdf, [pageIndex]);
        pdfDoc.addPage(page);
      }

      // save the PDF document and add it to the zip file
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pageRange = sequenceResults.map(res => res.page.split(' ')[1]).join('_');
      zip.file(`${sequence}sequenceMERGpage${pageRange}.pdf`, blob);
    });

    // wait for all promises to resolve
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
  // inputs: none
  // outputs: processes PDF files, adds box to each page, creates a zip of edited files
  const addBoxToPages = async () => {
    setLoading(true);

    // group results by sequence number
    const sequenceGroups = results.reduce((groups, result) => {
      if (result.sequence !== 'not found') {
        if (!groups[result.sequence]) {
          groups[result.sequence] = [];
        }
        groups[result.sequence].push(result);
      }
      return groups;
    }, {});

    // create a promise for each sequence group
    const editPromises = Object.keys(sequenceGroups).map(async (sequence) => {
      const pdfDoc = await PDFDocument.create();
      const sequenceResults = sequenceGroups[sequence];

      // add pages to the new PDF document
      for (const result of sequenceResults) {
        const response = await fetch(result.fileName);
        const arrayBuffer = await response.arrayBuffer();
        const originalPdf = await PDFDocument.load(arrayBuffer);

        // get the page index from the result
        const pageIndex = parseInt(result.page.split(' ')[1], 10) - 1;
        const [page] = await pdfDoc.copyPages(originalPdf, [pageIndex]);
        const newPage = pdfDoc.addPage(page);

        const rectWidth = 120;
        const rectHeight = 40;
        const rectX = newPage.getWidth() - rectWidth - 10;
        const rectY = newPage.getHeight() - rectHeight - 10;

        // draw rectangle on each page
        newPage.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight,
          borderColor: rgb(1, 0, 0),
          borderWidth: 1,
        });

        // add work order text
        newPage.drawText(`WO: ${workOrder}`, {
          x: rectX + 5,
          y: rectY + 5,
          size: 10,
          color: rgb(1, 0, 0), // change text color to red
        });

        // add sequence number text
        newPage.drawText(`Sequence #: ${result.sequence}`, {
          x: rectX + 5,
          y: rectY + 20, // add a space of 15 units between the two texts
          size: 10,
          color: rgb(1, 0, 0), // change text color to red
        });
      }

      // save the PDF document and return the blob and file name
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pageRange = sequenceResults.map(res => res.page.split(' ')[1]).join('_');
      return { blob, fileName: `${sequence}sequenceMERGpage${pageRange}.pdf` };
    });

    // wait for all promises to resolve
    const editedFiles = await Promise.all(editPromises);
    const zip = new JSZip();

    editedFiles.forEach((file) => {
      zip.file(file.fileName, file.blob);
    });

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
          className = "work-order-input"
          type="text"
          value={workOrder}
          onChange={handleWorkOrderChange}
          placeholder="enter work order #"
        />
        <button className = "edited-button" onClick={addBoxToPages}>add box and download edited pdfs</button>
      </div>
    )}
  </div>
)}
  </div>
  );
}

export default MainPage;
