import { Settings, BarChart3, CheckCircle, TestTube } from "lucide-react";

interface ModeSelectorProps {
  selectedMode: string;
  onModeChange: (mode: string) => void;
}

interface ModeConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof Settings;
  color: string;
}

const modes: ModeConfig[] = [
  {
    id: "implement",
    name: "Implement", 
    description: "Generate code changes and patches",
    icon: Settings,
    color: "bg-primary"
  },
  {
    id: "analyze",
    name: "Analyze",
    description: "Review code for issues and improvements", 
    icon: BarChart3,
    color: "bg-yellow-600"
  },
  {
    id: "review",
    name: "Review",
    description: "Score and evaluate code quality",
    icon: CheckCircle,
    color: "bg-orange-600"
  },
  {
    id: "test",
    name: "Test",
    description: "Generate smoke tests and validation",
    icon: TestTube,
    color: "bg-green-600"
  }
];

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <div 
            key={mode.id}
            className="group cursor-pointer"
            onClick={() => onModeChange(mode.id)}
          >
            <div 
              className={`block p-4 border-2 rounded-lg transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary bg-muted/20 group-hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-6 h-6 ${isSelected ? 'bg-primary' : mode.color} rounded flex items-center justify-center mt-0.5`}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{mode.name}</h3>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
