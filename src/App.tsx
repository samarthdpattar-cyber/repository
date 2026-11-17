/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ContactAccessSection } from './components/ContactAccessSection';
import { HeroSection } from './components/HeroSection';
import { LeaseWorkspace } from './components/LeaseWorkspace';
import { ModesSection } from './components/ModesSection';
import { Navbar } from './components/Navbar';
import { TimeMachineShowcase } from './components/TimeMachineShowcase';

export default function App() {
  const [focusUploadNonce, setFocusUploadNonce] = useState(0);
  const [timeMachineTriggerNonce, setTimeMachineTriggerNonce] = useState(0);

  const scrollToWorkspace = () => {
    const el = document.getElementById('workspace');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleJumpToUpload = () => {
    scrollToWorkspace();
    setFocusUploadNonce((n) => n + 1);
  };

  const handleLaunchTimeMachine = () => {
    scrollToWorkspace();
    setTimeMachineTriggerNonce((n) => n + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar onJumpToUpload={handleJumpToUpload} />

      <main className="flex-1">
        <HeroSection
          onStartReview={handleJumpToUpload}
          onLaunchTimeMachine={handleLaunchTimeMachine}
        />

        <LeaseWorkspace
          focusUploadNonce={focusUploadNonce}
          timeMachineTriggerNonce={timeMachineTriggerNonce}
        />

        <TimeMachineShowcase onRunTimeMachineDemo={handleLaunchTimeMachine} />

        <ModesSection />

        <ContactAccessSection />
      </main>

      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="font-display font-bold text-sm text-white">LeaseGuard AI</div>
            <div className="text-slate-400">
              Informational decision-support only — grounded strictly in active rulebooks, not legal
              advice.
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-slate-300">
            <a href="#pipeline" className="hover:text-white transition-colors whitespace-nowrap">
              How It Works
            </a>
            <a href="#workspace" className="hover:text-white transition-colors whitespace-nowrap">
              Live Reviewer
            </a>
            <a
              href="#time-machine"
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Time Machine
            </a>
            <a href="#modes" className="hover:text-white transition-colors whitespace-nowrap">
              Capabilities
            </a>
            <a
              href="#request-access"
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Request Access
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
