import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import Markdown from 'react-markdown';
import { ContentCopy, Download, Translate } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { TrashIcon } from '@heroicons/react/24/outline';
import { generatePDF } from '../utils/pdfGenerator';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const languages = [
  { code: 'Hindi', name: 'Hindi' },
  { code: 'Bengali', name: 'Bengali' },
  { code: 'Telugu', name: 'Telugu' },
  { code: 'Tamil', name: 'Tamil' },
  { code: 'Marathi', name: 'Marathi' },
  { code: 'Gujarati', name: 'Gujarati' },
  { code: 'Kannada', name: 'Kannada' },
  { code: 'Malayalam', name: 'Malayalam' },
  { code: 'Punjabi', name: 'Punjabi' },
  { code: 'Urdu', name: 'Urdu' },
];

export default function Summaries() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);
  const [previousSummaries, setPreviousSummaries] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translatedSummary, setTranslatedSummary] = useState('');
  const [translating, setTranslating] = useState(false);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const accessToken = useSelector((state) => state?.currentUser?.accessToken);

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        const response = await axios.get(`${backendURL}/summary/get/all`, {
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        setPreviousSummaries(response.data.data.summaries);
      } catch (error) {
        console.error('Error fetching summaries:', error);
      } finally {
        setLoadingSummaries(false);
      }
    };
    fetchSummaries();
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  function onDocumentLoadError(error) {
    setError('Error loading PDF: ' + error.message);
  }

  const nextPage = () => setPageNumber(pageNumber + 1);
  const previousPage = () => setPageNumber(pageNumber - 1);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setSelectedLanguage('');
    setTranslatedSummary('');
    
    if (selectedFile) {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('PolicyPdf', selectedFile);
        const res = await axios.post(`${backendURL}/summary/create`, formData, {
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        setSummary(res.data.data.summary);
        setPreviousSummaries(prev => [res.data.data.summary, ...prev]);
      } catch (error) {
        console.error('Error:', error);
        setError('Error generating summary');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${backendURL}/summary/delete/${id}`, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      setPreviousSummaries(prev => prev.filter(summary => summary._id !== id));
      if (summary?._id === id) {
        setSummary(null);
        setFile(null);
        setTranslatedSummary('');
        setSelectedLanguage('');
      }
    } catch (error) {
      console.error('Error deleting summary:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.summarizedText);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    if (!summary?.summarizedText) return;
    
    const doc = generatePDF(
      summary.summarizedText,
      summary.title || 'Policy Summary'
    );
    
    doc.save(`${summary.title || 'policy-summary'}.pdf`);
  };

  const handleClick = (item) => {
    setFile(item.PolicyPdf);
    setSummary(item);
    if (!item.translatedText) {
      setTranslatedSummary('');
      setSelectedLanguage('');
    } else {
      setTranslatedSummary(item?.translatedText.translatedText);
      setSelectedLanguage(item?.translatedText.language);
    }
  };

  const handleTranslate = async () => {
    if (!selectedLanguage) return;
    setTranslating(true);
    try {
      const response = await axios.post(`${backendURL}/summary/translate/${summary?._id}`, {
        language: selectedLanguage
      }, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      setTranslatedSummary(response.data.data.summary.translatedText.translatedText);
    } catch (error) {
      console.error('Error translating:', error);
    } finally {
      setTranslating(false);
    }
  };
  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1 bg-white rounded-lg shadow p-4 max-h-max">
            <h3 className="text-lg font-semibold mb-4">Previous Summaries</h3>
            {loadingSummaries ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {previousSummaries.map((item) => (
                  <div key={item._id} className="relative group">
                    <button
                      onClick={() => handleClick(item)}
                      className="w-full text-left p-2 hover:bg-gray-100 rounded font-semibold border border-slate-200"
                    >
                      {item.title}
                    </button>
                    <button
                      onClick={(e) => handleDelete(item._id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-full transition-opacity"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">PDF Summary Generator</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload PDF Document
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-secondary"
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {file && !loading && (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Original Document</h3>
                    <Document
                      file={file}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      className="w-full"
                    >
                      <Page pageNumber={pageNumber} width={500} renderTextLayer={false} />
                    </Document>
                    {/* {error && <p className="text-red-500">{error}</p>} */}
                    <div className="flex justify-between mt-4">
                      <button
                        disabled={pageNumber <= 1}
                        onClick={previousPage}
                        className="bg-primary text-white px-4 py-2 rounded-md disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <p>Page {pageNumber} of {numPages}</p>
                      <button
                        disabled={pageNumber >= numPages}
                        onClick={nextPage}
                        className="bg-primary text-white px-4 py-2 rounded-md disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">Summary</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopy}
                          className="p-2 hover:bg-gray-100 rounded-full"
                          title="Copy to clipboard"
                        >
                          <ContentCopy />
                        </button>
                        <button
                          onClick={handleDownload}
                          className="p-2 hover:bg-gray-100 rounded-full"
                          title="Download summary"
                        >
                          <Download />
                        </button>
                      </div>
                    </div>

                    <div className="prose max-w-none mb-4">
                      <Markdown>{summary.summarizedText}</Markdown>
                    </div>

                    <div className="flex gap-4 items-center mt-4">
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="rounded-md border-gray-300 outline-none p-2 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                      >
                        <option value="">Select language</option>
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleTranslate}
                        disabled={!selectedLanguage || translating}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-secondary disabled:opacity-50"
                      >
                        <Translate />
                        Translate
                      </button>
                    </div>

                    {translating && (
                      <div className="mt-4 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )}

                    {translatedSummary && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold mb-2">Translated Summary</h4>
                        <Markdown>{translatedSummary}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}