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

// Helper function to parse OpenAI JSON responses safely
function parseOpenAIJsonResponse(responseText: string): Record<string, unknown> {
  let cleanedJson = responseText.trim();
  
  // Remove markdown code fences
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
    return JSON.parse(cleanedJson);
  } catch (parseErr) {
    console.error('JSON parse error:', parseErr, 'Preview:', cleanedJson.substring(0, 200));
    return { 
      raw_text: responseText,
      document_description: 'Could not parse AI response into structured format.',
      extraction_confidence: 'low'
    };
  }
}

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
          // Handle PDF documents using unpdf for text extraction
          console.log('Processing PDF:', file.name, 'Size:', file.size);
          
          try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Use unpdf to extract text
            const { extractText } = await import('unpdf');
            
            // Step 1: Try to extract text
            let pdfText = '';
            try {
              const { text } = await extractText(uint8Array, { mergePages: true });
              pdfText = (text || '').trim();
              console.log('PDF text extracted via unpdf, length:', pdfText.length);
            } catch (textErr) {
              console.log('Text extraction failed, will use Vision OCR:', textErr);
            }

            // Step 2: If we have good text, analyze it. Otherwise, use Vision OCR
            if (pdfText && pdfText.length > 50) {
              console.log('Analyzing PDF text with GPT-4o...');
              
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
- document_type: string (what type of document this is)
- expiration_date: string (if applicable)
- employer: string (employer name if visible)
- income: string (income/salary amount if visible)
- other_info: object (any other relevant structured information)

ALWAYS INCLUDE THESE METADATA FIELDS:
- document_description: string (1-2 sentence summary)
- fields_found: array of strings (extracted field names)
- fields_not_found: array of strings (fields NOT found)
- extraction_confidence: "high" | "medium" | "low"

Return ONLY valid JSON.`
                  },
                  {
                    role: 'user',
                    content: `Extract information from this document:\n\n${pdfText.substring(0, 10000)}`,
                  },
                ],
                max_tokens: 1500,
                temperature: 0.1,
              });

              const responseText = response.choices[0]?.message?.content || '';
              aiExtraction = parseOpenAIJsonResponse(responseText);
              
            } else {
              // Minimal or no text extracted - likely a scanned PDF
              // Since we can't reliably render PDF pages to images in serverless,
              // we'll analyze whatever text we have or provide a helpful message
              console.log('Minimal text in PDF, attempting analysis anyway...');
              
              if (pdfText.length > 0) {
                // We have some text, try to analyze it
                try {
                  const response = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                      {
                        role: 'system',
                        content: `You are an AI that extracts information from document text, even if incomplete.
Extract any information you can find and return as JSON.

FIELDS TO LOOK FOR:
- full_name, date_of_birth, address, phone_number, email, id_number
- document_type, employer, income, expiration_date
- other_info: object (any other relevant information)

METADATA FIELDS:
- document_description: string (describe what this appears to be)
- fields_found: array (fields that were extracted)
- fields_not_found: array (fields NOT found)
- extraction_confidence: "high" | "medium" | "low"

Return ONLY valid JSON.`
                      },
                      {
                        role: 'user',
                        content: `Extract any information from this document text:\n\n${pdfText}`,
                      },
                    ],
                    max_tokens: 1500,
                    temperature: 0.1,
                  });

                  const responseText = response.choices[0]?.message?.content || '';
                  aiExtraction = parseOpenAIJsonResponse(responseText);
                  
                } catch (analysisErr) {
                  console.error('Analysis failed:', analysisErr);
                  aiExtraction = {
                    error: 'Could not analyze PDF content.',
                    document_description: 'This PDF has minimal extractable text.',
                    extraction_confidence: 'low'
                  };
                }
              } else {
                // No text at all - this is likely a scanned PDF
                aiExtraction = {
                  error: 'This PDF appears to be a scanned document.',
                  document_description: 'This PDF contains scanned images rather than searchable text. For best results, please upload documents as images (JPG, PNG) or use text-based PDFs.',
                  fields_not_found: ['full_name', 'date_of_birth', 'address', 'phone_number', 'email', 'id_number'],
                  extraction_confidence: 'low',
                  suggestion: 'Try uploading the document as an image file (JPG/PNG) instead.'
                };
              }
            }
          } catch (err) {
            const error = err as Error;
            console.error('PDF processing error:', error.message);
            aiExtraction = { 
              error: `Failed to process PDF: ${error.message}`,
              document_description: 'An error occurred while processing this PDF.',
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
