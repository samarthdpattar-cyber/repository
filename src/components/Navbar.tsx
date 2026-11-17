import React from 'react';

interface NavbarProps {
  onJumpToUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onJumpToUpload }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <a
          href="#top"
          className="font-display font-bold text-lg tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          LeaseGuard AI
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a
            href="#pipeline"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </a>
          <a
            href="#workspace"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Live Reviewer
          </a>
          <a
            href="#time-machine"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Time Machine
          </a>
          <a
            href="#modes"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Capabilities
          </a>
          <a
            href="#request-access"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Request Access
          </a>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onJumpToUpload}
            className="px-4 py-2 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Upload Agreement
          </button>
        </div>
      </div>
    </header>
  );
};
