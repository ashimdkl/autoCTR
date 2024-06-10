import React, { useState } from 'react'; // import react and useState hook
import { useDropzone } from 'react-dropzone'; // import useDropzone hook for handling file drops
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'; // import pdfjs-dist for PDF manipulation
import * as pdfjsLib from 'pdfjs-dist/webpack'; // import webpack for pdfjs-dist
import { saveAs } from 'file-saver'; // import saveAs function to save files
import JSZip from 'jszip'; // import jszip for creating zip files
import { PDFDocument } from 'pdf-lib'; // import PDFDocument from pdf-lib for PDF creation
import './App.css'; // import css file for styling

// set the worker source for pdfjs
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

/**
 * mainPage component
 * handles the main functionality of splitting pdf files into individual pages
 * @returns {jsx.Element} - returns the jsx for rendering the main page component
 */
function MainPage() {
  const [files, setFiles] = useState([]); // state to hold the uploaded files
  const [loading, setLoading] = useState(false); // state to handle loading state

  /**
   * onDrop function
   * handles the file drop event, processes pdf files and splits them into individual pages
   * @param {array} acceptedFiles - array of accepted files dropped by the user
   */
  const onDrop = (acceptedFiles) => {
    setFiles(acceptedFiles); // set the accepted files to state
    setLoading(true); // set loading state to true

    // map through the accepted files and process each file
    const promises = acceptedFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader(); // create a new file reader instance
        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result); // read file as uint8 array
          const loadingTask = getDocument(typedArray); // load the pdf document
          const pdf = await loadingTask.promise; // get the pdf document promise

          const zip = new JSZip(); // create a new jszip instance
          const promises = []; // array to hold promises for each page

          // loop through each page in the pdf
          for (let i = 1; i <= pdf.numPages; i++) {
            // get each page and process it
            promises.push(pdf.getPage(i).then(async (page) => {
              const scale = 2; // set scale for higher resolution
              const viewport = page.getViewport({ scale }); // get viewport with scale
              const canvas = document.createElement('canvas'); // create canvas element
              const context = canvas.getContext('2d'); // get canvas context
              canvas.height = viewport.height; // set canvas height
              canvas.width = viewport.width; // set canvas width

              const renderContext = {
                canvasContext: context, // canvas context
                viewport: viewport // viewport
              };

              await page.render(renderContext).promise; // render the page to canvas
              const imgData = canvas.toDataURL('image/png'); // get image data from canvas

              const newPdfDoc = await PDFDocument.create(); // create a new pdf document
              const page1 = newPdfDoc.addPage([viewport.width, viewport.height]); // add new page with same dimensions
              const img = await newPdfDoc.embedPng(imgData); // embed the image data into the pdf
              page1.drawImage(img, {
                x: 0,
                y: 0,
                width: viewport.width,
                height: viewport.height,
              });

              const pdfBytes = await newPdfDoc.save(); // save the new pdf document
              const blob = new Blob([pdfBytes], { type: 'application/pdf' }); // create a blob from pdf bytes
              zip.file(`page${i}.pdf`, blob); // add the blob to the zip file
            }));
          }

          // wait for all pages to be processed
          Promise.all(promises).then(() => {
            zip.generateAsync({ type: 'blob' }).then((content) => {
              saveAs(content, `${file.name.split('.pdf')[0]}_pages.zip`); // save the zip file
              resolve(); // resolve the promise
            });
          });
        };

        reader.readAsArrayBuffer(file); // read the file as array buffer
      });
    });

    // wait for all files to be processed
    Promise.all(promises).then(() => setLoading(false)); // set loading to false once done
  };

  // get the props for dropzone
  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div className="data-page">
      <h1>splitter</h1>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>drag and drop pdf files here, or click to select</p>
      </div>
      {loading ? (
        <div>loading and splitting files...</div>
      ) : (
        files.length > 0 && (
          <div>
            <h2>files processed! download your zipped files.</h2>
          </div>
        )
      )}
    </div>
  );
}

export default MainPage; // export the main page component