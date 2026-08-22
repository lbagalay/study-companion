const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subjects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          academic_year: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' },
          room: { type: 'string' },
          schedules: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                day_of_week: { type: 'integer' },
                end_time: { type: 'string' },
                room: { type: 'string' },
                start_time: { type: 'string' },
              },
              required: ['day_of_week', 'end_time', 'room', 'start_time'],
            },
          },
          semester: { type: 'string' },
          teacher: { type: 'string' },
          units: { type: 'number' },
        },
        required: ['academic_year', 'code', 'name', 'room', 'schedules', 'semester', 'teacher', 'units'],
      },
    },
  },
  required: ['subjects'],
} as const;

function json(body: unknown, status = 200) {
  return Response.json(body, { headers: corsHeaders, status });
}

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function outputText(response: { output_text?: string; output?: Array<{ content?: Array<{ text?: string; type?: string }> }> }) {
  if (response.output_text) return response.output_text;
  for (const item of response.output ?? []) {
    const text = item.content?.find((content) => content.type === 'output_text')?.text;
    if (text) return text;
  }
  throw new Error('The extraction response did not contain structured output.');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!req.headers.get('authorization')) return json({ error: 'Authentication required' }, 401);

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Choose a photo or PDF of the study load.' }, 400);
    if (file.size < 1 || file.size > 12 * 1024 * 1024) return json({ error: 'The file must be smaller than 12 MB.' }, 413);

    const mimeType = file.type.toLowerCase();
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';
    if (!isImage && !isPdf) return json({ error: 'Study-load imports currently support photos and PDF files.' }, 415);

    const base64 = toBase64(new Uint8Array(await file.arrayBuffer()));
    const fileContent = isImage
      ? { type: 'input_image', detail: 'high', image_url: `data:${mimeType};base64,${base64}` }
      : { type: 'input_file', filename: file.name || 'study-load.pdf', file_data: `data:application/pdf;base64,${base64}` };

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      body: JSON.stringify({
        input: [{
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Extract the subjects and recurring weekly class meetings from this student study load. Copy only information visible in the document. Do not guess missing values; use an empty string or 0 instead. Convert days to 0=Sunday through 6=Saturday and times to 24-hour HH:MM. Keep separate meeting rows for different days or times. Ignore totals, fees, student identifiers, and administrative rows. If this is not a study load or no subjects are legible, return an empty subjects array.',
            },
            fileContent,
          ],
        }],
        max_output_tokens: 8000,
        model: Deno.env.get('OPENAI_STUDY_LOAD_MODEL') ?? 'gpt-5.6-luna',
        store: false,
        text: { format: { name: 'study_load', schema: responseSchema, strict: true, type: 'json_schema' } },
      }),
      headers: { Authorization: `Bearer ${required('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const responseBody = await openAiResponse.json();
    if (!openAiResponse.ok) {
      console.error('OpenAI study-load extraction failed', openAiResponse.status, responseBody?.error?.code, responseBody?.error?.message);
      return json({ error: 'The document reader is temporarily unavailable. Try again in a moment.' }, 502);
    }

    const extracted = JSON.parse(outputText(responseBody));
    if (!extracted || !Array.isArray(extracted.subjects) || extracted.subjects.length > 50) {
      throw new Error('The extraction response did not contain a valid subject list.');
    }

    return json(extracted);
  } catch (error) {
    console.error('Study-load extraction failed', error);
    return json({ error: error instanceof Error && error.message === 'Missing OPENAI_API_KEY' ? 'Study-load reading is not configured yet.' : 'The study load could not be read. Try a clearer photo or PDF.' }, 500);
  }
});
