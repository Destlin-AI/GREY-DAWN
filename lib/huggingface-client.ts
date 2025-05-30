export async function queryHuggingFace(model: string, data: any) {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
    },
    method: "POST",
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Hugging Face API Error: ${response.status} - ${response.statusText}`)
  }

  return await response.json()
}
