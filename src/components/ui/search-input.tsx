import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = "Buscar..." }: SearchInputProps) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
      <Input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-10 w-full rounded-full border border-border/30 bg-background/60 backdrop-blur-md focus:border-primary focus:ring-0 placeholder:text-foreground/50"
      />
    </div>
  );
}
