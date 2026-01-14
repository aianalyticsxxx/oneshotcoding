'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-terminal-bg">
      {/* Header */}
      <header className="border-b border-terminal-border bg-terminal-bg/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-terminal-accent font-mono text-sm hover:underline">
            ← Back to OneShotCoding
          </Link>
          <Link href="/terms" className="text-terminal-text-dim font-mono text-sm hover:text-terminal-text">
            Terms of Service
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-terminal-text mb-2 font-mono">Privacy Policy</h1>
        <p className="text-terminal-text-dim text-sm mb-8 font-mono">Last updated: January 2026</p>

        <div className="prose prose-invert prose-terminal max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              1. Data We Collect
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              When you use OneShotCoding, we collect the following information:
            </p>
            <ul className="list-disc list-inside text-terminal-text-dim space-y-2 ml-4">
              <li>
                <strong className="text-terminal-text">GitHub Profile Data:</strong> Username, display name, avatar URL,
                and email address (for account creation via GitHub OAuth)
              </li>
              <li>
                <strong className="text-terminal-text">User-Generated Content:</strong> Posts (&quot;shots&quot;), comments,
                reactions, and any other content you create on the platform
              </li>
              <li>
                <strong className="text-terminal-text">Usage Data:</strong> Information about how you interact with the
                Service, including pages visited, features used, and timestamps
              </li>
              <li>
                <strong className="text-terminal-text">Device Information:</strong> Browser type, operating system, and
                IP address for security and analytics purposes
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              2. How We Use Your Data
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              We use your data for the following purposes:
            </p>
            <ul className="list-disc list-inside text-terminal-text-dim space-y-2 ml-4">
              <li>To provide and maintain the Service</li>
              <li>To authenticate your identity and secure your account</li>
              <li>To display your profile and content to other users</li>
              <li>To send important notifications about your account or the Service</li>
              <li>To analyze usage patterns and improve the Service</li>
              <li>To detect and prevent fraud, abuse, or security threats</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              3. Data Sharing
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              We do not sell your personal data. We may share your data in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-terminal-text-dim space-y-2 ml-4">
              <li>
                <strong className="text-terminal-text">Public Content:</strong> Your posts, profile information, and
                public activity are visible to other users
              </li>
              <li>
                <strong className="text-terminal-text">Service Providers:</strong> We work with trusted third parties
                (cloud hosting, storage) who process data on our behalf under strict confidentiality agreements
              </li>
              <li>
                <strong className="text-terminal-text">Legal Requirements:</strong> We may disclose data if required by
                law, court order, or to protect the rights and safety of users and the public
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              4. Data Retention
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              We retain your data as follows:
            </p>
            <ul className="list-disc list-inside text-terminal-text-dim space-y-2 ml-4">
              <li>
                <strong className="text-terminal-text">Account Data:</strong> Retained while your account is active
              </li>
              <li>
                <strong className="text-terminal-text">Content:</strong> Retained until you delete it or delete your account
              </li>
              <li>
                <strong className="text-terminal-text">Usage Logs:</strong> Retained for up to 90 days for security purposes
              </li>
              <li>
                <strong className="text-terminal-text">Deleted Account Data:</strong> Permanently removed within 30 days
                of account deletion
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              5. Your Rights
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              You have the following rights regarding your data:
            </p>
            <ul className="list-disc list-inside text-terminal-text-dim space-y-2 ml-4">
              <li>
                <strong className="text-terminal-text">Access:</strong> Request a copy of the data we hold about you
              </li>
              <li>
                <strong className="text-terminal-text">Correction:</strong> Update or correct inaccurate data via your
                profile settings
              </li>
              <li>
                <strong className="text-terminal-text">Deletion:</strong> Delete your account and all associated data
                through the Settings page
              </li>
              <li>
                <strong className="text-terminal-text">Export:</strong> Request a machine-readable export of your data
              </li>
              <li>
                <strong className="text-terminal-text">Objection:</strong> Object to certain data processing activities
              </li>
            </ul>
            <p className="text-terminal-text-dim leading-relaxed mt-3">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@oneshotcoding.io" className="text-terminal-accent hover:underline">
                privacy@oneshotcoding.io
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              6. Cookies
            </h2>
            <p className="text-terminal-text-dim leading-relaxed mb-3">
              We use cookies and similar technologies for:
            </p>
            <ul className="list-disc list-inside text-terminal-text-dim space-y-2 ml-4">
              <li>
                <strong className="text-terminal-text">Authentication:</strong> Secure session cookies to keep you
                logged in
              </li>
              <li>
                <strong className="text-terminal-text">Preferences:</strong> Remembering your settings and preferences
              </li>
              <li>
                <strong className="text-terminal-text">Analytics:</strong> Understanding how users interact with the
                Service (anonymized)
              </li>
            </ul>
            <p className="text-terminal-text-dim leading-relaxed mt-3">
              Essential cookies are required for the Service to function. You can disable non-essential
              cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              7. Security
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              We implement industry-standard security measures to protect your data, including encrypted
              connections (HTTPS), secure token-based authentication, and regular security audits.
              However, no method of transmission over the Internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              8. Children&apos;s Privacy
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              OneShotCoding is not intended for users under the age of 13. We do not knowingly collect
              data from children under 13. If you believe a child has provided us with personal data,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              9. Changes to This Policy
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify users of material
              changes by posting the updated policy on this page. Your continued use of the Service
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-terminal-text mb-3 font-mono border-b border-terminal-border pb-2">
              10. Contact Us
            </h2>
            <p className="text-terminal-text-dim leading-relaxed">
              If you have questions about this Privacy Policy or your data, please contact us at{' '}
              <a href="mailto:privacy@oneshotcoding.io" className="text-terminal-accent hover:underline">
                privacy@oneshotcoding.io
              </a>
            </p>
          </section>
        </div>

        {/* Footer navigation */}
        <div className="mt-12 pt-8 border-t border-terminal-border flex justify-between items-center">
          <Link href="/terms" className="text-terminal-accent font-mono text-sm hover:underline">
            ← Terms of Service
          </Link>
          <Link href="/" className="text-terminal-text-dim font-mono text-sm hover:text-terminal-text">
            Return to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
