import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy · TTLike',
  description: 'TTLike Privacy Policy — how we collect, use, and protect your information.',
  robots: { index: false },
}

const EFFECTIVE_DATE = 'May 30, 2026'
const CONTACT_EMAIL = 'privacy@ttlike.com'
const COMPANY = 'TTLike, Inc.'
const STATE = 'California'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600">← Back to TTLike</Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Effective Date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-8">

          {/* 1. Introduction */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Who We Are</h2>
            <p className="text-gray-600">
              {COMPANY} (&quot;TTLike,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the website{' '}
              <a href="https://ttlike.com" className="text-pink-500 hover:underline">ttlike.com</a>{' '}
              and related services (collectively, the &quot;Service&quot;). We are headquartered in {STATE}.
              This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our Service.
            </p>
            <p className="text-gray-600 mt-2">
              By using TTLike, you agree to the collection and use of information as described in this policy.
              If you do not agree, please do not use the Service.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="font-medium text-gray-800 mb-2">a. Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mb-4">
              <li><strong>Account registration:</strong> email address, name, and password.</li>
              <li><strong>Subscription &amp; billing:</strong> payment details processed by our third-party payment processor (we do not store raw card numbers).</li>
              <li><strong>Communications:</strong> messages you send us via email or support channels.</li>
            </ul>

            <h3 className="font-medium text-gray-800 mb-2">b. Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mb-4">
              <li><strong>Usage data:</strong> pages visited, features used, clicks, and session duration.</li>
              <li><strong>Device &amp; browser data:</strong> IP address, browser type and version, operating system, referring URL.</li>
              <li><strong>Cookies &amp; similar technologies:</strong> session cookies for authentication, preference cookies, and analytics cookies (see Section 6).</li>
            </ul>

            <h3 className="font-medium text-gray-800 mb-2">c. Information from Third Parties</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>If you sign in via a third-party OAuth provider, we receive your name and email from that provider.</li>
              <li>TikTok video metadata (titles, view counts, engagement metrics) that is publicly available.</li>
            </ul>
          </section>

          {/* 3. How We Use Information */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-2">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Provide, operate, and improve the Service.</li>
              <li>Create and manage your account and subscription.</li>
              <li>Process payments and send transactional emails (receipts, password resets).</li>
              <li>Respond to support requests and communicate with you.</li>
              <li>Send product updates, newsletters, and promotional offers — <strong>with your consent or as permitted by law</strong>; you may opt out at any time.</li>
              <li>Monitor and analyze usage trends to improve features and performance.</li>
              <li>Detect and prevent fraud, abuse, and security incidents.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          {/* 4. Sharing */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. How We Share Your Information</h2>
            <p className="text-gray-600 mb-2">
              We do <strong>not sell your personal information</strong> (see Section 8 for CCPA details).
              We share information only as follows:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><strong>Service providers:</strong> vendors who help us operate the Service (hosting, payment processing, analytics, email delivery) under confidentiality obligations.</li>
              <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets, with advance notice to you.</li>
              <li><strong>Legal requirements:</strong> when required by law, court order, or governmental authority, or to protect our rights and the safety of users.</li>
              <li><strong>With your consent:</strong> for any other purpose with your explicit agreement.</li>
            </ul>
            <p className="text-gray-600 mt-3">
              Key third-party sub-processors we use: Supabase (database hosting), Vercel (web hosting), Stripe or similar (payments), and Google Analytics or similar (analytics). Each has its own privacy policy.
            </p>
          </section>

          {/* 5. Data Retention */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p className="text-gray-600">
              We retain your account data for as long as your account is active or as needed to provide the Service.
              If you delete your account, we will delete or anonymize your personal information within <strong>30 days</strong>,
              except where we are required to retain it by law (e.g., billing records for tax purposes, typically 7 years).
              Aggregated, de-identified data may be retained indefinitely.
            </p>
          </section>

          {/* 6. Cookies */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Cookies &amp; Tracking Technologies</h2>
            <p className="text-gray-600 mb-2">We use the following types of cookies:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><strong>Strictly necessary:</strong> session cookies required for authentication and security. These cannot be disabled.</li>
              <li><strong>Functional:</strong> cookies that remember your preferences (e.g., language).</li>
              <li><strong>Analytics:</strong> cookies that help us understand how visitors use the site (e.g., page views). You may opt out via your browser settings or a cookie consent tool.</li>
            </ul>
            <p className="text-gray-600 mt-3">
              <strong>Do Not Track:</strong> We honor browser &quot;Do Not Track&quot; (DNT) signals for analytics cookies, consistent with CalOPPA requirements.
              When DNT is enabled, we will not use analytics tracking technologies.
            </p>
          </section>

          {/* 7. Data Security */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Data Security</h2>
            <p className="text-gray-600">
              We implement industry-standard security measures including TLS encryption in transit,
              encrypted storage for sensitive data, and access controls limited to authorized personnel.
              However, no method of transmission over the Internet is 100% secure.
              In the event of a data breach that affects your personal information, we will notify you
              as required by California law (Cal. Civ. Code § 1798.29 and § 1798.82) within <strong>72 hours</strong> of discovery.
            </p>
          </section>

          {/* 8. CCPA */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. California Privacy Rights (CCPA / CPRA)</h2>
            <p className="text-gray-600 mb-3">
              If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA)
              as amended by the California Privacy Rights Act (CPRA):
            </p>

            <h3 className="font-medium text-gray-800 mb-2">Right to Know</h3>
            <p className="text-gray-600 mb-3">
              You have the right to request that we disclose the categories and specific pieces of personal information
              we have collected about you, the categories of sources, the business purpose for collecting it,
              and the categories of third parties with whom we share it.
            </p>

            <h3 className="font-medium text-gray-800 mb-2">Right to Delete</h3>
            <p className="text-gray-600 mb-3">
              You have the right to request deletion of personal information we have collected from you,
              subject to certain exceptions (e.g., completing a transaction, detecting security incidents, complying with legal obligations).
            </p>

            <h3 className="font-medium text-gray-800 mb-2">Right to Correct</h3>
            <p className="text-gray-600 mb-3">
              You have the right to request correction of inaccurate personal information we hold about you.
            </p>

            <h3 className="font-medium text-gray-800 mb-2">Right to Opt Out of Sale / Sharing</h3>
            <p className="text-gray-600 mb-3">
              We do <strong>not sell</strong> personal information and do not share it for cross-context behavioral advertising.
              There is nothing to opt out of in this regard, but you may contact us to confirm.
            </p>

            <h3 className="font-medium text-gray-800 mb-2">Right to Limit Use of Sensitive Personal Information</h3>
            <p className="text-gray-600 mb-3">
              We do not collect sensitive personal information as defined by CPRA (e.g., Social Security numbers, precise geolocation, racial or ethnic origin).
            </p>

            <h3 className="font-medium text-gray-800 mb-2">Right to Non-Discrimination</h3>
            <p className="text-gray-600 mb-3">
              We will not discriminate against you for exercising any of your CCPA rights.
            </p>

            <h3 className="font-medium text-gray-800 mb-2">How to Submit a Request</h3>
            <p className="text-gray-600">
              To exercise any of the above rights, email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-500 hover:underline">{CONTACT_EMAIL}</a>{' '}
              with the subject line &quot;California Privacy Request.&quot;
              We will respond within <strong>45 days</strong>. We may extend this period by an additional 45 days where reasonably necessary,
              with prior notice. You may designate an authorized agent to make a request on your behalf.
              We will verify your identity before processing the request.
            </p>
          </section>

          {/* 9. Children */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-gray-600">
              The Service is not directed to children under the age of 13, and we do not knowingly collect personal information
              from children under 13. If we learn that we have collected personal information from a child under 13,
              we will delete it promptly. If you believe a child under 13 has provided us with personal information,
              please contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-500 hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          {/* 10. Changes */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. When we make material changes,
              we will update the &quot;Effective Date&quot; at the top of this page and, where required by law,
              notify you via email or a prominent notice on the Service at least <strong>30 days</strong> before the changes take effect.
              Continued use of the Service after changes become effective constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p className="text-gray-600">
              For questions, concerns, or to exercise your privacy rights, please contact us:
            </p>
            <div className="mt-3 bg-gray-50 rounded-xl p-5 text-gray-700 text-sm space-y-1">
              <p><strong>{COMPANY}</strong></p>
              <p>State of Incorporation: {STATE}</p>
              <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-500 hover:underline">{CONTACT_EMAIL}</a></p>
              <p>Website: <a href="https://ttlike.com" className="text-pink-500 hover:underline">ttlike.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
