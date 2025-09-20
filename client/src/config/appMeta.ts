export const APP_META = {
  productName: import.meta.env.VITE_APP_NAME ?? "AI Prompt Orchestrator",
  version: "2.2.0",
  description: "Multi-Provider Prompt Generation Platform",
  githubUrl: "https://github.com/your-org/ai-prompt-orchestrator",
  docsUrl: "#", // Placeholder for future docs
  supportEmail: "support@example.com" // Placeholder
} as const;

// Helper to update document title
export const updateDocumentTitle = (subtitle?: string) => {
  document.title = subtitle 
    ? `${subtitle} | ${APP_META.productName}` 
    : APP_META.productName;
};