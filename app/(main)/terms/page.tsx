import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service · TTLike',
  description: 'TTLike Terms of Service — the rules and conditions for using our platform.',
  robots: { index: false },
}

const EFFECTIVE_DATE = 'May 30, 2026'
const CONTACT_EMAIL = 'legal@ttlike.com'
const COMPANY = 'TTLike, Inc.'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600">← Back to TTLike</Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Effective Date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-8">

          {/* 1. Agreement */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p className="text-gray-600">
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and{' '}
              {COMPANY} (&quot;TTLike,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), a company based in California.
              By accessing or using <a href="https://ttlike.com" className="text-pink-500 hover:underline">ttlike.com</a>{' '}
              or any related services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms.
              If you do not agree, do not use the Service.
            </p>
            <p className="text-gray-600 mt-2">
              These Terms are governed by the laws of the State of California, United States, without regard to conflict-of-law principles.
            </p>
          </section>

          {/* 2. Eligibility */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Eligibility</h2>
            <p className="text-gray-600">
              You must be at least <strong>13 years old</strong> to use the Service.
              If you are between 13 and 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf.
              By using the Service, you represent and warrant that you have the legal capacity to enter into this agreement.
            </p>
          </section>

          {/* 3. Account */}
          <section>
            <h2 className="text-lg font-semibent text-gray-900 mb-3">3. Account Registration &amp; Security</h2>
            <p className="text-gray-600 mb-2">To access certain features, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Provide accurate, current, and complete registration information.</li>
              <li>Keep your password confidential and not share it with any third party.</li>
              <li>Notify us immediately at <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-500 hover:underline">{CONTACT_EMAIL}</a> of any unauthorized access to your account.</li>
              <li>Be responsible for all activity that occurs under your account.</li>
            </ul>
            <p className="text-gray-600 mt-2">
              We reserve the right to suspend or terminate your account for violation of these Terms.
            </p>
          </section>

          {/* 4. License */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. License to Use the Service</h2>
            <p className="text-gray-600">
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable,
              revocable license to access and use the Service for your personal or internal business purposes.
              You may not sublicense, sell, resell, transfer, assign, or otherwise exploit the Service for any commercial purpose
              without our express written consent.
            </p>
          </section>

          {/* 5. Acceptable Use */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Acceptable Use Policy</h2>
            <p className="text-gray-600 mb-2">You agree <strong>not</strong> to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Scrape, crawl, or systematically download data from the Service without our written permission.</li>
              <li>Use the Service to generate, distribute, or promote content that is illegal, defamatory, harassing, or harmful.</li>
              <li>Attempt to gain unauthorized access to our systems or networks.</li>
              <li>Reverse-engineer, decompile, or disassemble any portion of the Service.</li>
              <li>Use the Service in any manner that could damage, disable, overburden, or impair its functionality.</li>
              <li>Violate any applicable laws, including TikTok&apos;s Terms of Service when using URLs or content from that platform.</li>
              <li>Misrepresent your identity or affiliation with any person or entity.</li>
              <li>Use AI-generated scripts from the Service to deceive consumers in a manner that violates the FTC Act or California&apos;s False Advertising Law (Bus. &amp; Prof. Code § 17500).</li>
            </ul>
          </section>

          {/* 6. Subscription & Payment */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Subscriptions &amp; Payments</h2>
            <p className="text-gray-600 mb-2">
              Certain features require a paid subscription. By subscribing, you authorize us to charge your payment method on a recurring basis.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><strong>Billing cycle:</strong> Monthly or annually, as selected at purchase.</li>
              <li><strong>Automatic renewal:</strong> Subscriptions automatically renew unless canceled before the renewal date.</li>
              <li><strong>Cancellation:</strong> You may cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period; no pro-rated refunds are provided for partial periods.</li>
              <li><strong>Refunds:</strong> We offer a <strong>7-day money-back guarantee</strong> for first-time paid subscribers. After 7 days, all charges are final except as required by law or our sole discretion.</li>
              <li><strong>Price changes:</strong> We will provide at least <strong>30 days&apos; written notice</strong> before changing subscription prices.</li>
              <li><strong>Taxes:</strong> You are responsible for any applicable taxes, including California sales tax where required.</li>
            </ul>
          </section>

          {/* 7. AI-Generated Content */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. AI-Generated Content</h2>
            <p className="text-gray-600 mb-2">
              The Service uses artificial intelligence to generate scripts, hook templates, and product analyses.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><strong>Ownership:</strong> Subject to these Terms, you own the outputs generated specifically for you through your use of the Service. We retain no ownership claim over your unique outputs.</li>
              <li><strong>No warranty:</strong> AI-generated content may be inaccurate, incomplete, or not suitable for your specific use case. You are solely responsible for reviewing and verifying all outputs before use.</li>
              <li><strong>Compliance:</strong> You are responsible for ensuring that your use of AI-generated content complies with all applicable laws, including FTC endorsement guidelines, platform-specific policies, and advertising regulations.</li>
            </ul>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p className="text-gray-600 mb-2">
              All content, features, and functionality of the Service — including but not limited to software, algorithms,
              text, graphics, logos, and data compilations — are owned by TTLike or its licensors and are protected
              by U.S. and international copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-gray-600">
              You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise exploit
              any portion of the Service without our express written permission.
            </p>
          </section>

          {/* 9. Third-Party Content */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Third-Party Content &amp; Links</h2>
            <p className="text-gray-600">
              The Service may display publicly available data from TikTok and other third-party sources.
              We do not endorse and are not responsible for any third-party content, products, or services.
              Links to third-party websites are provided for convenience only; we have no control over and assume no responsibility for their content or privacy practices.
            </p>
          </section>

          {/* 10. Disclaimer */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Disclaimer of Warranties</h2>
            <p className="text-gray-600">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. VIRAL SCORES, ANALYTICS, AND AI OUTPUTS ARE ESTIMATES
              ONLY AND DO NOT GUARANTEE COMMERCIAL SUCCESS.
            </p>
          </section>

          {/* 11. Limitation of Liability */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Limitation of Liability</h2>
            <p className="text-gray-600 mb-2">
              TO THE FULLEST EXTENT PERMITTED BY CALIFORNIA LAW, TTLIKE AND ITS OFFICERS, DIRECTORS, EMPLOYEES,
              AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
              ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION.
            </p>
            <p className="text-gray-600">
              OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE WILL NOT
              EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO TTLIKE IN THE <strong>12 MONTHS</strong> PRECEDING THE CLAIM,
              OR (B) <strong>$100 USD</strong>.
            </p>
            <p className="text-gray-600 mt-2 text-xs italic">
              Note: Some jurisdictions, including California, do not allow the exclusion of certain warranties or the limitation of certain damages.
              If you are a California resident, some of the above limitations may not apply to you.
            </p>
          </section>

          {/* 12. Indemnification */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Indemnification</h2>
            <p className="text-gray-600">
              You agree to indemnify, defend, and hold harmless TTLike and its officers, directors, employees, and agents
              from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees)
              arising out of or relating to your use of the Service, your violation of these Terms,
              or your infringement of any third-party rights.
            </p>
          </section>

          {/* 13. Dispute Resolution */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Dispute Resolution &amp; Governing Law</h2>
            <p className="text-gray-600 mb-2">
              These Terms are governed by and construed in accordance with the laws of the <strong>State of California</strong>,
              without regard to its conflict-of-law provisions.
            </p>
            <p className="text-gray-600 mb-2">
              <strong>Informal Resolution:</strong> Before filing a formal claim, you agree to contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-500 hover:underline">{CONTACT_EMAIL}</a>{' '}
              and attempt to resolve the dispute informally for at least <strong>30 days</strong>.
            </p>
            <p className="text-gray-600 mb-2">
              <strong>Arbitration:</strong> If informal resolution fails, any dispute, claim, or controversy arising out of
              or relating to these Terms shall be resolved by binding arbitration under the rules of the American Arbitration Association (AAA),
              conducted in <strong>Los Angeles County, California</strong>. Each party shall bear its own arbitration costs.
            </p>
            <p className="text-gray-600 mb-2">
              <strong>Class Action Waiver:</strong> You waive any right to participate in a class-action lawsuit or class-wide arbitration.
            </p>
            <p className="text-gray-600">
              <strong>Exception:</strong> Either party may seek injunctive or other equitable relief in a court of competent jurisdiction
              in Los Angeles County, California to prevent irreparable harm pending arbitration.
            </p>
          </section>

          {/* 14. Termination */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">14. Termination</h2>
            <p className="text-gray-600">
              We may suspend or terminate your access to the Service at any time, with or without cause, and with or without notice,
              for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              You may terminate your account at any time by contacting us. Upon termination, your license to use the Service ceases immediately.
              Sections 7, 8, 10, 11, 12, and 13 survive termination.
            </p>
          </section>

          {/* 15. Changes */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">15. Changes to These Terms</h2>
            <p className="text-gray-600">
              We may update these Terms at any time. If we make material changes, we will notify you by email
              or by posting a notice on the Service at least <strong>30 days</strong> before the changes take effect.
              Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.
              If you do not agree to the updated Terms, you must stop using the Service before they take effect.
            </p>
          </section>

          {/* 16. Miscellaneous */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">16. Miscellaneous</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and TTLike regarding the Service.</li>
              <li><strong>Severability:</strong> If any provision of these Terms is found unenforceable, the remaining provisions will continue in full force and effect.</li>
              <li><strong>Waiver:</strong> Our failure to enforce any provision of these Terms does not constitute a waiver of our right to enforce it in the future.</li>
              <li><strong>Assignment:</strong> You may not assign your rights under these Terms. We may assign our rights without restriction.</li>
              <li><strong>Notices:</strong> Notices to you will be sent to the email address associated with your account.</li>
            </ul>
          </section>

          {/* 17. Contact */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">17. Contact Us</h2>
            <p className="text-gray-600">For questions about these Terms, please contact:</p>
            <div className="mt-3 bg-gray-50 rounded-xl p-5 text-gray-700 text-sm space-y-1">
              <p><strong>{COMPANY}</strong></p>
              <p>State of Incorporation: California</p>
              <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-500 hover:underline">{CONTACT_EMAIL}</a></p>
              <p>Website: <a href="https://ttlike.com" className="text-pink-500 hover:underline">ttlike.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
