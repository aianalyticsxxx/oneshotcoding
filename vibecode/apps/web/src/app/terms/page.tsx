'use client';

import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-terminal-bg">
      {/* Header */}
      <header className="border-b border-terminal-border bg-terminal-bg/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-terminal-accent font-mono text-sm hover:underline">
            ← Back to OneShotCoding
          </Link>
          <Link href="/privacy" className="text-terminal-text-dim font-mono text-sm hover:text-terminal-text">
            Privacy Policy
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-terminal-text mb-2 font-mono">Terms of Service</h1>
        <p className="text-terminal-text-dim text-sm mb-8 font-mono">Last updated: January 2026</p>

        <div className="prose prose-invert prose-terminal max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              1. Acceptance of Terms
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              By accessing or using OneShotCoding (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              2. User Responsibilities
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              As a user of OneShotCoding, you agree to:
            </p>
            <ul className="list-disc list-inside text-terminal-text-dim space-y-2 ml-4">
              <li>Provide accurate information when creating your account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the Service in compliance with all applicable laws</li>
              <li>Respect other users and the community guidelines</li>
              <li>Not engage in any activity that disrupts or interferes with the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              3. Content Ownership & License
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              You retain ownership of the content you create and share on OneShotCoding. By posting content,
              you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute
              your content within the Service.
            </p>
            <p className="text-terminal-text-dim leading-relaxed">
              You represent that you have the necessary rights to post any content you share and that your
              content does not infringe on the intellectual property rights of others.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              4. Prohibited Content
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              The following content is strictly prohibited on OneShotCoding:
            </p>
            <ul className="list-disc list-inside text-terminal-text-dim space-y-2 ml-4">
              <li>Illegal content or content promoting illegal activities</li>
              <li>Harassment, bullying, or threatening content</li>
              <li>Hate speech or discrimination</li>
              <li>Sexually explicit or pornographic content</li>
              <li>Content that violates the privacy of others</li>
              <li>Spam, malware, or phishing attempts</li>
              <li>Impersonation of other users or public figures</li>
              <li>Content that infringes on intellectual property rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              5. Account Termination
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              We reserve the right to suspend or terminate your account at our discretion if you violate
              these Terms of Service or engage in behavior that is harmful to the community.
            </p>
            <p className="text-terminal-text-dim leading-relaxed">
              You may delete your account at any time through the Settings page. Upon deletion, your
              personal data will be removed in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              6. Limitation of Liability
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              OneShotCoding is provided &quot;as is&quot; without warranties of any kind. We are not liable for any
              damages arising from your use of the Service, including but not limited to direct, indirect,
              incidental, consequential, or punitive damages. Your use of the Service is at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              7. Dispute Resolution
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              Any disputes arising from these Terms of Service or your use of the Service shall be
              resolved through good-faith negotiation. If a resolution cannot be reached, disputes
              will be subject to binding arbitration in accordance with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              8. Changes to Terms
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              We may update these Terms of Service from time to time. We will notify users of any
              material changes by posting the new Terms on this page and updating the &quot;Last updated&quot;
              date. Your continued use of the Service after changes constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              9. Contact
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              If you have questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:support@oneshotcoding.io" className="text-terminal-accent hover:underline">
                support@oneshotcoding.io
              </a>
            </p>
          </section>
        </div>

        {/* Footer navigation */}
        <div className="mt-12 pt-8 border-t border-terminal-border flex justify-between items-center">
          <Link href="/privacy" className="text-terminal-accent font-mono text-sm hover:underline">
            Privacy Policy →
          </Link>
          <Link href="/" className="text-terminal-text-dim font-mono text-sm hover:text-terminal-text">
            Return to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
