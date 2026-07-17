import { NextRequest } from 'next/server';
import { getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonError, jsonOk } from '@/app/api/_lib/response';

type DiagnosisSuggestion = {
  diagnosis: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
};

function cleanText(value: unknown) {
  return String(value || '').trim().slice(0, 4000);
}

function normalizeSuggestions(value: unknown): DiagnosisSuggestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => ({
      diagnosis: cleanText(item?.diagnosis).slice(0, 180),
      reason: cleanText(item?.reason).slice(0, 500),
      confidence: ['low', 'medium', 'high'].includes(item?.confidence)
        ? item.confidence
        : 'medium',
    }))
    .filter((item) => item.diagnosis)
    .slice(0, 5);
}

function parseOpenAIJson(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError('OPENAI_API_KEY is not configured on the server.', 500);
    }

    const body = await request.json();
    const payload = {
      presentingComplaints: cleanText(body.presentingComplaints),
      examination: cleanText(body.examination),
      chartNotes: cleanText(body.chartNotes),
      treatmentPlan: cleanText(body.treatmentPlan),
      procedures: Array.isArray(body.procedures)
        ? body.procedures
            .map((item: any) => cleanText(item?.procedure || item))
            .filter(Boolean)
            .slice(0, 20)
        : [],
      patientContext: cleanText(body.patientContext),
    };

    const hasClinicalContext = [
      payload.presentingComplaints,
      payload.examination,
      payload.chartNotes,
      payload.treatmentPlan,
      payload.procedures.join(' '),
    ].some(Boolean);

    if (!hasClinicalContext) {
      return jsonError('Add complaints, examination findings, chart notes, or procedures before requesting suggestions.', 400);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You assist licensed dental clinicians by suggesting possible impression/diagnosis options from provided consultation notes. Do not make a definitive diagnosis. Do not invent findings. If evidence is limited, say so in the reason. Return only valid JSON with a suggestions array.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'Suggest 3 to 5 possible dental impression/diagnosis options for clinician review.',
              requiredJsonShape: {
                suggestions: [
                  {
                    diagnosis: 'short diagnosis/impression',
                    reason: 'brief evidence-based reason from the supplied notes',
                    confidence: 'low | medium | high',
                  },
                ],
              },
              clinicalNotes: payload,
            }),
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return jsonError(
        data?.error?.message || 'AI diagnosis suggestion request failed.',
        response.status
      );
    }

    const content = data?.choices?.[0]?.message?.content || '{}';
    const parsed = parseOpenAIJson(content);
    const suggestions = normalizeSuggestions(parsed?.suggestions);

    return jsonOk({
      suggestions,
      disclaimer: 'For clinician review only. Confirm findings before saving the final diagnosis.',
    });
  } catch (error) {
    console.error('AI diagnosis suggestion error:', error);
    return jsonError('Failed to generate diagnosis suggestions.');
  }
}
