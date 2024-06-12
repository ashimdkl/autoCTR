## power dist tools.

### Description

This application is designed to handle various PDF file operations such as splitting, renaming, and editing based on facility and sequence data. The application is built using React and leverages libraries like `pdf-lib` and `pdfjs-dist` for PDF manipulation, and `JSZip` for creating ZIP archives of the processed files. The second part is the General Order Analyzer and that is responsbile for parsing pdf's and finding the user keyword and extracting data into the excel sheets properly.

### Features

1. **Split PDF Files:**
   - Users can upload PDF files, and the application will split them into individual pages. Each page is saved as a separate PDF and zipped into a single file for download.

2. **Rename and Zip PDF Files:**
   - Users can upload PDF files along with facility and sequence data. The application processes the files, matches the sequence numbers and facility IDs, and renames the PDF pages accordingly. Files with the same sequence number are merged and saved as `SEQxxxx.pdf`.

3. **Add Annotations to PDF Pages:**
   - Users can add a work order and sequence number annotations to each page of the PDF files. The annotated PDFs are zipped and available for download.

### How It Works

1. **Upload PDF Files:**
   - Use the drag-and-drop interface to upload PDF files for splitting or renaming.

2. **Process Facility Data:**
   - Enter the sequence numbers and facility IDs in the specified format. The application parses this data and uses it to rename and annotate the PDF pages.

3. **Download Processed Files:**
   - After processing, the application provides options to download the split, renamed, or annotated PDF files as a ZIP archive.


## Features For General Ordering App.

### Features

1. **PDF File Upload:**
   - Users can upload multiple PDF files using a drag-and-drop interface for processing and analysis.

2. **Keyword Search:**
   - Users can input keywords (comma-separated) to search for in the uploaded PDF files. The application identifies sentences containing these keywords and generates a report.

3. **General Order Analysis:**
   - The application performs a specialized analysis for General Order 95 (GO 95) and General Order 128 (GO 128) rules. It extracts and matches sentences against these rules and includes the definitions in the report.

4. **Excel Report Generation:**
   - After analysis, the application generates an Excel report with detailed information on the keyword occurrences, including the sentence context, page number, and any matched General Order rules and definitions.

5. **Interactive Help:**
   - Users can access a help popup with a video tutorial explaining how to use the application.

### How It Works

1. **Upload PDF Files:**
   - Use the drag-and-drop interface to upload PDF files for analysis. The application reads the text content of each page in the uploaded PDFs.

2. **Enter Keywords:**
   - Enter the keywords you want to search for in the PDFs. Keywords should be comma-separated.

3. **Perform Analysis:**
   - Click on the "Normal Analysis" button to perform a standard keyword search.
   - Click on the "General Order Analysis" button to perform a specialized analysis for GO 95 and GO 128 rules.

4. **Download Report:**
   - After the analysis is complete, the application generates an Excel file containing the results. The report includes details such as the keyword, file name, page number, occurrence count, and any matched General Order rules and definitions.

### Installation

1. Clone the repository:
   git clone https://github.com/your-username/pdf-processing-app.git
2) Navigate to the project directory:
  cd pdf-processing-app
3) Install dependencies:
  npm install
4) Start the application:
  npm start
