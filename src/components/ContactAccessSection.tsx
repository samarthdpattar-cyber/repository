import React, { useEffect, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import type { AccessInquiry } from '../types/lease';

const ORG_TYPES: AccessInquiry['organizationType'][] = [
  'Tenant',
  'Legal Aid Clinic',
  'Student Housing',
  'Tenant Union',
  'Other',
];

export const ContactAccessSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationType, setOrganizationType] =
    useState<AccessInquiry['organizationType']>('Tenant');
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedInquiry, setSubmittedInquiry] = useState<AccessInquiry | null>(null);
  const [totalRequests, setTotalRequests] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/inquiries')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.count === 'number') {
          setTotalRequests(data.count);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (region.trim().length < 2) {
      setError('Please enter your city, state, or housing region.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          organizationType,
          region: region.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Unable to submit your request.');
      } else {
        setSubmittedInquiry(data.inquiry as AccessInquiry);
        if (typeof data.totalInquiries === 'number') {
          setTotalRequests(data.totalInquiries);
        }
        setName('');
        setEmail('');
        setRegion('');
        setNotes('');
      }
    } catch {
      setError('Network error while submitting request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="request-access" className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Context & What Teams Receive */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 text-balance">
              Request a regional rulebook pack for your community.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Housing clinics, student unions, and tenant advocacy teams can request custom
              versioned rulebook packs calibrated to local rent-cap and deposit ordinances.
            </p>

            <div className="pt-2 space-y-2.5 text-xs sm:text-sm text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="font-mono-code text-indigo-900 font-semibold">01.</span>
                <span>JSON rulebook pack configured with regional overrides and effective dates.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-mono-code text-indigo-900 font-semibold">02.</span>
                <span>Side-by-side Agreement Time Machine tracking across annual amendments.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-mono-code text-indigo-900 font-semibold">03.</span>
                <span>Strict zero-hallucination citation guard for tenant consultations.</span>
              </div>
            </div>

            {totalRequests !== null && totalRequests > 0 && (
              <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 tabular-nums">
                {totalRequests} regional rulebook request{totalRequests === 1 ? '' : 's'} logged in
                backend store
              </div>
            )}
          </div>

          {/* Right Column: Validated Backend Form */}
          <div className="lg:col-span-7">
            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-7">
              {submittedInquiry ? (
                <div className="space-y-4 py-4">
                  <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Request Saved to Backend</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-950">
                    Thank you, {submittedInquiry.name}.
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Your regional rulebook inquiry for{' '}
                    <strong className="text-slate-900">{submittedInquiry.region}</strong> (
                    {submittedInquiry.organizationType}) has been persisted under reference{' '}
                    <span className="font-mono-code text-indigo-950 font-semibold">
                      {submittedInquiry.id}
                    </span>
                    .
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSubmittedInquiry(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                    >
                      Submit Another Request
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="inq-name" className="block text-xs font-semibold text-slate-800">
                        Full Name
                      </label>
                      <input
                        id="inq-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="inq-email" className="block text-xs font-semibold text-slate-800">
                        Email Address
                      </label>
                      <input
                        id="inq-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@housingclinic.org"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="inq-org" className="block text-xs font-semibold text-slate-800">
                        Role or Organization
                      </label>
                      <select
                        id="inq-org"
                        value={organizationType}
                        onChange={(e) =>
                          setOrganizationType(e.target.value as AccessInquiry['organizationType'])
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-800"
                      >
                        {ORG_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="inq-region" className="block text-xs font-semibold text-slate-800">
                        City or Jurisdiction
                      </label>
                      <input
                        id="inq-region"
                        type="text"
                        required
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="e.g., Seattle, WA or Bengaluru"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="inq-notes" className="block text-xs font-semibold text-slate-800">
                      Rulebook Clauses of Interest (Optional)
                    </label>
                    <textarea
                      id="inq-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Deposit limits, notice period rules, student housing addenda..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-800"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-xs text-red-800">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-slate-500">
                      Stored directly on the LeaseGuard backend.
                    </span>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Submitting...' : 'Request Rulebook Pack'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
