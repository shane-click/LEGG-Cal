import Link from 'next/link';
import { Building2 } from 'lucide-react'; // Using Building2 as a generic "Leggwork" icon

export default function Header() {
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-primary hover:text-accent transition-colors">
            <Building2 className="h-7 w-7" />
            <span>Leggwork</span>
          </Link>
          {/* Navigation items can be added here if needed */}
        </div>
      </div>
    </header>
  );
}
