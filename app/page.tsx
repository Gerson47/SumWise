"use client";
import { useState } from "react";
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import JSZip from 'jszip';
import mammoth from "mammoth";
import React, { useRef, ChangeEvent } from 'react';


GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs"


export default function Home(){
  
  let resultText = ("")
  const [text, setText] = useState ("");
  const [userInput, setUserInput] = useState("");
  const [response, setResponse] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [keyTakeaways, setKeyTakeaways] = useState("");
  const [definitions, setDefinitions] = useState("");
  const [practiceTests, setPracticeTests] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(false);

  const [questions, setQuestions] = useState<string[]>([]);
  
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    };
  
    const processFile = (file: File) => {
      const fileReader = new FileReader();
      
      fileReader.addEventListener('loadstart', () => setStatus('Start Loading'));
      fileReader.addEventListener('load', () => setStatus('Loaded'));
      fileReader.addEventListener('loadend', async() => {
        setStatus('Complete');

        const fileExtension = file.name.split('.').pop()?.toLowerCase();
       
        
        if (fileExtension === "txt") {
          
          if (typeof fileReader.result === "string") {
            resultText = fileReader.result;
            setText(resultText);
          } else {
            setStatus("Error: Unable to process text file");
            return;
          }
        } 
        else if (fileExtension === "docx" || fileExtension === "docs") {
          
          const arrayBuffer = await file.arrayBuffer();
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          resultText = value;
          setText(resultText);
          console.log(value);
          
        } 
        else if (fileExtension === "pdf") {
         
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          const pdfTextArray = [];
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pdfTextArray.push(textContent.items.map((item: any) => item.str).join(" "));
          }
          resultText = pdfTextArray.join("\n");
          setText(resultText)
          console.log(resultText)

        }
        else if (fileExtension === "ppt" || fileExtension === "pptx"){
          const extractTextFromPptx = async (file: File): Promise<string> => {
            const zip = new JSZip();
            const arrayBuffer = await file.arrayBuffer();
            const pptxContent = await zip.loadAsync(arrayBuffer);
            
            let extractedText = "";
          
            const slideFiles = Object.keys(pptxContent.files).filter((fileName) =>
              fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml")
            );
          
            for (const slideFile of slideFiles) {
              const slideXml = await pptxContent.file(slideFile)?.async("text");
          
              if (slideXml) {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(slideXml, "application/xml");
          
                const textElements = xmlDoc.getElementsByTagName("a:t");
                for (const element of textElements) {
                  extractedText += element.textContent + " ";
                }
              }
            }
          
            return extractedText.trim();
          };

          const extractedText = await extractTextFromPptx(file);
          resultText = extractedText
          setText(resultText)
          console.log("Extracted Text:", resultText);
        }

        else {
          setStatus("Unsupported file format");
          return;
        }
        
        try{
          setLoadingText(true);
          
          const textResponse = await fetch('/api', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(
                { 
                  message: resultText,
                  
                  context: userInput,
                }),
            })

            if (textResponse.ok) {
              const data = await textResponse.json();
              setSummaryText(data.summary);
              setKeyTakeaways(data.keyTakeaways);
              setDefinitions(data.definitions);
              setPracticeTests(data.practiceTests);
              setQuestions([
                data.question1,
                data.question2,
                data.question3,
              ]);
              console.log(data.response);
              console.log(data.questions);
              
            }
        }  
          catch {
            setSummaryText("An error occurred while processing your request!");
          }
          finally{
            setLoadingText(false);
          }
       
        });
      
      fileReader.addEventListener('progress', (e) => {
        
        if (e.lengthComputable) {
          const loadingPercentage = (100 * e.loaded) / e.total;
          setProgress(loadingPercentage);
        }
      });

      fileReader.addEventListener('error', () => setStatus('Error loading file'));
      fileReader.addEventListener('abort', () => setStatus('File loading aborted'));
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === "txt") {
        fileReader.readAsText(file);
      }
      else if (fileExtension === "docx" || fileExtension === "docs"){
        setText(resultText);
        fileReader.readAsArrayBuffer(file);

      }
      else if (fileExtension === "pdf"){
        setText(resultText);
        fileReader.readAsArrayBuffer(file);
        console.log(resultText)

      }
      else if (fileExtension === "ppt" || fileExtension === "pptx"){
        setText(resultText);
        fileReader.readAsArrayBuffer(file);
        console.log(resultText);
      }
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          { 
            message: text,
            context: userInput, 
          }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("API response: ", data);
        console.log(data.response);
        setResponse(data.response);

        setQuestions([
          data.question1,
          data.question2,
          data.question3,
        ]);
        
        setUserInput("");

      } 
      else {
        throw new Error(`API responded with status: ${res.status}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("An error occurred while processing your request.");
    } finally {
      setLoading(false);
    }
  };
 
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (userInput === "") return;
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClick = (question: string) => {
    setUserInput(question);
  };

  
  return (
    <>
    
      <div className="topContainer">
        <div className="DropContainer">
          <div className="filePreviewContainer">
            <p className="topLabel">Preview File/Website</p>
            <button 
              id="PreviewButton"
              // ref={fileInputRef} 
              // onClick={handlePreview}
              >
                Click to Preview
            </button>
            <br />
              <div className="container">
                <br />
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt, .pdf, .docs, .docx, .ppt, .pptx"
                  className="file-input"
                />

                {status && <p>Status: {status}</p>}
                {progress > 0 && (
                  <progress value={progress} max="100">
                    {progress}%
                  </progress>
                )}
              </div>  

              <br />
              
          </div>
        </div>
      </div>

      <div className="results">
          <div className="summarizedContainer">
            <p className="topLabel">Summary:</p>
              <div className="ResultsContainer">
                {loadingText && (
                  <div className = "loading">
                        <p className = "loadingText">Loading...</p>
                      </div>
                )}      
                {summaryText && (
                  <div id="SummaryTextContainer">
                    <pre id="SummaryText" >{summaryText}</pre>
                  </div>
                )}
             </div>
          </div>  

          <div className="summarizedContainer">
            <p className="topLabel">Key Takeaways:</p>
              <div className="ResultsContainer">
              {loadingText && (
                <div className = "loading">
                      <p className = "loadingText">Loading...</p>
                    </div>
              )}      
                {keyTakeaways && (
                  <div id="KeyTextContainer">
                    <ol>
                      <li id="KeyText">{keyTakeaways}</li>
                    </ol>
                  </div>
                )}
              </div>            
          </div>        
      </div>

      <div className="results">
        <div className="summarizedContainer">
          <p className="topLabel">Definition of Terms:</p>
            <div className="ResultsContainer">
            {loadingText && (
              <div className = "loading">
                    <p className = "loadingText">Loading...</p>
                  </div>
            )}      
              {definitions && (
                <div id="DefinitionTextContainer">
                  <ul>
                    <li id="DefinitionText">{definitions}</li>
                  </ul>
                </div>
              )}
            </div>  
        </div>

        <div className="summarizedContainer">
          <p className="topLabel">Practice Test:</p>
            <div className="ResultsContainer">
            {loadingText && (
              <div className = "loading">
                    <p className = "loadingText">Loading...</p>
                  </div>
            )}    
              {practiceTests && (
                <div id="PracticeTextContainer">
                  <ol>
                    <li id="PracticeText">{practiceTests}</li>
                  </ol>
                </div>
              )}
            </div>  
        </div>
      </div>

      <div className="chatContainer">
        <div className="inputContainer">
          <div className="TopColor">
            <p className="topLabel"> Input: </p>
          </div>
          <br />

            <form onSubmit={handleSubmit}>
              <label id="AskAILabel">
                Ask AI for help:
              </label>
              <br />
              <br />

              <textarea 
                id="inputText" 
                value={userInput} 
                placeholder="Write your message here...&nbsp;" 
                required 
                onChange={(e) => setUserInput(e.target.value)} 
                onKeyDown={handleKeyDown}
                />
              <br />
            
              <button className="buttons" id="sumbitButton" type="submit" disabled={loading}>
                {loading ? "Loading..." : "Send"}
              </button>
              <br/><br/>

              
                  <div className="suggestedQuestions">
                    {questions.length > 0 && questions.map((question, index) => (
                      <button key={index} className="suggestButton" type="button" onClick={() => handleClick(question)}>
                        {question}
                      </button>
                    ))}
                    </div>
                    
                

            </form>
       
        </div>  

          <div className="outputContainer">
          
              <div className="TopColor">
                <p className="topLabel"> Output: </p>
              </div>
              <br />

              <div className="TopOutputTextContainer">
                <div id="outputTextContainer">
                  <pre id="outputText">{response}</pre>
                </div>
              </div>  
          </div>  
      </div>
    </>
  );

};