// gemini-api.ts - Google Gemini AI Integration

export class GeminiAIAgent {
  apiKey: string;
  apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  isReady: boolean;
  cachedQuestions: string[] = [];

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    this.isReady = !!apiKey;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.isReady = !!apiKey;
  }

  async generateInvestigationQuestions(crimeDetails: string, subjectName = "Subject"): Promise<string[]> {
    try {
      if (this.isReady && this.apiKey?.trim()) {
        const result = await this.callGeminiAPI(crimeDetails, subjectName);
        if (result && Array.isArray(result) && result.length > 0) return result;
      }
      return this.generateContextualQuestions(crimeDetails, subjectName);
    } catch (error) {
      console.error('Error in question generation:', error);
      return this.generateContextualQuestions(crimeDetails, subjectName);
    }
  }

  private async callGeminiAPI(crimeDetails: string, subjectName: string): Promise<string[]> {
    const prompt = `You are an expert criminal investigator conducting a polygraph examination. A subject named "${subjectName}" is being questioned about the following incident:

INCIDENT DETAILS:
${crimeDetails}

Generate exactly 6 specific, targeted interrogation questions. Format as a valid JSON array. Output ONLY the JSON array, no other text.`;

    const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) throw new Error(`Gemini API Error ${response.status}`);

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) throw new Error('Invalid API response');

    let jsonArray: string[];
    try {
      jsonArray = JSON.parse(textContent);
    } catch {
      const jsonMatch = textContent.match(/\[\s*"[\s\S]*?"\s*\]/);
      if (jsonMatch) jsonArray = JSON.parse(jsonMatch[0]);
      else throw new Error('Could not parse JSON');
    }

    this.cachedQuestions = jsonArray.slice(0, 6);
    return this.cachedQuestions;
  }

  generateContextualQuestions(crimeDetails: string, _subjectName = "Subject"): string[] {
    const details = crimeDetails.toLowerCase();
    const q: string[] = [];

    q.push("Where were you when the incident occurred?");

    if (details.includes('robbery') || details.includes('theft') || details.includes('stolen')) {
      q.push("Have you ever stolen anything or been convicted of theft?");
      q.push("Do you know who committed this robbery/theft?");
    }
    if (details.includes('murder') || details.includes('kill') || details.includes('death')) {
      q.push("Did you cause the death of the victim?");
      q.push("Were you present at the location when the incident occurred?");
    }
    if (details.includes('assault') || details.includes('attack')) {
      q.push("Did you physically harm the victim?");
      q.push("What is your relationship to the victim?");
    }
    if (details.includes('fraud') || details.includes('forgery')) {
      q.push("Did you intentionally deceive anyone for financial gain?");
    }

    q.push("Look directly at the camera: Are you being completely honest about your involvement?");

    while (q.length < 6) {
      q.push("Can you provide more information about your activities related to this incident?");
    }

    return q.slice(0, 6);
  }

  async generateFollowUpQuestion(crimeDetails: string, previousAnswers: { question: string; answer: string }[]): Promise<string> {
    if (!this.isReady) return "Can you provide more specific details about what you just mentioned?";

    try {
      const answersText = previousAnswers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join('\n\n');
      const prompt = `You are an expert investigator. Case: ${crimeDetails}\n\nConversation:\n${answersText}\n\nGenerate ONE follow-up question. Respond with ONLY the question.`;

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch {
      return "Can you tell us more about your involvement in the incident?";
    }
  }
}

export const geminiAgent = new GeminiAIAgent();
