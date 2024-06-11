import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import './App.css';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

// setting the worker source for pdf.js
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

function MainPage() {
  const [splitFiles, setSplitFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [facilityData, setFacilityData] = useState("");
  const [renameFiles, setRenameFiles] = useState([]);
  const [facilityDialogVisible, setFacilityDialogVisible] = useState(false);

  const handleFacilityDataChange = (event) => {
    setFacilityData(event.target.value);
  };

  const parseFacilityData = (data) => {
    return data.split('\n').map(line => {
      const [sequence, facilityId] = line.split('\t');
      return { sequence, facilityId };
    });
  };

  const handleSplitDrop = (acceptedFiles) => {
    setSplitFiles(acceptedFiles);
    setLoading(true);

    const splitPromises = acceptedFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = getDocument(typedArray);
          const pdf = await loadingTask.promise;

          const zip = new JSZip();
          const pagePromises = [];

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

  const handleRenameDrop = (acceptedFiles) => {
    setRenameFiles(acceptedFiles);
    setLoading(true);
    setFacilityDialogVisible(true);
  };

  const processFacilityData = () => {
    const facilityDataArray = parseFacilityData(facilityData);
    const facilityIds = facilityDataArray.map(item => item.facilityId);

    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('api key is missing');
      setLoading(false);
      return;
    }

    const renamePromises = renameFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = getDocument(typedArray);
          const pdf = await loadingTask.promise;

          const pagePromises = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            pagePromises.push(pdf.getPage(i).then(async (page) => {
              const textContent = await page.getTextContent();
              const lines = textContent.items.map(item => item.str.replace(/\s+/g, ''));
              const text = lines.join(' ');

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

  const renameAndZipFiles = () => {
    setLoading(true);
    const zip = new JSZip();

    const sequenceGroups = results.reduce((groups, result) => {
      if (result.sequence !== 'not found') {
        if (!groups[result.sequence]) {
          groups[result.sequence] = [];
        }
        groups[result.sequence].push(result);
      }
      return groups;
    }, {});

    const renamePromises = Object.keys(sequenceGroups).map(async (sequence) => {
      const pdfDoc = await PDFDocument.create();
      const sequenceResults = sequenceGroups[sequence];

      for (const result of sequenceResults) {
        const response = await fetch(result.fileName);
        const arrayBuffer = await response.arrayBuffer();
        const originalPdf = await PDFDocument.load(arrayBuffer);

        const pageIndex = parseInt(result.page.split(' ')[1], 10) - 1;
        const [page] = await pdfDoc.copyPages(originalPdf, [pageIndex]);
        pdfDoc.addPage(page);
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pageRange = sequenceResults.map(res => res.page.split(' ')[1]).join('_');
      zip.file(`${sequence}sequenceMERGpage${pageRange}.pdf`, blob);
    });

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
        </div>
      )}
    </div>
  );
}

export default MainPage;
