import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import './GeneralOrder.css';

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

function GeneralOrder() {
  const [files, setFiles] = useState([]);
  const [texts, setTexts] = useState({});
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [go95Definitions, setGO95Definitions] = useState({});
  const [go128Definitions, setGO128Definitions] = useState({});

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
            <button onClick={handleSearch}>Normal Analysis</button>
            <button onClick={handleGeneralOrderAnalysis}>General Order Analysis</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GeneralOrder;
