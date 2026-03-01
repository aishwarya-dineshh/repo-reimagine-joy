// logic.ts - Core AI engine for deception probability calculation

import { geminiAgent } from './gemini-api';

export class AIEngine {
  baseQuestions: string[] = [
    "What is your full name?",
    "What is your date of birth?",
    "Where do you live?",
    "Are you currently employed?"
  ];

  investigationQuestions: string[] = [];
  currentContext = "";

  avgBaselinePulse = 0;
  avgBaselineSaccades = 0;
  avgBaselineBlinks = 0.5;

  anomalyCount = 0;
  totalAnalysisTicks = 0;
  stressSum = 0;
  rationale: string[] = [];

  async setContext(context: string, subjectName = "Subject") {
    this.currentContext = context;

    if (geminiAgent.isReady) {
      try {
        const questions = await geminiAgent.generateInvestigationQuestions(context, subjectName);
        if (Array.isArray(questions) && questions.length > 0) {
          this.investigationQuestions = questions;
          this.baseQuestions = questions.slice(0, 4);
          return;
        }
      } catch (e) {
        console.warn('Gemini question generation failed:', e);
      }
    }

    this.generateContextualQuestions(context);

    if (!this.investigationQuestions || this.investigationQuestions.length === 0) {
      this.investigationQuestions = [
        "Can you tell us what you know about this incident?",
        "Where were you at the time this occurred?",
        "Have you discussed this incident with anyone?",
        "Is there anything you want to clarify about your involvement?",
        "Are you willing to answer any questions we ask?",
        "Tell me the truth: what happened?"
      ];
    }

    this.baseQuestions = this.investigationQuestions.slice(0, 4);
  }

  generateContextualQuestions(context: string) {
    const questions: string[] = [];
    const contextLower = context.toLowerCase();

    const timeMatch = context.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)|\d{1,2}:\d{2})/);
    if (timeMatch) {
      questions.push(`Can you account for your exact location and activities at ${timeMatch[1]} when this incident occurred?`);
    } else {
      questions.push("Can you provide your exact timeline for when this incident took place?");
    }

    if (contextLower.includes('shop') || contextLower.includes('store')) {
      questions.push("How well are you familiar with the layout and operations of the establishment?");
    } else {
      questions.push("Have you been to the location where this incident occurred?");
    }

    if (contextLower.includes('stolen') || contextLower.includes('theft') || contextLower.includes('robbery')) {
      questions.push("Do you have any knowledge about what happened to the items that were stolen?");
    } else {
      questions.push("Can you describe what items were involved in this incident?");
    }

    if (contextLower.includes('cctv') || contextLower.includes('camera')) {
      questions.push("Are you concerned about being identified on CCTV footage at the scene?");
    } else {
      questions.push("What do you say to reports that you were seen at the location during the incident?");
    }

    if (contextLower.includes('staff') || contextLower.includes('access')) {
      questions.push("Explain why you had access to the area where the incident took place?");
    } else {
      questions.push("How did you gain access to the location where this incident occurred?");
    }

    questions.push("Look directly at the camera and state: Did you have any involvement in this incident?");

    while (questions.length < 8) {
      questions.push("Can you provide any additional details regarding this matter?");
    }

    this.investigationQuestions = questions.slice(0, 8);
  }

  getQuestion(isCalibration: boolean, index: number): string | null {
    if (isCalibration) {
      return index < this.baseQuestions.length ? this.baseQuestions[index] : null;
    }
    return index < this.investigationQuestions.length ? this.investigationQuestions[index] : null;
  }

  calibrateBaseline(pulseBuffer: number[], currentBpm: number, saccadesPerSec: number, blinksPerSec = 0) {
    this.avgBaselinePulse = currentBpm;
    this.avgBaselineSaccades = saccadesPerSec || 1;
    this.avgBaselineBlinks = blinksPerSec || 0.5;
  }

  analyzeRealTime(currentBpm: number, saccadesPerSec: number, blinksPerSec = 0): number {
    let stressScore = 0;
    this.totalAnalysisTicks++;

    const bpmDiff = currentBpm - this.avgBaselinePulse;
    if (bpmDiff > 15) {
      stressScore += 40;
      if (this.totalAnalysisTicks % 10 === 0) this.rationale.push(`Sudden cardiovascular spike: +${bpmDiff} BPM above baseline.`);
    } else if (bpmDiff > 5) {
      stressScore += 15;
    }

    if (saccadesPerSec > this.avgBaselineSaccades * 2.5) {
      stressScore += 40;
      if (this.totalAnalysisTicks % 15 === 0) this.rationale.push(`Irregular eye shifts (saccadic rate: ${saccadesPerSec}/sec).`);
    } else if (saccadesPerSec > this.avgBaselineSaccades * 1.5) {
      stressScore += 20;
    }

    const baselineBlinks = this.avgBaselineBlinks || 0.5;
    if (baselineBlinks > 0) {
      if (blinksPerSec < baselineBlinks * 0.5) {
        stressScore += 20;
        if (this.totalAnalysisTicks % 12 === 0) this.rationale.push(`Blink suppression detected (blinks/sec: ${blinksPerSec}).`);
      } else if (blinksPerSec > baselineBlinks * 2) {
        stressScore += 20;
        if (this.totalAnalysisTicks % 12 === 0) this.rationale.push(`Excessive blinking detected (blinks/sec: ${blinksPerSec}).`);
      }
    }

    if (stressScore > 50) this.anomalyCount++;
    this.stressSum += stressScore;
    return Math.min(100, Math.max(0, stressScore));
  }

  calculateFinalProbability(): { probability: string; reasons: string[] } {
    const avgStress = this.totalAnalysisTicks > 0 ? this.stressSum / this.totalAnalysisTicks : 0;
    let prob = Math.min(99.9, Math.max(0.0, avgStress));

    this.rationale = [...new Set(this.rationale)].slice(0, 4);

    if (prob > 75) {
      this.rationale.push("Overall biometric profile strongly correlates with deceptive behavior signatures.");
    } else if (prob > 40) {
      this.rationale.push("Inconclusive variations detected. Moderate stress responses observed.");
    } else {
      this.rationale.push("Biometric baseline remained relatively stable.");
    }

    return { probability: prob.toFixed(1), reasons: this.rationale };
  }

  reset() {
    this.investigationQuestions = [];
    this.currentContext = "";
    this.avgBaselinePulse = 0;
    this.avgBaselineSaccades = 0;
    this.avgBaselineBlinks = 0.5;
    this.anomalyCount = 0;
    this.totalAnalysisTicks = 0;
    this.stressSum = 0;
    this.rationale = [];
    this.baseQuestions = [
      "What is your full name?",
      "What is your date of birth?",
      "Where do you live?",
      "Are you currently employed?"
    ];
  }
}

export const aiEngine = new AIEngine();
