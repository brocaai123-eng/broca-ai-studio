import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { sendClientOnboardingCompleteEmail } from '@/lib/email/resend';

// Use service role for operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Get form data
    const formData = await request.formData();
    const fieldValuesStr = formData.get('fieldValues') as string;
    const fieldValues = JSON.parse(fieldValuesStr || '{}');

    // Find client by onboarding token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, broker_id, name, email')
      .eq('onboarding_token', token)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Invalid onboarding token' }, { status: 404 });
    }

    // Store form submission data
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        status: 'completed',
        onboarding_progress: 100,
        form_data: fieldValues,
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id);

    if (updateError) {
      console.error('Failed to update client:', updateError);
      return NextResponse.json({ error: 'Failed to save form data' }, { status: 500 });
    }

    // Process uploaded documents
    const documentEntries: Array<{ key: string; file: File }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('document_') && value instanceof File) {
        documentEntries.push({ key: key.replace('document_', ''), file: value });
      }
    }

    // Upload documents to Supabase Storage and extract text with AI
    const extractedData: Record<string, unknown> = {};
    const uploadedDocs: Array<{ id: string; name: string; url: string; ai_extracted?: unknown }> = [];

    for (const { key, file } of documentEntries) {
      try {
        // Sanitize filename - remove special characters and spaces
        const sanitizedFileName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
          .replace(/_+/g, '_'); // Remove multiple consecutive underscores
        
        // Upload to Supabase Storage
        const fileName = `${client.id}/${Date.now()}_${sanitizedFileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error for', key, ':', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        // Map MIME type to allowed file_type values
        const getFileType = (mimeType: string): 'pdf' | 'image' | 'doc' => {
          if (mimeType.startsWith('image/')) return 'image';
          if (mimeType === 'application/pdf') return 'pdf';
          return 'doc';
        };

        // Create document record in database
        const { data: docRecord, error: docError } = await supabase
          .from('documents')
          .insert({
            client_id: client.id,
            broker_id: client.broker_id,
            name: file.name, // Keep original name for display
            file_path: fileName, // Sanitized path
            file_url: urlData.publicUrl,
            file_type: getFileType(file.type),
            file_size: String(file.size),
            document_type: key,
            status: 'pending',
          })
          .select()
          .single();

        if (docError) {
          console.error('Document record error:', docError);
          continue;
        }

        // Use OpenAI to extract information from the document
        // For images, we can use vision API
        // For PDFs, we extract text first then use GPT to analyze
        let aiExtraction = null;
        
        if (file.type.startsWith('image/')) {
          try {
            // Convert file to base64
            const arrayBuffer = await file.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = file.type;

            const response = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: `You are an AI assistant that extracts information from documents. 
                  Extract all relevant personal and important information from this document.
                  Return the extracted data as a JSON object with the following structure:
                  
                  REQUIRED FIELDS TO LOOK FOR:
                  - full_name: string
                  - date_of_birth: string
                  - address: string
                  - phone_number: string
                  - email: string
                  - id_number: string (driver's license, passport number, SSN last 4, etc.)
                  - document_type: string (what type of document this appears to be)
                  - expiration_date: string (if applicable)
                  - employer: string (if visible)
                  - income: string (if visible)
                  - other_info: object (any other relevant information)
                  
                  ALWAYS INCLUDE THESE METADATA FIELDS:
                  - document_description: string (a 1-2 sentence summary of what this document is and what key information it contains)
                  - fields_found: array of strings (list all field names that were successfully extracted)
                  - fields_not_found: array of strings (list all standard fields that were looked for but NOT found in this document, from the list: full_name, date_of_birth, address, phone_number, email, id_number, expiration_date, employer, income)
                  - extraction_confidence: string ("high", "medium", or "low" based on document quality and clarity)
                  
                  Only include extracted fields that you can confidently extract from the document.
                  Return ONLY valid JSON, no markdown or explanation.`
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${mimeType};base64,${base64}`,
                      },
                    },
                    {
                      type: 'text',
                      text: 'Please extract all relevant information from this document.',
                    },
                  ],
                },
              ],
              max_tokens: 1000,
            });

            const extractedText = response.choices[0]?.message?.content || '';
            try {
              // Clean up the response - remove markdown code fences if present
              let cleanedJson = extractedText.trim();
              if (cleanedJson.startsWith('```json')) {
                cleanedJson = cleanedJson.slice(7);
              } else if (cleanedJson.startsWith('```')) {
                cleanedJson = cleanedJson.slice(3);
              }
              if (cleanedJson.endsWith('```')) {
                cleanedJson = cleanedJson.slice(0, -3);
              }
              cleanedJson = cleanedJson.trim();
              aiExtraction = JSON.parse(cleanedJson);
            } catch {
              aiExtraction = { raw_text: extractedText };
            }
          } catch (aiError) {
            console.error('AI extraction error:', aiError);
            aiExtraction = { error: 'Failed to extract information' };
          }
        } else if (file.type === 'application/pdf') {
          // Handle PDF documents
          console.log('Processing PDF:', file.name, 'Size:', file.size);
          
          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Step 1: Try to extract text using pdf-parse
            let pdfText = '';
            let pdfParseError: Error | null = null;
            
            try {
              const pdfParseModule = await import('pdf-parse') as any;
              const pdfParse = pdfParseModule.default || pdfParseModule;
              
              // pdf-parse options for better compatibility
              const options = {
                max: 0, // No page limit
              };
              
              const pdfData = await pdfParse(buffer, options);
              pdfText = (pdfData.text || '').trim();
              console.log('PDF text extracted, length:', pdfText.length, 'Preview:', pdfText.substring(0, 100));
            } catch (err) {
              pdfParseError = err as Error;
              console.error('pdf-parse error:', err);
            }

            // Step 2: Analyze extracted text with OpenAI OR use Vision OCR
            if (pdfText && pdfText.length > 50) {
              // We have enough text content, use text-based analysis
              console.log('Sending PDF text to OpenAI for analysis...');
              
              try {
                const response = await openai.chat.completions.create({
                  model: 'gpt-4o',
                  messages: [
                    {
                      role: 'system',
                      content: `You are an AI assistant that extracts information from document text. 
Extract all relevant personal and important information from this document.
Return the extracted data as a JSON object.

REQUIRED FIELDS TO LOOK FOR:
- full_name: string (person's full name)
- date_of_birth: string (DOB if present)
- address: string (full address)
- phone_number: string (phone/mobile number)
- email: string (email address)
- id_number: string (SSN, driver's license, passport number, etc.)
- document_type: string (what type of document this is - e.g., "W2 Form", "Bank Statement", "Tax Return")
- expiration_date: string (if applicable)
- employer: string (employer name if visible)
- income: string (income/salary amount if visible)
- other_info: object (any other relevant structured information)

ALWAYS INCLUDE THESE METADATA FIELDS:
- document_description: string (1-2 sentence summary of the document)
- fields_found: array of strings (field names that were extracted)
- fields_not_found: array of strings (standard fields NOT found)
- extraction_confidence: "high" | "medium" | "low"

Only include fields you can confidently extract. Return ONLY valid JSON.`
                    },
                    {
                      role: 'user',
                      content: `Extract information from this document text:\n\n${pdfText.substring(0, 8000)}`,
                    },
                  ],
                  max_tokens: 1500,
                  temperature: 0.1,
                });

                const responseText = response.choices[0]?.message?.content || '';
                console.log('OpenAI response received, length:', responseText.length);
                
                // Parse the JSON response
                let cleanedJson = responseText.trim();
                if (cleanedJson.startsWith('```json')) {
                  cleanedJson = cleanedJson.slice(7);
                } else if (cleanedJson.startsWith('```')) {
                  cleanedJson = cleanedJson.slice(3);
                }
                if (cleanedJson.endsWith('```')) {
                  cleanedJson = cleanedJson.slice(0, -3);
                }
                cleanedJson = cleanedJson.trim();
                
                try {
                  aiExtraction = JSON.parse(cleanedJson);
                  console.log('Successfully parsed AI extraction');
                } catch (parseErr) {
                  console.error('JSON parse error:', parseErr, 'Response:', cleanedJson.substring(0, 200));
                  aiExtraction = { 
                    raw_text: responseText,
                    document_description: 'Extracted content from PDF but could not parse into structured format.',
                    extraction_confidence: 'low'
                  };
                }
              } catch (openaiError) {
                console.error('OpenAI API error:', openaiError);
                aiExtraction = {
                  error: 'Failed to analyze PDF content with AI',
                  raw_text: pdfText.substring(0, 500),
                  document_description: 'Text was extracted but AI analysis failed.',
                  extraction_confidence: 'low'
                };
              }
            } else {
              // No/minimal text extracted - Use Vision OCR by converting PDF to images
              console.log('Using Vision OCR for PDF (scanned or low text content)...');
              
              try {
                // Use pdf.js to render PDF pages to images
                const pdfjsLib = await import('pdfjs-dist') as any;
                const { createCanvas } = await import('canvas') as any;
                
                // Load the PDF document
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
                const pdfDoc = await loadingTask.promise;
                const numPages = Math.min(pdfDoc.numPages, 5); // Process max 5 pages
                
                console.log(`PDF has ${pdfDoc.numPages} pages, processing first ${numPages}`);
                
                // Convert each page to base64 image
                const pageImages: string[] = [];
                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                  const page = await pdfDoc.getPage(pageNum);
                  const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better OCR
                  
                  const canvas = createCanvas(viewport.width, viewport.height);
                  const context = canvas.getContext('2d');
                  
                  await page.render({
                    canvasContext: context,
                    viewport: viewport,
                  }).promise;
                  
                  // Convert canvas to base64 PNG
                  const base64Image = canvas.toDataURL('image/png').split(',')[1];
                  pageImages.push(base64Image);
                  console.log(`Rendered page ${pageNum} to image`);
                }
                
                // Send images to GPT-4o Vision for OCR
                console.log('Sending PDF page images to GPT-4o Vision for OCR...');
                
                const imageContents = pageImages.map((base64, idx) => ({
                  type: 'image_url' as const,
                  image_url: {
                    url: `data:image/png;base64,${base64}`,
                    detail: 'high' as const,
                  },
                }));
                
                const response = await openai.chat.completions.create({
                  model: 'gpt-4o',
                  messages: [
                    {
                      role: 'system',
                      content: `You are an AI assistant that performs OCR and extracts information from document images.
Carefully read ALL text visible in the document images and extract relevant information.
Return the extracted data as a JSON object.

REQUIRED FIELDS TO LOOK FOR:
- full_name: string (person's full name)
- date_of_birth: string (DOB if present)
- address: string (full address)
- phone_number: string (phone/mobile number)
- email: string (email address)
- id_number: string (SSN, driver's license, passport number, etc.)
- document_type: string (what type of document this is - e.g., "W2 Form", "Bank Statement", "Tax Return", "Pay Stub")
- expiration_date: string (if applicable)
- employer: string (employer name if visible)
- income: string (income/salary/wages amount if visible)
- other_info: object (any other relevant structured information like account numbers, tax year, etc.)

ALWAYS INCLUDE THESE METADATA FIELDS:
- document_description: string (1-2 sentence summary of the document)
- fields_found: array of strings (field names that were extracted)
- fields_not_found: array of strings (standard fields NOT found)
- extraction_confidence: "high" | "medium" | "low"

Only include fields you can confidently extract. Return ONLY valid JSON.`
                    },
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'text',
                          text: `Please perform OCR on these ${numPages} PDF page image(s) and extract all relevant information.`,
                        },
                        ...imageContents,
                      ],
                    },
                  ],
                  max_tokens: 2000,
                  temperature: 0.1,
                });

                const responseText = response.choices[0]?.message?.content || '';
                console.log('Vision OCR response received, length:', responseText.length);
                
                // Parse the JSON response
                let cleanedJson = responseText.trim();
                if (cleanedJson.startsWith('```json')) {
                  cleanedJson = cleanedJson.slice(7);
                } else if (cleanedJson.startsWith('```')) {
                  cleanedJson = cleanedJson.slice(3);
                }
                if (cleanedJson.endsWith('```')) {
                  cleanedJson = cleanedJson.slice(0, -3);
                }
                cleanedJson = cleanedJson.trim();
                
                try {
                  aiExtraction = JSON.parse(cleanedJson);
                  aiExtraction.ocr_method = 'vision'; // Mark that we used OCR
                  console.log('Successfully parsed Vision OCR extraction');
                } catch (parseErr) {
                  console.error('JSON parse error:', parseErr, 'Response:', cleanedJson.substring(0, 200));
                  aiExtraction = { 
                    raw_text: responseText,
                    document_description: 'OCR was performed but could not parse into structured format.',
                    extraction_confidence: 'low',
                    ocr_method: 'vision'
                  };
                }
              } catch (visionError) {
                console.error('Vision OCR error:', visionError);
                
                // Fallback error message
                const errorReason = pdfParseError 
                  ? `PDF text parsing failed: ${pdfParseError.message}`
                  : 'Vision OCR processing failed';
                
                aiExtraction = {
                  error: 'Could not extract information from this PDF document.',
                  document_description: 'Both text extraction and Vision OCR failed for this document.',
                  fields_not_found: ['full_name', 'date_of_birth', 'address', 'phone_number', 'email', 'id_number', 'expiration_date', 'employer', 'income'],
                  extraction_confidence: 'low',
                  technical_details: errorReason
                };
              }
            }
          } catch (err) {
            const error = err as Error;
            console.error('PDF processing error:', error.message, error.stack);
            aiExtraction = { 
              error: `Failed to process PDF: ${error.message}`,
              document_description: 'An error occurred while processing this PDF document.',
              fields_not_found: ['full_name', 'date_of_birth', 'address', 'phone_number', 'email', 'id_number', 'expiration_date', 'employer', 'income'],
              extraction_confidence: 'low'
            };
          }
        }

        // Update document with AI extraction
        if (aiExtraction) {
          await supabase
            .from('documents')
            .update({
              ai_extracted_data: aiExtraction,
              status: 'completed',
            })
            .eq('id', docRecord.id);

          extractedData[key] = aiExtraction;
        } else {
          await supabase
            .from('documents')
            .update({ status: 'completed' })
            .eq('id', docRecord.id);
        }

        uploadedDocs.push({
          id: docRecord.id,
          name: file.name,
          url: urlData.publicUrl,
          ai_extracted: aiExtraction,
        });

      } catch (err) {
        console.error('Error processing document', key, ':', err);
      }
    }

    // Update client with document count
    await supabase
      .from('clients')
      .update({
        documents_submitted: uploadedDocs.length,
        ai_extracted_data: extractedData,
      })
      .eq('id', client.id);

    // Deduct tokens using RPC function
    // Token costs: 5 tokens for form submission + 10 tokens per AI document scan
    const aiScannedDocs = Object.keys(extractedData).length;
    const onboardingTokenCost = 5;
    const aiScanTokenCost = aiScannedDocs * 10;
    
    // Deduct onboarding tokens
    if (onboardingTokenCost > 0) {
      await supabase.rpc('deduct_tokens', {
        p_broker_id: client.broker_id,
        p_amount: onboardingTokenCost,
        p_action_type: 'onboarding',
        p_description: `Client onboarding: ${client.name}`,
      });
    }
    
    // Deduct AI scan tokens (separate transaction for clarity)
    if (aiScanTokenCost > 0) {
      await supabase.rpc('deduct_tokens', {
        p_broker_id: client.broker_id,
        p_amount: aiScanTokenCost,
        p_action_type: 'ai_scan',
        p_description: `AI document scanning: ${aiScannedDocs} documents for ${client.name}`,
      });
    }
    
    const totalTokensUsed = onboardingTokenCost + aiScanTokenCost;

    console.log(`Onboarding completed for client ${client.id}. Documents processed: ${uploadedDocs.length}. Tokens used: ${totalTokensUsed}`);

    // Send notification email to broker
    try {
      // Get broker details
      const { data: broker } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', client.broker_id)
        .single();

      if (broker?.email) {
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await sendClientOnboardingCompleteEmail({
          to: broker.email,
          brokerName: broker.full_name || 'there',
          clientName: client.name,
          clientEmail: client.email,
          documentsCount: uploadedDocs.length,
          hasAiExtraction: Object.keys(extractedData).length > 0,
          clientViewUrl: `${APP_URL}/dashboard/clients/${client.id}`,
        });
        console.log('Broker notification email sent to:', broker.email);
      }
    } catch (emailError) {
      console.error('Failed to send broker notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding submitted successfully',
      documentsProcessed: uploadedDocs.length,
    });

  } catch (error) {
    console.error('Onboarding submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
