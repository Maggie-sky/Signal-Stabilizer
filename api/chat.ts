
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages, model = "qwen-turbo", response_format } = req.body;
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'QWEN_API_KEY is not configured on server.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        input: {
          messages: messages
        },
        parameters: {
          result_format: "message"
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: 'DashScope API Error', 
        details: errorData 
      });
    }

    const data = await response.json();
    // 通义千问返回结构：output.choices[0].message.content
    const reply = data.output?.choices?.[0]?.message?.content;

    return res.status(200).json({ reply });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request Timeout' });
    }
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
