import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, context, summaryNumber, keytakeaway, definitionNumber, practiceNumber } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const model = gemini.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction:  
                        `You are a summarizer assistant. Your tasks are:
                          1. Analyze the given text ${message} and complete the following tasks (THIS IS VERY IMPORTANT):
                            - Provide a summary with this number of words: ${summaryNumber}.
                            - List ${keytakeaway} key takeaways. (JUST PUT THE KEY TAKEAWAYS IN ONE SECTION)
                            - Define ${definitionNumber} important terms. (JUST PUT THE TERMS IN ONE SECTION)
                            - Generate ${practiceNumber} practice test questions with choices and answers.
                          2. If the user asks a question using this ${context}, respond directly to the question and skip tasks 1-4. 
                          The output should look like this and dont bold the terms.
                          - Summary ${summaryNumber} words. (JUST PUT THE SUMMARY IN ONE PARAGRAPH.).
                          - Key Takeaways (DO NOT SEPERATE EACH KEY TAKEAWAYS IN ANOTHER SECTION JUST PUT IT IN ONE SECTION. put in numeric order.)
                          - Important terms (JUST PUT THE TERMS IN ONE SECTION. do not bold the terms, define each term, put in numeric order.)
                          - Practice tests (5 practice tests with choices and answers.)
                          `
    });

    const chatCompletion = await model.generateContentStream({
        contents: [
          
            { 
              role: "user", 
              parts:[
                {
                  text: `${context}`
                }
              ]
            },
                          
        ],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.1,
          topP: 0.1,
        }
    });

    const suggestQuestions = await model.generateContentStream({
      contents:[{
        role: "user",
        parts:[{
          text: `Suggest three questions that the user might ask in the text. The questions must be the important part of the text. Dont answer it. Keep the question short. Use double line break between each question.`
        }]
      }],
      generationConfig: {
        maxOutputTokens: 4000,
        temperature: 0.1,
        topP: 0.1,
      }
    });
    

    let response = "";
    for await (const chunk of chatCompletion.stream) {
      const chunkText = chunk.text();
      response += chunkText;
    }   

    const sections: string[] = response.split("\n\n"); 
    const summary = sections[0] || "Summary not available";
    const keyTakeaways = sections[1] || "Key takeaways not available";
    const definitions = sections[2] || "Definitions not available";
    const practiceTests: string[] = [];
      for (let i = 3; i < sections.length; i++) {
        const thePracticeTests = sections[i] + ("\n\n") || "Practice tests not available";
        practiceTests.push(thePracticeTests);
      }
    
    let questions = "";
    for await (const chunk of suggestQuestions.stream) {
      const chunkText = chunk.text();
      questions += chunkText;
    } 
    
    const sections2: string[] = questions.split("\n\n")
    const question1 = sections2[0] || "Question 1 not available";
    const question2 = sections2[1] || "Question 2 not available";
    const question3 = sections2[2] || "Question 3 not available"; 

    return NextResponse.json({
      summary,
      keyTakeaways,
      definitions,
      practiceTests,
      response,
      content: response,
      questions,
      question1,
      question2,
      question3
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}