import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runGeminiAudit } from './lib/geminiService'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url, email } = req.body

    if (!url) {
      return res.status(400).json({ error: 'Missing URL' })
    }

    const result = await runGeminiAudit({
      url,
      apiKey: process.env.GEMINI_API_KEY!,
    })

    return res.status(200).json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('AUDIT FAILURE:', error)
    return res.status(500).json({
      success: false,
      error: 'Audit encountered a technical interruption',
    })
  }
}
