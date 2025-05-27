import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-primary hover:text-accent transition-colors">
            <Image
              src="/leggwork-logo.png"
              alt="Leggwork Logo"
              width={48}
              height={48}
              priority // Good to add for LCP elements like a logo
            />
            {/* If you want the text "Leggwork" next to the logo, uncomment this. 
                Otherwise, the logo itself (if it contains the name) will suffice.
            <span className="text-primary">Leggwork</span> 
            */}
          </Link>
          {/* Navigation items can be added here if needed */}
        </div>
      </div>
    </header>
  );
}
