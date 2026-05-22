const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function formatTips(text, placeName) {
  try {
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Add if not existing or improve and clean these safety tips for ${placeName}. Add missing important ones. Return ONLY simple bullet (•) points each on single line with empty line in between , no explanations total is max 5:\n${text}`
          }]
        }]
      })
    });
  
    if (!res.ok) {
      const errorData = await res.json();
      console.error("Gemini API error status:", res.status, errorData);
      return "";
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  } catch (err) {
    console.error("Network or parsing error:", err);
    return "";
  }
}

export { formatTips };