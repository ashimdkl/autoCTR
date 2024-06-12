import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import * as XLSX from 'xlsx';
import './GeneralOrder.css';

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

function GeneralOrder() {
  const [files, setFiles] = useState([]);
  const [texts, setTexts] = useState({});
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [go95Definitions, setGO95Definitions] = useState({});
  const [go128Definitions, setGO128Definitions] = useState({});
  const [popupVisible, setPopupVisible] = useState(false); // New state for popup visibility

  useEffect(() => {
    fetch('/go95.txt')
      .then(response => response.text())
      .then(text => {
        const definitions = parseGODefinitions(text);
        setGO95Definitions(definitions);
      });

    fetch('/go128.txt')
      .then(response => response.text())
      .then(text => {
        const definitions = parseGODefinitions(text);
        setGO128Definitions(definitions);
      });
  }, []);

  const parseGODefinitions = (text) => {
    const lines = text.split('\n');
    const definitions = {};

    lines.forEach(line => {
      const ruleMatch = line.match(/(\d+\.\d+): (.+)/);
      if (ruleMatch) {
        const ruleNumber = ruleMatch[1];
        const definition = ruleMatch[2];
        definitions[ruleNumber] = definition;
      }
    });

    return definitions;
  };

  const onDrop = (acceptedFiles) => {
    setFiles(acceptedFiles);
    setLoading(true);

    const promises = acceptedFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = getDocument(typedArray);
          const pdf = await loadingTask.promise;
          const textPositions = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            textPositions.push({ page: i, text: pageText, items: textContent.items });
          }

          setTexts((prevTexts) => ({ ...prevTexts, [file.name]: { textPositions } }));
          resolve();
        };

        reader.readAsArrayBuffer(file);
      });
    });

    Promise.all(promises).then(() => setLoading(false));
  };

  const findSentences = (text, keyword) => {
    const sentences = text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s/);
    return sentences.filter(sentence => sentence.toLowerCase().includes(keyword.toLowerCase()));
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleSearch = () => {
    const keywordsArray = keywords.split(',').map(kw => kw.trim());
    const results = [];

    Object.keys(texts).forEach((fileName) => {
      const { textPositions } = texts[fileName];
      keywordsArray.forEach(keyword => {
        textPositions.forEach(({ page, text }) => {
          const sentences = findSentences(text, keyword);
          sentences.forEach((sentence, i) => {
            results.push({
              keyword,
              fileName: fileName.replace('.pdf', ''),
              page,
              occurrence: `${i + 1} / ${sentences.length}`,
              title: sentence
            });
          });
        });
      });
    });

    results.sort((a, b) => a.keyword.localeCompare(b.keyword));
    handleDownload(results);
  };

  const handleGeneralOrderAnalysis = () => {
    const keywordsArray = keywords.split(',').map(kw => kw.trim());
    const results = [];
    Object.keys(texts).forEach((fileName) => {
      const { textPositions } = texts[fileName];
      keywordsArray.forEach(keyword => {
        textPositions.forEach(({ page, text }, index) => {
          const sentences = findSentences(text, keyword);
          sentences.forEach((sentence, i) => {
            const go95Results = analyzeGO95(sentence, fileName, page, i + 1, sentences.length);
            const go128Results = analyzeGO128(sentence, fileName, page, i + 1, sentences.length);
            results.push(...go95Results, ...go128Results);
          });
        });
      });
    });

    results.sort((a, b) => a.keyword.localeCompare(b.keyword));
    handleDownload(results);
  };

  const analyzeGO95 = (sentence, fileName, page, occurrence, totalOccurrences) => {
    const results = [];
    const go95Match = sentence.match(/GO 95,? Rules? ([\d.]+)/);
    if (go95Match) {
      const ruleNumber = go95Match[1];
      const goInfo = go95Definitions[ruleNumber] || '';
      results.push({
        keyword: 'GO 95',
        fileName,
        page: `Page ${page}`,
        occurrence: `${occurrence} / ${totalOccurrences}`,
        goNumber: '95',
        ruleNumber,
        goInfo,
        title: sentence
      });
    }
    return results;
  };

  const analyzeGO128 = (sentence, fileName, page, occurrence, totalOccurrences) => {
    const results = [];
    const go128Match = sentence.match(/GO 128,? Rules? ([\d.]+)/);
    if (go128Match) {
      const ruleNumber = go128Match[1];
      const goInfo = go128Definitions[ruleNumber] || '';
      results.push({
        keyword: 'GO 128',
        fileName,
        page: `Page ${page}`,
        occurrence: `${occurrence} / ${totalOccurrences}`,
        goNumber: '128',
        ruleNumber,
        goInfo,
        title: sentence
      });
    }
    return results;
  };

  const handleDownload = (results) => {
    const worksheet = XLSX.utils.json_to_sheet(results.map(result => ({
      keyword: result.keyword,
      file: result.fileName,
      page: result.page,
      occurrence: result.occurrence,
      'go ?': result.goNumber || '',
      'rule number': result.ruleNumber || '',
      'definition': result.goInfo || '',
      title: result.title
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, 'pdf_keyword_analyzer.xlsx');
  };

  return (
    <div className="data-page">
      <h1>powerFUL searching.</h1>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>drag and drop pdf files here, or click to select</p>
      </div>
      {loading ? (
        <div>Loading and Generating Files.... </div>
      ) : (
        files.length > 0 && (
          <div>
            <h2>Loading Complete! Choose Analysis Appropriately.</h2>
          </div>
        )
      )}
      {Object.keys(texts).length > 0 && (
        <div>
          <h2>Enter keywords to search (comma separated):</h2>
          <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} />
          <div>
            <button className = "download-button" onClick={handleSearch}>Normal Analysis</button>
            <button className = "download-button" onClick={handleGeneralOrderAnalysis}>General Order Analysis</button>
          </div>
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
            <source src="/GOanalysis.mp4" type="video/mp4" />
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

export default GeneralOrder;
