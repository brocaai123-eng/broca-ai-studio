import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

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

/**
 * GET /api/upload-documents/[token]
 * 
 * Public endpoint - fetches document request info by upload token.
 * Tries document_requests table first, then falls back to client onboarding_token.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Try document_requests table first
    const { data: docRequest } = await supabase
      .from('document_requests')
      .select(`
        id, client_id, broker_id, message, requested_documents, status, created_at,
        client:clients!document_requests_client_id_fkey(id, name, email),
        broker:profiles!document_requests_broker_id_fkey(full_name)
      `)
      .eq('upload_token', token)
      .single();

    if (docRequest) {
      if (docRequest.status === 'completed') {
        return NextResponse.json({ error: 'Documents have already been submitted' }, { status: 400 });
      }

      const client = Array.isArray(docRequest.client) ? docRequest.client[0] : docRequest.client;
      const broker = Array.isArray(docRequest.broker) ? docRequest.broker[0] : docRequest.broker;

      return NextResponse.json({
        source: 'document_request',
        requestId: docRequest.id,
        clientId: docRequest.client_id,
        clientName: client?.name || 'Client',
        clientEmail: client?.email || '',
        brokerName: broker?.full_name || 'Your Broker',
        brokerId: docRequest.broker_id,
        message: docRequest.message,
        requestedDocuments: docRequest.requested_documents || [],
        createdAt: docRequest.created_at,
      });
    }

    // Fallback: check client onboarding_token
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, email, broker_id, status, notes')
      .eq('onboarding_token', token)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Invalid or expired upload link' }, { status: 404 });
    }

    // Parse any document request metadata from notes
    let fallbackMessage: string | null = null;
    let fallbackDocs: string[] = [];
    if (client.notes) {
      const docRequestMatch = client.notes.match(/\[doc_request\] message=(.*?) \| docs=(.*?) \| token=/);
      if (docRequestMatch) {
        fallbackMessage = docRequestMatch[1] || null;
        fallbackDocs = docRequestMatch[2] ? docRequestMatch[2].split(',').filter(Boolean) : [];
      }
    }

    // Get broker name
    const { data: broker } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', client.broker_id)
      .single();

    return NextResponse.json({
      source: 'client_token',
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      brokerName: broker?.full_name || 'Your Broker',
      brokerId: client.broker_id,
      message: fallbackMessage,
      requestedDocuments: fallbackDocs,
    });
  } catch (error) {
    console.error('Error fetching document request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/upload-documents/[token]
 * 
 * Public endpoint - client submits documents via the upload token.
 * Uploads to Supabase Storage, creates document records, and runs AI extraction.
 * Same flow as onboarding submit.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Resolve clientId and brokerId from token
    let clientId: string | null = null;
    let brokerId: string | null = null;
    let requestId: string | null = null;
    let source: 'document_request' | 'client_token' = 'client_token';

    // Try document_requests table
    const { data: docRequest } = await supabase
      .from('document_requests')
      .select('id, client_id, broker_id, status')
      .eq('upload_token', token)
      .single();

    if (docRequest) {
      if (docRequest.status === 'completed') {
        return NextResponse.json({ error: 'Documents already submitted' }, { status: 400 });
      }
      clientId = docRequest.client_id;
      brokerId = docRequest.broker_id;
      requestId = docRequest.id;
      source = 'document_request';
    } else {
      // Fallback to client onboarding_token
      const { data: client } = await supabase
        .from('clients')
        .select('id, broker_id')
        .eq('onboarding_token', token)
        .single();

      if (!client) {
        return NextResponse.json({ error: 'Invalid or expired upload link' }, { status: 404 });
      }
      clientId = client.id;
      brokerId = client.broker_id;
    }

    if (!clientId || !brokerId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const documentEntries: Array<{ key: string; file: File }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('document_') && value instanceof File) {
        documentEntries.push({ key: key.replace('document_', ''), file: value });
      }
    }

    if (documentEntries.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Upload documents to Supabase Storage and extract text with AI
    // Same approach as onboarding submit
    const extractedData: Record<string, unknown> = {};
    const uploadedDocs: Array<{ id: string; name: string; url: string; ai_extracted?: unknown }> = [];

    for (const { key, file } of documentEntries) {
      try {
        // Sanitize filename
        const sanitizedFileName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_+/g, '_');
        
        // Upload to Supabase Storage - same bucket as onboarding
        const fileName = `${clientId}/${Date.now()}_${sanitizedFileName}`;
        const { error: uploadError } = await supabase.storage
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
            client_id: clientId,
            broker_id: brokerId,
            name: file.name,
            file_path: fileName,
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

        // AI extraction - same as onboarding
        let aiExtraction = null;

        if (file.type.startsWith('image/')) {
          try {
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
                  - fields_not_found: array of strings (list all standard fields that were looked for but NOT found in this document)
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
            aiExtraction = parseOpenAIJsonResponse(extractedText);
          } catch (aiError) {
            console.error('AI extraction error for image:', aiError);
            aiExtraction = { error: 'Failed to extract information' };
          }
        } else if (file.type === 'application/pdf') {
          console.log('Processing PDF:', file.name, 'Size:', file.size);
          
          try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            const { extractText } = await import('unpdf');
            
            let pdfText = '';
            try {
              const { text } = await extractText(uint8Array, { mergePages: true });
              pdfText = (text || '').trim();
              console.log('PDF text extracted, length:', pdfText.length);
            } catch (textErr) {
              console.log('Text extraction failed:', textErr);
            }

            if (pdfText && pdfText.length > 50) {
              const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'system',
                    content: `You are an AI assistant that extracts information from document text.
Extract all relevant personal and important information from this document.
Return the extracted data as a JSON object.

REQUIRED FIELDS TO LOOK FOR:
- full_name: string
- date_of_birth: string
- address: string
- phone_number: string
- email: string
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
            } else if (pdfText.length > 0) {
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
- other_info: object

METADATA FIELDS:
- document_description: string
- fields_found: array
- fields_not_found: array
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
              aiExtraction = {
                error: 'This PDF appears to be a scanned document.',
                document_description: 'This PDF contains scanned images rather than searchable text. For best results, upload as images (JPG, PNG).',
                fields_not_found: ['full_name', 'date_of_birth', 'address', 'phone_number', 'email', 'id_number'],
                extraction_confidence: 'low',
                suggestion: 'Try uploading the document as an image file (JPG/PNG) instead.'
              };
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

    if (uploadedDocs.length === 0) {
      return NextResponse.json({ error: 'No documents were uploaded successfully' }, { status: 400 });
    }

    // Update client with document count and AI extracted data
    await supabase
      .from('clients')
      .update({
        documents_submitted: uploadedDocs.length,
        ai_extracted_data: extractedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    // Update document request status if applicable
    if (source === 'document_request' && requestId) {
      await supabase
        .from('document_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          documents_count: uploadedDocs.length,
        })
        .eq('id', requestId);
    }

    // Deduct tokens - 10 tokens per AI document scan
    const aiScannedDocs = Object.keys(extractedData).length;
    if (aiScannedDocs > 0) {
      try {
        await supabase.rpc('deduct_tokens', {
          p_broker_id: brokerId,
          p_amount: aiScannedDocs * 10,
          p_action_type: 'ai_scan',
          p_description: `AI document scanning: ${aiScannedDocs} additional documents`,
        });
      } catch (tokenErr) {
        console.error('Token deduction failed:', tokenErr);
      }
    }

    // Log to timeline
    try {
      await supabase
        .from('case_timeline')
        .insert({
          client_id: clientId,
          broker_id: brokerId,
          event_type: 'documents_submitted',
          title: 'Additional Documents Submitted',
          description: `Client uploaded ${uploadedDocs.length} document(s): ${uploadedDocs.map(d => d.name).join(', ')}`,
        });
    } catch {
      // Timeline logging is optional
    }

    // Send notification email to broker
    try {
      const { data: broker } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', brokerId)
        .single();

      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();

      if (broker?.email) {
        const { sendDocumentUploadedNotificationEmail } = await import('@/lib/email/resend');
        await sendDocumentUploadedNotificationEmail({
          to: broker.email,
          brokerName: broker.full_name || 'there',
          clientName: client?.name || 'A client',
          documentsCount: uploadedDocs.length,
          hasAiExtraction: aiScannedDocs > 0,
          clientViewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/clients/${clientId}`,
        });
        console.log('Broker notification email sent to:', broker.email);
      }
    } catch (emailError) {
      console.error('Failed to send broker notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      documentsUploaded: uploadedDocs.length,
      documents: uploadedDocs,
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
