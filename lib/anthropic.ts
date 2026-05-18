import 'server-only' // 🌟 盾牌：强行隔离前端，彻底干掉 Forbidden 报错
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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

  // 🌟 修复点 1：使用标准且最新的 Claude 3.5 Sonnet 模型代号
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest', 
    max_tokens: 4096,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // 🌟 修复点 2：超级稳健的 JSON 清理器，防止 Claude 吐出的 markdown 导致系统崩溃
  let rawText = content.text.trim()
  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  }

  try {
    const scripts = JSON.parse(rawText)
    return scripts
  } catch (parseError) {
    console.error('JSON Parse failed. Raw text was:', content.text)
    throw new Error('AI returned an invalid JSON format')
  }
}