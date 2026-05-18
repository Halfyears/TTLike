import 'server-only'

export async function generateScripts(params: {
  hookType: string
  productName: string
  productDescription: string
  targetAudience: string
  niche: string
}): Promise<string[]> {
  const { hookType, productName, productDescription, targetAudience, niche } = params

  const systemPrompt = `You are an expert TikTok UGC script writer specializing in viral content for dropshipping products.
Your scripts are designed to maximize engagement, watch time, and conversions.
Always write in a natural, authentic tone that matches the ${hookType} hook style.`

  const userPrompt = `Generate exactly 5 different TikTok video scripts for this product:

Product: ${productName}
Description: ${productDescription}
Target Audience: ${targetAudience}
Niche: ${niche}
Hook Style: ${hookType}

For each script:
1. Start with a powerful ${hookType.toLowerCase()} hook (first 3 seconds)
2. Build engagement (middle 10-20 seconds)
3. End with a clear CTA

Format your response as JSON array with this structure:
[
  {
    "title": "Script variant title",
    "hook": "Opening hook text",
    "body": "Main content",
    "cta": "Call to action",
    "fullScript": "Complete script with timestamps"
  }
]

Return only valid JSON, no markdown.`

  // 🌟 使用 Google 官方免费端点请求 Gemini 2.5 Flash
  const apiKey = process.env.GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: {
        responseMimeType: 'application/json', // 强行让 Gemini 吐出标准的纯 JSON
      }
    })
  })

  if (!response.ok) {
    const errData = await response.json()
    throw new Error(errData.error?.message || 'Gemini API 请求失败')
  }

  const resData = await response.json()
  const rawText = resData.candidates[0].content.parts[0].text.trim()

  try {
    const scripts = JSON.parse(rawText)
    return scripts
  } catch (e) {
    console.error('JSON 解析失败，原始文本为:', rawText)
    throw new Error('AI 返回的格式无法被系统解析')
  }
}