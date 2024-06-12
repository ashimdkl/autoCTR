PDF Processing Application
Description
This application is designed to handle various PDF file operations such as splitting, renaming, and editing based on facility and sequence data. The application is built using React and leverages libraries like pdf-lib and pdfjs-dist for PDF manipulation, and JSZip for creating ZIP archives of the processed files.

Features
Split PDF Files:

Users can upload PDF files, and the application will split them into individual pages. Each page is saved as a separate PDF and zipped into a single file for download.
Rename and Zip PDF Files:

Users can upload PDF files along with facility and sequence data. The application processes the files, matches the sequence numbers and facility IDs, and renames the PDF pages accordingly. Files with the same sequence number are merged and saved as SEQxxxx.pdf.
Add Annotations to PDF Pages:

Users can add a work order and sequence number annotations to each page of the PDF files. The annotated PDFs are zipped and available for download.
How It Works
Upload PDF Files:

Use the drag-and-drop interface to upload PDF files for splitting or renaming.
Process Facility Data:

Enter the sequence numbers and facility IDs in the specified format. The application parses this data and uses it to rename and annotate the PDF pages.
Download Processed Files:

After processing, the application provides options to download the split, renamed, or annotated PDF files as a ZIP archive.
Installation
Clone the repository:
sh
Copy code
git clone https://github.com/your-username/pdf-processing-app.git
Navigate to the project directory:
sh
Copy code
cd pdf-processing-app
Install dependencies:
sh
Copy code
npm install
Start the application:
sh
Copy code
npm start
Usage
Splitting PDFs:

Drag and drop the PDF files into the splitter section and wait for the files to be processed. Download the zipped file containing individual PDF pages.
Renaming and Zipping PDFs:

Drag and drop the PDF files into the renaming section. Enter the sequence and facility data, and process the files. Download the zipped file containing the renamed and merged PDFs.
Annotating PDFs:

After processing the files, enter the work order number and add annotations to the pages. Download the zipped file containing the annotated PDFs.
Issues and Solutions
Handling Missing Sequence Numbers:

Pages with missing sequence numbers ("not found") are now skipped during processing to avoid errors.
File Parsing and Fetching:

The application includes checks to ensure files exist before processing, preventing parsing errors such as "No PDF header found."
License
This project is licensed under the MIT License - see the LICENSE file for details.
