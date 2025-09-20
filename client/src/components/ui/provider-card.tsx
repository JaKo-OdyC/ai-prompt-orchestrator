interface ProviderCardProps {
  id: string;
  name: string;
  description: string;
  color: string;
  abbreviation: string;
  selected: boolean;
  onToggle: () => void;
}

export function ProviderCard({
  id,
  name,
  description,
  color,
  abbreviation,
  selected,
  onToggle
}: ProviderCardProps) {
  return (
    <div className="group cursor-pointer" onClick={onToggle}>
      <div 
        className={`block p-4 border-2 rounded-lg transition-all duration-200 ${
          selected 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary bg-muted/20 group-hover:bg-muted/30'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center`}>
            <span className="text-sm font-bold text-white">{abbreviation}</span>
          </div>
          <div>
            <h3 className="font-medium text-sm">{name}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
