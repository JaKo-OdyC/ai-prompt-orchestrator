interface SafePromptRules {
  max_length: number;
  forbidden_terms: string[];
  required_terms: string[];
}

interface PromptEvaluation {
  length_ok: boolean;
  contains_forbidden_terms: boolean;
  required_terms: string[];
  approved: boolean;
  score: number;
}

export class SafePromptFilter {
  private rules: SafePromptRules = {
    max_length: 2000,
    forbidden_terms: ["hack", "exploit", "bypass", "manipulate", "jailbreak"],
    required_terms: ["analyze", "implement", "review", "test", "code", "file"]
  };

  evaluatePrompt(promptText: string): PromptEvaluation {
    const lengthOk = promptText.length <= this.rules.max_length && promptText.length >= 10;
    const containsForbiddenTerms = this.rules.forbidden_terms.some(term => 
      promptText.toLowerCase().includes(term.toLowerCase())
    );
    const foundRequiredTerms = this.rules.required_terms.filter(term => 
      promptText.toLowerCase().includes(term.toLowerCase())
    );
    
    // Calculate quality score (0-100)
    let score = 50; // Base score
    
    // Length scoring
    if (lengthOk) score += 20;
    if (promptText.length > 100) score += 10; // Detailed prompts
    
    // Required terms scoring
    score += foundRequiredTerms.length * 5;
    
    // Forbidden terms penalty
    if (containsForbiddenTerms) score -= 30;
    
    // Technical context bonus
    const technicalTerms = ["function", "class", "variable", "method", "API", "interface"];
    const foundTechnicalTerms = technicalTerms.filter(term =>
      promptText.toLowerCase().includes(term.toLowerCase())
    );
    score += foundTechnicalTerms.length * 3;
    
    score = Math.max(0, Math.min(100, score));
    
    const approved = lengthOk && !containsForbiddenTerms && foundRequiredTerms.length > 0;
    
    return {
      length_ok: lengthOk,
      contains_forbidden_terms: containsForbiddenTerms,
      required_terms: foundRequiredTerms,
      approved,
      score
    };
  }

  getRecommendations(evaluation: PromptEvaluation, originalPrompt: string): string[] {
    const recommendations: string[] = [];
    
    if (!evaluation.length_ok) {
      if (originalPrompt.length > this.rules.max_length) {
        recommendations.push("Shorten the prompt to maximum " + this.rules.max_length + " characters");
      } else {
        recommendations.push("Expand the prompt for more detailed analysis");
      }
    }
    
    if (evaluation.contains_forbidden_terms) {
      recommendations.push("Remove potentially harmful terms from the prompt");
    }
    
    if (evaluation.required_terms.length === 0) {
      recommendations.push("Include at least one required term: " + this.rules.required_terms.join(", "));
    }
    
    if (evaluation.score < 70) {
      recommendations.push("Consider adding more technical context or specific requirements");
    }
    
    return recommendations;
  }
}